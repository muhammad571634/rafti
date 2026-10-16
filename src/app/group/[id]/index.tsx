import { Ionicons } from '@expo/vector-icons';
import { BlurTargetView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View, type ListRenderItemInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatInput, MessageBubble, TypingRow, VoiceSheet } from '@/components/chat';
import { lastMineId, runOf } from '@/components/chat/runs';
import { DailyCallsSheet } from '@/components/chat/daily-calls-sheet';
import { AttachMenu, type AttachKey } from '@/components/chat/attach-menu';
import { DayChip } from '@/components/chat/day-chip';
import { MessageMenu } from '@/components/chat/message-menu';
import { ReportSheet } from '@/components/chat/report-sheet';
import { TruthOrDareSheet } from '@/components/chat/truth-or-dare-sheet';
import { GroupAvatar } from '@/components/group-avatar';
import { PaywallSheet } from '@/components/paywall-sheet';
import { CallPaywallSheet } from '@/components/plans/call-paywall-sheet';
import { OutOfMinutesSheet } from '@/components/plans/out-of-minutes-sheet';
import {
  CharacterAvatar,
  Divider,
  IconButton,
  PressableScale,
  Screen,
  ShellBadge,
  Sheet,
  Txt,
} from '@/components/ui';
import { shortName } from '@/lib/format';
import { groupTitle } from '@/lib/group-chat';
import { backgroundsById, dayKey, shellCosts } from '@/mock';
import { callsIncluded, displayName, minutesOf, useAppStore } from '@/store/use-app-store';
import { colors, hitSlop, radius, space } from '@/theme';
import type { Character, Message } from '@/types';

/** Secret notes, quizzes, dates and daily calls are for two: they open with one member. */
type WithOne = 'secretNote' | 'quiz' | 'date' | 'dailyCalls';

const ROW_AVATAR = 36;

/**
 * A group chat (approved prototype): the user and 2-3 friends. Each member's run of
 * bubbles carries their name; "typing" says who. Text, voice, photos and truth or dare
 * happen here; the two-person things open with the member the user picks.
 */
export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Array.isArray(id) ? id[0] : id;

  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Message>>(null);

  const group = useAppStore((s) => s.groups.find((g) => g.id === groupId));
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const messages = useAppStore((s) => (groupId ? s.messages[groupId] : undefined));
  const typingId = useAppStore((s) => (groupId ? s.groupTyping[groupId] : null));
  const user = useAppStore((s) => s.user);
  const shells = useAppStore((s) => s.wallet.shells);
  const withCalls = useAppStore((s) => callsIncluded(s.wallet));
  const callMinutes = useAppStore((s) => minutesOf(s.wallet, 'call').total);
  const animations = useAppStore((s) => s.settings.chatAnimation);

  const sendGroupText = useAppStore((s) => s.sendGroupText);
  const sendGroupVoice = useAppStore((s) => s.sendGroupVoice);
  const sendGroupImage = useAppStore((s) => s.sendGroupImage);
  const playGroupTruthOrDare = useAppStore((s) => s.playGroupTruthOrDare);
  const setActiveConversation = useAppStore((s) => s.setActiveConversation);
  const reactToMessage = useAppStore((s) => s.reactToMessage);
  const deleteMessage = useAppStore((s) => s.deleteMessage);
  const reportMessage = useAppStore((s) => s.reportMessage);

  const [attachOpen, setAttachOpen] = useState(false);
  const blurTarget = useRef<View>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  /** The member on the wheel's other half; a new one each game. */
  const [truthWith, setTruthWith] = useState<Character | null>(null);
  const [withOne, setWithOne] = useState<WithOne | null>(null);
  const [callsWith, setCallsWith] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<number | null>(null);
  const [callGate, setCallGate] = useState<'paywall' | 'out' | null>(null);
  const [menu, setMenu] = useState<Message | null>(null);
  const [reporting, setReporting] = useState<Message | null>(null);
  const [reported, setReported] = useState(false);
  const openMenu = useCallback((message: Message) => setMenu(message), []);

  // Replies that land while the group is on screen are read, not unread.
  useFocusEffect(
    useCallback(() => {
      if (!groupId) return;
      setActiveConversation(groupId);
      return () => setActiveConversation(null);
    }, [groupId, setActiveConversation]),
  );

  useEffect(() => {
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [messages?.length, typingId]);

  const byId = useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters]);
  const members = useMemo(
    () => (group?.memberIds ?? []).flatMap((m) => byId.get(m) ?? []),
    [group?.memberIds, byId],
  );
  const nameOf = useCallback(
    (character: Character) => shortName(displayName(character, relationships[character.id])),
    [relationships],
  );
  const names = groupTitle(members.map(nameOf));
  const title = group?.name || names;
  const data = useMemo(() => messages ?? [], [messages]);
  const lastMine = useMemo(() => lastMineId(data), [data]);
  const typing = typingId ? byId.get(typingId) : undefined;
  const wallpaper = backgroundsById.bg_plain;

  // Only messages that arrive while the group is open animate in.
  const [openedAt] = useState(() => Date.now());
  const fallback = members[0];
  const noticeText = t('group.aiNotice', { names: names.replace(' & ', ' and ') });

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Message>) => {
      const author = item.characterId ? byId.get(item.characterId) : undefined;
      const character = author ?? fallback;
      if (!character) return null;
      const run = runOf(data, index);
      return (
        <>
          {run.timeBreak ? <DayChip iso={item.createdAt} /> : null}
          <MessageBubble
            message={item}
            character={character}
            animate={animations && Date.parse(item.createdAt) > openedAt}
            showAvatar={run.runStart}
            runEnd={run.runEnd}
            receipt={item.id === lastMine}
            senderName={author ? nameOf(author) : undefined}
            aiNoticeText={noticeText}
            onLongPress={openMenu}
          />
        </>
      );
    },
    [data, byId, fallback, lastMine, animations, openedAt, nameOf, noticeText, openMenu],
  );

  if (!group || !groupId || members.length < 2) {
    return (
      <Screen background={colors.bgPlain}>
        <Txt style={styles.missing}>{t('group.notFound')}</Txt>
      </Screen>
    );
  }

  const outOfShells = (cost: number) => {
    setPaywall(cost);
    return false;
  };

  const send = (text: string) => {
    const result = sendGroupText(groupId, text);
    if (result === 'noShells') return outOfShells(shellCosts.textMessage);
    return result === 'sent';
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    const uri = result.canceled ? undefined : result.assets[0]?.uri;
    if (uri && sendGroupImage(groupId, uri) === 'noShells') outOfShells(shellCosts.textMessage);
  };

  const attach = (key: AttachKey) => {
    setAttachOpen(false);
    switch (key) {
      case 'voice':
        return setVoiceOpen(true);
      case 'photo':
        return pickPhoto();
      case 'truthOrDare':
        return setTruthWith(members[Math.floor(Math.random() * members.length)]);
      case 'diary':
        return router.push('/diary/write');
      default:
        return setWithOne(key);
    }
  };

  /** The member picked for a two-person thing: their own flow, as from their chat. */
  const openWith = (kind: WithOne, character: Character) => {
    setWithOne(null);
    switch (kind) {
      case 'secretNote':
        return router.push(`/secret-note/${character.id}`);
      case 'quiz':
        return router.push({ pathname: '/quiz/[characterId]', params: { characterId: character.id } });
      case 'date':
        return router.push({ pathname: '/dating', params: { partner: character.id } });
      case 'dailyCalls':
        return setCallsWith(character.id);
    }
  };

  const startCall = () => {
    if (callMinutes > 0) return router.push({ pathname: '/group/[id]/call', params: { id: groupId } });
    setCallGate(withCalls ? 'out' : 'paywall');
  };
  const openStore = (route: '/store/shell?tab=shells' | '/store/shell?tab=plans&plan=pro') => {
    setCallGate(null);
    router.push(route);
  };
  const openInfo = () => router.push({ pathname: '/group/[id]/info', params: { id: groupId } });

  return (
    <Screen background={wallpaper.colors as readonly [string, string]} statusBarStyle={wallpaper.dark ? 'light' : 'dark'}>
      {/* What the menus blur on Android (expo-blur needs a target there). */}
      <BlurTargetView ref={blurTarget} style={styles.flex}>
        <View style={[styles.header, { marginTop: -insets.top, paddingTop: insets.top + space.xs }]}>
          <PressableScale onPress={() => router.back()} hitSlop={hitSlop} scaleTo={0.88} accessibilityLabel={t('a11y.back')}>
            <Ionicons name="chevron-back" size={27} color={colors.text} />
          </PressableScale>

          <View style={styles.identity}>
            <PressableScale
              style={styles.identityTap}
              scaleTo={0.98}
              accessibilityRole="button"
              accessibilityLabel={t('group.rowLabel', { name: title })}
              onPress={openInfo}>
              <GroupAvatar members={members} size={38} ringColor={colors.surface} />
              <View style={styles.identityText}>
                <Txt variant="title" lines={1}>
                  {title}
                </Txt>
                <Txt variant="tiny" color={colors.textSecondary} lines={1}>
                  {t('group.members', { count: members.length })}
                </Txt>
              </View>
            </PressableScale>
            <ShellBadge count={shells} showAdd onPress={() => router.push('/store/shell?tab=shells')} />
          </View>

          <IconButton
            icon="call-outline"
            size={22}
            style={styles.headerIcon}
            accessibilityLabel={t('group.call')}
            onPress={startCall}
          />
          <IconButton icon="menu" size={24} style={styles.headerIcon} accessibilityLabel={t('group.info')} onPress={openInfo} />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top + 56}>
          <View style={styles.flex}>
            <FlatList
              ref={listRef}
              data={data}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              renderItem={renderItem}
              ListFooterComponent={
                typing ? <TypingRow character={typing} label={t('group.typing', { name: nameOf(typing) })} /> : null
              }
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            />
          </View>

          <ChatInput
            placeholder={t('group.inputPlaceholder', { names })}
            onSend={send}
            onAttach={() => setAttachOpen(true)}
            onVoice={() => setVoiceOpen(true)}
          />
        </KeyboardAvoidingView>
      </BlurTargetView>

      <AttachMenu visible={attachOpen} onClose={() => setAttachOpen(false)} onPick={attach} blurTarget={blurTarget} />

      {/* Two-person things: pick the member, then their own flow opens. */}
      <Sheet visible={!!withOne} onClose={() => setWithOne(null)}>
        <Txt variant="h3">{t('group.pickMember')}</Txt>
        <Txt variant="body" color={colors.textSecondary} style={styles.sheetCopy}>
          {t('group.pickMemberBody')}
        </Txt>
        <View style={styles.ways}>
          {members.map((member, index) => (
            <View key={member.id}>
              {index > 0 ? <Divider inset={space.lg + ROW_AVATAR + space.md} /> : null}
              <PressableScale
                scaleTo={1}
                style={styles.way}
                accessibilityRole="button"
                accessibilityLabel={displayName(member, relationships[member.id])}
                onPress={() => withOne && openWith(withOne, member)}>
                <CharacterAvatar character={member} size={ROW_AVATAR} />
                <Txt variant="bodyStrong" style={styles.flex} lines={1}>
                  {displayName(member, relationships[member.id])}
                </Txt>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </PressableScale>
            </View>
          ))}
        </View>
      </Sheet>

      {truthWith ? (
        <TruthOrDareSheet
          visible
          onClose={() => setTruthWith(null)}
          character={truthWith}
          name={displayName(truthWith, relationships[truthWith.id])}
          onPlay={(target, kind) => playGroupTruthOrDare(groupId, truthWith.id, target, kind)}
        />
      ) : null}
      {callsWith ? <DailyCallsSheet visible onClose={() => setCallsWith(null)} characterId={callsWith} /> : null}

      <VoiceSheet
        visible={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onSend={(seconds) => {
          setVoiceOpen(false);
          if (sendGroupVoice(groupId, seconds, '(voice message)') === 'noShells') outOfShells(shellCosts.voiceMessage);
        }}
      />

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} chat />

      <CallPaywallSheet
        visible={callGate === 'paywall'}
        character={members[0]}
        name={displayName(members[0], relationships[members[0].id])}
        onClose={() => setCallGate(null)}
        onStarted={() => {
          setCallGate(null);
          router.push({ pathname: '/group/[id]/call', params: { id: groupId } });
        }}
      />
      <OutOfMinutesSheet
        visible={callGate === 'out'}
        onAdded={() => {
          setCallGate(null);
          router.push({ pathname: '/group/[id]/call', params: { id: groupId } });
        }}
        onNoShells={() => openStore('/store/shell?tab=shells')}
        onGetPro={() => openStore('/store/shell?tab=plans&plan=pro')}
        onDone={() => setCallGate(null)}
      />

      <MessageMenu
        message={menu}
        blurTarget={blurTarget}
        onClose={() => setMenu(null)}
        onReact={(message, reaction) => {
          reactToMessage(groupId, message.id, reaction);
          setMenu(null);
        }}
        onCopy={(message) => {
          void Clipboard.setStringAsync(message.text ?? '');
          setMenu(null);
        }}
        onReport={(message) => {
          setReported(false);
          setReporting(message);
          setMenu(null);
        }}
        onDelete={(message) => {
          deleteMessage(groupId, message.id);
          setMenu(null);
        }}
      />

      <ReportSheet
        visible={!!reporting}
        reported={reported}
        onClose={() => setReporting(null)}
        onReport={(reason) => {
          if (reporting) reportMessage(groupId, reporting.id, reason);
          setReported(true);
        }}
      />
    </Screen>
  );
}


const styles = StyleSheet.create({
  flex: { flex: 1 },
  missing: { padding: space.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    zIndex: 2,
  },
  headerIcon: { width: 34 },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  identityTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  identityText: { flex: 1, gap: 2 },
  list: { paddingVertical: space.lg },
  sheetCopy: { marginTop: space.xs },
  ways: {
    marginTop: space.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  way: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 64,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
  },
});

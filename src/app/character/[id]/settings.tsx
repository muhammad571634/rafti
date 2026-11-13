import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Header, ListRow, Screen, Sheet, Txt, useScrolledPast } from '@/components/ui';
import {
  BondHead,
  BondTrack,
  CardRound,
  ChoiceRow,
  DangerRow,
  FaceCard,
  FriendAccent,
  Group,
  LinkRow,
  useProfileStyles,
  ProfileTop,
  QuickAction,
  QuickRow,
  SwitchRow,
  TopButton,
} from '@/components/character/kit';
import { ClosenessSheet } from '@/components/closeness-sheet';
import { phrase } from '@/i18n';
import { FAMILY_LABELS } from '@/lib/kin';
import { planDate } from '@/components/plans/copy';
import { isActiveMemory } from '@/economy/memory-limit';
import { chatDrafts } from '@/lib/chat-drafts';
import { forgetFriendNow } from '@/hooks/use-forget-friend';
import { forgetNotes } from '@/lib/voice-files';
import { shortName } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { booksFor } from '@/lib/lorebook';
import { personaFor, personaList } from '@/lib/personas';
import { currentMood, replyPrefs, temperamentFor } from '@/lib/reply-engine';
import { levelForIntimacy, MAX_LEVEL, TIERS, unlockedLabels } from '@/mock';
import { localized } from '@/i18n/content';
import { officialLorebooks } from '@/mock/lorebooks';
import { callsIncluded, displayName, useAppStore } from '@/store/use-app-store';
import { colors, friendAccent, radius, space, systemGround, type } from '@/theme';
import type { Lorebook, ReplyLength, ReplyStyle } from '@/types';
import { confirmAlert as confirm } from '@/lib/alert';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const REPLY_STYLES: readonly ReplyStyle[] = ['talk', 'mix', 'story'];
const REPLY_LENGTHS: readonly ReplyLength[] = ['short', 'auto', 'long'];

type ActionKey =
  | 'voiceCall'
  | 'characterMemories'
  | 'characterSettings'
  | 'editCharacter'
  | 'searchHistory'
  | 'changeBackground'
  | 'clearChat'
  | 'reset'
  | 'remove'
  | 'block';

export default function CharacterSettingsScreen() {
  const profileStyles = useProfileStyles();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const characterId = Array.isArray(id) ? id[0] : id;

  const { t } = useTranslation();
  const router = useRouter();

  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const relationship = useAppStore((s) => (characterId ? s.relationships[characterId] : undefined));
  // Voice replies come with Pro (or the trial); without it the switch says so.
  const hasPlan = useAppStore((s) => callsIncluded(s.wallet));
  const conversation = useAppStore((s) => s.conversations.find((c) => c.characterId === characterId));
  const memoryCount = useAppStore((s) => s.memories.filter((m) => m.characterId === characterId && isActiveMemory(m)).length);
  const openThreads = useAppStore((s) => s.threads.filter((x) => x.characterId === characterId && x.status === 'open').length);
  const chatAnimation = useAppStore((s) => s.settings.chatAnimation);
  const clearChat = useAppStore((s) => s.clearChat);
  const resetRelationship = useAppStore((s) => s.resetRelationship);
  const setNickname = useAppStore((s) => s.setNickname);
  const setCharacterPref = useAppStore((s) => s.setCharacterPref);
  const setReplyPrefs = useAppStore((s) => s.setReplyPrefs);
  const setSetting = useAppStore((s) => s.setSetting);
  const setRelationshipLabel = useAppStore((s) => s.setRelationshipLabel);
  const user = useAppStore((s) => s.user);
  const personas = useAppStore((s) => s.personas);
  const defaultPersonaId = useAppStore((s) => s.defaultPersonaId);
  const chatPersonas = useAppStore((s) => s.chatPersonas);
  const setChatPersona = useAppStore((s) => s.setChatPersona);
  const lorebooks = useAppStore((s) => s.lorebooks);
  const [personaOpen, setPersonaOpen] = useState(false);

  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [closenessOpen, setClosenessOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  // Past the avatar and name, the bar shows the name (iOS scroll edge).
  const { scrolled, onScroll } = useScrolledPast(220);

  if (!character) {
    return (
      <Screen background={colors.bgPlain}>
        <Header title={t('errors.notFound')} />
      </Screen>
    );
  }

  const name = displayName(character, relationship);
  const own = !character.isOfficial;

  const run = (key: ActionKey) => {
    switch (key) {
      case 'voiceCall':
        return router.push(`/call/${character.id}`);
      case 'characterMemories':
        return router.push(`/character/${character.id}/memories`);
      case 'characterSettings':
        return router.push(`/character/${character.id}`);
      case 'editCharacter':
        return router.push({ pathname: '/create-character', params: { id: character.id } });
      case 'searchHistory':
        return router.push(`/character/${character.id}/search`);
      case 'changeBackground':
        return router.push(`/character/${character.id}/background`);
      case 'clearChat':
        return confirm(
          t('characterSettings.clearChat'),
          t('characterSettings.clearChatConfirm'),
          t('common.delete'),
          () => {
            if (!conversation) return;
            chatDrafts.clear(conversation.id);
            void forgetNotes(conversation.id);
            clearChat(conversation.id);
          },
          t('common.cancel'),
        );
      case 'reset':
        return confirm(
          t('characterSettings.reset'),
          t('characterSettings.resetConfirm'),
          t('characterSettings.reset'),
          () => resetRelationship(character.id),
          t('common.cancel'),
        );
      case 'remove':
        // A friend from Find leaves the user's friends (Find keeps them); one the user made is deleted.
        return confirm(
          t(own ? 'friendRemove.deleteTitle' : 'friendRemove.removeTitle', { name: shortName(name) }),
          t(own ? 'friendRemove.deleteBody' : 'friendRemove.removeBody'),
          t(own ? 'common.delete' : 'friendRemove.remove'),
          () => leave(own ? 'delete' : 'remove'),
          t('common.cancel'),
        );
      case 'block':
        return confirm(
          t('safety.blockTitle', { name: shortName(name) }),
          t('safety.blockBody'),
          t('safety.block'),
          () => leave('block'),
          t('common.cancel'),
        );
    }
  };

  // Everything with them goes: their photos too, and the user's selfies in them must not stay behind.
  const friendId = character.id;
  const leave = (how: 'remove' | 'delete' | 'block') => {
    forgetFriendNow(friendId, how);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/(tabs)/chat');
  };

  const quick: { key: ActionKey; icon: IoniconName; label: string; badge?: number }[] = [
    { key: 'voiceCall', icon: 'call', label: t('characterSettings.quickCall') },
    { key: 'searchHistory', icon: 'search', label: t('characterSettings.quickSearch') },
    { key: 'characterMemories', icon: 'bookmark', label: t('characterSettings.characterMemories'), badge: memoryCount },
    { key: 'changeBackground', icon: 'image', label: t('characterSettings.quickBackground') },
  ];
  const danger: { key: ActionKey; label: string }[] = [
    { key: 'clearChat', label: t('characterSettings.clearChat') },
    { key: 'reset', label: t('characterSettings.reset') },
    { key: 'remove', label: t(own ? 'friendRemove.deleteRow' : 'friendRemove.removeRow', { name: shortName(name) }) },
    { key: 'block', label: t('characterSettings.blockName', { name: shortName(name) }) },
  ];
  // How they feel right now, as under their name in the chat; it fades back to their usual self.
  const mood = currentMood(relationship?.mood, temperamentFor(character), Date.now()).emotion;

  return (
    // The four tabs' look (0z152): Apple's white ground, their picture as Find's photo card, white cards.
    <Screen background={systemGround.ground}>
      <ProfileTop
        title={name}
        showTitle={scrolled}
        onBack={() => router.back()}
        right={
          // Only the user's own characters can be edited; seed ones get a nickname below.
          own ? (
            <TopButton label={t('common.edit')} accessibilityLabel={t('characterSettings.editCharacter')} onPress={() => run('editCharacter')} />
          ) : undefined
        }
      />

      {/* Their own space: quick actions, the level and the row tiles in their colour. */}
      <FriendAccent value={friendAccent(character.id)}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingTop: space.xs, paddingBottom: insets.bottom + space.huge }}>
          <FaceCard
            character={character}
            name={name}
            lines={[
              `${t('chat.aiShort')} · ${t(`chat.mood.${mood}`)}`,
              relationship ? t('characterSettings.since', { date: planDate(Date.parse(relationship.anniversary)) }) : null,
            ]}
          />

          <QuickRow>
            {quick.map((q) => (
              <QuickAction key={q.key} icon={q.icon} label={q.label} badge={q.badge} onPress={() => run(q.key)} />
            ))}
          </QuickRow>

          {relationship ? (
            <RelationshipCard
              level={relationship.level}
              intimacy={relationship.intimacy}
              title={phrase(relationship.levelTitle)}
              label={relationship.label && phrase(relationship.label)}
              onPick={() => setLabelOpen(true)}
              onInfo={() => setClosenessOpen(true)}
            />
          ) : null}

          {/* The former "Chat settings" sheet, inline as on iOS. */}
          <Group>
            <SwitchRow
              label={t('characterSettings.voiceReplies')}
              icon="mic"
              value={relationship?.voiceReplies ?? true}
              disabled={!character.voiceReady}
              onChange={(v) => setCharacterPref(character.id, 'voiceReplies', v)}
            />
            <SwitchRow
              label={t('characterSettings.messagesFirst')}
              icon="chatbubble-ellipses"
              value={relationship?.messagesFirst ?? true}
              onChange={(v) => setCharacterPref(character.id, 'messagesFirst', v)}
            />
            <SwitchRow
              label={t('characterSettings.chatAnimation')}
              icon="sparkles"
              value={chatAnimation}
              onChange={(v) => setSetting('chatAnimation', v)}
              last
            />
          </Group>
          {/* Without Pro (or the trial) voice replies do not play; the footer says so, iOS style. */}
          {!hasPlan && character.voiceReady ? <Txt style={profileStyles.footer}>{t('characterSettings.voiceRepliesPlanHint')}</Txt> : null}

          {/* How their replies read (Character.AI's response style and length); the next reply follows. */}
          <Group>
            <ChoiceRow
              label={t('characterSettings.replyStyle')}
              options={REPLY_STYLES.map((value) => ({ value, label: t(`characterSettings.replyStyles.${value}`) }))}
              value={replyPrefs(relationship).style}
              onChange={(style) => setReplyPrefs(character.id, { style })}
            />
            <ChoiceRow
              label={t('characterSettings.replyLength')}
              options={REPLY_LENGTHS.map((value) => ({ value, label: t(`characterSettings.replyLengths.${value}`) }))}
              value={replyPrefs(relationship).length}
              onChange={(length) => setReplyPrefs(character.id, { length })}
              last
            />
          </Group>

          <Group>
            {conversation ? (
              <LinkRow
                label={t('personas.youAre')}
                icon="person-circle"
                meta={personaFor(conversation.id, { user, personas, defaultPersonaId, chatPersonas }).name}
                onPress={() => setPersonaOpen(true)}
              />
            ) : null}
            {/* What their world and the user's books tell them (Character.AI's Lorebook). */}
            <LinkRow
              label={t('lore.chatRow')}
              icon="book"
              meta={loreMeta(booksFor(character, lorebooks, localized('lorebooks', officialLorebooks)), t)}
              onPress={() => router.push({ pathname: '/lore/for/[characterId]', params: { characterId: character.id } })}
            />
            {/* What they took from the chat (A2): open threads, to see, change or stop. */}
            <LinkRow
              label={t('mind.title')}
              icon="pin"
              meta={openThreads ? String(openThreads) : undefined}
              onPress={() => router.push({ pathname: '/mind', params: { characterId: character.id } })}
            />
            <LinkRow label={t('characterSettings.profile')} icon="person" onPress={() => run('characterSettings')} />
            <LinkRow
              label={t('characterSettings.nicknameRow')}
              icon="pricetag"
              meta={relationship?.nickname || t('characterSettings.none')}
              onPress={() => {
                setDraftName(relationship?.nickname ?? '');
                setRenaming(true);
              }}
              last
            />
          </Group>

          <Group>
            {danger.map((d, i) => (
              <DangerRow key={d.key} label={d.label} last={i === danger.length - 1} onPress={() => run(d.key)} />
            ))}
          </Group>
        </ScrollView>
      </FriendAccent>

      <Sheet visible={renaming} onClose={() => setRenaming(false)} title={t('characterSettings.nickname')} avoidKeyboard>
        <TextInput
          value={draftName}
          onChangeText={setDraftName}
          placeholder={character.name}
          accessibilityLabel={t('characterSettings.nickname')}
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          maxLength={30}
          autoFocus
        />
        <Txt variant="caption" color={colors.textMuted} style={styles.hint}>
          {t('characterSettings.nicknameHint')}
        </Txt>
        <Button
          label={t('common.save')}
          full
          onPress={() => {
            setNickname(character.id, draftName);
            setRenaming(false);
          }}
        />
      </Sheet>

      {/* Who the user is in this chat (Character.AI's per-chat persona); the character sees it from the next reply. */}
      <Sheet visible={personaOpen} onClose={() => setPersonaOpen(false)} title={t('personas.chatTitle')}>
        <ScrollView style={styles.labelScroll} showsVerticalScrollIndicator={false}>
          {conversation
            ? personaList({ user, personas }).map((persona) => (
                <LabelRow
                  key={persona.id}
                  title={persona.name}
                  meta={persona.profile ? t('personas.profile') : undefined}
                  selected={personaFor(conversation.id, { user, personas, defaultPersonaId, chatPersonas }).id === persona.id}
                  onPress={() => {
                    haptic.selection();
                    setChatPersona(conversation.id, persona.id);
                    setPersonaOpen(false);
                  }}
                />
              ))
            : null}
          <LabelRow
            title={t('personas.manage')}
            selected={false}
            link
            onPress={() => {
              setPersonaOpen(false);
              router.push('/personas');
            }}
          />
        </ScrollView>
      </Sheet>

      <ClosenessSheet visible={closenessOpen} onClose={() => setClosenessOpen(false)} level={relationship?.level} />

      <Sheet
        visible={labelOpen}
        onClose={() => setLabelOpen(false)}
        title={t('closeness.labelTitle', { name: shortName(name) })}>
        <ScrollView style={styles.labelScroll} showsVerticalScrollIndicator={false}>
          <Txt variant="small" color={colors.textSecondary} style={styles.labelHint}>
            {t('closeness.labelHint')}
          </Txt>
          <LabelRow
            title={t('closeness.none')}
            selected={!relationship?.label}
            onPress={() => {
              setRelationshipLabel(character.id, undefined);
              setLabelOpen(false);
            }}
          />
          {/* Family (src/lib/kin.ts): open from the start, never romantic, keeps a day's rhythm. */}
          {FAMILY_LABELS.map((label) => (
            <LabelRow
              key={label}
              title={phrase(label)}
              meta={t('closeness.family')}
              selected={relationship?.label === label}
              onPress={() => {
                setRelationshipLabel(character.id, label);
                setLabelOpen(false);
              }}
            />
          ))}
          {TIERS.flatMap((tier) =>
            tier.labels.map((label) => {
              const open = unlockedLabels(relationship?.level ?? 0).includes(label);
              return (
                <LabelRow
                  key={label}
                  title={phrase(label)}
                  meta={open ? phrase(tier.title) : t('closeness.lockedAt', { level: tier.from })}
                  locked={!open}
                  selected={relationship?.label === label}
                  onPress={() => {
                    if (!open) return;
                    setRelationshipLabel(character.id, label);
                    setLabelOpen(false);
                  }}
                />
              );
            }),
          )}
        </ScrollView>
      </Sheet>
    </Screen>
  );
}

/** The world books row's value: the one book's name, how many there are, or none. */
function loreMeta(books: Lorebook[], t: TFunction) {
  if (books.length === 1) return books[0].name;
  return books.length ? t('lore.bookCount', { count: books.length }) : t('characterSettings.none');
}

/** Level, stage, progress to the next level and the label you chose. */
function RelationshipCard({
  level,
  intimacy,
  title,
  label,
  onPick,
  onInfo,
}: {
  level: number;
  intimacy: number;
  title: string;
  label?: string;
  onPick: () => void;
  onInfo: () => void;
}) {
  const { t } = useTranslation();
  const { progress, nextLevelAt } = levelForIntimacy(intimacy);
  const maxed = level >= MAX_LEVEL;

  return (
    <Group>
      <BondHead
        title={title}
        line={`${t('closeness.level', { level })} · ${
          maxed ? t('closeness.max') : t('closeness.toNext', { count: Math.max(0, nextLevelAt - intimacy), level: level + 1 })
        }`}
        end={<CardRound icon="information" accessibilityLabel={t('closeness.title')} onPress={onInfo} />}
      />
      <BondTrack progress={progress} />
      <View style={styles.bondRow}>
        <LinkRow label={t('closeness.relationship')} meta={label ?? t('closeness.pickShort')} onPress={onPick} last />
      </View>
    </Group>
  );
}

function LabelRow({
  title,
  meta,
  locked,
  selected,
  link,
  onPress,
}: {
  title: string;
  meta?: string;
  locked?: boolean;
  selected: boolean;
  /** A row that opens another screen: a chevron instead of the radio. */
  link?: boolean;
  onPress: () => void;
}) {
  return (
    <ListRow
      title={title}
      meta={meta}
      trailing={
        link ? (
          <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />
        ) : locked ? (
          <Ionicons name="lock-closed" size={16} color={colors.textFaint} />
        ) : (
          <Ionicons
            name={selected ? 'radio-button-on' : 'radio-button-off'}
            size={20}
            color={selected ? colors.bond : colors.textFaint}
          />
        )
      }
      onPress={onPress}
      style={locked ? styles.locked : undefined}
    />
  );
}

const styles = StyleSheet.create({
  bondRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong },
  labelScroll: { maxHeight: 460 },
  labelHint: { marginBottom: space.sm },
  locked: { opacity: 0.5 },
  input: {
    height: 48,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    ...type.body,
  },
  hint: { marginTop: space.sm, marginBottom: space.lg },
});

import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  type IoniconName,
  SettingsCard,
  SettingsChoiceBlock,
  SettingsClosenessCard,
  SettingsDangerRow,
  SettingsHeroCard,
  SettingsLinkRow,
  SettingsQuickTile,
  SettingsSheetOption,
  SettingsSwitchRow,
} from '@/components/character/settings-parts';
import { ClosenessSheet } from '@/components/closeness-sheet';
import { PhotoSheet } from '@/components/create/form-parts';
import { usePickCharacterPicture } from '@/components/create/use-pick-picture';
import { InkGlassPill, InkNavBar, PillButton } from '@/components/ink';
import { planDate } from '@/components/plans/copy';
import { Screen, Sheet, templatePortrait, Txt, useScrolledPast } from '@/components/ui';
import { isActiveMemory } from '@/economy/memory-limit';
import { forgetFriendNow } from '@/hooks/use-forget-friend';
import { phrase } from '@/i18n';
import { localized } from '@/i18n/content';
import { confirmAlert as confirm } from '@/lib/alert';
import { chatDrafts } from '@/lib/chat-drafts';
import { shortName } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { FAMILY_LABELS } from '@/lib/kin';
import { booksFor } from '@/lib/lorebook';
import { personaFor, personaList } from '@/lib/personas';
import { currentMood, replyPrefs, temperamentFor } from '@/lib/reply-engine';
import { forgetNotes } from '@/lib/voice-files';
import { levelForIntimacy, MAX_LEVEL, TIERS, unlockedLabels } from '@/mock';
import { officialLorebooks } from '@/mock/lorebooks';
import { callsIncluded, displayName, useAppStore } from '@/store/use-app-store';
import { colors, friendAccent, space, systemColors } from '@/theme';
import { ink, inkFace, inkGutter, inkRadius } from '@/theme/ink';
import type { Lorebook, ReplyLength, ReplyStyle } from '@/types';

const REPLY_STYLES: readonly ReplyStyle[] = ['talk', 'mix', 'story'];
const REPLY_LENGTHS: readonly ReplyLength[] = ['short', 'auto', 'long'];
const INPUT_BG = '#0E0E14';
const INPUT_RIM = 'rgba(255,255,255,0.10)';
const INPUT_FOCUS_RIM = 'rgba(235,173,132,0.58)';

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

/**
 * Chat settings (approved Ink Night+ prototype `ink-polish-chat-settings.html`): ambient
 * friend-accent horizon wash, sticky `InkNavBar` with scroll-edge serif name + optional `Edit`
 * glass pill, Cinema hero photo card with live mood badge, Apple Contacts-style 4 glass quick
 * action tiles, tinted Closeness card, semantic iOS colored icon rows, crisp white-thumb reply
 * controls, red-icon destructive rows, and Ink Night+ sheets.
 */
export default function CharacterSettingsScreen() {
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
  const updateCharacter = useAppStore((s) => s.updateCharacter);
  const pickPicture = usePickCharacterPicture();
  const [photoOpen, setPhotoOpen] = useState(false);

  const [personaOpen, setPersonaOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nickFocused, setNickFocused] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [closenessOpen, setClosenessOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  // Past the hero card, the sticky nav bar shows the character's serif name (iOS scroll edge).
  const { scrolled, onScroll } = useScrolledPast(160);

  if (!character) {
    return (
      <Screen background={ink.ground}>
        <InkNavBar backLabel={t('common.back')} onBack={() => router.back()} title={t('errors.notFound')} scrolled />
      </Screen>
    );
  }

  const name = displayName(character, relationship);
  const own = !character.isOfficial;
  // Any friend that is not the official cast can wear a picture the user picks (owner, 2026-11-27);
  // a story friend's painting comes back with "Original photo".
  const storyArt = templatePortrait(character);
  const changePicture = async (from: 'library' | 'camera') => {
    setPhotoOpen(false);
    try {
      const uri = await pickPicture(from);
      if (!uri) return;
      updateCharacter(character.id, { avatarUri: uri });
      haptic.success();
    } catch {
      haptic.error();
    }
  };
  const accent = friendAccent(character.id);

  // Everything with them goes: their photos too, and the user's selfies in them must not stay behind.
  const friendId = character.id;
  const leave = (how: 'remove' | 'delete' | 'block') => {
    forgetFriendNow(friendId, how);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/(tabs)/chat');
  };

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

  const quick: { key: ActionKey; icon: IoniconName; color: string; label: string; badge?: number }[] = [
    { key: 'voiceCall', icon: 'call', color: systemColors.green, label: t('characterSettings.quickCall') },
    { key: 'searchHistory', icon: 'search', color: systemColors.blue, label: t('characterSettings.quickSearch') },
    {
      key: 'characterMemories',
      icon: 'bookmark',
      color: ink.accent,
      label: t('characterSettings.characterMemories'),
      badge: memoryCount,
    },
    { key: 'changeBackground', icon: 'image', color: systemColors.cyan, label: t('characterSettings.quickBackground') },
  ];

  const danger: { key: ActionKey; icon: IoniconName; label: string }[] = [
    { key: 'clearChat', icon: 'trash-outline', label: t('characterSettings.clearChat') },
    { key: 'reset', icon: 'refresh-outline', label: t('characterSettings.reset') },
    {
      key: 'remove',
      icon: 'person-remove-outline',
      label: t(own ? 'friendRemove.deleteRow' : 'friendRemove.removeRow', { name: shortName(name) }),
    },
    { key: 'block', icon: 'ban-outline', label: t('characterSettings.blockName', { name: shortName(name) }) },
  ];

  // How they feel right now, as under their name in the chat; it fades back to their usual self.
  const mood = currentMood(relationship?.mood, temperamentFor(character), Date.now()).emotion;
  const moodLine = `${t('chat.aiShort')} · ${t(`chat.mood.${mood}`)}`;
  const sinceLine = relationship ? t('characterSettings.since', { date: planDate(Date.parse(relationship.anniversary)) }) : null;

  const bondProgress = relationship ? levelForIntimacy(relationship.intimacy) : null;
  const bondMaxed = relationship ? relationship.level >= MAX_LEVEL : false;
  const bondLine =
    relationship && bondProgress
      ? `${t('closeness.level', { level: relationship.level })} · ${
          bondMaxed
            ? t('closeness.max')
            : t('closeness.toNext', { count: Math.max(0, bondProgress.nextLevelAt - relationship.intimacy), level: relationship.level + 1 })
        }`
      : '';

  const currentPersona = conversation
    ? personaFor(conversation.id, { user, personas, defaultPersonaId, chatPersonas })
    : null;
  const unlocked = unlockedLabels(relationship?.level ?? 0);
  const tierItems = TIERS.flatMap((tier) => tier.labels.map((label) => ({ tier, label })));

  return (
    <Screen background={ink.ground}>
      <LinearGradient
        pointerEvents="none"
        colors={[`${accent.strong}2E`, 'rgba(9,9,13,0)']}
        start={{ x: 0.72, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.ambient}
      />

      <InkNavBar
        backLabel={t('common.back')}
        onBack={() => router.back()}
        title={name}
        scrolled={scrolled}
        right={
          // Only the user's own characters can be edited; seed ones get a nickname below.
          own ? (
            <InkGlassPill
              label={t('common.edit')}
              accessibilityLabel={t('characterSettings.editCharacter')}
              onPress={() => run('editCharacter')}
            />
          ) : undefined
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + space.huge }}>
        <SettingsHeroCard
          character={character}
          name={name}
          moodLine={moodLine}
          sinceLine={sinceLine}
          accent={accent}
          photoLabel={t(character.avatarUri || storyArt != null ? 'createCharacter.flow.changePhoto' : 'createCharacter.flow.addPhoto')}
          onChangePhoto={own ? () => setPhotoOpen(true) : undefined}
        />

        <View style={styles.quickRow}>
          {quick.map((q) => (
            <SettingsQuickTile
              key={q.key}
              icon={q.icon}
              iconColor={q.color}
              label={q.label}
              badge={q.badge}
              onPress={() => run(q.key)}
            />
          ))}
        </View>

        {relationship && bondProgress ? (
          <SettingsClosenessCard
            accent={accent}
            stageTitle={phrase(relationship.levelTitle)}
            levelLine={bondLine}
            progress={bondProgress.progress}
            relationshipLabel={t('closeness.relationship')}
            relationshipValue={relationship.label ? phrase(relationship.label) : t('closeness.pickShort')}
            infoLabel={t('closeness.title')}
            onInfo={() => setClosenessOpen(true)}
            onPickRelationship={() => setLabelOpen(true)}
          />
        ) : null}

        {/* Chat toggles: semantic iOS system colors for scannability. */}
        <SettingsCard>
          <SettingsSwitchRow
            icon="mic"
            fill={systemColors.purple}
            label={t('characterSettings.voiceReplies')}
            value={relationship?.voiceReplies ?? true}
            disabled={!character.voiceReady}
            onChange={(v) => setCharacterPref(character.id, 'voiceReplies', v)}
          />
          <SettingsSwitchRow
            icon="chatbubble-ellipses"
            fill={systemColors.green}
            label={t('characterSettings.messagesFirst')}
            value={relationship?.messagesFirst ?? true}
            onChange={(v) => setCharacterPref(character.id, 'messagesFirst', v)}
          />
          <SettingsSwitchRow
            icon="sparkles"
            fill={systemColors.orange}
            label={t('characterSettings.chatAnimation')}
            value={chatAnimation}
            onChange={(v) => setSetting('chatAnimation', v)}
            last
          />
        </SettingsCard>

        {/* Without Pro (or the trial) voice replies do not play; the footer says so, iOS style. */}
        {!hasPlan && character.voiceReady ? (
          <Txt style={styles.footerHint} maxFontSizeMultiplier={1.6}>
            {t('characterSettings.voiceRepliesPlanHint')}
          </Txt>
        ) : null}

        {/* How their replies read (response style and length); the next reply follows. */}
        <SettingsCard>
          <SettingsChoiceBlock
            label={t('characterSettings.replyStyle')}
            options={REPLY_STYLES.map((value) => ({ value, label: t(`characterSettings.replyStyles.${value}`) }))}
            value={replyPrefs(relationship).style}
            onChange={(style) => setReplyPrefs(character.id, { style })}
          />
          <SettingsChoiceBlock
            label={t('characterSettings.replyLength')}
            options={REPLY_LENGTHS.map((value) => ({ value, label: t(`characterSettings.replyLengths.${value}`) }))}
            value={replyPrefs(relationship).length}
            onChange={(length) => setReplyPrefs(character.id, { length })}
            last
          />
        </SettingsCard>

        {/* Personalization & World links */}
        <SettingsCard>
          {conversation && currentPersona ? (
            <SettingsLinkRow
              icon="person-circle"
              fill={systemColors.blue}
              label={t('personas.youAre')}
              meta={currentPersona.name}
              onPress={() => setPersonaOpen(true)}
            />
          ) : null}
          {/* What their world and the user's books tell them (Lorebook). */}
          <SettingsLinkRow
            icon="book"
            fill={systemColors.teal}
            label={t('lore.chatRow')}
            meta={loreMeta(booksFor(character, lorebooks, localized('lorebooks', officialLorebooks)), t)}
            onPress={() => router.push({ pathname: '/lore/for/[characterId]', params: { characterId: character.id } })}
          />
          {/* What they took from the chat (A2): open threads, to see, change or stop. */}
          <SettingsLinkRow
            icon="pin"
            fill={systemColors.orange}
            label={t('mind.title')}
            meta={openThreads ? String(openThreads) : undefined}
            onPress={() => router.push({ pathname: '/mind', params: { characterId: character.id } })}
          />
          <SettingsLinkRow
            icon="person"
            fill={systemColors.indigo}
            label={t('characterSettings.profile')}
            onPress={() => run('characterSettings')}
          />
          <SettingsLinkRow
            icon="pricetag"
            fill={systemColors.pink}
            label={t('characterSettings.nicknameRow')}
            meta={relationship?.nickname || t('characterSettings.none')}
            onPress={() => {
              setDraftName(relationship?.nickname ?? '');
              setRenaming(true);
            }}
            last
          />
        </SettingsCard>

        {/* Destructive actions */}
        <SettingsCard>
          {danger.map((d, i) => (
            <SettingsDangerRow
              key={d.key}
              icon={d.icon}
              label={d.label}
              last={i === danger.length - 1}
              onPress={() => run(d.key)}
            />
          ))}
        </SettingsCard>
      </ScrollView>

      <Sheet
        visible={renaming}
        onClose={() => {
          setRenaming(false);
          setNickFocused(false);
        }}
        title={t('characterSettings.nickname')}
        avoidKeyboard>
        <TextInput
          value={draftName}
          onChangeText={setDraftName}
          onFocus={() => setNickFocused(true)}
          onBlur={() => setNickFocused(false)}
          placeholder={character.name}
          accessibilityLabel={t('characterSettings.nickname')}
          placeholderTextColor={ink.placeholder}
          selectionColor={ink.accent}
          style={[styles.input, nickFocused && styles.inputFocused]}
          maxLength={30}
          autoFocus
        />
        <Txt style={styles.hint} maxFontSizeMultiplier={1.6}>
          {t('characterSettings.nicknameHint')}
        </Txt>
        <PillButton
          label={t('common.save')}
          kind="primary"
          size="md"
          onPress={() => {
            setNickname(character.id, draftName);
            setRenaming(false);
            setNickFocused(false);
          }}
        />
      </Sheet>

      {/* Who the user is in this chat (per-chat persona); the character sees it from the next reply. */}
      <Sheet visible={personaOpen} onClose={() => setPersonaOpen(false)} title={t('personas.chatTitle')} scroll>
        <View style={styles.sheetCard}>
          {conversation
            ? personaList({ user, personas }).map((persona) => (
                <SettingsSheetOption
                  key={persona.id}
                  title={persona.name}
                  meta={persona.profile ? t('personas.profile') : persona.about || undefined}
                  selected={currentPersona?.id === persona.id}
                  checkColor={ink.accent}
                  checkInk={ink.onAccent}
                  onPress={() => {
                    haptic.selection();
                    setChatPersona(conversation.id, persona.id);
                    setPersonaOpen(false);
                  }}
                />
              ))
            : null}
          <SettingsSheetOption
            title={t('personas.manage')}
            link
            last
            onPress={() => {
              setPersonaOpen(false);
              router.push('/personas');
            }}
          />
        </View>
      </Sheet>

      <ClosenessSheet
        visible={closenessOpen}
        onClose={() => setClosenessOpen(false)}
        level={relationship?.level}
        accentColor={accent.strong}
      />

      <Sheet
        visible={labelOpen}
        onClose={() => setLabelOpen(false)}
        title={t('closeness.labelTitle', { name: shortName(name) })}
        scroll>
        <Txt style={styles.labelHint} maxFontSizeMultiplier={1.6}>
          {t('closeness.labelHint')}
        </Txt>
        <View style={styles.sheetCard}>
          <SettingsSheetOption
            title={t('closeness.none')}
            selected={!relationship?.label}
            checkColor={colors.bond}
            checkInk={ink.ground}
            onPress={() => {
              haptic.selection();
              setRelationshipLabel(character.id, undefined);
              setLabelOpen(false);
            }}
          />
          {/* Family (src/lib/kin.ts): open from the start, never romantic, keeps a day's rhythm. */}
          {FAMILY_LABELS.map((label) => (
            <SettingsSheetOption
              key={label}
              title={phrase(label)}
              meta={t('closeness.family')}
              selected={relationship?.label === label}
              checkColor={colors.bond}
              checkInk={ink.ground}
              onPress={() => {
                haptic.selection();
                setRelationshipLabel(character.id, label);
                setLabelOpen(false);
              }}
            />
          ))}
          {tierItems.map(({ tier, label }, idx) => {
            const isOpen = unlocked.includes(label);
            return (
              <SettingsSheetOption
                key={label}
                title={phrase(label)}
                meta={isOpen ? phrase(tier.title) : t('closeness.lockedAt', { level: tier.from })}
                locked={!isOpen}
                selected={relationship?.label === label}
                checkColor={colors.bond}
                checkInk={ink.ground}
                last={idx === tierItems.length - 1}
                onPress={() => {
                  if (!isOpen) return;
                  haptic.selection();
                  setRelationshipLabel(character.id, label);
                  setLabelOpen(false);
                }}
              />
            );
          })}
        </View>
      </Sheet>
      <PhotoSheet
        visible={photoOpen}
        hasPhoto={!!character.avatarUri || storyArt != null}
        canRemove={!!character.avatarUri}
        removeLabel={storyArt != null ? t('createCharacter.flow.originalPhoto') : undefined}
        onClose={() => setPhotoOpen(false)}
        onPick={(from) => void changePicture(from)}
        onRemove={() => {
          setPhotoOpen(false);
          updateCharacter(character.id, { avatarUri: undefined });
        }}
      />
    </Screen>
  );
}

/** The world books row's value: the one book's name, how many there are, or none. */
function loreMeta(books: Lorebook[], t: TFunction) {
  if (books.length === 1) return books[0].name;
  return books.length ? t('lore.bookCount', { count: books.length }) : t('characterSettings.none');
}

const styles = StyleSheet.create({
  ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 260 },
  quickRow: {
    flexDirection: 'row',
    gap: 9,
    marginHorizontal: inkGutter,
    marginTop: 14,
  },
  footerHint: {
    ...inkFace('footnote'),
    color: ink.text2,
    marginHorizontal: inkGutter + 12,
    marginTop: 8,
  },
  sheetCard: {
    borderRadius: inkRadius.row,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    overflow: 'hidden',
  },
  labelHint: {
    ...inkFace('footnote'),
    color: ink.text2,
    marginBottom: space.md,
  },
  input: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_RIM,
    color: ink.text,
    ...inkFace('body'),
  },
  inputFocused: { borderColor: INPUT_FOCUS_RIM },
  hint: {
    ...inkFace('footnote'),
    color: ink.text2,
    marginTop: space.sm,
    marginBottom: space.lg,
    marginHorizontal: 4,
  },
});

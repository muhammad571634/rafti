import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  CharacterAvatar,
  GlassBar,
  GlassButton,
  Header,
  IconButton,
  ListRow,
  PressableScale,
  Screen,
  Sheet,
  Txt,
  useScrolledPast,
} from '@/components/ui';
import { ClosenessSheet } from '@/components/closeness-sheet';
import { planDate } from '@/components/plans/copy';
import { isActiveMemory } from '@/economy/memory-limit';
import { shortName } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { personaFor, personaList } from '@/lib/personas';
import { levelForIntimacy, MAX_LEVEL, TIERS, unlockedLabels } from '@/mock';
import { callsIncluded, displayName, useAppStore } from '@/store/use-app-store';
import { colors, radius, space, type } from '@/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type ActionKey =
  | 'voiceCall'
  | 'characterMemories'
  | 'characterSettings'
  | 'editCharacter'
  | 'searchHistory'
  | 'changeBackground'
  | 'clearChat'
  | 'reset'
  | 'block';

/** Alert.alert is a no-op on web; fall back to the browser's confirm there. */
function confirm(title: string, message: string, action: string, onConfirm: () => void, cancel: string) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancel, style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

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
  const chatAnimation = useAppStore((s) => s.settings.chatAnimation);
  const clearChat = useAppStore((s) => s.clearChat);
  const resetRelationship = useAppStore((s) => s.resetRelationship);
  const blockCharacter = useAppStore((s) => s.blockCharacter);
  const setNickname = useAppStore((s) => s.setNickname);
  const setCharacterPref = useAppStore((s) => s.setCharacterPref);
  const setSetting = useAppStore((s) => s.setSetting);
  const setRelationshipLabel = useAppStore((s) => s.setRelationshipLabel);
  const user = useAppStore((s) => s.user);
  const personas = useAppStore((s) => s.personas);
  const defaultPersonaId = useAppStore((s) => s.defaultPersonaId);
  const chatPersonas = useAppStore((s) => s.chatPersonas);
  const setChatPersona = useAppStore((s) => s.setChatPersona);
  const [personaOpen, setPersonaOpen] = useState(false);

  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [closenessOpen, setClosenessOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  // Past the avatar and name, the bar shows the name (iOS scroll edge).
  const { scrolled, onScroll } = useScrolledPast(150);

  if (!character) {
    return (
      <Screen background={colors.bgPlain}>
        <Header title={t('errors.notFound')} />
      </Screen>
    );
  }

  const name = displayName(character, relationship);

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
          () => conversation && clearChat(conversation.id),
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
      case 'block':
        return confirm(
          t('safety.blockTitle', { name: shortName(name) }),
          t('safety.blockBody'),
          t('safety.block'),
          () => {
            blockCharacter(character.id);
            if (router.canDismiss()) router.dismissAll();
            router.replace('/(tabs)/chat');
          },
          t('common.cancel'),
        );
    }
  };

  const own = !character.isOfficial;
  const quick: { key: ActionKey; icon: IoniconName; label: string; badge?: number }[] = [
    { key: 'voiceCall', icon: 'call', label: t('characterSettings.quickCall') },
    { key: 'searchHistory', icon: 'search', label: t('characterSettings.quickSearch') },
    { key: 'characterMemories', icon: 'bookmark', label: t('characterSettings.characterMemories'), badge: memoryCount },
    { key: 'changeBackground', icon: 'image', label: t('characterSettings.quickBackground') },
  ];
  const danger: { key: ActionKey; label: string }[] = [
    { key: 'clearChat', label: t('characterSettings.clearChat') },
    { key: 'reset', label: t('characterSettings.reset') },
    { key: 'block', label: t('characterSettings.blockName', { name: shortName(name) }) },
  ];

  return (
    // iOS contact card (approved prototype `Info.dc.html`): grouped white cards on the grey ground.
    <Screen background={colors.bg}>
      <GlassBar
        title={name}
        scrolled={scrolled}
        right={
          // Only the user's own characters can be edited; seed ones get a nickname below.
          own ? (
            <GlassButton label={t('common.edit')} accessibilityLabel={t('characterSettings.editCharacter')} onPress={() => run('editCharacter')} />
          ) : null
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <View style={styles.identity}>
          <CharacterAvatar character={character} size={112} />
          <Txt style={styles.name} lines={1} accessibilityRole="header">
            {name}
          </Txt>
          <View style={styles.caption}>
            <Txt style={styles.captionText}>{t('chat.aiCharacter')}</Txt>
            {relationship ? (
              <>
                <View style={styles.captionDot} />
                <Txt style={styles.captionText}>
                  {t('characterSettings.since', { date: planDate(Date.parse(relationship.anniversary)) })}
                </Txt>
              </>
            ) : null}
          </View>
        </View>

        <View style={styles.quick}>
          {quick.map((q) => (
            <PressableScale
              key={q.key}
              scaleTo={0.95}
              onPress={() => run(q.key)}
              accessibilityRole="button"
              accessibilityLabel={q.badge ? `${q.label}, ${q.badge}` : q.label}
              style={styles.quickTile}>
              <Ionicons name={q.icon} size={22} color={colors.primary} />
              <Txt style={styles.quickLabel} color={colors.primary} lines={1}>
                {q.label}
              </Txt>
              {q.badge ? (
                <View style={styles.badge}>
                  <Txt style={styles.badgeText}>{q.badge > 99 ? '99+' : q.badge}</Txt>
                </View>
              ) : null}
            </PressableScale>
          ))}
        </View>

        {relationship ? (
          <RelationshipCard
            level={relationship.level}
            intimacy={relationship.intimacy}
            title={relationship.levelTitle}
            label={relationship.label}
            onPick={() => setLabelOpen(true)}
            onInfo={() => setClosenessOpen(true)}
          />
        ) : null}

        {/* The former "Chat settings" sheet, inline as on iOS. */}
        <View style={styles.card}>
          <SwitchRow
            label={t('characterSettings.voiceReplies')}
            value={relationship?.voiceReplies ?? true}
            disabled={!character.voiceReady}
            onChange={(v) => setCharacterPref(character.id, 'voiceReplies', v)}
          />
          <SwitchRow
            label={t('characterSettings.messagesFirst')}
            value={relationship?.messagesFirst ?? true}
            onChange={(v) => setCharacterPref(character.id, 'messagesFirst', v)}
          />
          <SwitchRow
            label={t('characterSettings.chatAnimation')}
            value={chatAnimation}
            onChange={(v) => setSetting('chatAnimation', v)}
            last
          />
        </View>
        {/* Without Pro (or the trial) voice replies do not play; the footer says so, iOS style. */}
        {!hasPlan && character.voiceReady ? (
          <Txt style={styles.footer}>{t('characterSettings.voiceRepliesPlanHint')}</Txt>
        ) : null}

        <View style={styles.card}>
          {conversation ? (
            <LinkRow
              label={t('personas.youAre')}
              meta={personaFor(conversation.id, { user, personas, defaultPersonaId, chatPersonas }).name}
              onPress={() => setPersonaOpen(true)}
            />
          ) : null}
          <LinkRow label={t('characterSettings.profile')} onPress={() => run('characterSettings')} />
          <LinkRow
            label={t('characterSettings.nicknameRow')}
            meta={relationship?.nickname || t('characterSettings.none')}
            onPress={() => {
              setDraftName(relationship?.nickname ?? '');
              setRenaming(true);
            }}
            last
          />
        </View>

        <View style={styles.card}>
          {danger.map((d, i) => (
            <Pressable
              key={d.key}
              onPress={() => run(d.key)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, i < danger.length - 1 && styles.rowLine, pressed && styles.rowPressed]}>
              <Txt style={styles.rowText} color={colors.danger}>
                {d.label}
              </Txt>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Sheet visible={renaming} onClose={() => setRenaming(false)} title={t('characterSettings.nickname')}>
        <TextInput
          value={draftName}
          onChangeText={setDraftName}
          placeholder={character.name}
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
          {TIERS.flatMap((tier) =>
            tier.labels.map((label) => {
              const open = unlockedLabels(relationship?.level ?? 0).includes(label);
              return (
                <LabelRow
                  key={label}
                  title={label}
                  meta={open ? tier.title : t('closeness.lockedAt', { level: tier.from })}
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

/** A row with the platform's own switch: UISwitch on iOS, Material on Android. */
function SwitchRow({
  label,
  value,
  disabled,
  last,
  onChange,
}: {
  label: string;
  value: boolean;
  disabled?: boolean;
  last?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={[styles.row, !last && styles.rowLine, disabled && styles.disabled]}>
      <Txt style={[styles.rowText, styles.flex]}>{label}</Txt>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={(v) => {
          haptic.toggle(v);
          onChange(v);
        }}
        accessibilityLabel={label}
        trackColor={{ true: colors.success }}
        ios_backgroundColor={colors.surfaceAlt}
      />
    </View>
  );
}

function LinkRow({ label, meta, last, onPress }: { label: string; meta?: string; last?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={meta ? `${label}, ${meta}` : label}
      style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && styles.rowPressed]}>
      <Txt style={[styles.rowText, styles.flex]}>{label}</Txt>
      {meta ? <Txt style={[styles.rowText, styles.meta]}>{meta}</Txt> : null}
      <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />
    </Pressable>
  );
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
    <View style={styles.bond}>
      <View style={styles.bondHead}>
        <View style={styles.bondHeart}>
          <Ionicons name="heart" size={16} color={colors.bond} />
        </View>
        <View style={styles.flex}>
          <Txt style={styles.bondTitle}>{title}</Txt>
          <Txt style={styles.bondLine}>
            {t('closeness.level', { level })}
            {' · '}
            {maxed
              ? t('closeness.max')
              : t('closeness.toNext', { count: Math.max(0, nextLevelAt - intimacy), level: level + 1 })}
          </Txt>
        </View>
        <IconButton icon="information-circle-outline" size={22} color={colors.textSecondary} accessibilityLabel={t('closeness.title')} onPress={onInfo} />
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(Math.min(1, progress) * 100)}%` }]} />
      </View>
      <View style={styles.bondRow}>
        <LinkRow label={t('closeness.relationship')} meta={label ?? t('closeness.pickShort')} onPress={onPick} last />
      </View>
    </View>
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
  identity: { alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.xs },
  name: { marginTop: space.md, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0.3 },
  caption: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  captionText: { fontSize: 15, color: colors.textSecondary },
  captionDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textSecondary },
  quick: { flexDirection: 'row', gap: space.sm, marginTop: 22, paddingHorizontal: space.lg },
  quickTile: {
    flex: 1,
    height: 62,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  quickLabel: { fontSize: 12, fontWeight: '500', letterSpacing: -0.1 },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  // iOS inset grouped list: white cards 16pt in, rows 44pt+, hairlines between rows.
  card: { marginTop: 22, marginHorizontal: space.lg, borderRadius: 14, backgroundColor: colors.surface, overflow: 'hidden' },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.lg },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  // No colour here: Txt's `color` prop (red rows) must win, and ink is its default.
  rowText: { fontSize: 17, letterSpacing: -0.4 },
  meta: { color: colors.textSecondary },
  footer: { marginTop: space.sm, marginHorizontal: space.lg + space.lg, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  bond: { marginTop: 22, marginHorizontal: space.lg, paddingTop: 14, borderRadius: 14, backgroundColor: colors.surface, overflow: 'hidden' },
  bondHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg, paddingRight: space.xs },
  bondHeart: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.bondSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bondTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.4 },
  bondLine: { fontSize: 13, color: colors.textSecondary },
  track: {
    height: 6,
    marginLeft: space.lg + 30 + space.md,
    marginRight: space.lg,
    marginTop: space.md,
    marginBottom: 14,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.bond },
  bondRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong },
  labelScroll: { maxHeight: 460 },
  labelHint: { marginBottom: space.sm },
  locked: { opacity: 0.5 },
  flex: { flex: 1 },
  input: {
    height: 48,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    ...type.body,
  },
  hint: { marginTop: space.sm, marginBottom: space.lg },
  disabled: { opacity: 0.45 },
});

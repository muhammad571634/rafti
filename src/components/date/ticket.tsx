import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { SFIcon, Txt } from '@/components/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

/**
 * A date drawn as an Apple Wallet event ticket (owner's pick, canvas "DateWallet", 2026-10-21):
 * a colour, a white glyph and the place's name. `ink` is the colour's dark end, for buttons
 * and rings that belong to the ticket.
 */
export interface TicketLook {
  colors: readonly [string, string];
  ink: string;
  icon: IoniconName;
  sf: SFSymbol;
}

const LOOK = (from: string, to: string, ink: string, icon: IoniconName, sf: SFSymbol): TicketLook => ({
  colors: [from, to],
  ink,
  icon,
  sf,
});

/** The five places on the date map. */
const PLACE_LOOKS: Record<string, TicketLook> = {
  ds_rain: LOOK('#5B8DEF', '#2F5DB8', '#2F5DB8', 'umbrella-outline', 'umbrella'),
  ds_aquarium: LOOK('#22B3D6', '#0B7896', '#0B7896', 'fish-outline', 'fish'),
  ds_festival: LOOK('#FFA24C', '#EE5A36', '#D9502F', 'sparkles-outline', 'sparkles'),
  ds_studio: LOOK('#9B6BFF', '#5B3BC4', '#5B3BC4', 'headset-outline', 'headphones'),
  ds_rooftop: LOOK('#2E3A73', '#11163A', '#11163A', 'moon-outline', 'moon.stars'),
};

/** The six pictures a user's own date can wear (`THEME_ARTS` ids). */
const ART_LOOKS: Record<string, TicketLook> = {
  sun: LOOK('#FFC94D', '#F59E0B', '#B86A00', 'sunny-outline', 'sun.max'),
  date: LOOK('#E8875B', '#B5543A', '#B5543A', 'cafe-outline', 'cup.and.saucer'),
  plane: LOOK('#4FA3F7', '#2364C9', '#2364C9', 'airplane-outline', 'airplane'),
  house: LOOK('#5BC489', '#2E8B57', '#2E8B57', 'home-outline', 'house'),
  music: LOOK('#B26BFF', '#6A3BC4', '#6A3BC4', 'musical-notes-outline', 'music.note'),
  nightSky: LOOK('#2E3A73', '#11163A', '#11163A', 'moon-outline', 'moon.stars'),
};

export const placeLook = (placeId: string): TicketLook => PLACE_LOOKS[placeId] ?? PLACE_LOOKS.ds_rain;
export const artLook = (art: string): TicketLook => ART_LOOKS[art] ?? ART_LOOKS.date;

/** A round gradient badge with the ticket's glyph (the place chip on a date, the look picker). */
export function TicketBadge({ look, size }: { look: TicketLook; size: number }) {
  return (
    <LinearGradient colors={look.colors} start={START} end={END} style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      <SFIcon ios={look.sf} icon={look.icon} size={Math.round(size * 0.5)} color="#FFFFFF" />
    </LinearGradient>
  );
}

/** The full ticket: header (glyph, name, one header field), kind label, title, fields, footer. */
export function DateTicket({
  look,
  name,
  headLabel,
  headValue,
  kind,
  title,
  fields,
  footer,
  locked,
}: {
  look: TicketLook;
  name: string;
  headLabel: string;
  headValue: string;
  kind: string;
  title: string;
  fields: { label: string; value: string }[];
  footer?: React.ReactNode;
  /** Not open yet: the colour is muted and the header value gets a lock. */
  locked?: boolean;
}) {
  return (
    <LinearGradient colors={look.colors} start={START} end={END} style={styles.ticket}>
      {locked ? <View style={styles.mute} pointerEvents="none" /> : null}
      <View style={styles.art} pointerEvents="none">
        <Ionicons name={look.icon} size={190} color="#FFFFFF" />
      </View>
      <View style={styles.head}>
        <SFIcon ios={look.sf} icon={look.icon} size={24} color="#FFFFFF" />
        <Txt style={styles.name} lines={1}>
          {name}
        </Txt>
        <View style={styles.headField}>
          <Txt style={styles.label}>{headLabel}</Txt>
          <View style={styles.headValueRow}>
            {locked ? <Ionicons name="lock-closed" size={13} color="#FFFFFF" /> : null}
            <Txt style={styles.headValue}>{headValue}</Txt>
          </View>
        </View>
      </View>
      <View style={styles.body}>
        <Txt style={styles.kind}>{kind}</Txt>
        <Txt style={styles.title} lines={1}>
          {title}
        </Txt>
        <View style={styles.fields}>
          {fields.map((f) => (
            <View key={f.label} style={styles.field}>
              <Txt style={styles.label}>{f.label}</Txt>
              <Txt style={styles.value}>{f.value}</Txt>
            </View>
          ))}
        </View>
      </View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </LinearGradient>
  );
}

// 160° in CSS: from the top-left third to the bottom-right third.
const START = { x: 0.33, y: 0 };
const END = { x: 0.67, y: 1 };

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
  ticket: { height: 236, borderRadius: 16, overflow: 'hidden' },
  art: { position: 'absolute', right: -34, top: 40, opacity: 0.16 },
  head: { height: 62, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { flex: 1, fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.3, color: '#FFFFFF' },
  headField: { alignItems: 'flex-end', gap: 1 },
  label: { fontSize: 11, lineHeight: 13, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' },
  // A grey wash in place of CSS saturate(): the ticket reads as not yet open.
  mute: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(110,110,118,0.55)' },
  headValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headValue: { fontSize: 17, lineHeight: 22, fontWeight: '700', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  body: { paddingHorizontal: 16, paddingTop: 4 },
  kind: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' },
  title: { marginTop: 2, fontSize: 26, lineHeight: 31, fontWeight: '700', letterSpacing: 0.2, color: '#FFFFFF' },
  fields: { marginTop: 14, flexDirection: 'row', gap: 26 },
  field: { gap: 1 },
  value: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: '#FFFFFF' },
  footer: { position: 'absolute', left: 16, right: 16, bottom: 14 },
});

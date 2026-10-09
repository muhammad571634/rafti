import { MoonStarsIcon } from 'phosphor-react-native/src/icons/MoonStars';
import { PaperclipIcon } from 'phosphor-react-native/src/icons/Paperclip';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { StarIcon } from 'phosphor-react-native/src/icons/Star';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, Pattern, Rect } from 'react-native-svg';

import type { BoardStyleId } from '@/types';

/**
 * Board note papers, drawn in code (no bitmap art): each one is a shape, a fill and
 * one small ornament. `ink` is the text colour that reads on that paper.
 */
export const BOARD_STYLES: { id: BoardStyleId; ink: string; muted: string }[] = [
  { id: 'cloud', ink: '#3E3570', muted: '#8F86C4' },
  { id: 'gingham', ink: '#6E2D3B', muted: '#C98A97' },
  { id: 'stripes', ink: '#28406B', muted: '#7F95BD' },
  { id: 'heart', ink: '#6E2D3B', muted: '#C98A97' },
  { id: 'kraft', ink: '#5A4127', muted: '#A88B67' },
  { id: 'notebook', ink: '#5A4512', muted: '#B39A55' },
  { id: 'pinned', ink: '#5A3442', muted: '#C08A9C' },
];

export const boardStyle = (id: BoardStyleId) => BOARD_STYLES.find((s) => s.id === id) ?? BOARD_STYLES[0];

/** Where the writing sits inside each paper, as fractions of the card. */
const CONTENT: Record<BoardStyleId, { top: number; side: number; bottom: number }> = {
  cloud: { top: 0.09, side: 0.1, bottom: 0.08 },
  gingham: { top: 0.13, side: 0.13, bottom: 0.11 },
  stripes: { top: 0.13, side: 0.1, bottom: 0.08 },
  heart: { top: 0.2, side: 0.2, bottom: 0.34 },
  kraft: { top: 0.13, side: 0.11, bottom: 0.1 },
  notebook: { top: 0.1, side: 0.14, bottom: 0.08 },
  pinned: { top: 0.11, side: 0.11, bottom: 0.1 },
};

export function contentInsets(id: BoardStyleId, width: number, height: number): ViewStyle {
  const c = CONTENT[id];
  return { paddingTop: height * c.top, paddingBottom: height * c.bottom, paddingHorizontal: width * c.side };
}

/** A rounded rectangle whose edges ripple, for the cloud and stripes papers. */
function wavyRect(x: number, y: number, w: number, h: number, amp: number, step: number) {
  const edge = (x1: number, y1: number, x2: number, y2: number) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(2, Math.round(len / step));
    const nx = -(y2 - y1) / len;
    const ny = (x2 - x1) / len;
    let d = '';
    for (let i = 1; i <= n; i += 1) {
      const t0 = (i - 0.5) / n;
      const t1 = i / n;
      const sign = i % 2 ? 1 : -1;
      const cx = x1 + (x2 - x1) * t0 + nx * amp * sign;
      const cy = y1 + (y2 - y1) * t0 + ny * amp * sign;
      d += ` Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${(x1 + (x2 - x1) * t1).toFixed(1)} ${(y1 + (y2 - y1) * t1).toFixed(1)}`;
    }
    return d;
  };
  return (
    `M ${x} ${y}` + edge(x, y, x + w, y) + edge(x + w, y, x + w, y + h) + edge(x + w, y + h, x, y + h) + edge(x, y + h, x, y) + ' Z'
  );
}

function heartPath(w: number, h: number) {
  const p = (x: number, y: number) => `${(x * w).toFixed(1)} ${(y * h).toFixed(1)}`;
  return [
    `M ${p(0.5, 0.95)}`,
    `C ${p(0.2, 0.76)} ${p(0.02, 0.56)} ${p(0.02, 0.33)}`,
    `C ${p(0.02, 0.13)} ${p(0.16, 0.04)} ${p(0.29, 0.04)}`,
    `C ${p(0.39, 0.04)} ${p(0.46, 0.1)} ${p(0.5, 0.18)}`,
    `C ${p(0.54, 0.1)} ${p(0.61, 0.04)} ${p(0.71, 0.04)}`,
    `C ${p(0.84, 0.04)} ${p(0.98, 0.13)} ${p(0.98, 0.33)}`,
    `C ${p(0.98, 0.56)} ${p(0.8, 0.76)} ${p(0.5, 0.95)} Z`,
  ].join(' ');
}

/** The paper itself; children are laid over it inside the style's writing area. */
export function Stationery({
  id,
  width,
  height,
  children,
}: {
  id: BoardStyleId;
  width: number;
  height: number;
  children?: React.ReactNode;
}) {
  const w = width;
  const h = height;
  const icon = Math.max(14, Math.round(w * 0.08));

  return (
    <View style={{ width: w, height: h }}>
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        {id === 'cloud' ? (
          <Path d={wavyRect(6, 6, w - 12, h - 12, 4, 18)} fill="#EEEBFF" stroke="#A99BE6" strokeWidth={1.5} />
        ) : null}

        {id === 'gingham' ? (
          <>
            <Defs>
              <Pattern id="gingham" width={14} height={14} patternUnits="userSpaceOnUse">
                <Rect width={14} height={14} fill="#FFF3F5" />
                <Rect width={7} height={14} fill="#FBD3DC" opacity={0.6} />
                <Rect width={14} height={7} fill="#FBD3DC" opacity={0.6} />
              </Pattern>
            </Defs>
            <Rect x={2} y={2} width={w - 4} height={h - 4} rx={w * 0.07} fill="url(#gingham)" />
            <Rect x={w * 0.08} y={h * 0.08} width={w * 0.84} height={h * 0.84} rx={w * 0.05} fill="#FFFAFB" />
          </>
        ) : null}

        {id === 'stripes' ? (
          <>
            <Defs>
              <Pattern id="stripes" width={22} height={10} patternUnits="userSpaceOnUse">
                <Rect width={22} height={10} fill="#F4F8FF" />
                <Rect width={11} height={10} fill="#DCE7FB" />
              </Pattern>
            </Defs>
            <Path d={wavyRect(6, 10, w - 12, h - 16, 3, 26)} fill="url(#stripes)" stroke="#FFFFFF" strokeWidth={5} />
          </>
        ) : null}

        {id === 'heart' ? (
          <>
            <Path d={heartPath(w, h)} fill="#F7B9C5" />
            <G transform={`translate(${w * 0.05} ${h * 0.05}) scale(0.9)`}>
              <Path d={heartPath(w, h)} fill="#FFF1EE" stroke="#F3A3B3" strokeWidth={2} strokeDasharray="2 5" />
            </G>
          </>
        ) : null}

        {id === 'kraft' ? (
          <>
            <G transform={`rotate(-2.5 ${w / 2} ${h / 2})`}>
              <Rect x={w * 0.04} y={h * 0.05} width={w * 0.92} height={h * 0.9} rx={3} fill="#E9E0FA" />
            </G>
            <G transform={`rotate(1.5 ${w / 2} ${h / 2})`}>
              <Rect x={w * 0.05} y={h * 0.05} width={w * 0.9} height={h * 0.9} rx={3} fill="#F5E4C8" />
              <Path
                d={`M ${w * 0.2} ${h * 0.3} q ${w * 0.15} ${h * 0.05} ${w * 0.32} -${h * 0.02} M ${w * 0.55} ${h * 0.7} q ${w * 0.1} -${h * 0.06} ${w * 0.25} 0`}
                stroke="#FFFFFF"
                strokeOpacity={0.5}
                strokeWidth={1}
                fill="none"
              />
            </G>
          </>
        ) : null}

        {id === 'notebook' ? (
          <>
            <Rect x={2} y={2} width={w - 4} height={h - 4} rx={w * 0.07} fill="#FFEFB8" />
            {Array.from({ length: Math.floor((h * 0.82) / 26) }, (_, i) => (
              <Line key={i} x1={2} x2={w - 2} y1={h * 0.16 + i * 26} y2={h * 0.16 + i * 26} stroke="#F2D98A" strokeWidth={1} />
            ))}
            <Line x1={w * 0.11} x2={w * 0.11} y1={2} y2={h - 2} stroke="#F2C36B" strokeWidth={1} />
            {Array.from({ length: Math.floor((h * 0.8) / 32) }, (_, i) => (
              <Circle key={i} cx={w * 0.055} cy={h * 0.12 + i * 32} r={4} fill="#FFF8DD" stroke="#EAD18A" />
            ))}
          </>
        ) : null}

        {id === 'pinned' ? (
          <>
            <G transform={`rotate(3 ${w / 2} ${h / 2})`}>
              <Rect x={w * 0.05} y={h * 0.05} width={w * 0.9} height={h * 0.88} rx={w * 0.05} fill="#FBD3DC" stroke="#E68AA0" />
            </G>
            <G transform={`rotate(-2 ${w / 2} ${h / 2})`}>
              <Rect x={w * 0.04} y={h * 0.06} width={w * 0.9} height={h * 0.88} rx={w * 0.05} fill="#FFFBEF" stroke="#E68AA0" />
              <Rect
                x={w * 0.08}
                y={h * 0.1}
                width={w * 0.82}
                height={h * 0.8}
                rx={w * 0.04}
                fill="none"
                stroke="#E68AA0"
                strokeDasharray="8 6"
              />
            </G>
          </>
        ) : null}
      </Svg>

      {/* One ornament per paper, drawn with the app's icon set. */}
      {id === 'cloud' ? (
        <>
          <StarIcon size={icon} weight="fill" color="#C9C0F2" style={[styles.abs, { left: 2, top: 2 }]} />
          <StarIcon size={icon * 1.4} weight="fill" color="#C9C0F2" style={[styles.abs, { left: 4, bottom: 0 }]} />
        </>
      ) : null}
      {id === 'gingham' ? (
        <HeartIcon size={icon * 1.4} weight="fill" color="#F6A9BA" style={[styles.abs, { right: 6, bottom: 4 }]} />
      ) : null}
      {id === 'stripes' ? (
        <MoonStarsIcon size={icon * 1.5} weight="duotone" color="#8DA4D6" style={[styles.abs, { alignSelf: 'center', top: -4, left: w / 2 - icon * 0.75 }]} />
      ) : null}
      {id === 'kraft' ? (
        <PaperclipIcon size={icon * 1.6} weight="bold" color="#B7B24A" style={[styles.abs, { left: w / 2 - icon * 0.8, top: -icon * 0.6 }]} />
      ) : null}
      {id === 'pinned' ? (
        <>
          <PaperclipIcon size={icon * 1.4} weight="bold" color="#5B9BE6" style={[styles.abs, { left: w * 0.42, top: -icon * 0.4 }]} />
          <PaperclipIcon size={icon * 1.4} weight="bold" color="#5B9BE6" style={[styles.abs, { left: w * 0.48, bottom: -icon * 0.3 }]} />
        </>
      ) : null}

      <View style={[StyleSheet.absoluteFill, contentInsets(id, w, h)]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
});

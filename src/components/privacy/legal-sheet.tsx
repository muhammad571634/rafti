import { Linking, StyleSheet, View } from 'react-native';

import { InkText } from '@/components/ink';
import { PressableScale, Sheet } from '@/components/ui';
import { SUPPORT_EMAIL } from '@/ai/safety';
import { hostedLegalUrl, LEGAL_DOCS, type LegalDocKind } from '@/lib/legal-docs';
import { ink, inkRadius } from '@/theme/ink';

/**
 * Opens the hosted legal page once `LEGAL_URLS` is configured (`sigmazam.app`), or falls back
 * cleanly to the in-app `LegalSheet` so Profile, Plans and Onboarding legal links always work.
 */
export function openLegalDocument(kind: LegalDocKind, onOpenSheet: (doc: LegalDocKind) => void) {
  const url = hostedLegalUrl(kind);
  if (url) {
    void Linking.openURL(url);
    return;
  }
  onOpenSheet(kind);
}

/**
 * Scrollable Ink Night+ legal sheet for Privacy Policy and Terms of Use (App Store 5.1.1 / 3.1.2).
 * Uses Ink theme tokens exclusively (zero literal colours) and scales cleanly with Dynamic Type.
 */
export function LegalSheet({ kind, onClose }: { kind: LegalDocKind | null; onClose: () => void }) {
  const doc = kind ? LEGAL_DOCS[kind] : null;
  return (
    <Sheet visible={!!doc} onClose={onClose} title={doc?.title ?? ''} scroll>
      {doc ? (
        <View style={styles.body}>
          <InkText variant="footnote" color={ink.text3}>
            {doc.updated}
          </InkText>
          <InkText variant="sub" color={ink.text2}>
            {doc.intro}
          </InkText>
          {doc.sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <InkText variant="bodyStrong" color={ink.text} accessibilityRole="header">
                {section.heading}
              </InkText>
              {section.paragraphs.map((paragraph, index) => (
                <InkText key={index} variant="sub" color={ink.text2}>
                  {paragraph}
                </InkText>
              ))}
            </View>
          ))}
          <PressableScale
            scaleTo={0.97}
            accessibilityRole="link"
            accessibilityLabel={SUPPORT_EMAIL}
            onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            style={styles.contactPill}>
            <InkText variant="subStrong" color={ink.accent}>
              {SUPPORT_EMAIL}
            </InkText>
          </PressableScale>
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 14, paddingBottom: 12 },
  section: { gap: 6, paddingTop: 4 },
  contactPill: {
    marginTop: 6,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: inkRadius.row,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

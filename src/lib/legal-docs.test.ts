import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SUPPORT_EMAIL } from '../ai/safety';

import { hostedLegalUrl, LEGAL_DOCS, type LegalDocKind } from './legal-docs';

describe('in-app legal documents (Privacy Policy & Terms of Use)', () => {
  const kinds: LegalDocKind[] = ['privacy', 'terms'];

  it('provides structured sections with no unfinished [bracket] placeholders', () => {
    for (const kind of kinds) {
      const doc = LEGAL_DOCS[kind];
      assert.ok(doc.title.length > 0);
      assert.ok(doc.intro.includes(SUPPORT_EMAIL), `${kind} intro should reference SUPPORT_EMAIL`);
      assert.ok(doc.sections.length >= 5, `${kind} should have complete legal sections`);
      const allText = [doc.title, doc.updated, doc.intro, ...doc.sections.flatMap((s) => [s.heading, ...s.paragraphs])].join('\n');
      assert.equal(/\[(?:legal name|address|email|country|date|lawyer)/i.test(allText), false, `${kind} leaked draft brackets`);
    }
  });

  it('returns null from hostedLegalUrl until LEGAL_URLS is configured', () => {
    assert.equal(hostedLegalUrl('privacy'), null);
    assert.equal(hostedLegalUrl('terms'), null);
  });
});

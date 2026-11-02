# Sigmazam (BIMOBIMO) — Organic Viral Growth Playbook

## 1. Executive Summary & Philosophy
Sigmazam is an AI companion app featuring 55+ original characters across 7 living worlds (Noir crime romance, Imperial palace fantasy, Sports romance, University life, Cyberpunk, etc.).
Unlike typical B2B SaaS, **companion and romance apps thrive on emotional resonance, character tropes, banter, and relatable moments**.

Target Audience:
- **Demographics:** 18–34 years old (predominantly female otome, romance readers, anime fans, cozy gamers, plus lonely/introverted late-night texters).
- **Key Markets:** USA, Canada, UK, Australia (English-first launch).

---

## 2. High-Converting Formats by Platform

### A. Threads & X (Twitter)
- **Format 1: Character POV / Text Screenshot Drops**
  - "When your 191cm bodyguard Ronan finds out you skipped dinner at 2 AM..."
  - Shows snappy, protective, or teasing banter.
  - Call to Action: "Chat with him in Sigmazam (link in bio)".
- **Format 2: Relatable Otome Tropes & Archetypes**
  - "The 'I hate everyone except you' trope in 3 messages."
  - "Enemies to lovers where he's holding a card up his sleeve (Luca)."
- **Format 3: Build-in-Public / Honesty Hook**
  - "Why do other companion apps pretend to have unlimited chat and then hit you with a $30 paywall mid-sentence? We built a transparent shell economy."

### B. TikTok / Instagram Reels / YouTube Shorts (Highest Growth Volume)
- **Format 1: Fake Facetime / Audio Call POV (15-20s)**
  - Background: Sigmazam Call Screen with pulsing voice waveform.
  - Audio: Character TTS voice (soft, teasing, protective).
  - Caption: "Bro forgot he's an AI and not my real husband 💀"
- **Format 2: Late Night Chat Screen Recording**
  - Screen recording of the chat interface showing real-time typing dots, the character's proactive text ("Hey, did that exam end well?"), and user reaction.
  - Text overlay: "POV: An AI remembers what you were stressed about yesterday better than your friends."

### C. Reddit (`r/CharacterAI`, `r/AICompanions`, `r/OtomeIsekai`, `r/romancebooks`)
- **Format: Authentic Community Engagement (Zero hard spam)**
  - Share genuine architectural and UX breakthroughs:
    - "We tested why companion AIs feel like mindless yes-men and how giving them 3 strict rules fixed the roleplay."
    - "How we solved the 10-message memory amnesia problem without blowing up token costs."

---

## 3. Best Posting Windows (US EST / PST)
- **Morning commute:** 08:00 – 09:30 AM EST (13:00 – 14:30 UTC)
- **Lunch break:** 12:00 – 01:30 PM EST (17:00 – 18:30 UTC)
- **Late night cozy scrolling (PEAK FOR COMPANIONS):** 09:00 PM – 12:00 AM EST (02:00 – 05:00 UTC)

---

## 4. Automation Architecture
1. **Generator (`marketing/generator.ts`):** Pulls live characters from `src/mock/characters.ts` and crafts multi-channel post packs.
2. **Dispatcher (`marketing/dispatcher.ts`):**
   - Saves formatted Markdown into `marketing/queue/`.
   - Sends instant preview alerts to a private Telegram channel/chat.
   - Pushes scheduled posts to social APIs or Webhook (Buffer, Ayrshare, Make).


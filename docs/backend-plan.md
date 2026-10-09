# Rafti backend rejasi (taklif, 2026-10-06)

Holat: **taklif — foydalanuvchi tasdig'ini kutmoqda.** Kod hali yozilmagan.
Oxiridagi "Qaror kerak" bo'limidagi savollarga javobdan keyin B0 boshlanadi.

2026-10-09: **12-bo'lim qo'shildi**: Codex kontekst paketidan olingan 6 ta yangi g'oya, hozirgi holatga
(40 personaj, Closeness v2) moslangan, va 6 ta qo'shimcha taklif. 4- va 11-bo'limlar shunga moslab yangilandi.

## 1. Tamoyillar

1. **Server — haqiqat manbai.** Chig'anoq, a'zolik, streak, intimacy, level va g'ildirak serverda
   hisoblanadi. Ilova faqat ko'rsatadi. Aks holda chig'anoqni ilovada "chizib" olish mumkin.
2. **Bitta til — TypeScript.** Ilova ham, server ham TS. `src/types` umumiy bo'ladi.
3. **Kam ops.** Yakka dasturchi uchun: boshqariladigan Postgres, auth va fayl ombori bitta joyda.
   Biznes mantiq esa o'zimizning serverda, provayderga bog'lanib qolmaymiz.
4. **Har provayder adapter orqasida.** LLM, TTS, STT va ovoz klonlash `interface` orqali ulanadi.
   Narx yoki sifat o'zgarsa, bitta faylni almashtiramiz.
5. **Har xarajat yoziladi.** Har bir LLM/TTS chaqiruvi `usage_events` jadvaliga tushadi:
   kim, qaysi model, nechta token, necha sent. Iqtisodni taxmin bilan emas, raqam bilan sozlaymiz.

## 2. Umumiy sxema

```
 Expo ilova (iOS / Android)
   │  HTTPS (JSON)            ▲ Realtime (yangi xabar, "yozyapti")   ▲ Push (ilova yopiq bo'lsa)
   ▼                          │                                      │
 rafti-api  (Node + Hono, TS) ─────────── Supabase ─────────────── Expo Push Service
   │   ├─ chat, iqtisod, profil endpointlari   ├─ Postgres + pgvector
   │   ├─ RevenueCat / AdMob webhooklari       ├─ Auth (anonim → Apple / Google)
   │   └─ worker: navbatdagi ishlar (pg-boss)  ├─ Storage (ovoz, rasm, avatar)
   │                                           └─ Realtime
   ├─► LLM (Claude API) — javob, reja, xotira, diary, secret note
   ├─► TTS / STT provayderi — ovozli javob, ovozli xabarni matnga aylantirish
   └─► LiveKit (keyingi bosqich) — jonli qo'ng'iroq: STT → LLM → TTS
```

**Asosiy g'oya: xabar har doim bir xil yo'l bilan keladi.** Ilova xabarni `POST` qiladi,
server uni yozadi va javobni fon ishida tayyorlaydi. Tayyor javob `messages` jadvaliga tushadi,
ilova uni Supabase Realtime orqali oladi. Salomlashish, eslatma, diary javobi va secret note ham
xuddi shu yo'l bilan keladi. Ilova yopiq bo'lsa, push bildirishnoma ketadi.
Shunda hozirgi `setTimeout` mantiqlari (`scheduleReply`, `answerDiary`, `sealNote`,
`runDailyInitiative`) bitta mexanizmga almashadi.

## 3. Komponentlar va tavsiya

| Qism | Tavsiya | Nega |
| --- | --- | --- |
| Server | Node 22 + **Hono**, bitta servis `rafti-api` + bitta worker jarayoni | Yengil, TS-first, Fly.io / Railway'ga bir buyruq bilan chiqadi |
| Hosting | **Fly.io** (yoki Railway) | Doimiy ishlaydigan jarayon kerak (worker, uzun LLM chaqiruvlari) — serverless emas |
| Ma'lumotlar bazasi | **Supabase Postgres** + `pgvector` | Auth, Storage va Realtime bitta joyda; bepul tarif bilan boshlanadi; Postgres istalgan joyga ko'chadi |
| Auth | Supabase Auth: **anonim kirish** → keyin Apple / Google bilan bog'lash | Foydalanuvchi ro'yxatdan o'tmasdan boshlaydi; App Store boshqa ijtimoiy kirish bo'lsa Apple kirishini talab qiladi |
| Fayllar | Supabase Storage (ovozli xabarlar, rasmlar, avatarlar) | Imzolangan URL, RLS |
| Navbat va jadval | **pg-boss** (Postgres ustida) | Alohida Redis kerak emas: kechiktirilgan ishlar, cron, qayta urinish |
| LLM | **Claude API** (`@anthropic-ai/sdk`), model — env sozlamasi | Prompt caching, structured output (reja va xotira ajratish), rasmni tushunish |
| TTS / STT / klon | Adapter; nomzodlar: ElevenLabs, Cartesia, MiniMax, Fish Audio | Narx va sifatni B4'da sinov bilan tanlaymiz |
| Qo'ng'iroq | **LiveKit Cloud** + LiveKit Agents (B5) | Navbat almashish (turn-taking), uzilish, past kechikish tayyor |
| To'lov | **RevenueCat** (`react-native-purchases`) + webhook | StoreKit 2 va Play Billing chek tekshiruvi tayyor, server faqat webhook oladi |
| Reklama | AdMob rewarded + **server-side verification** | Mukofotni ilova emas, Google'ning serverdan chaqiruvi beradi |
| Push | `expo-notifications` + Expo Push Service; VoIP — B5 | |
| Kuzatuv | Sentry (ilova + server), PostHog (analitika) | |

**Muhim: Expo Go bilan tugaydi.** RevenueCat, AdMob, LiveKit va VoIP push native modul talab qiladi.
B1'dan boshlab telefonda **EAS development build** bilan sinaymiz (bir marta o'rnatiladi,
keyin xuddi Expo Go kabi QR orqali yangilanadi). Kod yozishdan oldin
https://docs.expo.dev/versions/v57.0.0/ dagi tegishli sahifalar tekshiriladi (`AGENTS.md`).

## 4. Ma'lumotlar modeli (Postgres)

Hozirgi `src/types` deyarli to'g'ridan-to'g'ri jadvallarga aylanadi:

| Jadval | Asosiy ustunlar | Izoh |
| --- | --- | --- |
| `profiles` | `id` (= auth user), `display_name`, `handle`, `locale`, `birth_year`, `age_confirmed_at` | 18+ tekshiruvi shu yerda |
| `characters` | `id`, `owner_id` (null = rasmiy), `name`, `bio`, `persona jsonb` (12.3), `persona_version`, `voice_id`, `category`, `series`, `gender`, `visibility` | Rasmiy cast seed migratsiyasi bilan |
| `relationships` | `user_id`, `character_id`, `intimacy`, `level`, `label`, `streak_days`, `last_chat_day`, `nickname`, `voice_replies`, `messages_first`, `summary`, `recent_openers` (12.7) | `summary` — suhbatning qisqa xulosasi (xotira 2-qatlami) |
| `conversations` | `id`, `user_id`, `character_id`, `pinned`, `muted`, `last_message_at` | `unread_count` hisoblanadi |
| `messages` | `id`, `conversation_id`, `author`, `kind`, `text`, `transcript`, `media_path`, `duration_sec`, `created_at`, `read_at`, `client_id` | `client_id` — takroriy yuborishdan himoya |
| `memories` | `id`, `user_id`, `character_id`, `text`, `source`, `type`, `importance`, `confidence`, `status`, `superseded_by`, `pinned`, `embedding vector`, `created_at`, `last_confirmed_at`, `last_used_at` | Memories ekrani faqat `status = active` faktlarni ko'rsatadi (12.1, 12.2) |
| `memory_uses` | `message_id`, `memory_id` | Qaysi fakt qaysi javob promptiga tushgan (12.9) |
| `relationship_events` | `id`, `user_id`, `character_id`, `kind`, `params`, `created_at` | Faqat qo'shiladi. Us timeline va level shu oqimdan hisoblanadi (12.4) |
| `diary_entries`, `secret_notes`, `calls`, `moments`, `schedules` | hozirgi turlar bilan bir xil | |
| `wallets` | `user_id`, `shells`, `film`, `member_until`, `member_plan` | Faqat server yozadi |
| `shell_ledger` | `id`, `user_id`, `delta`, `reason`, `ref`, `idempotency_key`, `created_at` | Faqat qo'shiladi, o'chirilmaydi. Balans = yig'indi |
| `daily_state` | `user_id`, `check_in_day`, `last_login_day`, `ads_watched`, `spins_used`, ... | |
| `usage_events` | `user_id`, `kind` (llm/tts/stt/call), `mode` (12.5), `model`, `prompt_version`, `input_tokens`, `cached_tokens`, `output_tokens`, `seconds`, `cost_usd` | Xarajat hisobi; kunlik limit shundan hisoblanadi (12.10) |
| `reports` | `reporter_id`, `target` (character/message), `reason`, `status` | UGC shikoyat |

Hamma jadvalda **RLS**: foydalanuvchi faqat o'zinikini o'qiydi. Yozish (ayniqsa `wallets`,
`shell_ledger`, `relationships`) faqat server orqali.

## 5. API (birinchi versiya)

```
POST /v1/session/bootstrap          kirishdan keyin: profil, hamyon, kunlik mukofot, initiative
GET  /v1/conversations              ro'yxat (sahifalab)
GET  /v1/conversations/:id/messages?before=   tarix (sahifalab)
POST /v1/conversations/:id/messages {client_id, kind, text | media_path}
     → 202 {message, wallet}  | 402 {reason: "noShells"}
POST /v1/conversations/:id/read
POST /v1/characters/:id/friend      Add friend
POST /v1/characters                 yangi personaj (+ klon ishi)
POST /v1/diary, /v1/secret-notes/:id/exchange, /v1/dates, /v1/photos
POST /v1/gifts/spin, /v1/memories (CRUD)
POST /v1/uploads                    imzolangan yuklash URL'i
POST /webhooks/revenuecat, /webhooks/admob-ssv
```

Har pul sarflaydigan so'rov `idempotency_key` oladi: tarmoq uzilib qayta yuborilsa, ikki marta yechilmaydi.

## 6. Bitta xabarning yo'li (B1)

1. Ilova xabarni darhol ro'yxatga qo'yadi (`pending`) va `POST` qiladi.
2. Server tranzaksiyada: a'zolik yoki balansni tekshiradi, `shell_ledger`ga −1 yozadi, xabarni saqlaydi,
   streak va intimacy'ni yangilaydi, `reply` ishini navbatga qo'yadi. Javob: `202` + yangi hamyon.
3. Worker: "yozyapti" signalini Realtime broadcast orqali yuboradi, promptni yig'adi va Claude'ni chaqiradi.
   - **Prompt tartibi (cache uchun):** o'zgarmas qoidalar → personaj personasi → foydalanuvchi profili
     → xotira faktlari → suhbat xulosasi → oxirgi ~30 xabar. O'zgaruvchan qism (vaqt, bugungi sana)
     oxirida turadi, aks holda cache buziladi.
4. Javob `messages`ga yoziladi. Ovozli javob yoqilgan bo'lsa, TTS ishi navbatga qo'yiladi va audio
   tayyor bo'lganda `media_path` to'ldiriladi. Ilova Realtime orqali oladi, yopiq bo'lsa push ketadi.
5. Xatolik bo'lsa, chig'anoq qaytariladi (`shell_ledger` +1, `reason: refund`). Javob o'rtada kesilmaydi.

Ilova tomonda zustand store **kesh** bo'lib qoladi. Xabarlar `expo-sqlite`ga ko'chadi (hozir hammasi
bitta AsyncStorage kalitida, Android'da ~2MB chegarasi bor).

## 7. Xotira tizimi (Rafti'ning asosiy ustunligi)

BIMOBIMO sharhlaridagi 1-shikoyat — "unutadi". Uch qatlam:

1. **Qisqa muddat:** oxirgi ~30 xabar har promptda.
2. **Suhbat xulosasi:** `relationships.summary`. Suhbat 15 daqiqa jim qolganda worker uni yangilaydi.
3. **Faktlar:** o'sha ishda model structured output bilan yangi faktlarni ajratadi
   ("imtihoni 12-oktabrda", "mushugining ismi Pista"). Ular `memories`ga embedding bilan yoziladi.
   Har javobda eng mos 8–12 fakt (pgvector) va hamma `pinned` faktlar promptga qo'shiladi.

Foydalanuvchi Memories ekranida faktni ko'radi, pin qiladi va o'chiradi. O'chirilgan fakt promptga
boshqa tushmaydi. Bu ko'rinadigan va boshqariladigan xotira. Rejalarni ajratish (`detectPlan`) ham shu
structured output'ga o'tadi.

Fakt turi, muhimligi, hayot sikli, ishlatilish izi va "buni unut" — 12.1, 12.2, 12.9 va 12.12 da.

## 8. Iqtisod serverga ko'chadi

`src/store/use-app-store.ts` dagi qoidalar `server/src/economy/` ga o'tadi, raqamlar bir joyda:
xabar narxi, kunlik check-in zinapoyasi, reklama mukofoti va limiti, g'ildirak og'irliklari,
secret note va date narxlari. G'ildirak tasodifi serverda aylanadi, ilova faqat natijani animatsiya qiladi.

## 9. Xarajat hisobi — DIQQAT, iqtisodni qayta ko'rish kerak

Taxmin, bitta matnli javob: ~8K token cache'dan o'qiladi, ~0.5K yangi kiritish, ~150 token chiqish.
Narxlar Anthropic'ning birinchi tomon API narxlari (2026-09 holati):

| Model | Kiritish / chiqish, $ per 1M | ≈ 1 javob (cache ishlaganda) | Cache ishlamaganda (5 daqiqadan uzoq tanaffus) |
| --- | --- | --- | --- |
| Claude Opus 5.5 | 4 / 20 | ≈ $0.007 | ≈ $0.035 |
| Claude Sonnet 5.5 | 2 / 10 | ≈ $0.004 | ≈ $0.018 |
| Claude Haiku 4.5 | 1 / 5 | ≈ $0.002 | ≈ $0.009 |

Opus 5.5'da thinking doim yoqiq (`effort: low` bilan ham qo'shimcha chiqish tokeni bor), bu taxminga kirmagan.
Aniq raqamni B1'dan keyin `usage_events` ko'rsatadi. Model — bitta env sozlamasi, keyin almashtirish oson.

Daromad tomoni: 1 chig'anoq ≈ $0.0125 (560 chig'anoq $6.99), do'kon komissiyasidan keyin ≈ $0.009–0.011.
Demak **pullik xabar faqat arzon model bilan va cache ishlaganda foyda beradi.**

Hozirgi iqtisoddagi uch xavf:

1. **Bepul chig'anoq juda ko'p.** Kuniga check-in (~77) + 5 ta reklama (50) + g'ildirak ≈ 130+ bepul xabar.
   Faol bepul foydalanuvchi oyiga taxminan $8 (Haiku) dan $25+ (Opus) gacha LLM xarajati qiladi.
2. **"Unlimited chat" a'zoligi** ($9.99/oy, komissiyadan keyin ≈ $7): kuniga 200 xabar yozadigan
   a'zo oyiga $13 (Haiku) – $40+ (Opus) xarajat qiladi. Adolatli limit kerak (masalan, kuniga N xabardan keyin sekinroq model).
3. **"Ovozli javob va qo'ng'iroq bepul"** — TTS va jonli qo'ng'iroq eng qimmat qism.
   Daqiqa narxini B4/B5 da provayder sinovi bilan aniqlaymiz. Shundan keyin bepul daqiqalar limiti belgilanadi.

Bu raqamlar iqtisodni o'zgartirish uchun emas, **B1'dan keyin haqiqiy o'lchov bilan qaror qilish uchun.**
Arzonlashtirish yo'llari: prompt cache (1 soatlik TTL — faol suhbatlar uchun), xulosa va faktlar
bilan qisqa tarix, xotira ishlarini Batches API'da 50% arzon bajarish.

## 10. Xavfsizlik va do'kon talablari

- **18+ tekshiruvi:** birinchi ochilishda tug'ilgan yil. Romantik rejim faqat 18+ uchun.
- **AI ekanini oshkor qilish:** onboarding'da va personaj profilida "AI personaj" yozuvi.
- **Inqiroz yordami:** o'z joniga qasd yoki o'ziga zarar signallari aniqlansa, personaj rolidan chiqib
  yordam raqamlarini beradi (prompt qoidasi + alohida klassifikator).
- **Moderatsiya:** foydalanuvchi yaratgan personaj (ism, bio, rasm) e'lon qilinishidan oldin tekshiriladi.
  Shikoyat tugmasi va ko'rib chiqish navbati (`reports`).
- **Ovoz klonlash:** faqat o'z ovozi yoki ruxsat olingan ovoz; rozilik belgisi saqlanadi;
  real aktyor yoki ijrochi ovozi taqiqlanadi.
- **Hisobni o'chirish:** App Store ilova ichidan to'liq o'chirishni talab qiladi.
- **Maxfiylik:** repo ochiq (public). Kalitlar faqat hosting secret'larida, `.env` fayllar `.gitignore`da.
  Personaj promptlari ham ochiq bo'ladi. Buni xohlamasangiz, ular bazada saqlanadi.

## 11. Bosqichlar

Har bosqich: avval qisqa reja → tasdiq → kod → `tsc` + server testlari → telefonda sinov → commit.

| Bosqich | Nima qilinadi | Tayyor degani |
| --- | --- | --- |
| **B0 — poydevor** | `server/` papka (Hono, pg-boss), Supabase loyihasi, migratsiyalar, seed cast, anonim kirish, `bootstrap` endpointi, Fly.io'ga deploy, EAS development build | Telefondagi ilova serverdan profil va hamyonni oladi |
| **B1 — haqiqiy chat** | Xabar yo'li (6-bo'lim), Claude javoblari, Realtime, server iqtisodi + ledger, `usage_events`, `expo-sqlite`, mock provayder (12.6), rejim shablonlari (12.5), xabarlarni yig'ish (12.8), takrorlanish himoyasi (12.7), sifat to'plami (12.11) | Personaj haqiqatan javob beradi, balans serverda, xarajat jadvalda ko'rinadi |
| **B2 — xotira va tashabbus** | Xulosa + faktlar + pgvector, xotira turi va hayot sikli (12.1, 12.2), `memory_uses`, `relationship_events` (12.4), rejalar, diary va secret note LLM'da, salomlashish va eslatmalar workerda, push | Ertasi kuni personaj kechagi gapni eslaydi; ilova yopiq bo'lsa ham salomlashish keladi |
| **B3 — to'lov** | RevenueCat (paketlar + a'zolik), AdMob SSV, iqtisod sozlamasi (9-bo'lim raqamlari asosida) | Sandbox xaridi chig'anoq qo'shadi, qayta yuborilgan webhook ikki marta qo'shmaydi |
| **B4 — ovoz** | `expo-audio` yozish va ijro, STT, TTS ovozli javoblar, provayder tanlovi | Ovozli xabar matnga aylanadi, personaj o'z ovozi bilan javob beradi |
| **B5 — jonli qo'ng'iroq** | LiveKit + Agents, VoIP push (CallKit / Android full-screen intent), subtitrlar | Kechikish < ~1.5 s, kiruvchi qo'ng'iroq yopiq ilovada jiringlaydi |
| **B6 — UGC va o'sish** | Ovoz klonlash, moderatsiya, shikoyatlar, rus va o'zbek tillari | |

## 12. Qo'shimchalar (2026-10-09)

Manba: Codex tayyorlagan kontekst paketi (`rafti_codex_ready.zip`, 2026-10-08). Paketdagi kod `main` bilan
bir xil, yangi narsa faqat hujjatlarda edi. Undan **6 ta yangi g'oya** olindi (12.1–12.6). Ular hozirgi
holatga moslandi: 40 personaj, Closeness v2 (0–100 level, 5 bosqich, foydalanuvchi tanlaydigan `label`),
qo'ng'iroq vaqti balansi. Paketdagi qolgan narsalar bu rejada allaqachon bor edi: server haqiqat manbai,
adapterlar, ledger, 3 qatlamli xotira. Paketdagi `AGENTS.md` olinmadi, chunki bizning `AGENTS.md` ustun.
12.7–12.12 — o'zimning takliflarim. Hammasi faqat server tomoni: ekranlar va dizayn o'zgarmaydi.

### 12.1 Xotira turi va muhimligi

Har bir fakt matndan tashqari quyidagi maydonlarni oladi:

| Maydon | Qiymat | Nima uchun |
| --- | --- | --- |
| `type` | `preference`, `dislike`, `personal_fact`, `schedule`, `milestone`, `promise`, `habit`, `event` | Promptda guruhlab berish va eskirish qoidalari uchun |
| `importance` | 0–1 | Qaysi fakt promptga tushishini belgilaydi |
| `confidence` | 0–1 | Model faktni qanchalik aniq tushunganini bildiradi |

- **Ajratish qoidasi:** fakt `importance ≥ 0.5` va `confidence ≥ 0.7` bo'lsagina yoziladi. Har gap xotiraga
  aylanmaydi: "salom", "zerikdim" kabi bir martalik gaplar yozilmaydi.
- **Yuqori qiymatli:** aniq yoqtirish va yoqtirmaslik, muhim sanalar, odatlar, barqaror shaxsiy faktlar,
  munosabatdagi burilishlar, va'dalar.
- **Promptga tanlash:** hamma `pinned` faktlar + pgvector bo'yicha eng mos 8–12 ta. Tartib:
  `o'xshashlik × 0.6 + importance × 0.3 + yangilik × 0.1`.
- **Ajratishni arzon model bajaradi** (structured output, Batches API). Javob bergan model buni qilmaydi.

### 12.2 Xotiraning hayot sikli

Faktning holati: `active` → `superseded` (yangisi bilan almashdi) → `archived` (eskirdi) yoki `deleted`
(foydalanuvchi o'chirdi).

- Misol: "Namanganda ishlaydi" yozilgan, keyin foydalanuvchi "Toshkentga ko'chdim" dedi. Eski fakt
  `superseded` bo'ladi, `superseded_by` yangi faktga ishora qiladi. Ikkita bir-biriga zid faol fakt bo'lmaydi.
- Yangi fakt yozishdan oldin worker eng o'xshash 5 ta faol faktni modelga beradi va javob so'raydi:
  `new` (yangi), `duplicate` (faqat `last_confirmed_at` yangilanadi) yoki `supersedes: <id>`.
- `schedule` turidagi fakt sanasi o'tgandan 30 kun keyin `archived` bo'ladi.
- Promptga va Memories ekraniga faqat `active` faktlar tushadi. `superseded` fakt tarixda qoladi:
  personaj "oldin Namanganda edingiz-ku" deya olishi uchun, lekin faqat so'ralganda.

### 12.3 Personaj personasi tuzilgan holda

`characters.persona` erkin matn emas, `jsonb` bo'ladi:

```json
{
  "coreTraits": ["sokin", "kuzatuvchan", "himoyachi"],
  "speechStyle": "qisqa gaplar, kam emoji, savolga savol bilan javob beradi",
  "humor": "quruq, kinoyali",
  "values": ["sadoqat", "halollik"],
  "affection": "so'z bilan emas, g'amxo'rlik bilan ko'rsatadi",
  "boundaries": ["o'tmishi haqida birinchi suhbatda gapirmaydi"],
  "world": { "series": "Moonlit Realm", "places": ["..."], "knows": ["c_castor"] },
  "quirks": ["choyni sovutib ichadi"],
  "sampleLines": ["3–5 ta namunaviy gap"]
}
```

- 40 ta rasmiy personaj uchun persona `server/seed/personas/<id>.json` fayllarida yoziladi. Hozirgi
  `bio`, `tags` va `greeting` boshlang'ich material bo'ladi.
- Foydalanuvchi yaratgan personajda (F15) persona `speakingStyle`, `role`, `age`, `gender` va `tags`dan
  yig'iladi, ya'ni `buildCharacterPrompt` (`src/ai/rules.ts`) hozir qilayotgan ish serverga o'tadi.
- `persona_version` har o'zgarishda oshadi. Prompt cache va sifat testlari (12.11) shunga tayanadi.
- `world.knows` bir dunyodagi personajlar bir-birini tanishi uchun kerak. Bu guruh chati uchun ham asos bo'ladi.

### 12.4 Munosabat voqealari oqimi

`relationship_events` jadvaliga faqat qo'shiladi. Uning `kind` qiymatlari: hozirgi `MomentKind`
(`met`, `levelUp`, `call`, `diary`, `secretNote`, `dating`, `photo`, `plan`, `board`, `quiz`) va yangi
"birinchi marta" voqealari (`firstMessage`, `firstVoice`, `firstCall`, `firstDate`, `anniversary`, `labelChanged`).

- **Us timeline** shu oqimdan o'qiladi, ilova alohida yozmaydi.
- **Intimacy** server tomonda faqat tekshirilgan voqealardan hisoblanadi. Ilova "+2" yubormaydi, server
  "xabar saqlandi" voqeasidan o'zi qo'shadi. Level va 5 bosqich (`TIERS`, `src/mock/user.ts`) server kodiga ko'chadi.
- **Promptga** oxirgi muhim voqea qo'shiladi ("kecha birinchi marta qo'ng'iroq qildingiz").
- **Tashabbus** (salomlashish, "qanday o'tdi?") voqealarga qarab ishlaydi: yubiley, uzilgan streak, o'tgan reja.

### 12.5 Har rejim uchun alohida prompt bloki

Persona va xotira bitta, rejim bloki o'zgaradi:

| `mode` | Uslub |
| --- | --- |
| `chat` | 1–4 qisqa xabar, `label` va bosqichga mos yaqinlik |
| `diary` | Kunlik daftar sahifasi, birinchi shaxsda, o'tgan kunni eslaydi |
| `secret_note` | Kunning savoliga bitta samimiy xat |
| `date` | Joy va tanlovlar bo'yicha sahna, keyingi tanlovni taklif qiladi |
| `bedtime` | Sekin, tinch, uyquga tayyorlaydi |
| `initiative` | Bitta qisqa xabar: salomlashish, eslatma yoki "qanday o'tdi?" |
| `call` | Og'zaki nutq: qisqa gaplar, emoji va belgi yo'q (TTS uchun) |
| `game` | Couple quiz, truth or dare: o'yin qoidalari ichida qoladi |

- Munosabat uslubga ta'sir qiladi: bosqich (`stranger` → `family`) va foydalanuvchi tanlagan `label`
  ("Crush", "Partner") promptga beriladi. Model ularni o'zi o'ylab topmaydi.
- **Cache uchun tartib:** qoidalar → persona → rejim bloki → foydalanuvchi profili → xotira → xulosa →
  oxirgi xabarlar. Rejim bloki persona'dan keyin turadi, shuning uchun har rejimning prefiksi alohida keshlanadi.
- `usage_events.mode` qaysi rejim qancha turishini ko'rsatadi.

### 12.6 Mock provayder

`LLMProvider` interfeysining birinchi realizatsiyasi `MockProvider` bo'ladi. U hozirgi `src/mock/*`
javoblarini (`replyBursts`, diary va note javoblari) qaytaradi.

- `LLM_PROVIDER=mock | anthropic` — bitta env sozlamasi.
- API kalitisiz ham server to'liq ishlaydi: frontend ishi, avtomatik testlar va CI uchun.
- Testlar uchun deterministik: bir xil `seed` bir xil javobni beradi.
- TTS, STT va ovoz klonlash uchun ham xuddi shunday mock adapter bo'ladi.

### 12.7 Takrorlanishga qarshi himoya (o'zimning taklifim)

BIMOBIMO sharhlaridagi 2-shikoyat — personaj bir xil gaplarni takrorlaydi.

- `relationships.recent_openers`da oxirgi 20 javobning birinchi ~6 so'zi saqlanadi. Promptga
  "bu so'zlar bilan boshlama" ro'yxati beriladi.
- Javob tayyor bo'lgach, u oxirgi 30 javob bilan solishtiriladi (trigram o'xshashligi). O'xshashlik 0.6 dan
  oshsa, javob bir marta qayta yaratiladi. Xarajat kichik, chunki bu kamdan-kam bo'ladi.
- `quirks` va `sampleLines` (12.3) uslub namunasi, ular har javobda takrorlanmasligi kerak:
  bitta odat bir suhbatda ko'pi bilan bir marta tilga olinadi.

### 12.8 Ketma-ket xabarlarni yig'ib javob berish (o'zimning taklifim)

Odamlar ko'pincha bitta fikrni 2–4 ta qisqa xabar bilan yozadi. Hozir ilova har xabarga alohida javob navbatga qo'yadi.

- Worker oxirgi xabardan keyin 3 soniya jimlikni kutadi (eng ko'pi 8 soniya) va hamma xabarga bitta javob beradi.
- Natija: personaj jonliroq ko'rinadi, LLM chaqiruvlari 30–50% gacha kamayadi.
- Iqtisod o'zgarmaydi: har xabar avvalgidek 1 chig'anoq. Xatolik bo'lsa, hammasi qaytariladi.
- "Yozyapti" belgisi kutish paytida emas, model ishlay boshlaganda chiqadi.

### 12.9 Qaysi xotira ishlatilganini yozib borish (o'zimning taklifim)

`memory_uses(message_id, memory_id)`: har javob promptiga tushgan faktlar yoziladi.

- **Tuzatish:** "nega bunday dedi?" degan savolga aniq javob olinadi.
- **Reyting:** `last_used_at` orqali uzoq ishlatilmagan, muhimligi past faktlar arxivga o'tadi.
- **Kafolat testi:** o'chirilgan fakt keyingi promptlarga tushmaganini avtomatik tekshirish mumkin.

### 12.10 Foydalanuvchi bo'yicha kunlik xarajat chegarasi (o'zimning taklifim)

9-bo'limdagi "unlimited chat" xavfiga aniq mexanizm:

- Har foydalanuvchining kunlik LLM va TTS xarajati `usage_events`dan hisoblanadi.
- **Yumshoq chegara** (masalan, bepul foydalanuvchi uchun $0.10, a'zo uchun $0.40) oshsa, javoblar arzonroq
  modelda va qisqaroq tarix bilan davom etadi. Foydalanuvchi uchun suhbat uzilmaydi.
- **Qattiq chegara** faqat bot va suiiste'mol uchun (masalan, kuniga 2000 xabar). Bunda `429` qaytariladi va
  halol tizim xabari chiqadi. Personaj "charchadim" deb aldamaydi.
- Raqamlar B1'dan keyin haqiqiy `usage_events` asosida qo'yiladi.

### 12.11 Sifat to'plami va prompt versiyasi (o'zimning taklifim)

Model yoki promptni almashtirish suhbatni sezdirmasdan buzishi mumkin. Bundan himoya:

- `server/evals/` papkasida 40–60 ta tayyor stsenariy bo'ladi:
  - kechagi faktni eslash;
  - 4 dunyo bo'yicha persona izchilligi;
  - xavfsiz lahzalar (`CHARACTER_RULES`dagi SAFETY MOMENTS);
  - bosqich va `label`ga mos uslub;
  - rus va o'zbek tilida javob.
- Har model yoki prompt o'zgarishidan oldin to'plam ishga tushiriladi. Natijani LLM-hakam baholaydi, so'ng
  avvalgi versiya bilan solishtiriladi.
- `prompt_version` (`rules.ts` + persona + rejim bloki versiyalari) har javobda va `usage_events`da saqlanadi.
  Shunda sifat yoki narx o'zgarishini aniq versiyaga bog'lash mumkin.

### 12.12 Xotira maxfiyligi va "buni unut" (o'zimning taklifim)

Codex paketida bir qatorda tilga olingan, bu yerda aniq mexanizmga aylantirildi.

- Xotira matni loglarga, Sentry'ga va PostHog'ga tushmaydi, faqat `id` yuboriladi.
- Foydalanuvchi chatda "buni unut" desa, model structured output'da `forget` amalini qaytaradi.
  Fakt `deleted` bo'ladi, embedding o'chiriladi va personaj buni tasdiqlaydi.
- Hisob o'chirilganda faktlar, embeddinglar, xulosalar va Storage'dagi fayllar ham o'chadi.
  App Store shuni talab qiladi.

## 13. Qaror kerak (foydalanuvchidan)

1. **Stack:** Supabase + Hono (Fly.io) — tasdiqlaysizmi? Muqobil: Firebase (Google ekotizimi, lekin
   Postgres va pgvector yo'q, xotira tizimi qiyinroq).
2. **Chat modeli:** Opus 5.5 (eng yaxshi suhbat, eng qimmat), Sonnet 5.5 (o'rta) yoki Haiku 4.5 (eng arzon).
   Tavsiya: B1'da ikkitasini yonma-yon sinab, `usage_events` va suhbat sifatiga qarab tanlash.
3. **Server kodi qayerda:** shu repoda `server/` papkada (umumiy turlar uchun qulay, lekin hammasi ochiq)
   yoki alohida **private** repo.
4. **Hisoblar:** Supabase, Fly.io, Anthropic Console va RevenueCat hisoblarini siz ochasiz.
   Kalitlarni men ko'rmayman, ularni hosting secret'lariga o'zingiz qo'yasiz (B0'da qadamma-qadam yo'riqnoma beraman).

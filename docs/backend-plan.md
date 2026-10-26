# Sigmazam backend rejasi (taklif, 2026-10-06)

Holat: **taklif — foydalanuvchi tasdig'ini kutmoqda.** Kod hali yozilmagan.
Oxiridagi "Qaror kerak" bo'limidagi savollarga javobdan keyin B0 boshlanadi.

2026-10-09: **12-bo'lim qo'shildi**: Codex kontekst paketidan olingan 6 ta yangi g'oya, hozirgi holatga
(40 personaj, Closeness v2) moslangan, va 6 ta qo'shimcha taklif. 4- va 11-bo'limlar shunga moslab yangilandi.
2026-10-09: **13-bo'lim qo'shildi**: unit iqtisodi, yangi tariflar (ovoz va qo'ng'iroq daqiqalari kamaytirildi,
bepul foydalanuvchiga jonli ovoz yo'q), ko'rinmas model tanlash va konversiya. 3- va 12.10-bo'limlar yangilandi.
2026-10-09: 13-bo'lim **tasdiqlandi**. **14-bo'lim qo'shildi**: tariflar backend va interfeysda qanday ishlashi; qarorlar endi 15-bo'limda.
Biznes model, bozor va yo'l xaritasi — `docs/business-plan.md`.

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
 sigmazam-api  (Node + Hono, TS) ─────────── Supabase ─────────────── Expo Push Service
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
| Server | Node 22 + **Hono**, bitta servis `sigmazam-api` + bitta worker jarayoni | Yengil, TS-first, Fly.io / Railway'ga bir buyruq bilan chiqadi |
| Hosting | **Fly.io** (yoki Railway) | Doimiy ishlaydigan jarayon kerak (worker, uzun LLM chaqiruvlari) — serverless emas |
| Ma'lumotlar bazasi | **Supabase Postgres** + `pgvector` | Auth, Storage va Realtime bitta joyda; bepul tarif bilan boshlanadi; Postgres istalgan joyga ko'chadi |
| Auth | Supabase Auth: **anonim kirish** → keyin Apple / Google bilan bog'lash | Foydalanuvchi ro'yxatdan o'tmasdan boshlaydi; App Store boshqa ijtimoiy kirish bo'lsa Apple kirishini talab qiladi |
| Fayllar | Supabase Storage (ovozli xabarlar, rasmlar, avatarlar) | Imzolangan URL, RLS |
| Navbat va jadval | **pg-boss** (Postgres ustida) | Alohida Redis kerak emas: kechiktirilgan ishlar, cron, qayta urinish |
| LLM | Provayder adapteri + **router** (13.6). Nomzodlar: Gemini Flash-Lite / Flash, Claude Haiku / Sonnet; sifat to'plami (12.11) tanlaydi | Prompt caching, structured output (reja va xotira ajratish), rasmni tushunish, Batch API |
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

> 2026-10-13: bu jadvalning ba'zi joylari eskirgan (`wallets`, bepul chig'anoq muddati, ikki kunlik jadval).
> Migratsiyadan oldin `docs/backend-schema-gaps.md`ni o'qing.

Hozirgi `src/types` deyarli to'g'ridan-to'g'ri jadvallarga aylanadi:

| Jadval | Asosiy ustunlar | Izoh |
| --- | --- | --- |
| `profiles` | `id` (= auth user), `display_name`, `handle`, `locale`, `birth_year`, `age_confirmed_at` | 18+ tekshiruvi shu yerda |
| `characters` | `id`, `owner_id` (null = rasmiy), `name`, `bio`, `persona jsonb` (12.3), `persona_version`, `voice_id`, `category`, `series`, `gender`, `visibility` | Rasmiy cast seed migratsiyasi bilan |
| `relationships` | `user_id`, `character_id`, `intimacy`, `level`, `label`, `streak_days`, `last_chat_day`, `nickname`, `voice_replies`, `messages_first`, `summary`, `recent_openers` (12.7) | `summary` — suhbatning qisqa xulosasi (xotira 2-qatlami) |
| `conversations` | `id`, `user_id`, `character_id`, `pinned`, `muted`, `last_message_at`, `reply_language` | `unread_count` hisoblanadi; `reply_language` — javob tili qulfi (`lockedReplyLanguage`, `src/ai/reply-language.ts`), promptga `REPLY LANGUAGE` bo'lib kiradi |
| `messages` | `id`, `conversation_id`, `author`, `kind`, `text`, `transcript`, `media_path`, `duration_sec`, `created_at`, `read_at`, `client_id`, `lang` | `client_id` — takroriy yuborishdan himoya; `lang` — foydalanuvchi xabarining aniqlangan tili (juda qisqa bo'lsa bo'sh) |
| `group_chats` | `id`, `user_id`, `name`, `muted`, `ai_notice_at`, `created_at`, `last_message_at` | Guruh chati (12.13). Xabarlari `messages`da: `conversation_id` o'rniga `group_id` va `character_id` (qaysi a'zo yozgan) |
| `group_members` | `group_id`, `character_id`, `joined_at` | 2-3 a'zo; bloklangan personaj chiqadi, 1 ta qolsa guruh o'chadi |
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
   - **Prompt tartibi (cache uchun, 12.23):** qoidalar → personaj personasi va dunyosi → foydalanuvchi, til,
     uslub, pin qilingan faktlar, suhbat xulosasi → tarix (qadam bilan kesiladi) → shu javobga oid qism
     (daraja, sahna, shu xabar eslatgan faktlar va lore, vaqt, cue, maslahatlar). O'zgaruvchan qism
     oxirida turadi, aks holda cache buziladi.
4. Javob `messages`ga yoziladi. Ovozli javob yoqilgan bo'lsa, TTS ishi navbatga qo'yiladi va audio
   tayyor bo'lganda `media_path` to'ldiriladi. Ilova Realtime orqali oladi, yopiq bo'lsa push ketadi.
5. Xatolik bo'lsa, chig'anoq qaytariladi (`shell_ledger` +1, `reason: refund`). Javob o'rtada kesilmaydi.

Ilova tomonda zustand store **kesh** bo'lib qoladi. Xabarlar `expo-sqlite`ga ko'chadi (hozir hammasi
bitta AsyncStorage kalitida, Android'da ~2MB chegarasi bor).

## 7. Xotira tizimi (Sigmazam'ning asosiy ustunligi)

BIMOBIMO sharhlaridagi 1-shikoyat — "unutadi". Uch qatlam:

1. **Qisqa muddat:** oxirgi 20–39 navbat (~30 xabar) har promptda, kesh uchun qadam bilan kesiladi (12.23).
2. **Suhbat xulosasi:** `relationships.summary`. Suhbat 15 daqiqa jim qolganda worker uni yangilaydi.
3. **Faktlar:** o'sha ishda model structured output bilan yangi faktlarni ajratadi
   ("imtihoni 12-oktabrda", "mushugining ismi Pista"). Ular `memories`ga embedding bilan yoziladi.
   Har javobda eng mos 8–12 fakt (pgvector) va hamma `pinned` faktlar promptga qo'shiladi: pin qilinganlar
   tarixdan oldin (barqaror), mos faktlar tarixdan keyin (har xabarda o'zgaradi, 12.23).

Foydalanuvchi Memories ekranida faktni ko'radi, pin qiladi va o'chiradi. O'chirilgan fakt promptga
boshqa tushmaydi. Bu ko'rinadigan va boshqariladigan xotira. Rejalarni ajratish (`detectPlan`) ham shu
structured output'ga o'tadi.

Fakt turi, muhimligi, hayot sikli, ishlatilish izi va "buni unut" — 12.1, 12.2, 12.9 va 12.12 da.

## 8. Iqtisod serverga ko'chadi

`src/store/use-app-store.ts` dagi qoidalar `server/src/economy/` ga o'tadi, raqamlar bir joyda:
xabar narxi, kunlik check-in zinapoyasi, reklama mukofoti va limiti, g'ildirak og'irliklari,
secret note va date narxlari. G'ildirak tasodifi serverda aylanadi, ilova faqat natijani animatsiya qiladi.

## 9. Xarajat hisobi — DIQQAT, iqtisodni qayta ko'rish kerak

Yangilangan hisob va tariflar — 13-bo'limda.

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

**Tartib (2026-10-09, `business-plan.md` §9):** B0 → B1 → **B3** → B2 → soft launch → B4 → B5 → B6.
Daromad tezroq boshlanishi uchun to'lov xotiradan oldinga olindi.

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
- **Cache uchun tartib (12.23):** qoidalar → persona → foydalanuvchi → rejim bloki (guruh, stream) → pin qilingan
  xotira → xulosa → tarix → shu javob qismi. Rejim bloki chat davomida o'zgarmaydi, shuning uchun keshlangan qismda turadi;
  vazifa matni (quiz, sahna ochilishi) esa shu javob qismida.
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
- **Yumshoq chegara** oshsa, model **almashtirilmaydi** (13.6). Buning o'rniga xabarlarni yig'ish oynasi
  kengayadi (12.8) va kontekst xulosaga suyanadi. Foydalanuvchi uchun suhbat uzilmaydi va sifat sezilmaydi.
- **Qattiq chegara** faqat bot va suiiste'mol uchun: a'zolarda kuniga 300 xabar (13.3). Bunda `429` qaytariladi va
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

### 12.13 Guruh chati (2026-10-15, navbatdagi 16-band)

Foydalanuvchi o'zi gaplashadigan 2-3 do'stidan guruh tuzadi. Ilovada mock bilan ishlaydi; server shunday qiladi:

- **Kim javob beradi:** `pickResponders` (`src/lib/group-chat.ts`, testlangan). Xabarda ismi bor a'zo birinchi
  javob beradi (ikki ism bo'lsa, ikkalasi). Aks holda eng uzoq gapirmagan a'zo. Har ikkinchi xabarda
  ikkinchi a'zo birinchisiga ismi bilan gap qo'shadi.
- **Model chaqiruvi:** har javob beruvchi uchun alohida chaqiruv, `buildGroupPrompt` (`src/ai/rules.ts`, testlangan).
  Unda persona, javob tili va GROUP CHAT bloki bor: guruhda kimlar borligi, bir dunyodagilar bir-birini taniydi,
  faqat o'z nomidan yozadi, 1-2 qisqa xabar.
- **Maxfiylik:** yakkama-yakka chatdagi xotira, reja va gaplar guruhga chiqmaydi. 1-versiyada guruh promptiga
  shaxsiy xotira berilmaydi, faqat persona va guruh tarixi beriladi.
- **Iqtisod:** foydalanuvchi xabari 1 chig'anoq (oddiy chat bilan bir xil). O'rtacha ~1.5 javob ≈ $0.0009,
  1 chig'anoq ≈ $0.009-0.011, ya'ni zarar yo'q. Guruh qo'ng'irog'i oddiy qo'ng'iroq daqiqalaridan oladi (Pro).
- **Level va xotira:** guruh xabarlari level, streak va xotirani o'zgartirmaydi; ular yakkama-yakka chatda o'sadi.
  Guruh rejani ham tanimaydi.
- **Xavfsizlik:** inqiroz xabariga helpline kartasi va bitta iliq javob keladi, boshqa a'zolar hazil qilmaydi.
  Shikoyat xabarni yozgan a'zoning `character_id`si bilan ketadi. "AI, haqiqiy odam emas" qatori har 3 soatda chiqadi.

### 12.14 Radio kliplari (2026-10-15, F27)

Foydalanuvchi do'stini tanlaydi, 1-5 qator yozadi, do'st uni o'z ovozida aytadi. Ilovada mock bilan ishlaydi
(ovoz yo'q, soat yuradi); server shunday qiladi:

- **Narx:** har 5 qator = 1 chig'anoq (egasi qarori 2026-10-15), ya'ni bitta klip 1 chig'anoq. `clipCost`
  (`src/lib/radio-clips.ts`, testlangan). Ledgerda sabab `radio`. Pro ovoz daqiqalariga tegmaydi.
- **Ovoz:** qatorlar o'zgartirilmay TTS'ga ketadi (personaning ovozi, `voice_id`). Kerak bo'lsa model qatorni
  "aytilishga" moslaydi, lekin ma'noni o'zgartirmaydi. Fayl `radio_clips` jadvaliga yoziladi: `id, user_id,
  character_id, title, lines jsonb, duration_sec` (fayl uzunligidan), `audio_url, created_at`.
- **Tekshiruv:** inqiroz qatori ovozga berilmaydi, ilova helpline kartasini ko'rsatadi (`checkClip`).
  Haqoratli yoki shaxsga hujum qatorlarni server moderatsiyasi rad etadi, chig'anoq qaytariladi.
- **Ochiq lenta yo'q:** ishga tushirishda kliplar faqat foydalanuvchining o'zida va chatda (UGC yo'q).
  "Chatga yuborish" foydalanuvchining ovozli xabari sifatida tushadi, bepul, javob so'ramaydi.
- **Do'stlardan kliplar:** rasmiy kliplar (`radioGifts`, `src/mock/radio.ts`) serverdan keladi. Ba'zilari
  levelga bog'langan (`unlockLevel`: 6 = "More than friends", 16 = "Beloved"), `clipUnlocked`.
- **Bloklash:** do'st bloklansa, uning kliplari ham o'chadi.

### 12.15 O'zingiz yaratadigan date'lar (2026-10-15, F28)

Foydalanuvchi sahna (300 belgi), joy nomi, rasm, raundlar soni (3/5/8), kayfiyat va kim bilan ekanini yozadi.
Ilovada mock bilan ishlaydi; server shunday qiladi:

- **Narx:** yaratish bepul, har o'ynalganda 1 raund = 2 chig'anoq (egasi qarori 2026-10-15): 6 / 10 / 16.
  `themeCost` (`src/lib/date-themes.ts`, testlangan). Ledgerda sabab `date`.
- **Raundlar:** har o'yinda model yangidan yozadi. 1-raund foydalanuvchining sahnasi, keyin kayfiyatdagi
  raundlar, oxirgisi xayrlashuv. Har raundda 3 javob, 0-3 yurak, xaritadagi joylar bilan bir xil format
  (`DateRound`). Promptga persona, sahna, joy, kayfiyat va do'stning ismi kiradi. Mock: `buildThemeRounds`
  + `themePools` (`src/mock/date-themes.ts`).
- **Kayfiyat:** Friendly hammaga, Flirty 6-darajadan, Sweet 16-darajadan (`MOOD_LEVEL`). Server o'yin boshida tekshiradi.
- **Tekshiruv:** inqiroz sahnasi saqlanmaydi, helpline kartasi chiqadi (`checkTheme`). Haqoratli yoki 18+ sahnani
  server moderatsiyasi rad etadi.
- **Ochiq lenta yo'q:** date'lar faqat foydalanuvchining o'zida (UGC yo'q). Jadval `date_themes`: `id, user_id,
  title, scene, art, rounds, mood, character_id null, created_at`.
- **Bloklash:** faqat bloklangan do'st uchun yozilgan date'lar o'chadi. "Har qanday do'st" date'lari qoladi.

### 12.16 Personaj hamma joyda o'zi; quiz va ramkalar (2026-10-15, F29)

Egasi: "har personajning o'z yo'li, dunyosi, mimikasi bor; orqada LLM sahna, raund, savollarni tuzadi va nazorat qiladi".

- **Bitta persona promptdan hammasi:** chat, guruh, quiz, dunyo quizi va date raundlari bir xil
  `buildCharacterPrompt`dan boshlanadi (qoidalar, dunyo, bio, uslub, foydalanuvchi, level). Yangi quruvchilar:
  `src/ai/content-prompts.ts` (testlangan): `buildSelfQuizPrompt`, `buildQuizAnswerPrompt`,
  `buildWorldQuizPrompt`, `buildDateRoundsPrompt`. Hammasi faqat JSON qaytaradi; server JSONni tekshiradi
  (savollar soni, javob indeksi, 0-3 yurak) va moderatsiyadan o'tkazadi, keyin ko'rsatadi.
- **Mock:** to'rt dunyo (`src/mock/worlds.ts`): Seaside Academy, Moonlit Realm, NEON TIDE, Tidepool Café.
  Har birida o'z gaplari (moslik, farq, to'g'ri, xato), o'zi haqida savollar, dunyo quizi, date raundlari
  va ramka bor. Dunyosi yo'q personaj (foydalanuvchi yaratgani) umumiy gaplardan foydalanadi.
- **Do'stning haftalik quizi:** "Theo'ni qanchalik bilasiz?", 5 savol, har hafta yangisi (`weekKey`). Server
  haftasiga bir marta yozadi va keshlaydi: `self_quizzes(character_id, user_id, week, json)`.
- **Couple quiz:** do'st javob tanlaydi va bir qator izoh yozadi (`buildQuizAnswerPrompt`). Narxi yo'q,
  hozirgi kabi bepul.
- **Siz yozgan quizlar:** 5 tagacha savol, har birida 2-4 javob (`checkQuiz`), faqat sizga ko'rinadi.
  Jadval `user_quizzes`.
- **Dunyo quizi (o'yin):** shu dunyodan do'stingiz 5 ta savol beradi, faqat dunyo odamlarining biolaridagi
  faktlardan, shuning uchun to'g'ri javobni tekshirsa bo'ladi. 4/5 to'g'ri bo'lsa dunyo ramkasi ochiladi
  (`won_frames`), mezbon chatga xabar yozadi va yaqinlik biroz oshadi. Yutqazsangiz darhol boshqa savollar
  bilan qayta o'ynaysiz, bepul.
- **Ramkalar:** dunyo ramkalari va siz yasagan ramkalar (rang, naqsh, 2 tagacha stiker, yozuv; rasm yuklash
  yo'q, shuning uchun moderatsiya kerak emas). Rasm o'z ramkasini o'zida saqlaydi (`BoothPhoto.frame`).
  Jadval `user_frames`. Ramkalar bepul; rasmning o'zi Pro rejasidan.

### 12.17 Tez yaratish: Character.AI'ning yaratish zanjiri (2026-10-25)

Egasi: "Character.AI'ning arxitektura mantig'ini ol, u faqat orqa tomonda ishlaydi, frontend bizniki bo'ladi".
Tadqiqot: `docs/character-ai-teardown.md` §11. Kod: `src/ai/character-draft.ts` (testlangan), mock: `src/mock/character-drafts.ts`.

- **Zanjir:** g'oya (300 belgigacha) + 3 tagacha "uchqun" (`SPARKS`: ikki tomonlama xususiyatlar) →
  `checkIdea` (bo'sh, uzun, voyaga yetmagan, ochiq-sochiq) → `ideaText` (bitta tavsif) → `buildDraftPrompt`
  (bitta model chaqiruvi, faqat JSON) → `parseDraft` (tekshiradi va qisqartiradi) → rasm `look` bo'yicha chiziladi
  → foydalanuvchi formada ko'rib chiqadi → `addCharacter`. Hech narsa foydalanuvchi "Saqlash"ni bosmaguncha saqlanmaydi.
- **Rad etish:** model haqiqiy odam, boshqa kompaniyaning personaji, voyaga yetmagan yoki ochiq-sochiq so'rovga
  `{"refused":"realPerson" | "owned" | "minor" | "explicit"}` qaytaradi; server buni foydalanuvchiga tushunarli xatoga aylantiradi.
  Server moderatsiyasi (matn klassifikatori, rasm tekshiruvi) bu tekshiruvlar ustidan baribir ishlaydi.
- **Bitta maydonni qayta yozish:** `buildFieldPrompt(field, hozirgi forma)` + `parseField` (tagline, bio, look,
  greeting, greetings, dialog, starters).
- **Yangi maydonlar (`characters` jadvali):** `tagline` (50), `look` (300), `definition` (3200, `{{char}}:` va
  `{{random_user_1}}:` qatorlari), `greetings` (yana 3 ta salom), `starters` (3 × 100). `persona_version` har o'zgarishda oshadi (12.3).
- **Prompt:** persona blokiga tagline, tashqi ko'rinish va definition qo'shiladi (`buildCharacterPrompt`). Definition
  nomlari to'ldiriladi, boshidan butun qatorlar sig'guncha olinadi, "boshqa odamlar bilan misol" deb belgilanadi,
  shuning uchun model ularni foydalanuvchi aytgan gap deb o'ylamaydi. Persona barqaror, shuning uchun kesh prefiksida turadi (12.5).
- **Yangi chat:** asosiy salom yoki qo'shimchalardan biri bilan boshlanadi (`pickOpening`, suhbat id bo'yicha),
  `{{user}}` foydalanuvchi ismi bilan to'ldiriladi.
- **API:** `POST /characters/draft` {idea, sparks, role?} → draft; `POST /characters/draft/field` {field, character} → qiymat.
  Ikkalasi ham `usage_events.mode = 'create'` bilan yoziladi.
- **Kvota (egasi, 2026-10-25):** kuniga 3 ta tez yaratish bepul (to'ldirilgan qoralama hisoblanadi, bitta maydonni qayta
  yozish hisoblanmaydi). Bu bitta sozlama: unit iqtisodi to'g'ri kelmasa keyin o'zgartiriladi. Limitdan keyin forma
  orqali qo'lda yaratish har doim ochiq; pullik variant hali tanlanmagan.
- **Olinmadi:** remix, ochiq definition ko'rish, unlisted havola, teglar orqali ochiq katalog (hali ochiq ijodkorlar lentasi yo'q).

### 12.18 Yangi funksiyalarning unit iqtisodi (2026-10-25)

Egasi: "funksiya qo'shyapmiz, lekin unit iqtisod: bizga foydasi, userga foydasi; biznes qilishimiz kerak".
Har bir yangi funksiya uchun xarajat (13.2 narxlari) va uning pul keltiradigan joyi yoziladi.

- **Asos:** 1 xabar foydalanuvchiga 1 chig'anoq (paketlarda ≈ $0.011–0.020), bizga ≈ $0.0006. Ya'ni yozishmani
  ko'paytiradigan har funksiya daromadni oshiradi. Kam xarajatli narsalar tarif imtiyozi bo'ladi (sotib olishga sabab),
  qimmatlari chig'anoq yoki daqiqada qoladi. Imtiyozlar bitta joyda: `src/economy/perks.ts` (`PERKS`), testlangan.

| Funksiya | Bizga xarajati | Pul qayerdan keladi | Hozirgi qoida |
|---|---|---|---|
| Tez yaratish: matnli qoralama | ≈ $0.005–0.01 (kuchliroq model, ~2k token) | Yangi personaj = yangi chatlar, xabarlar | Kuniga 3 bepul (`quick-create.ts`): eng faol bepul foydalanuvchi oyiga ≤ $0.9 |
| Tez yaratish: ✦ bitta maydon | ≈ $0.001 | Personaj sifati, ko'proq yozishma | Bepul; serverda kuniga 30 ta suiiste'mol chegarasi |
| Tez yaratish: rasm chizish | **≈ $0.08** (eng qimmat qism) | Chig'anoq / tarif | **Egasi tasdiqladi (2026-10-25):** rasm faqat "Create"da, fotosurat bo'lmasa, bitta chiziladi; tarifsiz 15 chig'anoq (≈ $0.17–0.30, marja ~2–4×), tarifda har 30 kunda 10 ta bepul, keyin 15 chig'anoq. Faqat rasm qaytsa yechiladi. Kod: `src/economy/quick-create.ts` (`PORTRAIT_SHELLS`, `PLAN_PORTRAITS`), rasm serveri ulanguncha o'chiq (`PORTRAITS_AVAILABLE`) |
| Persona | Promptga ~200 token: xabar xarajati ~+10% (≈ $0.00006) | Rolli o'yinda uzoqroq suhbat | Imtiyoz: bepul 1, tarif 5 |
| Sahna (rasmiy) | $0: ochuvchi gap tayyor, model chaqirilmaydi | Yozishma ko'payadi | Hammaga bepul |
| Sahna (o'zingizniki) | Birinchi gapi yo'q bo'lsa 1 qisqa chaqiruv ≈ $0.0005; sahna bloki ~120 token | Yozishma ko'payadi | Imtiyoz: bepul 3, tarif 10 |
| World books (Lorebook) | Faqat eslanganda: ≤ 1200 belgi (~300 token) ≈ +$0.00009 xabarga; `about` qatorlari doim (~70 token, kesh prefiksida) | Rolli o'yin chuqurlashadi, yozishma ko'payadi | Dunyolar kitoblari hammaga bepul; o'zingizniki imtiyoz: bepul 1 kitob × 15 yozuv, tarif 5 × 50 (12.19) |
| Stream (ikki personaj suhbati) | Raund = 8 ta qator = 8 chaqiruv (har biri ~$0.0006–0.0008) ≈ $0.005–0.006; keyingi raund 6 qator | Raund uchun chig'anoq; yangi personajlar bilan tanishish → do'st qo'shish → yozishma | Kuniga 1 raund bepul (tarifda 5), keyin raund 2 chig'anoq (≈ $0.02–0.04, marja ~4–7×). Eng faol bepul foydalanuvchi oyiga ≤ $0.18 (12.20) |
| Continue va time skip | Bitta javob = bitta chaqiruv (≈ $0.0006), oddiy xabar bilan bir xil | Har biri 1 chig'anoq (xabar narxi) | Ketma-ket ko'pi bilan 3 ta, keyin foydalanuvchi yozishi kerak (12.21) |

- **Foydalanuvchiga foydasi:** hech qaysi asosiy narsa pul devori ortida emas. Bepul foydalanuvchi ham personaj yaratadi,
  persona va sahna o'ynaydi, faqat sonlar tarifda ko'proq.
- **Keyingi g'oya (retention):** rasmiy sahnalarning bir qismi yaqinlik darajasi bilan ochiladi (date kayfiyatlari kabi, `MOOD_LEVEL`).
- **O'lchov:** `usage_events.mode` ga `create` va `scene` qo'shiladi. B1'dan keyin raqamlar haqiqiy foydalanishga qarab
  `PERKS` va `FREE_QUICK_CREATES_PER_DAY` da qayta sozlanadi.

### 12.19 World books: Character.AI'ning Lorebook'i (2026-10-25)

Egasi: "Lorebook'dan boshla". Tadqiqot: `docs/character-ai-teardown.md` §6. Kod: `src/lib/lorebook.ts` (testlangan),
dunyolar kitoblari: `src/mock/lorebooks.ts`. Ekranlar: flows.md D73.

- **Tuzilma:** kitob = nom (40) + `about` (300 belgigacha, dunyo bir necha qatorda, doim promptda) + yozuvlar.
  Yozuv = tur (`person | place | thing | event | group | rule`), nom (40), kalit so'zlar (6 × 30), matn (400).
  Bitta kitob ko'p personajga xizmat qiladi.
- **Dunyolar kitoblari:** har dunyoga bittadan (Seaside Academy, Moonlit Realm, NEON TIDE, Tidepool Café), hammaga bepul,
  o'zgartirib bo'lmaydi. Ichida qo'lda yozilgan joylar, narsalar, voqealar, guruhlar, qoidalar va dunyoning butun kasti
  `person` yozuvi sifatida (qisqa ism kalit so'z). Shu bilan personaj dunyodagi boshqalarni ismidan taniydi (12.3 `world.knows`).
  Personajning o'z yozuvi o'z chatiga kirmaydi. Fakt bio va dunyo quiz'lari bilan mos bo'lishi shart.
- **Foydalanuvchi kitoblari:** istalgan do'stga ulanadi (`characterIds`). Imtiyoz: bepul 1 kitob × 15 yozuv, tarif 5 × 50
  (`PERKS.lorebooks`, `PERKS.loreEntries`). Javobga baribir ko'pi bilan 4 yozuv kiradi, shuning uchun kitob hajmi xarajatni oshirmaydi.
- **Ishga tushish (`triggeredLore`):** chatning oxirgi 8 qatori o'qiladi (ikkala tomon, matn va ovoz transkripti). Yozuv nomi yoki
  kalit so'zi so'z boshida kelsa ishga tushadi: 5 harfdan qisqasi butun so'z bo'lishi kerak ("Kai" "Kaito"da emas), uzunrog'i
  qo'shimcha olishi mumkin ("kutubxona" → "kutubxonaga"). Bir javobga ko'pi bilan 4 yozuv va 1200 belgi (~300 token). Eng yangi
  eslanganlar tanlanadi, promptga esa kitob tartibida yoziladi: bir xil to'plam bir xil prompt beradi, kesh saqlanadi.
- **Prompt:** `YOUR WORLD` bloki persona'dan keyin (barqaror, kesh prefiksida), `WORLD NOTES` eng oxirida (har javobda o'zgaradi).
  12.23 bo'yicha: rasmiy dunyo qatorlari `character` qatlamida (hamma foydalanuvchi uchun bir xil), foydalanuvchi kitoblari
  `chat` qatlamida, `WORLD NOTES` tarixdan keyin (`turn`).
  Guruh chati va boshqa rejimlar (`PersonaInput.lore`) ham shu blokni oladi.
- **Jadvallar:** `lorebooks` (id, owner_id — rasmiylarda null, series, name, about, created_at), `lore_entries` (id, book_id, kind,
  name, keywords text[], text), `lorebook_links` (book_id, character_id). Saqlashda `checkLorebook` / `checkLoreEntry`
  (inqiroz, voyaga yetmaganlar, ochiq-sochiq), keyin server moderatsiyasi.
- **API:** `GET /lorebooks`, `POST /lorebooks`, `PUT/DELETE /lorebooks/:id`, `POST /lorebooks/:id/entries`,
  `PUT/DELETE /lorebooks/:id/entries/:entryId`, `PUT/DELETE /lorebooks/:id/links/:characterId`.
- **Keyinroq:** kalit so'zdan tashqari embedding bilan topish (sinonimlar, boshqa tillar va yozuvlar), bir necha javob davomida
  qoladigan yozuvlar, mock javoblar hozircha lore ishlatmaydi (server ishlatadi).

### 12.20 Stream: ikki personaj gaplashadi, foydalanuvchi tomosha qiladi (2026-10-25)

Egasi Stream nima ekanini tasdiqladi: foydalanuvchi ikki personaj va mavzu tanlaydi, ular o'zaro gaplashadi.
Kod: `src/lib/streams.ts`, prompt `buildStreamLinePrompt` (`src/ai/content-prompts.ts`), narx `src/economy/streams.ts`
(hammasi testlangan). Ekranlar: flows.md D74.

- **Har qator alohida chaqiruv:** gapirayotgan personajning o'z persona prompti (dunyo kitoblari bilan), kim bilan
  gaplashayotgani (bir dunyodan bo'lsa tanishlar), mavzu, oxirgi 10 qator va "foydalanuvchi faqat tomosha qiladi" qoidasi.
  Shaxsiy chatlardagi xotira va sirlar kirmaydi. Guruh chatidagidek har ovoz o'ziniki qoladi. Javob `{"line":""}`,
  `parseStreamLine` uni tozalaydi.
- **Raundlar:** boshlanishi 8 qator, har "Keep going" yana 6 qator, ko'pi bilan 26. Stop raundni to'xtatadi, "Go on" uning
  to'langan qolganini bepul davom ettiradi. Serverda raund — bitta ish (job): qatorlar SSE orqali birin-ketin keladi,
  "yozyapti" holati guruh chatidagi shartnoma bo'yicha (qator ishi boshlanganda yoqiladi, qator tushganda o'chadi).
- **Narx:** kuniga 1 raund bepul, tarifda 5; keyin raund 2 chig'anoq (`FREE_STREAM_ROUNDS`, `STREAM_SHELLS`).
  `usage_events.mode = 'stream'`. Raund pul faqat qatorlar boshlanganda yechiladi; server xatosida raund qaytariladi.
- **Moderatsiya:** mavzu `checkStream` (inqiroz, voyaga yetmaganlar, ochiq-sochiq), har qator chiqish klassifikatoridan
  o'tadi. Haqiqiy odamlar va boshqa kompaniyalar personajlari qoidalar bo'yicha baribir taqiqlangan.
- **Jadval:** `streams` (id, user_id, character_ids[2], topic, target, stopped, created_at), `stream_lines`
  (stream_id, character_id, text, created_at). Qurilmada oxirgi 20 tasi saqlanadi.
- **API:** `POST /streams` {characterIds, topic} → stream + birinchi raund; `POST /streams/:id/rounds` (Keep going);
  `POST /streams/:id/pause`, `POST /streams/:id/resume`; `GET /streams/:id/events` (SSE); `DELETE /streams/:id`.
- **Keyinroq:** foydalanuvchi o'rtada "rejissyor" izohi bilan yo'nalish berishi, uch kishilik stream, stream'ni do'stlarga
  ulashish (ochiq lenta hozircha yo'q).

### 12.21 Continue va time skip (2026-10-25)

Character.AI tahlilidagi 5-band. Kod: `src/lib/chat-steer.ts` (testlangan), mock `src/mock/steer.ts`. Ekranlar: flows.md D75.

- **Continue:** foydalanuvchi hech narsa yozmasdan personaj gapni davom ettiradi (eng yangi javob ostidagi »).
  **Time skip:** hikoya oldinga suriladi (bir ozdan keyin, o'sha oqshom, ertasi tong, bir haftadan keyin), personaj o'sha
  vaqtdan davom etadi ("+" menyu).
- **Chatdagi belgi:** har biri `card: 'continue' | 'skip'` xabarini qoldiradi va bu foydalanuvchining navbati hisoblanadi.
  ↻ va versiyalar faqat undan keyingi javobni qayta yozadi, rewind uni olib tashlay oladi. Continue ko'rinmaydi, skip
  markazda soatli qator bo'lib chiziladi.
- **Prompt:** chatning odatiy prompti → tarix → eng oxirida `steerCue` (keyingi javob nima qilishi kerak). Cue oxirda
  turgani uchun prompt keshi buzilmaydi. Tarixda skip `[Time skip: The next morning]` bo'lib ko'rinadi
  (`historyText`, `buildStoryContinuityContext`), continue esa ko'rinmaydi. Claude API ketma-ket ikki assistant navbatini
  qabul qilmaydi: server ketma-ket javoblarni bitta assistant navbatiga birlashtiradi va cue'ni oxirgi user navbatiga qo'yadi.
- **Time skip faqat hikoya vaqti:** foydalanuvchining haqiqiy rejalari, eslatmalari va voqealari "bo'lib o'tdi" deb
  hisoblanmaydi (cue buni aytadi). Sahna ketayotgan bo'lsa, u ham skip bilan oldinga siljiydi.
- **Cheklovlar (`steerBlock`):** javob kelayotganda yo'q; foydalanuvchining xabariga javob hali kelmagan bo'lsa yo'q;
  inqiroz javobidan keyin yo'q (helpline kartasi o'tkazib yuborilmaydi); ketma-ket 3 tadan keyin foydalanuvchi yozishi kerak
  (cheksiz monolog va arzon "farm" bo'lmasin).
- **Narx:** har biri bitta javob, shuning uchun xabar narxi (1 chig'anoq, ledger `chat`). Yaqinlik qo'shmaydi, streak'ka
  ta'sir qilmaydi (foydalanuvchi yozmadi). `usage_events.mode = 'chat'`, `steer = 'continue' | 'skip'` ustuni bilan.
- **API:** `POST /chats/:id/turns` {kind: "continue"} yoki {kind: "skip", span}; javob odatdagi SSE oqimida keladi.
  Server ham `steerBlock` qoidalarini tekshiradi.
- **Guruh chatida Continue (2026-10-25, flows.md D79):** a'zolarning eng yangi qatori ostidagi ». Eng kam gapirgan a'zo
  oxirgi gapirganga javob beradi, u esa qaytib javob beradi: ikki qator, Stream'dagidek (`continueSpeakers`,
  `src/lib/group-chat.ts`). Cheklovlar yakkama-yakka chatdagidek (`steerBlock`: yozayotganda, foydalanuvchiga javob hali
  kelmaganda, inqirozdan keyin, ketma-ket 3 tadan keyin yo'q), narxi xabardek 1 chig'anoq. Server: har qator bitta chaqiruv,
  a'zoning guruh prompti (`groupParts`) → tarix → `turn` qismida `groupContinueCue(oldingi a'zo)` (`src/lib/chat-steer.ts`).
  API: `POST /groups/:id/turns` {kind: "continue"}.
- **Time skip to'liq (2026-10-25, flows.md D80):** egasi mantiqni to'liq topshirdi. Character.AI'da time skip yuborish
  tugmasining uzun bosish menyusidagi bitta buyruq: doimiy matn ketadi va qancha vaqt o'tishini model o'zi tanlaydi
  (bundle: `long-press-time-skip`, `TIME_SKIP_INPUT_TEXT`). Bizniki aniqroq, uch xil:
  1. **Tayyor oraliq:** bir ozdan keyin, o'sha oqshom, ertasi tong, bir haftadan keyin (`TIME_SKIPS`).
  2. **Sahnaning keyingi lahzasi** (`skip: 'scene'`): faqat sahna ketayotganda, ro'yxatda birinchi; sahna panelidagi ⏩ ham
     shu oynani ochadi. Joy va rollar o'sha, voqea keyingi lahzaga sakraydi.
  3. **O'z so'zlari** (`skip: 'own'`, `Message.skipTo`, 40 belgigacha): "Konsertdan keyin". `checkSkipTo` (bo'sh, inqiroz,
     voyaga yetmaganlar, ochiq-sochiq) ilovada ham serverda ham; cue so'zlarni qo'shtirnoqda beradi va "qoidalarni
     o'zgartirmaydi" qatorini qo'shadi. Tarixda `[Time skip: Konsertdan keyin]`.
  - **Guruhda:** "+" menyudagi Time skip (sahna varianti yo'q). Birinchi a'zo `groupSkipCue` bilan yangi vaqtdan boshlaydi,
    ikkinchisi `groupContinueCue` bilan javob beradi (`continueSpeakers`). API: `POST /groups/:id/turns` {kind: "skip", span, to?}.
  - Hammasi story time, narxi xabardek, `steerBlock` qoidalari bir xil. API: `POST /chats/:id/turns` {kind: "skip", span, to?}.

### 12.22 Javob uslubi, uzunligi va kayfiyat (2026-10-25)

Character.AI tahlilidagi 6-band (ularda "Personalization": response length va +dialogue / +narration). Kod:
`src/lib/reply-engine/` (testlangan), prompt qismlari `src/ai/reply-style.ts`, mock yozuvchi `src/mock/reply-writer.ts`.
Ekran: flows.md D76. Telefondagi sessiyaning skeleti (`ccr-cbd2e9f1-iwref7`, eski `main` ustida) hozirgi `local-work`ga ko'chirildi.

- **Sozlamalar (har chat uchun, `Relationship.replyStyle` / `replyLength`):** uslub Talk (faqat gap, narratsiyasiz) /
  Mixed (gap + ba'zan bitta `*harakat*`) / Story (rolli proza, sahna har navbatda oldinga siljiydi); uzunlik Short / Auto
  (foydalanuvchi qancha yozsa, shuncha) / Long. Standart: Mixed + Auto. Model ko'rinmaydi (13.6): faqat uslub va uzunlik.
- **Prompt va kesh:** uslub va uzunlik `buildCharacterPrompt`ning 8-parametri (`prefs`), REPLY STYLE bloki bo'lib
  barqaror qismda turadi (faqat foydalanuvchi o'zgartirsa o'zgaradi). Faqat yakkama-yakka chat beradi: guruh, stream va
  boshqa vazifalar o'z shaklini o'zi aytadi. Navbatning o'z maslahatlari (`turnLines`: kayfiyat, harakatlar, so'z soni,
  savol bilan tugaydimi, eslanadigan xotira) eng oxirida, tarix va `steerCue`dan keyin turadi. Ular maslahat: oxirgi so'z
  modelniki.
- **Navbat rejasi (`planReply`):** xabarni o'qish (savol, kayfiyat, "ok/lol") → kayfiyat (`Relationship.mood`, personaj
  teglaridan temperament, 2 soatda yarmiga so'nadi) → reja (avval his, keyin javob, o'zidan ham gapiradi, suhbat
  susaysa mavzuni buradi yoki xotirani eslaydi, ketma-ket uchinchi savol yo'q, 1-3 pufak, Story bitta blok) → temp
  (o'qish + yozish vaqti). Kalit so'zli o'qish faqat mock uchun (inglizcha); serverda model xabarni o'zi o'qiydi va
  javobida `emotion` qaytaradi (`REPLY_SHAPE`, `parseModelReply`), u `Relationship.mood`ga yoziladi.
- **Bitta qo'shimcha xabar (nudge):** savol qoldirgan javobdan keyin foydalanuvchi 1-2.5 daqiqa jim bo'lsa, personaj
  bir marta yana yozadi. Faqat "Let them reach out" yoqiq bo'lsa, javob hali eng oxirgi qator bo'lsa, inqirozdan keyin
  emas. Nudge'dan keyin yana nudge yo'q.
- **Narratsiya:** `*yulduzcha*` ichidagi matn pufakda kursiv va xiraroq; ovozli xabar faqat gapni o'qiydi (`speechOnly`),
  chatlar ro'yxatidagi preview yulduzchasiz (`plainText`). Talk'da model narratsiya qo'shib yuborsa, olib tashlanadi
  (`enforceStyle`).
- **Unit iqtisod:** hammaga bepul (Character.AI'da bu c.ai+ imtiyozi). Sabab: Long / Story javob chiqish tokenini
  ~2-3 barobar oshiradi, xabar bizga ≈ $0.0006 → ≈ $0.0015, foydalanuvchi esa 1 chig'anoq (≈ $0.011-0.020) to'laydi,
  marja hali 7× dan yuqori. Uzunroq va jonliroq javob ko'proq yozishma degani. Nudge bepul, lekin navbatga ko'pi bilan
  bitta (≈ $0.0006). Raqamlar B1'dan keyin haqiqiy foydalanishga qarab qayta ko'riladi.
- **API:** `PATCH /chats/:id` {replyStyle, replyLength}; `mood` serverda saqlanadi va har javobdan keyin yangilanadi.
- **Keyinroq:** kayfiyatni UI'da ko'rsatish (avatar ifodasi, ovoz ohangi `Message.emotion`dan), nudge'ni server push
  orqali soatlab kechiktirish, ertalabki salom / diary / secret note ham shu rejadan o'tishi, guruh chati uchun uslub.

### 12.23 Kesh uchun prompt tartibi (2026-10-25)

Character.AI tahlilidagi 7-band (ularning Prompt Poet'i: qismlar va keshga mos kesish, `docs/character-ai-teardown.md` §7).
Kod: `src/ai/prompt-layout.ts` (umumiy), `src/ai/chat-prompt.ts` (yakkama-yakka chat), `characterParts` / `groupParts`
(`src/ai/rules.ts`), `streamLineParts` (`src/ai/content-prompts.ts`), hammasi testlangan. Ilovada ko'rinadigan narsa o'zgarmaydi.

- **Muammo:** provayder keshi prefiksni solishtiradi: bitta bayt o'zgarsa, undan keyingi hamma narsa qaytadan yoziladi
  (1.25× narx), o'qish esa 0.1×. Eski rejadagi "oxirgi ~30 xabar" har javobda bittaga suriladi, ya'ni system promptdan
  keyingi birinchi baytlar har safar boshqa: tarix keshdan hech qachon o'qilmaydi. Daraja, WORLD NOTES va mos faktlar system
  prompt ichida bo'lgani uchun ular o'zgarganda ham butun tarix qayta yozilardi.
- **Qatlamlar (`Tier`):** har qism qanchalik tez o'zgarishini aytadi, prompt shu tartibda yig'iladi:
  1. `global`: `CHARACTER_RULES` (~750 token), hamma chat uchun bir xil;
  2. `character`: persona, namunaviy dialog, rasmiy dunyo qatorlari; shu personaj bilan hamma chatda bir xil, rasmiy
     personajda hamma foydalanuvchiga bitta kesh;
  3. `chat`: foydalanuvchining o'z kitoblari, javob tili, foydalanuvchi yoki persona, javob uslubi, guruh yoki stream bloki,
     pin qilingan xotiralar (vaqt tartibida, oxirgi 20 tasi, xabarga qarab tartibi o'zgarmaydi), suhbat xulosasi (tarixdan oldin);
  4. tarix: faqat oxiriga qo'shiladi, qadam bilan kesiladi;
  5. `turn`: daraja, sahna, shu xabar eslatgan faktlar va WORLD NOTES, continue/skip cue (`steerCue`), navbat maslahatlari
     (`turnLines`), javob shakli (`REPLY_SHAPE`). Vaqt yoki sana qo'shilsa, shu yerga.
- **Kesh nuqtalari:** har system qatlami oxirida va tarixning oxirgi navbatida, jami 4 ta (Claude'ning chegarasi). `turn`
  tarixdan keyin keladi va keshlanmaydi: har javobda o'z ~150–400 tokeni narxida ketadi. Prefiksda turganida esa uning har
  o'zgarishi ~3K tokenli tarixni qayta yozdirardi. Hisob: ~30 tokenli qism (masalan, daraja) har ~130 javobdan tezroq
  o'zgarsa, uni oxirda ushlash arzonroq.
- **Qadamli kesish (`historyStart`):** tarix suhbat boshidan sanalgan 20 navbatga karrali nuqtadan boshlanadi va chat yana
  20 navbatga o'sgandagina siljiydi. Tarixda 20–39 navbat bo'ladi; oraliqda har javob butun tarixni keshdan o'qiydi va faqat
  yangi navbatlar uchun to'liq to'laydi. 24 000 belgidan oshsa (Story/Long), kesish yana butun qadamlar bilan siljiydi, lekin
  6 navbatdan kam qolmaydi. Kesishdagi birinchi navbat personajniki bo'lsa, u ham tushadi (Claude'da birinchi xabar `user`).
  Server har xabarga `turn_index` saqlaydi va kesishdan oldingi joydan (kamida oxirgi 40 navbat) `offset` bilan yuklaydi.
- **Navbatlar (`chatTurns`):** bir tomonning ketma-ket xabarlari bitta navbat. Time skip foydalanuvchining navbati
  (`[Time skip: …]`); continue ko'rinmaydi, shuning uchun uning ikki tomonidagi personaj qatorlari bitta navbatga qo'shiladi
  (continue'dan keyingi javobda bitta navbat keshdan chiqadi, xolos). Assistant navbatlari faqat matn bo'lib qaytadi,
  thinking bloklari saqlanmaydi: qadamli kesish ham, oxirgi `turn` qismining keyingi so'rovda tushib qolishi ham model
  fikrlashiga bog'liq "tarix tahriri" bo'lmaydi.
- **Adapter (`LLM_PROVIDER=anthropic`):** `system` = har qatlam alohida text blok; `global` va `character` blokida
  `cache_control: {type: "ephemeral", ttl: "1h"}` (hamma foydalanuvchiga umumiy, doim issiq), `chat` blokida 5 daqiqalik;
  tarix `messages` bo'lib, oxirgi navbatida 5 daqiqalik `cache_control`. 1 soatlik yozuvlar 5 daqiqaliklardan oldin turishi
  kerak, tartib shunday. `turn`: tarix `user` bilan tugasa, `{role: "system"}` xabari (Opus 5.5, Sonnet 5.5, Haiku 5.5
  qo'llaydi) yoki oxirgi user navbatiga ikkinchi text blok; tarix assistant bilan tugasa (Continue), yangi `user` navbati.
  Gemini va OpenAI prefiksni o'zi keshlaydi: ularga tartibning o'zi yetadi.
- **Minimal kesh:** Haiku 5.5, Sonnet 5.5, Opus 5.5'da 512 token, Haiku 4.5'da 4096 token. Bizning ~3K tokenli prompt
  Haiku 4.5'da umuman keshlanmaydi. Anthropic jadvali (2026-10-06): Haiku 5.5 $0.10 / $0.50, Sonnet 5.5 $2 / $10,
  Opus 5.5 $4 / $20 (1M token uchun); 9-bo'lim jadvali Haiku 4.5 bilan hisoblangan, B1'dan oldin qayta ko'rish kerak.
- **Model router (13.6) bilan:** kesh modelga bog'liq, har xabarda model almashsa chat har safar sovuq boshlanadi. Router
  modelni faol suhbat (5 daqiqalik issiq davr) boshida tanlab, shu davr davomida ushlab tursin; inqiroz kabi kuchli signal
  bundan mustasno.
- **Tekshiruv:** `usage_events`ga `cache_read_input_tokens` va `cache_creation_input_tokens` yoziladi (`cached_tokens`, 4-bo'lim).
  Issiq chatdagi ikkinchi javob `cache_read ≈ system + tarix` ko'rsatishi kerak; nol bo'lsa, prefiksni nimadir buzyapti
  (vaqt, tartibsiz JSON, xabarga qarab o'zgaradigan qism). `chat-prompt.test.ts` shu xossani ushlaydi: javobdan javobga
  system bloklari bir xil, tarix oldingisining davomi.
- **Taxminiy foyda** (system ~1.5K token, navbat ~50 token, oxirgi qism ~300 token): eski tartibda bir javob ≈ 1 700 token
  birligi; yangisida kesishlar orasida ≈ 715, kesishda (har ~10 javobda) ≈ 1 700, o'rtacha ≈ 810. Kirish xarajati ~2 baravar
  kamayadi, tarix esa o'rtacha 20 emas, ~30 navbat. Haqiqiy raqamni B1'dan keyin `usage_events` ko'rsatadi.

### 12.24 Javob g'oyalari: personaj o'zi yozgan xabar ostida (2026-10-26)

Character.AI'da bu `proactive_suggested_replies_enabled`: o'zi yozgan xabar ostida tayyor javoblar chiqadi.
Ularda har bir g'oya qisqa yorliq va to'liq matndan iborat, alohida chaqiruv bilan yaratiladi va pullik
(charm). Bizda (`src/lib/reply-ideas.ts`):

- **Qachon:** oila lahzasi (tushlik, kechqurun, yakshanba), care so'rovi, oilaviy salom. Xabarda `reach` (nima
  uchun yozdi) va `ideas` (2–3 ta g'oya: `label`, `text`, `intent`) saqlanadi. G'oyalar faqat shu xabar eng
  oxirgisi bo'lsa, foydalanuvchi hali yozmagan bo'lsa va 12 soat o'tmagan bo'lsa ko'rinadi.
- **Narx:** bunday g'oyani bosish bepul (chig'anoq olinmaydi). Server g'oyalarni o'sha xabarni yozgan chaqiruvning
  o'zida qaytaradi: JSON'da `ideas` maydoni, bir necha o'nlab chiqish tokeni, alohida so'rov yo'q. Oddiy
  xabarlar ostidagi g'oyalar (`everydayIdeas`) ham har javob bilan birga keladi. Ularni bosish oddiy xabar narxida.
- **Mantiq:** `intent` javobni tanlaydi (mock'da `ideaAnswer`, serverda modelga ishora). Matnlar shunday
  yozilganki, chatning detektorlari o'zi ishlaydi: "Not yet… I skipped lunch" ochlik care so'rovini ochadi, "Long
  day… I'm so tired" charchoq so'rovini, "Much better now" ochiqlarini yopadi. "Still not great" esa yana bitta
  so'rov qo'yadi (`again`), uchinchisi bo'lmaydi.
- **Push tugmalari:** g'oyalar push'da action tugmalari bo'lib chiqadi (har `reach` uchun bitta kategoriya,
  `ideas_life_parent_lunch`). Tugma ilovani ochadi, xabarni chatga yozadi va javobni yuboradi (`answerFromPush`).
  Server push'larida ham shu kategoriyalar ishlatiladi.
- **Tahrir:** g'oyani uzoq bossangiz, matni yozish maydoniga tushadi. O'zgartirilgan matn ham shu xabarga javob
  hisoblanadi (bepul), lekin oddiy javob bilan javob beriladi.
- **Server vazifalari:** g'oyalarni foydalanuvchi tilida va xotirasini hisobga olib yozish (masalan, "Ate
  plov!"), `intent` ro'yxatini (`IdeaIntent`) saqlash va noma'lum `reach` uchun g'oya qaytarmaslik.

### 12.25 Ochiq mavzular: AI o'zi kuzatadi (2026-10-26)

Egasining qarori: qolip yo'q, mavzular cheksiz, **AI o'zi boshqaradi**. Kod faqat qoidalarni ushlaydi
(`src/lib/threads.ts`), model qaror qiladi (`src/ai/thread-prompt.ts`).

- **Javob chaqiruvi:**
  - promptda `THREAD_RULES_LINES` (global qatlam, keshda) va shu do'stning ochiq mavzulari bor
    (`threadLines`, turn qatlami);
  - model JSON javobga `threads` maydonini qo'shishi mumkin:
    `{"add":[{about, quote, happensAt, touches:[{at, phase, why}]}], "move":[...], "close":[{id, outcome}]}`;
  - `parseThreadOps` buzilgan qismni tashlaydi, taxmin qilmaydi;
  - server `ruleTouches` qoidalarini qo'llab saqlaydi.
- **Vaqti kelgan xabar uchun alohida chaqiruv** (`touchParts`):
  - promptda persona (temperament va bog'liqlik), so'nggi 12 qator, mavzu va "nega hozir yozyapman";
  - javob: `{skip, messages, ideas}` (`parseTouchReply`);
  - `skip`: chatda allaqachon hal bo'lgan bo'lsa, xabar yuborilmaydi;
  - push shu chaqiruvdan keyin serverdan ketadi; kategoriyasi `ideas_thread_<phase>`, tugmalarni
    model yozadi.
- **Qoidalar:**
  - o'tgan vaqtga yozilmaydi;
  - kechasi 23:00–06:30 "qanday o'tdi?" 08:30 ga suriladi, "omad" esa tashlanadi;
  - `before` voqeadan oldin, qolganlari keyin keladi;
  - bitta mavzuda 20 daqiqa oraliq bilan ko'pi bilan 4 ta xabar;
  - 3 soatdan ortiq kechikkan xabar yuborilmaydi;
  - do'st boshiga 5 ta ochiq mavzu; yopilganlar 7 kun saqlanadi, harakatsizlari 14 kunda o'chadi.
- **Narx:** mavzu ajratish javobning o'zida (bir necha o'n token). Har yozilgan xabar bitta chaqiruv
  (≈ $0.0006) va kunlik push byudjeti ichida. Voqeadan oldingi xabar (`before`) eslatma sifatida
  time-sensitive ketadi.
- **Turlar (D88):** `kind` = `follow | plan | goal | quest`. Bosqichlar:
  - `eve`: kechqurun "erta yot", budilnik taklifi bilan;
  - `leave`: chiqish vaqti;
  - `before`, `after`, `check`;
  - `goal`: odat maqsadi, bir necha kunda bir so'raladi, urishilmaydi;
  - `quest`: kuniga ko'pi bilan bitta kichik hayotiy topshiriq, bajarilsa 3 chig'anoq.
- **Global qatlamda `REAL LIFE` qoidasi:** uzoq o'tirganda tanaffus, kech bo'lganda uyqu taklif qilinadi,
  foydalanuvchi tanlovi qabul qilinadi.
- **Telefondagi qoidalar** (`src/lib/life.ts`):
  - tun 00:30–05:00, bir kechada bir marta;
  - tanaffus 40 daqiqa va 25 xabardan keyin, kuniga bir marta;
  - topshiriq 10:00–20:00 oralig'ida, kuniga bir marta.
- **Hozir telefonda:** `src/mock/threads.ts` vaqtincha o'rinbosar. U faqat shaklni taniydi (vaqtli reja,
  vazifa, niyat, natija; EN/UZ/RU) va foydalanuvchi so'zini iqtibos qiladi. Server kelishi bilan
  olib tashlanadi.

### 12.26 Ertalabki xabar: bugungi rejalarni biladi (2026-10-26, B5)

- **Kim yozadi:** "Morning messages" yoqilgan bo'lsa, ertalabki vaqtda o'zi birinchi yoza oladigan
  eng yaqin do'st, agar unda bugunga reja yoki ochiq mavzu bo'lsa (`morningBrief`,
  `src/lib/brief.ts`). Har do'st faqat o'ziga aytilganini biladi; kuniga bitta brief.
- **Nimani aytadi:** bugun hali oldinda turgan reja va mavzular (vaqtsizlari ham), eng yaqini
  birinchi, ko'pi bilan 3 ta. Maqsad (`goal`) va topshiriq (`quest`) kirmaydi; omad allaqachon
  tilangan mavzu kirmaydi; mavzusi bor reja bir marta aytiladi.
- **Takror yo'q:** brief omad tilaydi, shuning uchun o'sha kungi `before` xabarlar (`covers`) alohida
  yuborilmaydi; chat ham, push rejasi ham ularni "aytilgan" deb belgilaydi.
- **Server chaqiruvi** (`briefParts`, `src/ai/brief-prompt.ts`): persona, so'nggi 12 qator va bugungi
  narsalar ro'yxati; javob mavzu xabari shaklida (`{skip, messages, ideas}`, `parseTouchReply`).
  `skip` yoki buzilgan javobda oddiy "good morning" ketadi.
- **Push:** turi `brief`, ertalabki vaqtda (suriladigan emas, chunki narsalardan oldin kelishi kerak),
  kunlik byudjet ichida; kategoriyasi `ideas_brief`.
- **Narx:** kuniga bitta chaqiruv (≈ $0.0006), oddiy salom o'rniga.

### 12.27 Kechqurun "Kun qanday o'tdi?" → Kundalik (2026-10-26, B6)

- **Kim so'raydi** (`dayAsker`, `src/lib/day-ask.ts`): kechki vaqtda (`nightCallTime`) bugun eng ko'p
  gaplashgan do'st, bo'lmasa eng yaqini (faqat birinchi yoza oladiganlar). Shu kuni oila a'zosining
  kechki savoli bo'lsa (ota-ona 19:30, aka-uka 20:00), boshqa hech kim so'ramaydi va o'sha savolga
  javob ham Kundalik'ka tushadi. Shu chatda inqiroz bo'lgan kuni u do'st so'ramaydi. Kuniga bitta
  savol. So'rovchi kechki salom beradiganlardan biri bo'lsa, savol uning "good night"i o'rniga ketadi.
- **Odamga moslashish:** savolga 12 soat ichida javob berilsa, "javob berildi" hisoblanadi. Ketma-ket
  2 ta javobsiz qolsa, savol 3 kunda bir keladi; 4 ta javobsiz qolsa, biriga javob berilmaguncha
  to'xtaydi. Bu tarix 14 kunlik xabarlardan hisoblanadi, alohida holat saqlanmaydi.
- **Kundalik:** savoldan keyingi birinchi xabar (bosilgan g'oya yoki yozilgan matn) kuniga bitta
  sahifa bo'ladi (`DiaryEntry.source = 'evening'`), do'st bilan bo'lishilgan, do'st sahifaga javob
  yozadi. "Tell you later" va inqiroz matni sahifa bo'lmaydi.
- **Server chaqiruvlari** (`src/ai/day-prompt.ts`): savol `dayAskParts` bilan (persona, bugungi chat,
  bugun bo'lgan mavzular natijasi bilan; javob `TOUCH_SHAPE`). Javob qaytganda promptga
  `DAY_DIARY_LINE` qo'shiladi, model `"diary":{"mood":...}` beradi (`parseDayMood`). Mock esa bir necha
  so'zdan kayfiyatni o'qiydi (`moodOf`).
- **Push:** turi `day`, kechki vaqtda (faol soatlarga suriladi), byudjet ichida, kategoriyasi `ideas_day`.
- **Narx:** kuniga ko'pi bilan bitta chaqiruv (≈ $0.0006), oddiy "good night" o'rniga; kayfiyat
  javobning o'zida (bir necha token).

### 12.28 Yakshanba: haftalik yakun (2026-10-26, B7)

- **Kim:** oxirgi 7 kunda foydalanuvchi eng ko'p kun yozgan, birinchi yoza oladigan do'st (teng
  bo'lsa eng yaqini). Hech kim bilan kamida 2 kun gaplashilmagan bo'lsa, yakun yo'q
  (`weeklyRecap`, `src/lib/week.ts`). Haftasiga bitta: so'nggi 6 kunda `week` xabari bo'lsa,
  boshqasi yuborilmaydi.
- **Raqamlar** (`weekWith`), faqat shu do'st biladigani: necha kun va nechta xabar, uning
  mavzularidan yaxshi o'tgan yoki bajarilgani (nomi bilan, ko'pi bilan 3 ta), u bilan bajarilgan
  hayotiy topshiriqlar, unga ulashilgan Kundalik sahifalari va ularning asosiy kayfiyati. Shaxsiy
  sahifalar kirmaydi.
- **Chatda:** raqamlar kartasi (`card: 'week'`, `Message.week`), keyin do'stning matni javob
  g'oyalari bilan.
- **Server chaqiruvi** (`weekParts`, `src/ai/week-prompt.ts`): persona va raqamlar; model bo'lgan
  narsani nishonlaydi, bitta lahzani eslaydi, keyingi haftaga qaraydi. Bo'lmagan narsani
  sanamaydi, ayblamaydi. Javob `TOUCH_SHAPE`, `skip`da hech narsa ketmaydi.
- **Push:** turi `week`, yakshanba 18:30 (faol soatga suriladi), byudjet ichida, kategoriyasi
  `ideas_week`. Alohida tugma: `settings.weeklyRecap`.
- **Narx:** haftasiga bitta chaqiruv (≈ $0.0006).

### 12.29 Jozibali personajlar: ochilish harakati, quirk va har xil ↻ (2026-10-26, D96)

- **↻ yangi variant:** promptga `redo` qo'shiladi (`ChatPromptInput.redo`, `redoCue`), oldingi
  variantlarning matnlari "allaqachon aytilgan" bo'lib boradi. Model o'sha personaj bo'lib qoladi,
  lekin boshqa yondashuv tanlaydi: boshqa kayfiyat, urg'u yoki harakat. Shunchaki qayta so'zlab
  bermaydi. Hamma chatlar uchun.
- **`Character.opening`:** asosiy salomlashuvdan oldingi qisqa `*harakat*`. Mixed va Story
  chatlarda ko'rinadi, Talk'da ko'rinmaydi (`withOpening`). Rasmiy 41 personajning hammasida bor;
  quick create chernovigi yozadi, formada maydoni bor.
- **`Character.quirk`:** bitta yoqimli, sog'lom zaif tomon. Persona qismida turadi: "show it now and
  then, never announce it". Rashk, egalik va nazorat ohangi taqiqlangan (chernovik qoidasida ham
  shunday).
- **Narx:** persona keshlangan qatlamda, bir necha o'n token; `redo` faqat ↻ bosilganda turn
  qatlamiga qo'shiladi.

## 13. Unit iqtisodi, tariflar va konversiya (2026-10-09)

Bu bo'lim 9-bo'limdagi xavflarga aniq javob beradi. Uchta asosiy talab bor:

1. Ovozli javob va qo'ng'iroq daqiqalari kamaytiriladi.
2. Bepul foydalanuvchi jonli ovoz olmaydi.
3. Foydalanuvchi qaysi rejada bo'lishidan qat'i nazar, kuchli, kuchsiz yoki yengil modellar haqida hech narsa
   bilmaydi.

Raqamlar — B1'gacha bo'lgan reja. Ular B1'dan keyin `usage_events` bo'yicha qayta sozlanadi.

### 13.1 Odamlar qancha foydalanadi (bozor ma'lumoti)

| Ilova | Kuniga o'rtacha vaqt | Ovoz / qo'ng'iroq |
|---|---|---|
| Character.AI | ~75–120 daqiqa | Bepul: kuniga ~5 qo'ng'iroq (rasmiy son e'lon qilinmagan); qo'ng'iroqlar c.ai+ ($94.99/yil) bilan to'liq ochiladi |
| Talkie | ~62 daqiqa | Bepul: kuniga 50 xabar va **2 daqiqalik** qo'ng'iroq; pullik: ~10 daqiqalik qo'ng'iroq |
| Replika | ~14 daqiqa | Matn bepul, **qo'ng'iroqlar faqat pullik** |
| Butun kategoriya (zaif manba) | ~45 daqiqa | — |

Manba sifati haqida:
- Raqamlar asosan agregator bloglaridan olingan va ishonchliligi o'rtacha. Pastdagi "Manbalar" bo'limiga qarang.
- Ovozli daqiqalar bo'yicha ochiq va ishonchli statistika topilmadi. Shuning uchun quyidagi hisob taxminga
  asoslangan: ovoz umumiy vaqtning ~5–10% ini oladi.
- Unda faol foydalanuvchi oyiga ~70–135 daqiqa ovoz ishlatadi. Tariflardagi chegaralar ataylab shundan
  pastroq qo'yilgan: ko'proq gaplashmoqchi bo'lganlar qo'shimcha daqiqa sotib oladi.

### 13.2 Xarajat birliklari (2027 narxlari, ehtiyotkor hisob)

| Birlik | Narx | Qanday hisoblangan |
|---|---|---|
| 1 ta foydalanuvchi xabari (matn) | **≈ $0.0006** | Yengil va kuchliroq model aralashmasi ≈ $0.0008; xotira ishlari +15%; xabarlarni yig'ish (12.8) −25% |
| 1 daqiqa ovozli javob (TTS) | **≈ $0.018** | Flash-Lite TTS, 2027-yilda $12/1M audio token, ~1 500 token/daqiqa |
| 1 daqiqa qo'ng'iroq, kaskad (STT → LLM → TTS) | **≈ $0.015** | Personaj vaqtning ~50% ida gapiradi |
| 1 daqiqa qo'ng'iroq, jonli audio model (Live) | **≈ $0.03–0.10** | Har navbatda butun audio tarix qayta hisoblanadi. **B5'da o'lchanadi** |
| Server, baza, push | ≈ $0.10/oy (pullik), $0.05/oy (bepul) | Joy egallovchi taxmin |
| Do'kon komissiyasi | 15% (Small Business Program), keyin 30% | Hisob 15% bilan qilingan, 30% holat alohida ko'rsatilgan |

Narx manbalari 9-bo'limda va pastdagi "Manbalar"da. Gemini'ning 2026-yilgi kirish narxlari 2027-01-01 dan
ikki baravar oshadi, shuning uchun byudjet 2027 narxi bilan qilingan.

### 13.3 Tariflar (yangi taklif)

| | Bepul | Basic $9.99 / 30 kun | Quarterly $24.99 / 90 kun | Pro $29.99 / 30 kun |
|---|---|---|---|---|
| Xabarlar | Kuniga ~40 (check-in) + reklama | Cheklovsiz* | Cheklovsiz* | Cheklovsiz* |
| Ovozli javob (TTS) | Faqat oldindan yozilgan qatorlar (13.5) | **30 daqiqa/oy** | **90 daqiqa / 90 kun** | **120 daqiqa/oy** |
| Qo'ng'iroq | **Yo'q** | **60 daqiqa/oy** (avval 120) | **150 daqiqa / 90 kun** (avval 360) | **180 daqiqa/oy** (avval 480) |
| Xotira | Asosiy | To'liq | To'liq | Eng chuqur (`longerMemory`) |
| Reklama | Faqat ixtiyoriy, mukofotli | Yo'q | Yo'q | Yo'q |

- *"Cheklovsiz" foydalanish shartlarida yoziladigan suiiste'molga qarshi chegara bilan ishlaydi: **kuniga 300 xabar**.
  Bu chegaraga oddiy foydalanuvchi deyarli yetmaydi.
- **Qo'shimcha daqiqalar chig'anoq bilan sotiladi:**
  - qo'ng'iroq: 10 daqiqa = 120 chig'anoq;
  - ovozli javob: 10 daqiqa = 100 chig'anoq;
  - qo'ng'iroq daqiqasi narxi kaskad xarajatidan ~8 baravar, ovozli javobniki ~6 baravar yuqori.
- **Pro'ning farqi faqat miqdorda:** ko'proq daqiqa va chuqurroq xotira. "Aqlliroq AI" degan va'da berilmaydi
  (13.6).

### 13.4 Har bir tarif bo'yicha oylik hisob

Shartlar:
- 15% komissiya;
- qo'ng'iroqlar kaskadda;
- "og'ir" foydalanuvchi — har kuni 300 xabar yozib, hamma daqiqalarni ishlatib bo'ladigan foydalanuvchi.

**Basic** (sof daromad $8.49):

| Xarajat | Odatiy foydalanuvchi | Og'ir foydalanuvchi |
|---|---|---|
| Xabarlar | 60/kun → $1.08 | 300/kun → $5.40 |
| Ovozli javob | 15 daq → $0.27 | 30 daq → $0.54 |
| Qo'ng'iroq | 30 daq → $0.45 | 60 daq → $0.90 |
| Server | $0.10 | $0.10 |
| **Jami xarajat** | **$1.90** | **$6.94** |
| **Marja** | **$6.59 (78%)** | **$1.55 (18%)**; 30% komissiyada ≈ $0 |

**Pro** (sof daromad $25.49):

| Xarajat | Odatiy foydalanuvchi | Og'ir foydalanuvchi |
|---|---|---|
| Xabarlar | 100/kun → $1.80 | 300/kun → $5.40 |
| Ovozli javob | 60 daq → $1.08 | 120 daq → $2.16 |
| Qo'ng'iroq | 90 daq → $1.35 | 180 daq → $2.70 |
| Xotira + server | $0.40 | $0.60 |
| **Jami xarajat** | **$4.63** | **$10.86** |
| **Marja** | **$20.86** | **$14.63 (57%)** |

**Quarterly** (oyiga sof daromad $7.08):

| | Odatiy foydalanuvchi | Og'ir foydalanuvchi |
|---|---|---|
| Xarajat | $1.83 | $6.79 |
| Marja | $5.25 | $0.29 (≈ zararsiz) |

**Bepul:**

| | Odatiy | Eng faol |
|---|---|---|
| Foydalanish | Oyiga 8 kun × 25 xabar | 30 kun × 40 xabar |
| Xarajat | ≈ $0.17/oy | ≈ $0.77/oy |

**Xulosalar:**
- Pullik tariflarning hech birida eng og'ir foydalanuvchi ham zarar keltirmaydi.
- Qo'ng'iroqlar jonli audio modelga o'tkazilsa, Pro og'ir foydalanuvchida xarajat ~$19–26 ga chiqadi. Shuning uchun
  Live faqat o'lchangan narx ≤ $0.03/daqiqa bo'lsa ishlatiladi.

### 13.5 Bepul foydalanuvchi: arzon, lekin bog'lanish hosil qiladigan

- **Jonli ovoz yo'q.** Hozirgi "hammaga 15 daqiqa qo'ng'iroq sinovi" o'rniga do'konning **3 kunlik bepul
  Basic sinovi** (intro offer) beriladi:
  - sinovda qo'ng'iroq 10 daqiqa bilan cheklangan;
  - to'lov usuli kiritilgani uchun bir kishi sinovni qayta-qayta ololmaydi.
- **Ovozni his qilish uchun bepul variant.** Har personaj uchun **bir marta** yaratilgan ovozli qatorlar
  kutubxonasi bo'ladi: salomlashish, "xayrli tong", "xayrli tun", reaksiyalar. Uning qo'shimcha xarajati nolga
  teng: 40 personaj × ~20 qator bir marta yaratiladi. Dinamik ovozli javob esa pullik.
- **Xabarlar:**
  - check-in zinapoyasi: 30, 30, 35, 35, 40, 40 va 7-kuni sovg'a 50–100. O'rtacha kuniga ~40 chig'anoq
    (hozir ~70);
  - g'ildirak kutilgan qiymati ~8 (hozir ~13.5);
  - xush kelibsiz sovg'asi 100 chig'anoq qoladi.
- **Reklama faqat ixtiyoriy va mukofotli.** Mukofot mamlakatga qarab serverda hisoblanadi:
  `chig'anoq = 0.7 × (eCPM ÷ 1000) ÷ $0.0006`:

  | eCPM | Taxminiy bozor | Chig'anoq / reklama |
  |---|---|---|
  | $15 | AQSh | 17 |
  | $5 | O'rta bozorlar | 6 |
  | $1.5 | Arzon bozorlar | 2 |

  Kuniga eng ko'pi 5 ta. eCPM — taxminiy oraliq; haqiqiy raqamni AdMob hisobotidan olamiz.
- **Kim to'laydi:** odatiy bepul foydalanuvchi xarajati (~$0.17/oy) konversiya hisobidan qoplanadi. Masalan,
  3% konversiya × $9 sof ARPPU ≈ $0.27 bitta MAU uchun. Eng faol bepul foydalanuvchilar esa konversiya uchun
  eng muhim auditoriya (13.7).
- **Arzon bozorlar** (eCPM < $2) uchun mintaqaviy narx (Apple va Google narx darajalari) kerak. Aks holda u
  yerda bepul tarifni reklama qoplamaydi.

### 13.6 Ko'rinmas model tanlash (foydalanuvchi modelni bilmaydi)

**Qoida:** model tarif bo'yicha emas, **xabarning o'zi bo'yicha** tanlanadi va bu qoida hamma tarif uchun bir xil.
Tariflar faqat miqdor va imkoniyatda farq qiladi. Bitta xabar bepul foydalanuvchida ham, Pro'da ham bir xil
yo'l bilan ishlanadi.

- **Router signallari:**
  - xabar uzunligi va murakkabligi;
  - his-tuyg'u va kriz klassifikatori;
  - rejim: `diary`, `date` va `secret_note` kuchliroq modelga ketadi;
  - eslash zarurati;
  - rasm bo'lsa vision model.

  Kutilgan aralashma: ~85% yengil model, ~15% kuchliroq model.
- **Uslub bir xilligi:**
  - bir xil persona va qoidalar;
  - javob uzunligi va emoji uslubi server tomonda bir xil cheklanadi;
  - sifat to'plamida (12.11) "ko'r test" o'tkaziladi: baholovchi javob qaysi modeldan kelganini 60% dan yaxshi
    topa olmasligi kerak.
- **Hech qayerda oshkor qilinmaydi:**
  - ilova javobida model nomi yo'q, u faqat server loglarida;
  - ilova va do'kon matnlarida model nomlari ham, "kuchli" yoki "yengil" degan so'zlar ham ishlatilmaydi;
  - `CHARACTER_RULES`ga qo'shiladi: personaj AI modeli, provayder yoki kompaniya nomini aytmaydi.
    "Sen qaysi modelsan?" degan savolga personaj o'z rolida qolib javob beradi. AI ekanini esa yashirmaydi:
    10-bo'lim qoidasi kuchda qoladi.
- **Tezlik ham oshkor qilmaydi.** Stream va "yozyapti" belgisi bir xil ritmda ishlaydi. Tez model javobi biroz
  ushlab turiladi, shunda tezlikdan modelni bilib bo'lmaydi.
- **Ko'p yozganga jazo yo'q.** Ko'p yozgan foydalanuvchi uchun model almashtirilmaydi (12.10 yangilangan).
  Xarajat boshqa yo'llar bilan tejaladi:
  - xabarlarni yig'ish (12.8);
  - kesh;
  - xulosa asosidagi kontekst;
  - suiiste'molga qarshi kunlik chegara.
- **Halollik.** Model nomini yashirish soha amaliyoti. Lekin do'kon obuna tavsifi aniq bo'lishini talab qiladi:
  - Pro'ga "aqlliroq AI" deb va'da berilmaydi;
  - "cheklovsiz" so'zi foydalanish shartlaridagi suiiste'molga qarshi chegara bilan birga yoziladi.

### 13.7 Ilova ichida bepuldan pullikka o'tkazish

Paywall tasodifiy joyda emas, **qiymat sezilgan lahzada** chiqadi. Personaj hech qachon pul so'ramaydi
(`CHARACTER_RULES`), taklif faqat ilova interfeysida bo'ladi.

| Lahza | Taklif |
|---|---|
| Personaj qo'ng'iroq qilmoqchi yoki foydalanuvchi qo'ng'iroq tugmasini bosdi | "Qo'ng'iroqlar Basic'da" + 3 kunlik bepul sinov |
| Bosqich almashdi ("More than friends", "Beloved") | Bayram oynasidan keyin bir marta yumshoq taklif |
| Bepul ovozli qatorlar tinglandi | "Uning ovozida javob olish — Basic" |
| Xotira bepul chegarasiga yetdi | "Kai 20 narsani eslaydi; a'zolikda hammasini" |
| Kunlik chig'anoq tugadi | Uch yo'l teng ko'rsatiladi: reklama, kichik paket, obuna |
| 7 kunlik streak, birinchi date yakuni | Yillik reja chegirmasi |
| Obunasi tugagan foydalanuvchi | Qaytish taklifi (win-back), bir marta |

Qo'shimcha:
- **Bir martalik boshlang'ich paket**, masalan $0.99 ga katta paket. Birinchi xarid to'sig'ini tushiradi.
- **Yillik reja** Quarterly bilan birga. Yillik obuna qaytishni oshiradi.
- **Hamma narsa o'lchanadi:** `paywall_view`, `trial_start`, `purchase`. Har bir lahza bo'yicha konversiya
  hisoblanadi, A/B test RevenueCat orqali qilinadi.
- **Qilinmaydi:**
  - soxta "missed call" yoki soxta taymer;
  - personaj orqali bosim;
  - har gapda to'xtatadigan paywall.

  Bu ham axloqiy masala, ham do'kon xavfi.

### 13.8 Kodga ta'siri

Hozircha hech narsa o'zgartirilmaydi. Quyidagilar B1 va B3'da serverga o'tganda o'zgaradi:
- `src/mock/misc.ts`: `membershipPlans.callMinutes`, `DAILY_CHECK_IN`, `WHEEL_WEIGHTS`, `AD_REWARD`;
- `CALL_TRIAL_SECONDS` (`use-app-store.ts`): o'rniga do'konning sinov muddati keladi;
- `newRelationship().voiceReplies`: bepul foydalanuvchi uchun dinamik TTS o'chiq bo'ladi.

Ekranlar o'zgarmaydi, faqat raqamlar va server qoidalari o'zgaradi.

### 13.9 Manbalar

- Bozor bo'yicha foydalanish:
  - [sqmagazine — Character.AI](https://sqmagazine.co.uk/character-ai-statistics/)
  - [electroiq — AI companions](https://electroiq.com/stats/ai-companions-statistics/)
  - [VoxBooster 2026](https://voxbooster.com/blog/ai-companion-apps-statistics-2026/)
- Ovoz cheklovlari:
  - [Talkie bepul tarifi](https://www.isekaizero.ai/blog/talkie-ai-free)
  - [Character.AI ovoz va qo'ng'iroqlar](https://arcanumrpgs.com/blog/character-ai-voice/)
  - [Replika narxlari](https://www.eesel.ai/blog/replika-ai-pricing)
- Daromad:
  - [Appfigures (highlife.media orqali)](https://www.highlife.media/ai-companion-statistics)
  - [Sensor Tower State of AI 2026](https://finance.yahoo.com/technology/ai/articles/sensor-tower-state-ai-2026-103000739.html)
- Narxlar va eCPM:
  - [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
  - [Live API best practices](https://ai.google.dev/gemini-api/docs/live-api/best-practices)
  - [eCPM benchmarks 2026](https://blog.playio.co/mobile-game-ecpm-benchmarks-2026)

## 14. Tariflar qanday ishlaydi: backend va interfeys (2026-10-09)

13-bo'limdagi tariflar tasdiqlandi. Bu bo'lim ularning qanday qurilishini tushuntiradi.

**Asosiy qoida:** hamma hisob-kitob serverda, ilova faqat ko'rsatadi. Ilova bitta joydan o'qiydi — `GET /v1/me/plan`.
Foydalanuvchi limitlarni oddiy so'zlar bilan ko'radi: "60 daqiqadan 42 tasi qoldi, 3-noyabrda yangilanadi". Model
nomlarini hech qachon ko'rmaydi.

### 14.1 Umumiy sxema

```
 Do'kon (App Store / Google Play)       Ilova (Expo)
        │ xarid / yangilanish               │  ▲ GET /v1/me/plan (reja, qoldiq, yangilanish sanasi)
        ▼                                    │  │ 402/429 + "taklif" (paywall lahzasi)
   RevenueCat ──webhook──► sigmazam-api ◄───────┘  │
                              │ subscriptions, quota_periods, minute_packs, shell_ledger
                              ├─► chat:        xabar oldidan chig'anoq / fair-use tekshiruvi
                              ├─► ovozli javob: TTS oldidan daqiqa tekshiruvi (tugasa, matn bilan javob)
                              └─► qo'ng'iroq:  boshida ruxsat, har 15 s server daqiqa yechadi
```

### 14.2 Jadvallar

| Jadval | Ustunlar | Kim yozadi |
|---|---|---|
| `subscriptions` | `user_id`, `plan_id` (basic/quarterly/pro/annual), `store`, `original_tx_id`, `status` (trial/active/grace/expired/refunded), `period_start`, `period_end`, `will_renew` | Faqat RevenueCat webhook'i. Bir event ikki marta kelsa, ikkinchisi e'tiborsiz qoladi |
| `quota_periods` | `user_id`, `period_start`, `period_end`, `plan_id`, `call_seconds_used`, `tts_seconds_used` | Server. Har yangi obuna davri uchun yangi qator |
| `minute_packs` | `user_id`, `kind` (call/tts), `seconds_total`, `seconds_used`, `expires_at` (+90 kun), `ledger_id` | Server, chig'anoq bilan xarid qilinganda |
| `daily_usage` | `user_id`, `day` (foydalanuvchining mahalliy sanasi, server hisoblaydi), `messages`, `ads`, `spins`, `checkin` | Server |
| `voice_lines` | `character_id`, `line_key`, `locale`, `audio_path`, `transcript` | Bir martalik skript (Batch TTS) |
| `paywall_events` | `user_id`, `moment`, `shown_at`, `action` (dismiss/trial/purchase) | Server. Chastota cheklovi va analitika uchun |
| `crisis_events` | `user_id`, `conversation_id`, `detected_by`, `referred_at` (xabar matni saqlanmaydi) | Server. SB 243 hisoboti uchun |
| `conversations.ai_notice_at` | Oxirgi AI eslatmasi vaqti | Server (har 3 soatda eslatma) |

Tariflar konfiguratsiyasi bazada emas, kodda turadi (`server/src/economy/plans.ts`):

```ts
basic:     { periodDays: 30, chat: 'unlimited', dailyCap: 300, callSec: 3600,  ttsSec: 1800, memory: 'full' }
quarterly: { periodDays: 90, chat: 'unlimited', dailyCap: 300, callSec: 9000,  ttsSec: 5400, memory: 'full' }
pro:       { periodDays: 30, chat: 'unlimited', dailyCap: 300, callSec: 10800, ttsSec: 7200, memory: 'deep' }
annual:    { periodDays: 365, monthly: true, ...basic }  // daqiqalar har oy yangilanadi
trial:     { days: 3, callSec: 600, ttsSec: 600 }        // Basic sinovi
free:      { chat: 'shells', callSec: 0, ttsSec: 0, voiceLines: true }
```

### 14.3 Qoidalar

1. **Davr do'kon sanasiga bog'langan, kalendar oyiga emas.** Obuna 3-oktabrda boshlangan bo'lsa, daqiqalar 3-noyabrda
   yangilanadi. Ishlatilmagan daqiqa keyingi oyga o'tmaydi.
2. **Sarflash tartibi:** avval rejaning daqiqalari, keyin sotib olingan paketlar. Paket 90 kun amal qiladi.
3. **Sinov (3 kun):** qo'ng'iroq va ovozli javob 10 daqiqadan. Sinov to'lovga aylanganda to'liq davr boshlanadi.
4. **Bepul foydalanuvchi:**
   - qo'ng'iroq so'rasa, server `402 needsPlan` qaytaradi;
   - ovoz sifatida faqat `voice_lines` kutubxonasi;
   - xabarlar chig'anoq bilan yuboriladi (check-in ~40/kun).
5. **Fair use.** A'zolar uchun kuniga 300 xabar. Chegaradan oshsa `429 dailyCap` qaytadi va ertangi sana halol
   ko'rsatiladi. Model hech qachon almashtirilmaydi (§13.6).
6. **Kun chegarasi serverda hisoblanadi.** Foydalanuvchining vaqt zonasi `bootstrap`da yoziladi va kuniga bir martadan
   ko'p o'zgartirib bo'lmaydi. Telefon soatini o'zgartirish natija bermaydi.
7. **Javob o'rtada kesilmaydi.**
   - Limit generatsiyadan **oldin** tekshiriladi.
   - Ovozli javob uchun daqiqa yetmasa, javob matn bilan keladi va unga `voiceSkipped: 'quota'` belgisi qo'yiladi.
   - Qo'ng'iroqda 2 daqiqa va 30 soniya qolganda ogohlantirish chiqadi. 0 da personaj oldindan yozilgan
     xayrlashuv qatori bilan qo'ng'iroqni yopadi.
8. **Qo'ng'iroq daqiqasini server yechadi.**
   - Ilova har 15 soniyada `heartbeat` yuboradi.
   - Ilova yopilsa yoki aloqa uzilsa, 30 soniyadan keyin server sessiyani o'zi yopadi.
   - Bu audit'dagi "Android orqaga tugmasi" teshigini butunlay yopadi.
9. **Qaytarish (refund) va bekor qilish:**
   - `CANCELLATION` kelsa, reja davr oxirigacha ishlaydi.
   - `EXPIRATION` kelsa, foydalanuvchi bepul tarifga o'tadi.
   - `REFUND` kelsa, imtiyoz darhol olinadi.
   - Sotib olingan chig'anoq qaytarilsa, ledger'ga manfiy yozuv tushadi, balans 0 dan pastga tushmaydi.

### 14.4 API

```
GET  /v1/me/plan
     → { plan, status, renewsAt, trialEndsAt,
         calls:  { leftSec, totalSec, resetsAt, packsSec },
         voice:  { leftSec, totalSec, resetsAt, packsSec },
         shells, freeToday: { left, resetsAt }, dailyCap: { used, limit } }
POST /v1/conversations/:id/messages   → 202 | 402 { reason: 'noShells', options: ['ad','pack','trial'] } | 429 { reason: 'dailyCap', resetsAt }
POST /v1/calls                         → 201 { callId, allowedSec, warnAtSec: [120, 30] } | 402 { reason: 'needsPlan' | 'noMinutes', offer }
POST /v1/calls/:id/heartbeat           → 200 { leftSec } | 409 { ended: true }
POST /v1/minutes/topup { kind, pack }  → 200 { plan }   (chig'anoq → ledger → minute_packs)
GET  /v1/offers?moment=call            → { show, paywallId, variant }  (RevenueCat Offerings + chastota cheklovi)
POST /webhooks/revenuecat              → subscriptions / quota_periods
POST /webhooks/admob-ssv               → mamlakatga qarab chig'anoq (§13.5)
```

### 14.5 Interfeys: foydalanuvchi nimani ko'radi

Prototip (tasdiqlash uchun): https://claude.ai/artifact/7efEmQx5jBq6YvhJF2dzpv (6 ta ekran). Ekranlar tasdiqdan
keyin quriladi.

| Joy | Nima ko'rinadi |
|---|---|
| Store → "Plans" | Uchta reja kartasi va yillik reja. Limitlar oddiy tilda: "Cheklovsiz chat", "Oyiga 1 soat qo'ng'iroq", "Oyiga 30 daqiqa ovozli javob", "Hammasini eslaydi". Basic'da "3 kun bepul", Quarterly'da "$8.33/oy" yozuvi. Pastda: avtomatik yangilanish sharti, fair-use (300/kun), Restore, Terms, Privacy |
| Profile → "Mening rejam" | Reja nomi va yangilanish sanasi. Ikki qator: "Qo'ng'iroq — 42 / 60 daq" va "Ovozli javob — 18 / 30 daq", ostida "3-noyabrda yangilanadi" va "Daqiqa qo'shish" tugmasi. Bepul foydalanuvchida bugungi chig'anoq va "Basic'ni 3 kun bepul sinash" |
| Bepul foydalanuvchi qo'ng'iroq tugmasini bosdi | Sheet: personaj portreti, "Uning ovozini eshit" (kutubxonadan bepul qator), "Qo'ng'iroqlar Basic'da — oyiga 60 daqiqa", asosiy tugma "3 kun bepul boshlash", ikkinchi tugma "Hozir emas" |
| Qo'ng'iroq paytida | 2 daqiqa qolganda yuqorida kichik "2 daq qoldi" yorlig'i. 0 da yumshoq yakun, keyin sheet: "Qo'ng'iroq daqiqalari tugadi · 3-noyabrda yangilanadi · 10 daqiqa qo'shish — 120 chig'anoq" |
| Ovozli javob daqiqasi tugadi | Javob matn bilan keladi. Kuniga bir marta ostida kichik qator: "Ovozli javoblar shu oyga tugadi — 3-noyabrda qaytadi. Matn davom etadi." va "Daqiqa qo'shish" |
| Chig'anoq tugadi (bepul) | Mavjud `PaywallSheet` qayta ishlatiladi. Uchta teng yo'l: reklama (+N), paket ($0.99 dan), Basic 3 kun bepul |
| Fair-use chegarasi | Tizim qatori: "Bugun juda ko'p gaplashdik 🙂 Ertaga 00:00 da davom etamiz." Paywall chiqmaydi, chunki foydalanuvchi allaqachon a'zo |
| AI eslatmasi | Chat sarlavhasida ism ostida "AI personaj". Suhbat boshida va har 3 soatda markazda tizim qatori: "Kai — AI personaj, haqiqiy odam emas." |

### 14.6 Paywall lahzalari (texnik qism)

- Server javobida `upsell: { moment }` maydoni keladi. Masalan: `noShells`, `callAttempt`, `voiceLinesHeard`,
  `stageUp`, `memoryLimit`.
- Ilova qaysi variantni ko'rsatishni `GET /v1/offers` orqali so'raydi. A/B testlar RevenueCat Experiments'da qilinadi.
- **Chastota cheklovi:**
  - bitta lahza kuniga ko'pi bilan 1 marta;
  - hammasi bo'lib kuniga ko'pi bilan 2 ta paywall;
  - javob kelayotgan paytda paywall ko'rsatilmaydi;
  - chat ichida faqat foydalanuvchi o'zi biror harakat qilganda (yuborish, qo'ng'iroq) chiqadi.
- Har ko'rsatish `paywall_events`ga yoziladi. Konversiya har lahza bo'yicha alohida hisoblanadi.

### 14.7 Qonunga moslik (launch'dan oldin)

- **AI eslatmasi** (NY GBL 47, SB 243): suhbat boshida va har 3 soatda, hamma foydalanuvchiga. `ai_notice_at` buni
  kuzatadi.
- **Kriz protokoli:** kirishdagi klassifikator ishlaydi, helpline kartasi chiqadi, `crisis_events`ga yozuv tushadi
  (matnsiz).
- **Iqtibos filtri.** Diary sahifasi va comeback push'lar kriz gaplaridan iqtibos olmaydi. Bu ilovada hozirdan
  tuzatildi.
- **18+:** tug'ilgan yil + Declared Age Range / Play Age Signals. Kichik yosh aniqlansa, kirish yopiladi.

### 14.8 Testlar

- `plans.ts` va `quota.ts` sof funksiyalar bo'ladi (push rejalashtiruvchisi kabi). Unit testlar tekshiradi:
  - davr qanday yangilanishi;
  - sarflash tartibi;
  - sinov;
  - fair-use;
  - vaqt zonasi;
  - refund.
- Sandbox: Basic'ni sotib olish → `GET /v1/me/plan` 60 daqiqa ko'rsatadi. 61 daqiqa qo'ng'iroq qilinsa, server 60-
  daqiqada qo'ng'iroqni yopadi. Webhook'ni ikki marta yuborish daqiqani ikki marta qo'shmaydi.

## 15. Qarorlar

1. **Stack:** ✅ Supabase + Hono (Fly.io) — founder qarori (2026-10-09). Firebase'da Postgres va pgvector yo'q,
   shuning uchun xotira tizimi u yerda qiyinroq bo'lardi.
2. **Chat modeli:** bitta model emas, ko'rinmas router (13.6). Yengil va kuchliroq modelni B1'da sifat to'plami
   va `usage_events` tanlaydi. Nomzodlar: Gemini 3.1 Flash-Lite, Gemini 3.8 Flash, Claude Haiku 4.5 va Sonnet 5.5.
3. **Server kodi qayerda:** ✅ shu repoda, `server/` papkada (umumiy turlar uchun) — founder qarori.
   Promptlar va iqtisod qoidalari kirishidan oldin, ya'ni B1'dan oldin, repo'ni **private** qilish tavsiya etiladi
   (buni faqat siz qila olasiz).
4. **Hisoblar:** Supabase, Fly.io, LLM provayder(lar)i (Google AI Studio pullik tarifi va/yoki Anthropic Console) va RevenueCat hisoblarini siz ochasiz.
   Kalitlarni men ko'rmayman, ularni hosting secret'lariga o'zingiz qo'yasiz (B0'da qadamma-qadam yo'riqnoma beraman).
5. **Tariflar (13.3):** ✅ tasdiqlandi (2026-10-09). Qo'ng'iroq 60/150/180 daqiqa, ovozli javob 30/90/120 daqiqa,
   bepul foydalanuvchiga jonli ovoz yo'q, 3 kunlik bepul sinov. Founder qo'shimchasi: yillik reja $79.99
   (Basic limitlari bilan).
6. **Bepul ulush (13.5):** ✅ tasdiqlandi (2026-10-09). Check-in o'rtacha ~40 chig'anoq/kun, reklama mukofoti
   mamlakatga qarab.
7. **Monetizatsiya interfeysi:** prototip https://claude.ai/artifact/7efEmQx5jBq6YvhJF2dzpv — tasdiqlaysizmi?
8. **Xotira tariflarga bog'lanmaydi:** ✅ founder qarori (2026-10-13). Xotira sifati hamma tariflarda bir xil; pullik
   rejalar faqat qo'ng'iroq va ovozli javob daqiqalarini qo'shadi. 13.3 jadvalidagi "Xotira" qatori (`longerMemory`)
   va 14.5 dagi "Hammasini eslaydi" va'dasi shu qaror bilan bekor bo'ladi. Do'kon matni: "Every plan gets the same
   memory quality. Paid plans add call and voice minutes."
9. **Bepul chig'anoqlar har kuni yonadi:** ✅ founder qarori (2026-10-13). Check-in, g'ildirak, reklama, ulashish,
   va taklifdan kelgan chig'anoqlar yarim tunda to'liq 0 ga tushadi. Sotib olingani va xush kelibsiz sovg'asi
   (100, har hisobga bir marta) yonmaydi. Maqsad: bepul foydalanuvchini pullik rejaga o'tkazish. Sxema: `docs/backend-schema-gaps.md` §2.
10. **Kredit modeli:** ✅ founder qarori (2026-10-13, BIMOBIMO kabi). **Har xabar 1 chig'anoq, hamma uchun**
    (obunachilar ham). 13.3 dagi "cheklovsiz chat" va 300/kun fair use bekor bo'ladi. Uchta reja:
    - **Basic oylik $9.99:** 2 000 chig'anoq/oy, to'liq xotira, faqat chat.
    - **Pro oylik $29.99** va **Pro yillik $239.99** (= $20/oy, 33% tejash; ekranda yillik oldindan tanlangan):
      5 000 chig'anoq/oy, 3 soat qo'ng'iroq, 2 soat ovozli javob, 30 ta Photo Booth surati, Bedtime, yangi
      personajlar birinchi. Yillik va oylik Pro imkoniyatlari bir xil, farq faqat narxda.
    - Basic yillik va Quarterly olib tashlanadi.
    - Rejadagi chig'anoq har oy beriladi (yillikda ham bo'lib-bo'lib) va yonmaydi. Qo'ng'iroq va surat faqat Pro
      kvotasidan, chig'anoqqa sotilmaydi: shunda chig'anoq faqat chatga ketadi (~$0.0006 xarajat).
    - Bepul: kuniga bepul chig'anoq (yonadi), har personajga 20 ta xotira, qolgani qulflangan ("Unlock with Basic").
    - Sof foyda (15% do'kon, 3% qaytarish, 1% IT Park va AI xarajatidan keyin), oyiga: Basic ~$6–7,
      Pro oylik ~$13.5–20, Pro yillik ~$5.3–12 (og'ir → oddiy foydalanuvchi). Qo'ng'iroq narxi B5'da o'lchanadi;
      qimmat chiqsa, 3 soatlik kvota serverdan kamaytiriladi.
11. **Veb to'lov (launch'dan keyin):** ✅ rejaga qo'shildi (2026-10-13). AQShdan boshlab veb checkout (Stripe +
    Stripe Tax yoki Paddle kabi merchant of record): soliq narx ustiga qo'shiladi, do'kon komissiyasi (15–30%)
    tejaladi. BIMOBIMO Android'da to'lovni veb orqali oladi. Apple/Google'ning tashqi to'lov qoidalari launch
    paytida qayta tekshiriladi. Business-plan §12.5 dagi tartib: IAP → AQShda veb → Telegram Stars.
12. **Mintaqaviy narxlar:** ✅ (2026-10-13). Soliq narx ichida bo'lgan mamlakatlarda (Avstraliya, Yangi Zelandiya,
    Britaniya, Yevropa) do'kon soliqni narxdan ushlab qoladi va bizga 10–17% kam tushadi. Shu yerlarda narx bir
    pog'ona yuqori qo'yiladi (masalan, Avstraliyada A$16.99), sof tushum AQSh bilan teng qolishi uchun. AQSh va
    Kanadada soliq narx ustiga qo'shiladi, uni to'lovchi to'laydi. App Store Connect va Play Console'da
    launch oldidan sozlanadi.

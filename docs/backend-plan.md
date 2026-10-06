# Rafti backend rejasi (taklif, 2026-10-06)

Holat: **taklif — foydalanuvchi tasdig'ini kutmoqda.** Kod hali yozilmagan.
Oxiridagi "Qaror kerak" bo'limidagi savollarga javobdan keyin B0 boshlanadi.

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
| `characters` | `id`, `owner_id` (null = rasmiy), `name`, `bio`, `persona` (prompt), `voice_id`, `category`, `series`, `visibility` | Rasmiy cast seed migratsiyasi bilan |
| `relationships` | `user_id`, `character_id`, `intimacy`, `level`, `streak_days`, `last_chat_day`, `nickname`, `voice_replies`, `messages_first`, `summary` | `summary` — suhbatning qisqa xulosasi (xotira 2-qatlami) |
| `conversations` | `id`, `user_id`, `character_id`, `pinned`, `muted`, `last_message_at` | `unread_count` hisoblanadi |
| `messages` | `id`, `conversation_id`, `author`, `kind`, `text`, `transcript`, `media_path`, `duration_sec`, `created_at`, `read_at`, `client_id` | `client_id` — takroriy yuborishdan himoya |
| `memories` | `id`, `user_id`, `character_id`, `text`, `source`, `pinned`, `embedding vector`, `created_at` | Memories ekrani shu jadvalni ko'rsatadi va tahrirlaydi |
| `diary_entries`, `secret_notes`, `calls`, `moments`, `schedules` | hozirgi turlar bilan bir xil | |
| `wallets` | `user_id`, `shells`, `film`, `member_until`, `member_plan` | Faqat server yozadi |
| `shell_ledger` | `id`, `user_id`, `delta`, `reason`, `ref`, `idempotency_key`, `created_at` | Faqat qo'shiladi, o'chirilmaydi. Balans = yig'indi |
| `daily_state` | `user_id`, `check_in_day`, `last_login_day`, `ads_watched`, `spins_used`, ... | |
| `usage_events` | `user_id`, `kind` (llm/tts/stt/call), `model`, `input_tokens`, `cached_tokens`, `output_tokens`, `seconds`, `cost_usd` | Xarajat hisobi |
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
| **B1 — haqiqiy chat** | Xabar yo'li (6-bo'lim), Claude javoblari, Realtime, server iqtisodi + ledger, `usage_events`, `expo-sqlite` | Personaj haqiqatan javob beradi, balans serverda, xarajat jadvalda ko'rinadi |
| **B2 — xotira va tashabbus** | Xulosa + faktlar + pgvector, rejalar, diary va secret note LLM'da, salomlashish va eslatmalar workerda, push | Ertasi kuni personaj kechagi gapni eslaydi; ilova yopiq bo'lsa ham salomlashish keladi |
| **B3 — to'lov** | RevenueCat (paketlar + a'zolik), AdMob SSV, iqtisod sozlamasi (9-bo'lim raqamlari asosida) | Sandbox xaridi chig'anoq qo'shadi, qayta yuborilgan webhook ikki marta qo'shmaydi |
| **B4 — ovoz** | `expo-audio` yozish va ijro, STT, TTS ovozli javoblar, provayder tanlovi | Ovozli xabar matnga aylanadi, personaj o'z ovozi bilan javob beradi |
| **B5 — jonli qo'ng'iroq** | LiveKit + Agents, VoIP push (CallKit / Android full-screen intent), subtitrlar | Kechikish < ~1.5 s, kiruvchi qo'ng'iroq yopiq ilovada jiringlaydi |
| **B6 — UGC va o'sish** | Ovoz klonlash, moderatsiya, shikoyatlar, rus va o'zbek tillari | |

## 12. Qaror kerak (foydalanuvchidan)

1. **Stack:** Supabase + Hono (Fly.io) — tasdiqlaysizmi? Muqobil: Firebase (Google ekotizimi, lekin
   Postgres va pgvector yo'q, xotira tizimi qiyinroq).
2. **Chat modeli:** Opus 5.5 (eng yaxshi suhbat, eng qimmat), Sonnet 5.5 (o'rta) yoki Haiku 4.5 (eng arzon).
   Tavsiya: B1'da ikkitasini yonma-yon sinab, `usage_events` va suhbat sifatiga qarab tanlash.
3. **Server kodi qayerda:** shu repoda `server/` papkada (umumiy turlar uchun qulay, lekin hammasi ochiq)
   yoki alohida **private** repo.
4. **Hisoblar:** Supabase, Fly.io, Anthropic Console va RevenueCat hisoblarini siz ochasiz.
   Kalitlarni men ko'rmayman, ularni hosting secret'lariga o'zingiz qo'yasiz (B0'da qadamma-qadam yo'riqnoma beraman).

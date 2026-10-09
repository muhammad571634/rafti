# Rafti backend rejasi (taklif, 2026-10-06)

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
   RevenueCat ──webhook──► rafti-api ◄───────┘  │
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

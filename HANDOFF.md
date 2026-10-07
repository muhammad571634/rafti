# HANDOFF — keyingi sessiya shu fayldan boshlasin

## ▶ KEYINGI QADAM — shu yerdan boshlang (2026-10-07, bulutga o'tish)
Foydalanuvchi lokal Claude Desktop'dan (Windows, `C:\Users\joray\BIMOBIMO`) **bulutdagi Claude Code**'ga o'tdi.
Ish **chalg'imasdan** shu tartibda davom etadi. Lokal xotiradagi qoidalar ham shu faylga ko'chirildi
(pastdagi "Foydalanuvchi afzalliklari" bo'limi), boshqa joyga qarash shart emas.

1. **Hozirgi oqim: F14 Profil va sozlamalar.** Holat jadvali va tartib: [`docs/flows.md`](docs/flows.md).
   F1-F13 tayyor. F14 dan keyin F15. Oxirgi commit: `9f25328` (3D clay ikonkalar).
2. **Har bir F oqimini qurish tartibi** (shu tarzda ishlandi, foydalanuvchiga yoqdi):
   1. `docs/flows.md` dagi BIMOBIMO `#N` skrinshotlarini oching (`../rafti-research/`, indeks
      `teardown/screens.md`). Faqat shu oqimnikini oching, 133 tasini emas.
   2. Ilovadagi mavjud kodni ko'ring, nima bor va nima yo'qligini ajrating.
   3. Butunlay yangi ekran bo'lsa, avval HTML prototip (claude.ai Artifact) ko'rsating va tasdiq oling.
      Mavjud ekranni kengaytirish bo'lsa, to'g'ridan-to'g'ri kodga ruxsat bor ("next" = davom et).
   4. Kod yozing. Mantiq zanjirga ulanadi: oqim avvalgi va keyingi oqimga ta'sir qiladi
      (chat → kundalik, uchrashuv → yaqinlik + ertasi kundalik, reja → eslatma, ulashish → +6).
   5. `npx tsc --noEmit` toza o'tadi; `npx expo start --web` va brauzerda 375×812 tekshiriladi.
   6. Bu faylga qisqa yozuv, `docs/flows.md` holatini yangilang.
   7. `local-work` ga commit va push (foydalanuvchi har tugagan oqim uchun doimiy ruxsat bergan).
   8. Foydalanuvchiga o'zbekcha, qisqa: nima qilindi, BIMOBIMO'dan farqi, keyingi qadam.
3. **F14 uchun boshlang'ich ma'lumot:**
   - `src/app/profile.tsx` bor (sozlamalar, "They reach out" o'chirgichlari); BIMOBIMO #130, #131, #133;
   - qilinadi: profil to'ldirilganlik foizi, qiziqishlar, taklif kodi (F10 dagi `inviteCodeFor`), hisobni
     o'chirish (tasdiq bilan). Til tanlash hozircha yashirin (bitta til). Profil allaqachon bor ekran —
     kengaytirish, lekin yangi bo'limlar ko'p bo'lsa avval prototip ko'rsating.
4. **Ochiq ishlar (foydalanuvchi bilan kelishilgan, unutmang):**
   - **3D clay ikonkalar** — butun ilova uchun yangi ikonka uslubi. Chat "+" tayyor. Keyingi joylar tartibi,
     2-to'plam prompti: [`docs/icons-3d.md`](docs/icons-3d.md). Foydalanuvchi 2-to'plamni chizib `assets/raw/` ga
     qo'yadi → `python scripts/build-brand-art.py icons` → Home Explore'dan boshlab ulanadi.
   - **Personajlar katalogi** (foydalanuvchi so'ragan, 2026-10-07): BIMOBIMO'dagi real idol/franchise personajlar
     bizda TAQIQ (huquq va App Store xavfi). Katalog ikki yo'l bilan o'sadi: (a) F15 da foydalanuvchi
     personajlarini "hammaga ochiq" qilish + moderatsiya + shikoyat; (b) Rafti original personajlarini 16 → ~50 ga
     oshirish (har dunyoda 8-10), rasmlarni foydalanuvchi Nano Banana'da chizadi, bio'ni agent yozadi.
     Foydalanuvchi hali qaysi biridan boshlashni tanlamagan — F14 dan keyin so'rang.
   - Push bildirishnomalar yo'q (`expo-notifications` o'rnatilmagan): reja eslatmalari hozircha faqat chatda.
5. **Dizayn qoidalari:** interfeys faqat ingliz tilida; oddiy, zamonaviy minimal; matn minimal (sarlavha, raqam,
   ikonka — tushuntirish matnlari yo'q); asosiy matnlar katta va qalin (`src/theme/typography.ts`); bitta asosiy
   to'q sariq tugma; mint faqat munosabat uchun; tasdiqlangan ekranlarni (Diary, Onboarding, Home) qayta chizmang.
   Yozish maydoni bor sheet'larda `Sheet avoidKeyboard`, maydonga `autoFocus` qo'ymang.
6. **Muhit (bulut):**
   - Repo: `muhammad571634/rafti` (public), branch **`local-work`**. Strategiya hujjatlari: private
     `muhammad571634/rafti-research`, branch `claude/bimobimo-teardown` — repo yonidagi `../rafti-research/` ga
     klon qilinadi (agar ruxsat bo'lmasa, foydalanuvchidan GitHub kirishini so'rang). `#100`, `#102-#133`
     skrinshotlari `muhammad571634/rafti-research-2` da.
   - Expo typed routes ba'zan eskirib `tsc` yiqiladi (`/board/index` yoki yangi marshrut ko'rinmaydi): dev serverni
     to'xtatib, Metro keshi (`$TMPDIR/metro-cache`, `metro-file-map-*`) va `.expo/types/router.d.ts` ni o'chirib,
     qayta ishga tushiring. Marshrutga o'tishda `{ pathname: '/x/[id]', params }` shakli bunga chidamliroq.
   - `package-lock.json` lokalda o'zgargan holda qolgan edi, commit qilinmagan (foydalanuvchiniki emas, tegmang).

## Foydalanuvchi afzalliklari (lokal xotiradan ko'chirildi, 2026-10-07)
- **Animatsiya:** popup/sheet'lar animatsiyasiz darhol chiqadi; yozyapti nuqtalari, ovoz to'lqini va boshqa
  harakatlar qoladi. "Animatsiyani o'zgartir" desa — faqat ko'rsatilganini o'zgartiring, qolganini so'rang.
- **Minimal matn:** ekranlarda faqat sarlavha, ism, raqam, ikonka. Qoida tushuntirish kerak bo'lsa — ikonka
  ortidagi info sheet'da, qisqa. Tugma matnlari qisqa ("Claim +60").
- **Rasmlar:** foydalanuvchi Gemini (Nano Banana) da o'zi chizadi — prompt bering, uslub namunasini biriktirishni
  ayting. Alternativa: Higgsfield API (`HF_CREDENTIALS` env, `xai/grok-imagine-image-2.0`, ~$0.08/rasm; foydalanuvchi
  uni "Hugging Face" deb ataydi). Qoida: bitta sinov rasm, ko'rsating, keyin soni va narxi aytilgan to'plam.
- **Animatsiya fayllari:** faqat LottieFiles (HyperFrames rad etilgan). Web uchun `@lottiefiles/dotlottie-react` kerak.
- **Personajlar:** real odamlar va boshqa kompaniya qahramonlari yo'q; hamma personaj kattalar (18+).
- **Javob uslubi:** o'zbekcha, qisqa; tugagach "nima qilindi / BIMOBIMO'dan farqi / keyingi qadam".


## Ish qoidalari (foydalanuvchi bilan)
- Foydalanuvchi o'zbek tilida yozadi — javoblar o'zbekcha. Kod izohlari inglizcha.
- `AGENTS.md`: Expo SDK 57 — kod yozishdan oldin https://docs.expo.dev/versions/v57.0.0/ ga qarash.
- Ish branch'i `local-work`. Har tugagan oqimdan keyin commit va push (foydalanuvchining doimiy ruxsati).
  `main`ga PR keyinroq (`gh` o'rnatilmagan: PR'ni foydalanuvchi `.../pull/new/<branch>` havolasi bilan ochadi).
- Repo PUBLIC: https://github.com/muhammad571634/rafti (foydalanuvchi ataylab shunday tanlagan).
  Bu repoda git muallifi lokal sozlangan: `muhammad571634 <jorayevmuhammad496@gmail.com>`.
- Rasmlarni foydalanuvchi Gemini (Nano Banana) da o'zi chizadi: promptni ber, Rafti stikerini uslub
  namunasi qilib biriktirishini ayt. Tayyor rasm `../BIMOBIMOdesignraw/<name>.png/` papkasiga yoki repodagi
  `assets/raw/` ga tushadi; ko'rib, yaroqli bo'lsa `python scripts/build-brand-art.py`.
- Har o'zgarishdan keyin: `npx tsc --noEmit` + brauzerda tekshirish
  (`.claude/launch.json` → `bimobimo-web`, port 8081, mobil o'lcham 375×812).
- Metro "Unable to resolve module" bersa (ayniqsa `git checkout`dan keyin): serverni to'xtatib,
  `%TEMP%\metro-cache` va `%TEMP%\metro-file-map-*`ni o'chirib, qayta ishga tushir.

## Hozirgi holat (2026-10-07) — YANGI SESSIYA SHU YERDAN BOSHLASIN
- **Ish branch'i: `local-work`.** Unda Today redesign'i:
  - hero karta (`today-hero.tsx`) va kunlik sovg'a kartasi (`daily-gift-card.tsx`);
  - Explore **B varianti**: rangli Phosphor duotone ikonkalar, foydalanuvchi tanlagan;
  - `assets/heroes/` (16 ta hero rasm).
- Phosphor ikonkalari bittalab importlanadi (`phosphor-react-native/src/icons/X`). `tsc` ularni tekshirmasligi
  uchun `tsconfig.json`da `lib/typescript/icons` ga yo'l berilgan.
- **Mahsulot strategiyasi private reposida:** `muhammad571634/rafti-research`, branch `claude/bimobimo-teardown`.
  - `HANDOFF.md`;
  - BIMOBIMO tahlili: `teardown/` (133 skrinshot indeksi bilan);
  - spetsifikatsiya: `spec/rafti-product-spec.md`;
  - dizayn va oqimlar rejasi: `spec/design-plan.md`.

  **Har bir yangi dizayn ishi shu hujjatlardan boshlanadi.**
- **F8 Heartbeat Diary — kodda tayyor (2026-10-07).** Prototip foydalanuvchi tomonidan tasdiqlangan:
  https://claude.ai/artifact/DtV8DUHfbUTYjf5RMiWD2T
  - `src/app/diary/index.tsx`: muqovalar karuseli ("My diary" birinchi, keyin suhbati bor personajlar),
    orqa fon oldingi muqovaning xira rasmi, "New page" belgisi, sahifasi yo'q personaj kulrang + "No page yet",
    pastdagi bitta tugma kartaga qarab o'zgaradi (Write / Read / Open last page / Chat with X), saralash.
  - Sana tugmasi kichik kalendar oynasini ochadi (`src/components/diary/calendar-popover.tsx`, foydalanuvchi yuborgan BIMOBIMO kundalik
    kalendari tuzilishida: Cancel + Confirm, qo'shni oy kunlari xira; sahifa bor kunlarda nuqta). Tanlangan kun
    kartalarni o'sha kunga qarab ko'rsatadi.
  - `src/app/diary/page/[characterId].tsx`: personaj sahifasi (Caveat qo'lyozma, chiziqli qog'oz, kayfiyat, qaysi
    suhbatdan keyin yozilgani, sahifalar orasida o'tish, "Reply to X in chat" → chat `draft` parametri bilan ochiladi).
  - `src/app/diary/mine.tsx`: foydalanuvchining o'z sahifalari (avvalgi `diary/index` shu yerga ko'chdi).
  - `src/components/diary/rules-sheet.tsx`: "How their diary works" oynasi. Rasm hozircha Rafti stikeri.
  - Ma'lumot: `CharacterDiaryPage` turi, `mock/diary.ts` dagi `characterDiaryPages` (keyin server yozadi),
    store'da `characterDiary` (persist qilinmaydi) va `diaryPagesRead` (persist).
  - Yangi paket: `@expo-google-fonts/caveat` (`fonts.hand`, `type.hand`, `type.handTitle`).
- **Zanjir (2026-10-07):** ilova bitta kunlik halqa sifatida quriladi. Xarita va har oqim holati:
  https://claude.ai/artifact/UChkXuUa9vNDyFHNTHHNUb
  - Ulangan: kecha suhbat/uchrashuv bo'lsa, ertalab personaj kundalik yozadi (`src/mock/diary-writer.ts`,
    store'da `writeDueDiaryPages`, ilova ochilganda va Diary ekraniga kirilganda chaqiriladi).
  - **F1 Onboarding — kodda tayyor** (prototip tasdiqlangan: https://claude.ai/artifact/M4ci9hVBBQMbtDkeuxBcUF):
    `src/app/onboarding.tsx`. Salom → 18+ yil → ism → birinchi do'st (Kai, Aurelian, Sol, Seren) → bildirishnoma
    → +100 (`WELCOME_SHELLS`) → birinchi chat (personaj ismingiz bilan savol beradi). `(tabs)/_layout` onboarding
    tugamaguncha `/onboarding` ga yo'naltiradi; store v4 migratsiyasi eski foydalanuvchilarni o'tkazib yuboradi.
    1-kun check-in onboarding ichida jim beriladi; personajlar tashabbusi (qo'ng'iroq, salom) onboarding'dan keyin.
    Bildirishnoma hozircha faqat sozlama (`expo-notifications` hali o'rnatilmagan).
  - `shortName()` (`src/lib/format.ts`): "Prince Aurelian" → "Aurelian". Gaplarda ism uchun shuni ishlating.
- **Til qarori (2026-10-07):** butun interfeys hozircha faqat ingliz tilida (asosiy til). Boshqa tillar keyin
  `src/i18n/locales/` orqali qo'shiladi; til tanlash tugmasi bitta til bo'lganda ko'rinmaydi.
  - **F2 Home — kodda tayyor:** "Today" bo'limi hero kartadan keyin darhol turadi. Unda bugun yozilgan, hali
    o'qilmagan kundalik sahifalar ("Theo wrote about you", to'q sariq nuqta bilan), chatda aytilgan bugungi
    rejalar, maxfiy xatlar va g'ildirak bor. Home ochilganda navbatdagi kundalik sahifalar yoziladi.
  - **F3 Chat yadrosi — kodda tayyor** (BIMOBIMO #34-#39):
    - javob 1-4 ta qisqa xabar bo'lib birma-bir keladi, oralarida "yozyapti" (`replyBursts`, `scheduleReply`);
    - kun ajratgichlari: Today / Yesterday / sana;
    - xabarni uzoq bosish menyusi: 6 reaksiya, Copy (`expo-clipboard`), Delete for me; reaksiya pufak burchagida;
    - xabar yuborilganda chig'anoq belgisidan "-1" ko'tarilib yo'qoladi (narx ko'rinadi);
    - ro'yxatdan o'tilgan kuni boshqa personajlar o'zi qo'ng'iroq qilmaydi (birinchi kun yangi do'stniki).
  - **F4/F5 — kodda tayyor** (BIMOBIMO #2-#8):
    - har bir chig'anoq harakati tarixga yoziladi (`ledger`, `LedgerEntry`, store'dagi `log()`; 6 oy saqlanadi);
    - kunlik check-in chig'anoqlari (`wallet.free`) birinchi sarflanadi va yarim tunda tugaydi, tarixda
      "Unused free shells expired" bo'lib yoziladi; sotib olinganlar tugamaydi (`expireFreeShells`);
    - `/store/ledger` ekrani: kunlar bo'yicha, bir kunda bitta personaj bilan xabarlar bitta qatorga yig'iladi;
      do'kon sarlavhasidagi chek belgisi orqali ochiladi; Home'dagi sovg'a kartasida "N free left · gone at midnight";
    - paywall: reklama (+10) va g'ildirak chatdan chiqmasdan; yozilgan matn saqlanadi;
    - ketma-ket yuborilgan xabarlarga javoblar navbat bilan keladi, aralashmaydi (`replyingUntil`).
  - **Rafti reaksiya stikerlari — ulandi:** xom varaq `assets/raw/reactions-sheet.jpg` (Nano Banana, 3x3).
    `scripts/build-brand-art.py` dagi `build_reactions()` 6 tasini kesadi (fon kulrang qog'oz, oq die-cut chegara
    saqlanadi) → `assets/brand/reaction-{love,laugh,wow,sad,hyped,thumbs}.png`, registry'da `REACTION_STICKERS`.
    Chat menyusi va pufak burchagidagi reaksiya shu stikerlar.
  - **F7 Munosabat v2 — kodda tayyor** (BIMOBIMO #21-#23, #41): darajalar 0-100, 5 bosqich (`TIERS` in
    `src/mock/user.ts`): Stranger 0, Friend 1-5, More than friends 6-15, Beloved 16-49, Family 50-100.
    `levelThreshold(n) = 2*n^2.3` (1 xabar ~2 intimacy). Har bosqich yorliqlar ochadi (romantik: Crush, Partner,
    Soulmate...; BIMOBIMO'dagi aka/opa yorliqlari olinmadi), `relationship.label`, `setRelationshipLabel`.
    Level-up oynasi faqat yangi bosqichda chiqadi. Personaj sozlamalarida munosabat kartasi (daraja, progress,
    yorliq tanlash), kontaktlarda va sozlamalarda "How closeness works" oynasi (`closeness-sheet.tsx`).
    Store v5 migratsiyasi darajalarni intimacy'dan qayta hisoblaydi. Date ssenariylari darajalari 1/3/6/10/16.
  - **F6 Qo'ng'iroqlar — kodda tayyor** (BIMOBIMO #8, #29, #40, #46):
    - qo'ng'iroq vaqti alohida balans: `wallet.callSeconds`; onboarding'da 15 daqiqa sinov (`CALL_TRIAL_SECONDS`),
      obunalar 2/8/6 soat qo'shadi (`membershipPlans[].callMinutes`); store v6 eski foydalanuvchilarga sinov beradi;
    - qo'ng'iroq ekrani "Live call · 14:57 left", vaqt tugasa o'zi yakunlanadi, balans 0 bo'lsa "Get more call time";
    - chatdagi qo'ng'iroq tugmasi birinchi marta (yoki vaqt tugaganda) sinov haqida oyna ochadi (`user.callIntroSeen`);
    - tarix ekrani ikki bo'limli: Shells | Call time (`LedgerEntry.unit = 'seconds'`);
    - javob berilmagan qo'ng'iroqdan keyin personaj chatga yozadi (`missedCallLines`); vaqt bo'lmasa personaj
      qo'ng'iroq qilmaydi.
  - **F9 Us va kalendar — kodda tayyor** (BIMOBIMO #49-#55; prototip tasdiqlangan:
    https://claude.ai/artifact/VFqxdBJ4mnTbzLtQh6zXu3):
    - Us tabida "Coming up" o'rniga oy kalendari (`src/components/us/plan-calendar.tsx`): reja bor kunda nuqta,
      kun bosilsa pastda o'sha kunning rejalari (vaqt, eslatma vaqti, bajarilgani);
    - "+" → `PublishSheet`: Plan (`plan-sheet.tsx`: nom, kun, ixtiyoriy vaqt ±15 daq), Diary (`/diary/write`),
      Board (`/board/write`). Qo'lda qo'shilgan reja haqida personaj chatda yozadi (`planAddedLine`);
    - chatdagi `detectPlan` endi vaqtni ham oladi ("at 3pm", "15:30", "at 7" = 19:00); `ScheduleItem.time`,
      `followedUp`, `source`;
    - `runTimers()` (store): vaqtli rejada 10 daqiqa oldin, vaqtsizda ertalab 8:00 da eslatma; tugagach
      (vaqtli: +2 soat, vaqtsiz: 20:00) "how did it go?" xabari, 36 soatdan keyin so'ramaydi
      (`src/lib/schedule.ts` → `planStep`). Ilova ochiq bo'lsa har 30 soniyada, ochilganda va foreground'da chaqiriladi.
      Push bildirishnoma hali yo'q (`expo-notifications` o'rnatilmagan);
    - "Our moments" filtri: All / Plans / Dates / Calls / Notes / Diary (faqat bor turlar). Yangi moment turlari
      `plan`, `board`;
    - **Message board** (BIMOBIMO doskasi tuzilishida, rasmlarsiz): `src/app/board/write.tsx` — kimga (sheet),
      300 belgi, Clear, 7 ta qog'oz uslubi (`src/components/board/stationery.tsx`, hammasi SVG + Phosphor bilan
      kodda chizilgan), "Pin it" 2 chig'anoq (`shellCosts.boardNote`, ledger `board`). 8 soniyadan keyin personaj
      chatda javob beradi, +6 intimacy. `src/app/board/index.tsx` — ilingan eslatmalar panjarasi (eski "oxirgi
      xabarlar" doskasi o'rniga). Store'da `boardPosts` (persist);
    - Home'dagi bugungi reja qatorida vaqt: "15:00 · Theo will remind you".
  - **F10 Bepul sovg'alar — kodda tayyor** (BIMOBIMO #26-#28):
    - Free gifts ekranida "Invite friends · +50": o'z kodi (`src/lib/invite.ts`, 6 belgi, 0/O/1/I yo'q,
      akkauntdan hosil qilinadi; server keyin haqiqiy kod beradi), nusxa olish, haftalik progress 0/6
      (`user.inviteCredits`, server to'ldiradi), "Invite" ulashish oynasini ochadi;
    - "Have a code?": do'st kodini bir marta kiritish, +50 (`redeemInvite`: invalid / own / used), ledger `invite`;
    - "Daily share": +6 kuniga bir marta (`claimShareReward`, `daily.shareDay`, ledger `share`). Hisoblanadi:
      qo'ng'iroqni ulashish (call ekrani), doska eslatmasini ulashish (board kartasidagi belgi), taklif.
      Hammasi `shareForReward()` orqali; webda share oynasi bo'lmasa matn nusxalanadi;
    - har qayerda ulashilganda tepada "+6 for sharing" banneri (`share-reward-banner.tsx`, root layout'da);
    - Discord/Instagram/TikTok qatorlari qo'shilmadi: Rafti'ning rasmiy akkauntlari hali yo'q.
    - Diqqat: `board/index.tsx` tahrir qilinganda Expo typed routes ba'zan `/board/index` deb yozadi va tsc
      yiqiladi. Tuzatish: serverni to'xtatish, `%TEMP%\metro-cache`, `metro-file-map-*` va
      `.expo/types/router.d.ts` ni o'chirish, qayta ishga tushirish.
  - **Reja oynasi (F9) foydalanuvchi talabi bilan yangilandi:** ekranning ~72% balandligi, sarlavha h1 va
    do'stning avatari, katta qalin matnlar; kun tanlash uchta teng tugma (Today | Tomorrow | kalendar, boshqa
    kun tanlansa tugmada sana), vaqt katta raqam va katta ± tugmalari. Kalendar `CalendarPopover` ning
    `allow="future"` rejimi (Diary'da o'zgarish yo'q). Oyna faqat ochilganda tozalanadi.
  - **Klaviatura (foydalanuvchi talabi):** reja oynasi ochilganda klaviatura o'zi chiqmaydi (autoFocus yo'q).
    `Sheet` ga `avoidKeyboard` qo'shildi: oyna klaviatura ustidagi joydan baland bo'lmaydi, ichi scroll bo'ladi
    (Android oynani o'zi kichraytiradi, iOS'da `KeyboardAvoidingView`). Yozish maydoni bor har yangi sheet shu
    parametrni ishlatsin. `useKeyboardVisible()` (`src/hooks`) — klaviatura ochiqligida reja oynasi balandligini bo'shatadi.
  - Doskaga eslatma yuborilgach oldingi ekranga qaytiladi (`router.back()`), shunda typed routes xatosiga bog'liq emas.
  - **F11 Date — kodda tayyor** (BIMOBIMO #9-#12; prototip tasdiqlangan:
    https://claude.ai/artifact/XQk64zfZuwBGR9vT8QPszv):
    - `src/app/dating.tsx` — xarita: 5 joy (`src/mock/dates.ts`, `DATE_PLACES`: joy, emoji, narx, daraja, xaritadagi
      o'rni, 5 raund × 3 javob, har javob 0-3 yurak). Dengiz, nuqtali yo'l, daraxtlar SVG bilan kodda. Daraja yetmasa
      joy kulrang + qulf; bu sherik bilan borilgan joy yalpiz hoshiyali. Tepada sherik tanlash sheet'i va balans;
      joy bosilsa oyna (raundlar, daraja, narx, "Start date with X");
    - `src/app/date/[placeId].tsx` — raundlar: personaj hero rasmi, raund nuqtalari, yuraklar, sahna matni, 3 javob,
      javobdan keyin personaj reaksiyasi va "Next"; oxirida polaroid (`src/components/date/polaroid.tsx`, Caveat),
      yakun (sweet/warm/funny), Share (`shareForReward`, kunlik +6), Back to chat. ✕ "Leave X here?" so'raydi,
      swipe-back o'chirilgan. Ekran faqat to'langan uchrashuvni o'ynaydi (`activeDate`, `beginDate` qo'yadi,
      `finishDate` tozalaydi) — to'g'ridan-to'g'ri havola bepul o'ynatmaydi;
    - `finishDate`: yaqinlik `INTIMACY.date + yuraklar`, `dates` (persist, `DateRecord`), `dating` moment (ertasi kundalik
      sahifasi shundan), personaj chatda kayfiyatga qarab yozadi (`afterDateLine`);
    - `src/app/date/album.tsx` — "Our dates": polaroidlar panjarasi;
    - eski `dateScenarios` va `startDate` olib tashlandi (uchrashuv endi chatda emas, o'z ekranida).
    - Qilinmadi: foydalanuvchilar yaratadigan mavzular (P3), joylar uchun rasm (hozir emoji tile).
  - **F12 Chat "+" o'yinlari — kodda tayyor** (BIMOBIMO #42-#48; prototip tasdiqlangan:
    https://claude.ai/artifact/Vr4YPbc6z9LZLGmrfXzRS8):
    - "+" endi 4×2 panjara, Explore B uslubidagi rangli Phosphor duotone ikonkalar (`moduleTints`: voice, secretNote,
      quiz, truthOrDare qo'shildi): Voice, Photo, Secret note, Couple quiz, Truth or dare, Date, Daily calls, Diary.
      Foydalanuvchi emoji ikonkalarni yoqtirmadi — shu uslub tanlandi;
    - **Couple quiz** `src/app/quiz/[characterId].tsx`: 3 to'plam × 5 savol (`src/mock/games.ts`), personaj javobi
      `partnerAnswer` (personaj+savol bo'yicha barqaror hash), javob tanlangach darhol ochiladi; natija chatga system
      karta ("💞 First date · 4/5"), personaj izohi (`quizReply`), yaqinlik `2 + 2×moslik`, `quiz` moment (Us filtri "Games");
    - **Truth or dare** `src/components/chat/truth-or-dare-sheet.tsx`: SVG g'ildirak (Reanimated aylanish), personajga
      tushsa siz Truth/Dare tanlaysiz — savol chatga ketadi, u javob beradi (+3); sizga tushsa u chatda savol beradi;
    - **Daily calls** `src/components/chat/daily-calls-sheet.tsx`: kim qo'ng'iroq qiladi (ovozi bor do'stlar),
      ertalab/kechki vaqt (±30 daq.) va o'chirgichlar. `settings.morningCallTime`, `nightCallTime`, `callerId`;
      `runDailyInitiative` endi shu vaqtdan boshlab 4 soat ichida qo'ng'iroq qiladi (`inWindow`).
  - **F13 Find — kodda tayyor** (BIMOBIMO #56, #59): mavjud ekran kengaytirildi (prototipsiz, HANDOFF qoidasi bo'yicha):
    - "All" tabi birinchi va standart; har bir dunyo alohida karta: sarlavha, soni, "›" → `src/app/world/[series].tsx`
      (hamma personajlar, "N characters · M can call"); kartada 3 tadan sahifalar (gorizontal paging) va nuqtalar;
    - avatarda yashil telefon belgisi = ovozi bor, qo'ng'iroq qilsa bo'ladi (`Avatar badge="call"`; Onboarding'dagi
      belgi o'zgarmadi);
    - qidiruv kartalarni olib tashlab, barcha dunyolardan tekis "N found" ro'yxatini ko'rsatadi;
    - `CharacterRow` umumiy komponentga chiqdi (`src/components/character-row.tsx`).
  - Navbat: F14 Profil va sozlamalar.
- **Tipografiya (foydalanuvchi talabi, 2026-10-07):** asosiy matnlar kattaroq va qalinroq, interfeys oddiy,
  zamonaviy minimal. `src/theme/typography.ts`: body 16/22, small 14/19, title 17 bold, h1 30 heavy,
  h2 24 heavy. Yangi ekranlar shu o'lchamlardan foydalanadi, o'lchamni joyida qo'lda kattalashtirmang.
- **Keyingi ish:**
  - qoida oynasi uchun Rafti kundalik yozayotgan rasm (1 ta sinov, keyin `assets/brand/`);
  - shu uslubdagi Secret note, Gifts va Date qoida oynalari;
  - keyin `design-plan.md` dagi P0 oqimlari (F1–F5).
- **Higgsfield API** (bulut muhitida `HF_CREDENTIALS` environment variable bor):
  - `GET https://api.higgsfield.ai/models` modellar ro'yxatini beradi (84 ta, 17 tasi rasm);
  - `POST https://api.higgsfield.ai/<slug>`, header `Authorization: Key $HF_CREDENTIALS`;
  - holatni kuzatish: `GET /requests/<id>/status`;
  - uslub namunasi bilan rasm: `alibaba/qwen-image-3/edit`. Maydonlar: `prompt`, `image_urls` (ochiq URL, masalan repodagi
    `raw.githubusercontent.com/.../assets/brand/tile-diary.png`), `aspect_ratio` (`1:1`…), `resolution` (`1k`/`2k`);
  - natija rasmlari `d3u0tzju9qaucj.cloudfront.net` da. Bu domen bulut muhitining Allowed domains ro'yxatida bo'lishi kerak;
  - birinchi sinov rasmi (diary qoida oynasi uchun Rafti) chizildi, lekin CDN yopiq bo'lgani uchun hali yuklab olinmadi.

## Avvalgi holat (2026-10-06, kechroq)
- PR #3 (`redesign`) `main`ga merge qilindi (`4625509`). `redesign` branch'i `main`ga tenglashtirildi.
- **Backend rejasi yozildi: `docs/backend-plan.md`** — foydalanuvchi tasdig'ini kutmoqda.
  - Tavsiya: Supabase (Postgres + pgvector, Auth, Storage, Realtime) + o'z serverimiz
    (Node + Hono + pg-boss, Fly.io), Claude API, RevenueCat, AdMob SSV, keyin LiveKit.
  - Bosqichlar B0–B6. B0 — poydevor, B1 — haqiqiy chat.
  - Muhim topilma: hozirgi iqtisodda bepul chig'anoq ko'p (kuniga ~130 xabar) va "unlimited" a'zolik
    LLM xarajatini qoplamasligi mumkin. Raqamlar rejaning 9-bo'limida.
  - B1'dan boshlab Expo Go yetmaydi, EAS development build kerak.
  - Ochiq savollar (12-bo'lim): stack, chat modeli, server kodi shu repodami yoki private repoda, hisoblar.

## Oldingi holat (2026-10-06)
- Chat redesign va to'liq ilova redesign'i (0–3-bosqich) TUGADI, `redesign` branch'ida:
  `77e07ae` (0–1), `e352a8e` (2), `ac2cd56` (3). `redesign` `mobile-ux-audit` ustiga qurilgan,
  shuning uchun PR `main`ga ikkala ishni ham olib kiradi.
  PR havolasi: https://github.com/muhammad571634/rafti/pull/new/redesign (push tugagach).
- Dizayn qoidalari (har yangi ekranda shu qoidalarga amal qil):
  - Fon `colors.bgPlain`. Kartochka va soya o'rniga `ListRow` va `Divider` ishlatiladi.
  - Bitta o'rik `Button primary`. Yalpiz (`colors.bond`/`bondText`) faqat munosabat uchun.
  - Chiziqli Ionicons va `IconTile`. Matn sentence case'da. Gradient yo'q.
  - Komponentlar: `src/components/ui` (ListRow, IconTile, Divider, SectionLabel, CountBadge, Button secondary).
- Foydalanuvchi qoidalari:
  - Avval rasm yoki prototip (`show_widget`), tasdiqdan keyin kod.
  - Faqat ko'rsatilgan animatsiyani o'zgartir (popup'lar animatsiyasiz, qolganlari qoladi).
- Bash'da heredoc ichida `'` bilan murakkab buyruqlar yiqiladi. i18n uchun skript:
  JSON patch'ni faylga yoz, keyin `python scripts/i18n_set.py "$(cat patch.json)" [o'chiriladigan.kalit]`.
  Skript CRLF va 2 bo'shliqli formatni saqlaydi.

## Oldingi holat (2026-10-05)
- **Rafti** — AI kompanion ilova (BIMOBIMO/Beemo'dan ilhomlangan, lekin o'z brendi va IP'si).
  Expo SDK 57 / RN 0.86 / expo-router / zustand. Tavsif — `README.md`.
- UI, iqtisod (chig'anoq), qo'ng'iroqlar, diary, secret note va boshqalar ishlaydi.
  **AI hali mock** (`src/store/use-app-store.ts` + `src/mock/*`), backend yo'q.
- Maskot: **Rafti** — yalpiz sharfli suv samuri (eski nomi "Popo", nemis/ispan tilidagi
  ma'nosi sabab almashtirildi). Valyuta: **shells** (chig'anoq).
- Personajlar: 16 ta original, kattalar (18+), 4 dunyo, 2D anime portretlar (`assets/avatars`).
- Git:
  - `main` = PR #1 merge qilingan (butun ilova + rebrend).
  - `mobile-ux-audit` branch push qilingan, **PR hali ochilmagan**:
    https://github.com/muhammad571634/rafti/pull/new/mobile-ux-audit
- Foydalanuvchi telefonda Expo Go orqali sinab ko'rgan — ishlagan.

## Brend
- Palitra "Kakao va yalpiz": o'rik `#FF9F5A`, yalpiz `#3CCFB4`, osmon `#6BB8FF`,
  krem fon `#FFF7EC`, karamel `#C98B5E`, matn `#2A2E45` (`src/theme/colors.ts`).
- Xom rasmlar: `C:\Users\joray\BIMOBIMOdesignraw\` — har bir `*.png` aslida PAPKA,
  ichida Gemini `.jpg`; eng yangisi olinadi. Namuna: `_refs\ref_popo_square.png`,
  kanvaslar `_refs\canvas_1x1.png`, `canvas_3x4_vertical.png`, `canvas_wide_banner.png`.
  `mascot_main.png` ISHLATILMAYDI.

## Qilingan ishlar (2026-09-29, 2-sessiya)
- `scripts/build-brand-art.py`: xom rasmlardan `assets/brand/` fayllarini yasaydi. Rasm
  almashsa, qayta ishga tushirish kifoya: `python scripts/build-brand-art.py`.
  - Plitkalar kesiladi, burchaklari shaffof qilinadi va 512px'ga keltiriladi.
  - Stiker va empty_state rasmlarining foni olib tashlanadi.
  - reward va levelup rasmlarining krem foni Popo yuzi bilan bir xil rang, shuning uchun
    foni olinmaydi: butun rasm ramkada ko'rsatiladi.
  - Skript yana quyidagilarni yasaydi: app icon, favicon, Android adaptiv ikonkalari
    va splash, hamda `assets/icons/shell.png`.
  - `icon_board` plitkasi qalin chizilgan, shuning uchun uning chegarasi `TILE_FACES`da qo'lda berilgan.
- Palitra: `pink*` ranglari `apricot*`ga, `lav*` ranglari `mint*`ga, `teal*` ranglari `sky*`ga
  almashtirildi. Neytral ranglar iliq, matn rangi `#2A2E45`.
- Valyuta endi "shell" (chig'anoq). Kodda to'liq qayta nomlandi: `wallet.shells`,
  `spendShells`, `/store/shell`, `ShellBadge`/`ShellIcon`.
  Store persist versiyasi 2 ga ko'tarildi: migratsiya eski `acorns` balansini `shells`ga ko'chiradi.
- Maskot: SVG mushuk o'rniga Popo rasmlari qo'yildi (`BrandArt`, `Mascot`: `src/components/ui/mascot.tsx`),
  suzib turish animatsiyasi bilan.
  - Home: plitkalar va banner.
  - Kunlik sovg'a, level-up, bo'sh ekranlar.
  - Bedtime, Gifts, Diary muqovasi (har kartada rangli xatcho'p bor), avatar va qo'ng'iroq stikeri.
  - Chat foni endi chig'anoq va panjalardan iborat.
- O'chirildi: `CuteDuo`, mushuk va cho'chqa ikonkalari, mushukli Lottie'lar va `assets/expo.icon`.
- `tsc` toza o'tdi. Brauzerda Home, Store, Gifts, Diary, Bedtime, Chat, Us, Profile,
  Secret Note va Call History ekranlari tekshirildi.

## Qilingan ishlar (2026-09-29, 3-sessiya)
- Yangi `banner_home` va `currency_shell` ulandi (`python scripts/build-brand-art.py`).
  - `currency_shell` uchun alohida kesish usuli qo'shildi: `key_out_sky`. Chig'anoqning lilak
    tuslari ko'k fonga juda yaqin, shuning uchun fon yorqinlik bo'yicha emas, rang tusi bo'yicha ajratiladi.
  - Skript fayllarni avval `.part` nomi bilan yozib, keyin almashtiradi. Shunda Metro
    yarim yozilgan faylni ko'rmaydi va `TransformError: empty file` chiqmaydi.
- Lottie'lar qayta bo'yaldi (`scripts/recolor-lottie.js`):
  - `typing`: `ff3d7f` → `FF9F5A`.
  - `level-up`: pushti → o'rik, qizg'ish-pushti → `FF8A70`, ko'k → `6BB8FF`, binafsha → `3CCFB4`.
  - `love-letter`: lavanda → yalpiz (`138A75`, `3CCFB4`, `B5EDE2`, `9FE3D6`), pushti → o'rik.
  - `assets/lottie/README.md` shunga mos yangilandi.
- Brauzerda tekshirildi:
  - Level-up haqiqiy holatda chiqdi: Megumi chatida 6 ta xabar yuborildi, intimacy 18 → 30, Level 2.
  - Love-letter xat almashishda chiqdi (Secret Note).
  - Typing nuqtalari o'rik rangda.
  - Home, Store, Gifts va Chat ekranlari ham ko'rib chiqildi. Yangi tabda konsolda xato yo'q.
  - `tsc` toza o'tdi.
- Persist migratsiyasi tasdiqlandi: saqlangan holat `version: 2`, `shells` bor, `acorns` yo'q.

- Foydalanuvchi telefonda Expo Go orqali sinab ko'rdi: hammasi ishladi.

## Qilingan ishlar (2026-09-29, 5-sessiya): Rafti va original personajlar
- Ilova nomi **Rafti** bo'ldi: `app.json` (name, slug, scheme), `package.json`, i18n `app.name`,
  README. Maskot ham Rafti deb ataladi, `assets/brand/rafti-*` fayllari shunga moslab qayta nomlandi.
- `src/mock/characters.ts`: 16 ta original personaj, 4 ta dunyoda. Oppa va Luna qoldi.
  - **Seaside Academy:** Kai, Elio, Theo, Hana, Iris.
  - **Moonlit Realm:** Aurelian, Castor, Zarek, Seraphine.
  - **NEON TIDE:** Ezra, Seren, Kiro, Minu. "Noa" nomidan voz kechildi, chunki real
    qo'shiqchi Noa Kazama bor.
  - **Tidepool Café:** Adrian, Lucas, Sol.
- Kategoriyalar `school | fantasy | idol | daily | original` bo'ldi (Find, create-character, en.json).
- **Barcha personajlar kattalar (18+).** Seaside Academy universitet, Find'da "Campus" deb ko'rinadi.
  Romantik ilovada voyaga yetmagan personaj bo'lmasligi kerak (App Store qoidasi).
- Namuna ma'lumotlar yangi personajlarga o'tkazildi: gojo→theo, felix→seren, zhongli→castor, megumi→elio.
- Store'ning saqlash kaliti endi `rafti.store`. Eski `bimobimo.store` bir marta o'qiladi, keyin o'chiriladi.
  Persist versiyasi 3 ga ko'tarildi, `recastSeed` quyidagilarni qiladi:
  - eski litsenziyali personajlar va ularga tegishli ma'lumotlarni o'chiradi;
  - foydalanuvchi yaratgan personajlarni saqlab qoladi, kategoriyasini yangisiga moslaydi
    (kpop→idol, anime→school, game→fantasy);
  - kundalik sahifalarini qoldiradi, lekin o'chirilgan personajlar bilan ulashishni bekor qiladi.
  - Brauzerda qo'lda yaratilgan v2 holat bilan sinab ko'rildi.
- Eski DiceBear avatarlari o'chirildi, hozircha avatar o'rnida monogramma turibdi.
  - `build-brand-art.py` endi `avatar_<nom>.png/` papkalaridan `assets/avatars/c_<nom>.png` yasaydi
    va `registry.ts`ni avtomatik yozadi.

- Store `merge`: rasmiy personajlar har doim koddan olinadi. Shuning uchun seed matnidagi
  o'zgarish saqlangan qurilmalarga ham yetib boradi, foydalanuvchi yaratganlari esa saqlanib qoladi.
- Avatarlar: ✅ 16/16 tayyor (Campus, Moonlit Realm, NEON TIDE, Tidepool Café). Uslub namunalari:
  Campus va Ezra uchun avatar_kai, Moonlit uchun avatar_aurelian, qolgan NEON TIDE uchun avatar_ezra,
  Café uchun avatar_adrian. Oppa va Luna — "My Creations" misoli, monogramma bilan qoldi.

## Qilingan ishlar (2026-09-30): mobil UX auditi (/mobile-design)
- Chat: `MessageBubble` endi `memo` qilingan, `renderItem`/`onCallBack` barqaror.
  Faqat chat ochilgandan keyin kelgan xabarlar animatsiya bilan chiqadi.
- Accessibility: `PressableScale` standart `accessibilityRole="button"` oladi.
  Barcha ikonka-tugmalarga nom berildi (`a11y.*` kalitlari, en.json). `IconButton` endi
  `accessibilityLabel` qabul qiladi.
- Ichma-ich tugmalar ajratildi: chat sarlavhasidagi ShellBadge va Call History'dagi qo'ng'iroq tugmasi.
  Qoida: tugma ichiga tugma qo'yilmaydi (VoiceOver yetib bormaydi, vebda `<button>` ichida `<button>`).
- Tegish maydonlari ≥44pt (`hitSlop`): Chip, ShellBadge, Home profil tugmasi, Shell Store'dagi Free,
  Us'dagi reja o'chirish, qidiruvni tozalash, klipni o'chirish, diary tool.
- `src/app/_layout.tsx`: root `ErrorBoundary` ("Rafti tripped over a pebble" + Retry), sinab ko'rildi.
- Us → Moments sahifalab ko'rsatiladi (20 tadan, "Show N more"). Diary sana ro'yxati `FlatList`da.
- Tekshirildi: 23 ekranda nomsiz yoki ichma-ich tugma yo'q (DOM tekshiruvi), `tsc` toza.
- Eslatma: `git checkout` fayllarni vaqtincha o'chirsa, Metro fayl-xaritasi eskirib qoladi
  ("Unable to resolve module"). Yechim: dev serverni to'xtatish, `%TEMP%\metro-cache` va
  `%TEMP%\metro-file-map-*`ni o'chirish, qayta ishga tushirish.

## Qilingan ishlar (2026-10-05): store `merge` tuzatildi
- `merge` endi `user`, `wallet`, `daily`, `settings` obyektlarini standart qiymatlar
  bilan birlashtiradi. Keyin qo'shilgan yangi kalit (masalan, dark mode uchun `settings.theme`)
  eski saqlangan holati bor qurilmalarda `undefined` bo'lib qolmaydi. Bu redesign'dan oldin shart edi.
- Brauzerda sinaldi: `chatAnimation` va `spinsUsed` yo'q eski holat yuklanganda ular standart qiymat
  bilan to'ldi, foydalanuvchi tanlovi (`morningCall: false`) va balans saqlanib qoldi. `tsc` toza.
- Keyinga qoldirildi: `clearChat`dan keyin keladigan javob (backend ulanganda so'rovni bekor qilish
  bilan hal bo'ladi) va `app.json` (bundle ID, ruxsat matnlari, `supportsTablet`) — nashrdan oldin.

## 2026-10-05/06: pastki 4 tez tugma (Voice, Photo, Secret Note, Memory) — QAYTARILDI
- Qo'shilgan edi, foydalanuvchi telefonda ko'rdi va rad etdi: "UI UX dizaynni buzib turibdi".
  Hamma fayllar `HEAD` holatiga qaytarildi: `chat-quick-actions.tsx`, `voice.png` va `memory.png` o'chirildi,
  `ChatInput` yana "+", galereya, emoji va yuborish tugmalari bilan. Bu yo'nalishni qayta taklif qilma.
- Saqlab qolingan: `Sheet` animatsiyasiz (pastda) va store `merge` tuzatishi.
## Qilingan ishlar (2026-10-06): yozish paneli redesign — A varianti (ChatGPT uslubi)
- Foydalanuvchi ish tartibi: avval maket rasmi (`show_widget`), tasdiqlangach kod. A va B taklif qilindi,
  A tanlandi (B — Gemini uslubidagi ikki qavatli kartochka edi).
- `src/components/chat/chat-input.tsx` qayta yozildi:
  - To'liq kenglikdagi oq panel o'rniga chat foni ustida suzuvchi oq pill bo'ldi
    (`radius.xxl`, `colors.border`, `shadows.card`, chetlardan 12pt).
  - Ichida: "+" (`IconButton`, `surfaceAlt` fon), matn maydoni va bitta asosiy o'rik tugma.
    Bo'sh maydonda tugma `mic` (`onVoice` → VoiceSheet), matn yozilganda `arrow-up` (yuborish, haptic).
    Almashish animatsiyasiz.
  - Galereya va emoji tugmalari olib tashlandi: Photo "+" oynasida bor, emoji tugmasi hech narsa qilmasdi.
  - Matn maydoni bitta qatorda tugmalar bilan bir tekisda turadi, 5 qatorgacha o'sadi.
    Webda `rows: 1` (react-native-web aks holda 2 qatorli textarea chizadi).
- API: `ChatInput({ placeholder, onSend, onAttach, onVoice })`. Yozuv chat ekranidan
  `t('chat.inputPlaceholder', { name })` orqali beriladi: "Message {{name}}…".
- `IconButton`ga `haptic` prop qo'shildi.
- `en.json`: `a11y.gallery` va `a11y.emoji` o'chirildi, `a11y.voiceMessage` qo'shildi.
- Tekshirildi (375×812, `tsc` toza, konsolda xato yo'q):
  - Bo'sh holat: + / Message Seren… / mikrofon. Yozilganda "Send" tugmasi chiqdi.
  - Yuborilgan xabar ro'yxatga tushdi, Seren javob berdi, balans 128 → 127.
  - Mikrofon VoiceSheet'ni ochdi, "+" esa Voice, Photo, Secret Note, Date va Diary'ni ko'rsatdi.

## Qilingan ishlar (2026-10-05): oynalar endi sakramaydi
- Foydalanuvchi talabi: chatdagi va boshqa joylardagi "sakrab chiqadigan oyna" animatsiyasi
  olib tashlansin, oyna yengil va toza chiqsin.
- **Boshqa animatsiyalar QOLADI:** "yozyapti" nuqtalari, ovoz to'lqini, xabarlarning kirishi,
  tugma bosilishi, maskot va konfetti BIMOBIMO'dagidek qoladi, ularga tegilmasin.
  Avval hammasini o'chira boshlagandim, foydalanuvchi to'xtatdi: "faqat oynalar".
- `src/components/ui/sheet.tsx`: FadeIn, `SlideInDown.springify()`, FadeOut va SlideOutDown olib tashlandi.
  Modal `animationType="none"`: oyna darhol chiqadi va darhol yo'qoladi.
  Orqa fon endi qorong'i blur (native) va `colors.overlay` (web) o'rniga hamma platformada yengil `colors.scrim`.
  `colors.overlay` endi ishlatilmaydi.
- Ilovadagi barcha popup'lar (17 joy) shu bitta `Sheet` orqali ochiladi, shuning uchun hammasiga ta'sir qiladi.
  Ekranlar orasidagi o'tishlar (`_layout.tsx` dagi native stack) o'zgarmadi.
- Tekshirildi: `tsc` toza. Brauzerda Voice va "+" oynalari darhol joyida chiqdi (`getAnimations()` bo'sh),
  yopilganda darhol yo'qoldi.

## Redesign rejasi (2026-10-06, taklif — foydalanuvchi tasdig'ini kutmoqda)
- Maqsad: ilova "AI chizgan" emas, senior dizayner qilgandek ko'rinsin. Uslub ChatGPT kabi zamonaviy
  minimal, lekin Rafti'ning o'z dizayni (BIMOBIMO nusxasi emas).
- Hozirgi "AI belgilari": har narsa soyali kartochkada, gradientlar (Us, Store, tugmalar),
  3 xil ikonka uslubi (3D emoji, to'ldirilgan to'q sariq, chiziqli), o'rik rang hamma joyda,
  Home'da maskot 10 marta takrorlanadi.
- Dizayn tili:
  - Fon `gray50` #FCF9F5.
  - Ajratish soya bilan emas, ingichka chiziq (`gray200`) va bo'shliq bilan qilinadi.
  - O'rik rang faqat asosiy harakat va o'qilmagan xabarlar uchun.
  - Yalpiz rang faqat munosabat (level, progress) uchun.
  - Bitta chiziqli ikonka oilasi, rang ink.
  - Shriftlar: tizim shrifti va Fredoka. Fredoka faqat wordmark va katta raqamlarda.
  - Maskot faqat 3 joyda: logo, bo'sh ekranlar, bayram lahzalari.
- Bosqichlar:
  - 0 — umumiy komponentlar: ListRow, Section, SheetList, Button turlari, TabBar, Switch rangi.
  - 1 — Home ("Today"), Chats ro'yxati, personaj profili, chatdagi "+" menyusi.
    Prototip `show_widget` bilan ko'rsatilgan.
  - 2 — Find, Us, Profile/sozlamalar, Shell Store.
  - 3 — qolgan ekranlar: Diary, Secret Note, Gifts, Dating, Photo booth, Radio, Bedtime,
    qo'ng'iroqlar, Create character, Memories, Call history.
- Ish tartibi: har bosqichda avval prototip, tasdiqdan keyin kod, keyin `tsc`, brauzer va telefonda tekshirish.

## Qilingan ishlar (2026-10-06): redesign 0 va 1-bosqich — TAYYOR (telefonda ko'rib chiqish kutilmoqda)
- 0-bosqich, umumiy komponentlar (`src/components/ui`):
  - `ListRow`: left, `titleAccessory`, meta, trailing, chevron.
  - `IconTile`: chiziqli ikonka, iliq kulrang squircle ichida, `dot` bilan.
  - `Divider`, `SectionLabel`, `CountBadge`.
  - `Button`: primary endi gradientsiz, yaxlit o'rik rang, `radius.md`. Yangi `secondary` (oq, hairline) varianti qo'shildi.
    Bu o'zgarish hamma ekranlarga ta'sir qiladi.
  - Ranglar: `colors.bond` va `bondText` (yalpiz, faqat munosabat uchun). `tabActive` endi ink, `tabInactive` esa gray500.
  - Pastki tablar: yassi oq panel va hairline, ikonkalar chatbubble va compass. O'qilmagan xabarlar son bilan emas, bitta o'rik nuqta bilan.
    Tab nomi "Chats".
- 1-bosqich ekranlari (workflow: quruvchi agent, 2 tekshiruvchi — dizayn va to'g'rilik — keyin tuzatuvchi):
  - `(tabs)/index.tsx` — "Today" hubi:
    - Salomlashish soatga qarab o'zgaradi. Ostida kutayotganlar qatori.
    - Kartochkada o'qilmagan chatlar (bo'lmasa, oxirgi 2 ta chat).
    - Today bo'limi: bepul spin va tayyor secret note'lar.
    - Explore: 10 modul, 4 ustunli `IconTile` panjarasi.
    - Banner va otter plitkalari olib tashlandi. `TILES` endi faqat `gifts.tsx`da ishlatiladi,
      qolgan `assets/brand/tile-*.png` fayllari ishlatilmaydi (o'chirilmadi).
  - `(tabs)/chat.tsx`: katta "Chats" sarlavhasi, "New chat" tugmasi (Find'ga o'tadi) va qidiruv
    (ism yoki xabar matni bo'yicha, natija bo'lmasa xabar chiqadi). `ListRow` qatorlari: to'g'nag'ich, vaqt,
    `CountBadge`, muted ikonka.
  - `character/[id]/index.tsx`:
    - Blur va gradient olib tashlandi. Markazda 92pt avatar, "Voice ready" yalpiz rangda.
    - Tugmalar: primary "Message", secondary "Voice call" va "Secret note".
    - Level kartochkasi: yalpiz progress chizig'i.
    - Qatorlar: Memories (son faqat >0 bo'lsa ko'rinadi) va Chat settings.
  - `chat/[id].tsx`: "+" menyusi 3 ustunli panjara o'rniga ro'yxat bo'ldi: ikonka, nom va narx
    (a'zolar uchun voice va photo narxi ko'rsatilmaydi).
- `en.json`: yangi kalitlar qo'shildi (`home.greeting/*`, `home.todo/*`, `home.short/*`,
  `characterProfile.*`, `chat.shellCost`, `a11y.unreadTab`, `a11y.profile`). Ishlatilmay qolgan
  `home.greetingBanner*` va `chat.cost` o'chirildi.
- Tekshirildi:
  - `tsc` toza, konsolda xato yo'q.
  - 375×812 o'lchamda to'rttala ekran prototipga mos chiqdi. Qidiruvda "cas" yozilsa Castor va Lancaster topiladi,
    "zzz" yozilsa "Nothing matches" chiqadi.
  - "+" menyusi narxlarni to'g'ri ko'rsatadi.
- 0 va 1-bosqich `redesign` branch'iga commit qilindi (`77e07ae`), hali push qilinmagan.

## Qilingan ishlar (2026-10-06): redesign 2-bosqich — TAYYOR (commit qilinmagan)
- Bu safar workflow emas, o'zim yozdim (ultracode o'chiq edi).
- `ListRow`ga `right` slot qo'shildi (Switch yoki kichik tugma uchun).
- `Toggle` endi ink rangda, oq thumb bilan. U hamma joyda ishlatiladi.
- Yangi `type.figure`: 22pt Fredoka.
- `find.tsx`:
  - FAB olib tashlandi, uning o'rniga sarlavhada "+" turadi.
  - Kategoriyalar tagiga chizilgan tablar ko'rinishida.
  - Dunyo nomi ostida `ListRow` ro'yxati, yonida "Add" (`addFriend`, ekran o'zgarmaydi) yoki "✓ Friends".
  - "Add" qator tugmasining ICHIDA emas, YONIDA turadi (ichma-ich tugma bo'lmasligi uchun).
- `us.tsx`:
  - Gradient o'rniga outlined kartochka: kun soni Fredoka'da, yalpiz progress va 3 ta stat
    (intimacy, streak, first met "Apr 9").
  - "Coming up" bo'limida `DateTile`. "Moments" chiziqli ikonkali ro'yxat.
- `profile.tsx`:
  - Bo'limlar: Account, They reach out, Chat, About.
  - "Chat animations" QOLDI, chunki u xabarlar animatsiyasini haqiqatan boshqaradi. Prototipda xato
    "ishlamaydi" deb yozgandim, foydalanuvchiga aytildi.
- `store/shell.tsx` — halol "value framing", hamma narx ochiq:
  - Paketlar kattadan kichikka tartiblangan (langar). `popular` paket oldindan tanlangan va "Most popular" yorlig'iga ega.
  - "Best value" va tejash foizlari haqiqiy narxdan hisoblanadi (`buildOffers`). 100 chig'anoq narxi
    ko'rsatiladi, bonus yalpiz rangda "N free".
  - Pastda bitta "Get N shells · $X" tugmasi, platformaga qarab "paid through the App Store/Google Play".
  - `ShellPack.best` → `popular` deb qayta nomlandi, `amount` (son narx) qo'shildi.
- Tekshirildi:
  - `tsc` toza, konsolda xato yo'q.
  - Paket tanlanganda tugma o'zgaradi, `aria-checked` to'g'ri ishlaydi.
  - Xarid: balans +320. "Add" bosilganda Kai "Friends" bo'ldi.
  - Bu sinovlar vebdagi localStorage'ni o'zgartirdi, telefonga ta'sir qilmaydi.
- 2-bosqich commit qilindi (`e352a8e`).

## Qilingan ishlar (2026-10-06): redesign 3-bosqich — TAYYOR (commit qilinmagan)
- Diary:
  - Har sahifada takrorlangan otter muqovasi o'rniga sahifaning o'zi: katta sana (Fredoka), sarlavha,
    matndan parcha va "X wrote back".
  - Sahifalarni surish (pan gesture) saqlandi. FAB o'rniga "Write today's page" tugmasi.
- Secret note: markazda kunning savoli, muhrlangan xat yalpiz qulf bilan, pastda "Swap notes · 3".
- Gifts: 7 kunlik doiralar qatori, g'ildirak tinch ranglarda (jackpot yalpiz, "Spin" o'rik).
  Aylanish animatsiyasi qoldi. Video ko'rish pastki qator.
- Qo'ng'iroq: Mute, End va Speaker tugmalari, yozuvlari bir qatorda.
  Mute va Speaker hozircha faqat holatni ko'rsatadi (expo-audio yo'q). Theme'ga `onMedia*` tokenlari qo'shildi.
  Kiruvchi qo'ng'iroq va Bedtime ataylab o'zgartirilmadi (to'liq portret va tungi sahna).
- Ro'yxatga o'tganlar: Memories, Call history, Dating, Radio, personaj sozlamalari
  (bo'limlar: This chat, Character, Manage). Contacts, Board, Background, Search va Photo booth'da
  soyalar ingichka chiziqqa almashtirildi.
- Create character endi yorug': lokal `dark` palitra o'rniga `form` (theme tokenlari).
  Diary write'dagi daftar qog'ozi qoldi.
- **Muhim tuzatish, `PressableScale`:** Reanimated'ning animatsion uslubi `opacity`ni bosib ketardi, shuning uchun
  o'chirilgan tugmalar butun ilovada yoqilgandek ko'rinardi. Endi `disabled` holatda oddiy `Pressable`
  0.45 opacity bilan chiziladi. Natijada `onPress`siz `Chip` xira bo'lib qolardi, shuning uchun
  bunday Chip endi oddiy `View` bo'lib chiziladi.
- Matnlar sentence case'ga o'tkazildi ("ADD CHARACTER" → "New character", Settings va boshqalar).
  Mahsulot nomlari (Shell Store, Heartbeat Diary, Photo Booth, Bulletin Board) bosh harfda qoldi.
- Tekshirildi: `tsc` toza, 18 ta ekran xatosiz render bo'ldi (iframe orqali). Mute toggle'i ishlaydi.
  Bo'sh xatda Swap tugmasi 0.45, yozilgandan keyin 1.
- Konsoldagi "shadows is not defined" va "useEffect is not defined" xatolari ESKI: ular tahrir o'rtasidagi
  HMR'dan qolgan, hozirgi kodda yo'q.

## BIMOBIMO raqobat tahlili (2026-10-05, xulosa)
- BIMOBIMO: App Store (US) 4.9 / ~5.5K baho; kuchi — ovoz va "haqiqiyday" suhbat.
- Sharhlardagi asosiy shikoyatlar: xotira (unutadi), takroriy iboralar, acorn devori
  ("hamma narsa pullik"), rasmni tanimaydi, til xatolari, rus tili yo'q, widget/qo'ng'iroq buglari.
- Rafti'ning ajralib turish yo'li: (1) ko'rinadigan va boshqariladigan xotira (Memories ekrani bor),
  (2) adolatli iqtisod — qo'ng'iroqlar bepul, javob o'rtada kesilmaydi, (3) rus/o'zbek/turkiy tillar,
  (4) original "tirik dunyo" (voqealar, guruh chati — NEON TIDE), (5) rasmni tushunish,
  (6) xavfsizlik (yosh tekshiruvi, AI ekanini oshkor qilish, inqiroz yordami).
- Arxitektura xavflari: barcha xabarlar bitta AsyncStorage kalitida (Android ~2MB qator
  chegarasi) → `expo-sqlite`; hisob/sinxron yo'q; balans faqat qurilmada; push yo'q;
  store ~1000 qator monolit; test/analitika/Sentry yo'q; dark mode yo'q; faqat ingliz tili.

## Keyingi ishlar (tavsiya etilgan tartib)
1. ✅ `redesign` PR'i merge qilindi (#3).
2. ✅ Backend rejasi yozildi (`docs/backend-plan.md`). Keyingi qadam: 12-bo'limdagi savollarga
   javob olish, keyin B0 (poydevor).
3. Xabarlarni `expo-sqlite`ga ko'chirish + sahifalash.
4. Push bildirishnomalar (VoIP/CallKit qo'ng'iroqlar uchun), Sentry, analitika.
5. Xavfsizlik: yosh tekshiruvi, AI disclosure, moderatsiya, UGC shikoyat, ovoz klonlash roziligi.
6. Tillar: rus, o'zbek (i18n tayyor — har til bitta JSON).
7. Keyin: dark mode, widget, guruh chati, dunyo voqealari, rasmlarni WebP'ga o'tkazish.
8. Ixtiyoriy: Oppa va Luna portretlari. Nashrdan oldin "Rafti" tovar belgisi tekshiruvi.

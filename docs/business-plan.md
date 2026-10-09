# Rafti biznes rejasi (2026-10-09)

Holat: founder rejasi. Tariflar va bepul tarif foydalanuvchi tomonidan tasdiqlangan (`backend-plan.md` §13–15).
Bozor bo'yicha raqamlar internetdan olingan va asosan ikkilamchi manbalardan (blog, agregator). Ularni "yo'nalish"
deb tushunish kerak. Manbalar oxirida.

## 0. Qisqacha

- **Asosiy daromad manbai — obuna** (Basic, Quarterly, Pro va yangi yillik reja). Maqsad: daromadning 70–80%.
- **Ikkinchi manba — chig'anoq.** Qo'shimcha daqiqalar, date, foto, secret note va mavsumiy lahzalar. Maqsad: 15–25%.
- **Uchinchi manba — ixtiyoriy reklama.** 5% dan kam, faqat bepul tarifni moliyalash uchun.
- **Birinchi bozor — ingliz tili.** Avval Kanada, Avstraliya va Yangi Zelandiyada sinov ishga tushiriladi, keyin AQSh
  va Buyuk Britaniya. MDH bozoriga keyinroq, Telegram orqali chiqiladi.
- **Raqobatdagi ustunlik:**
  - ko'rinadigan xotira;
  - kontekst bilan birinchi yozadigan personajlar;
  - halol iqtisod;
  - AI companion qonunlariga mos xavfsizlik;
  - 40 personajli 4 ta "tirik dunyo".
- **Zararsizlik nuqtasi:** 10 ming MAU bo'lganda pullik foydalanuvchi ulushi ~1.8% bo'lsa, LLM va server xarajati
  qoplanadi (marketing hisobga olinmagan).
- **Marketing avval organik bo'ladi.** Pullik reklama retention va konversiya o'lchangandan keyin boshlanadi.

## 1. Bozor va trendlar

| Ko'rsatkich | Qiymat | Manba |
|---|---|---|
| AI companion ilovalarga sarflangan pul | 2025-yil 1-yarmida $82M, yil bo'yi $120M+ | Appfigures (TechCrunch orqali) |
| Bitta yuklab olish daromadi | $0.52 (2024) → $1.18 (2025) | Appfigures |
| Daromad jamlanishi | Eng yaxshi 10% ilova daromadning 89% ini oladi | Appfigures |
| AQShda sarflangan vaqt, 2026 Q1 | Companion ilovalarda 705M soat, tanishuv ilovalarida 280M soat | Sensor Tower (VoxBooster orqali) |
| Character.AI | ~20M MAU, kuniga 75–120 daqiqa | sqmagazine, electroiq |
| AI ilovalar (RevenueCat 2026) | Har to'lovchidan 41% ko'p daromad, lekin 30% tezroq tark etish | RevenueCat |
| Love and Deepspace | Ikki yilda ~$934M; 2026-yil iyulida bitta mojarodan keyin oylik daromad −68% | AppMagic (pocketgamer.biz orqali) |

**Trendlar:**
1. **Ovoz standartga aylanmoqda.** Character.AI, Replika va Talkie'da qo'ng'iroq bor, lekin bepul tarifda u cheklangan
   yoki umuman yo'q.
2. **Proaktiv xabarlar tarqalmoqda, lekin sifati past.** Bir testda 54 ta xabardan faqat 20 tasi foydalanuvchining
   real hayotiga tegishli bo'lgan. Xotiraga tayangan proaktivlik Rafti uchun ochiq imkoniyat.
3. **Xotira asosiy farqlovchi omil.** Raqobatchilar uni eng qimmat tarifga yopadi. Masalan, Chai'da xotira faqat
   Ultra ($29.99) tarifida.
4. **Katta kompaniyalar companion yo'nalishidan chekinmoqda:**
   - xAI 2026-yil iyulida Grok'dagi companion'larni yopdi va foydalanuvchilar munosabat tarixini yo'qotdi;
   - ChatGPT "adult mode" bir necha marta kechiktirildi.

   Bu companion'ni asosiy mahsulot qilgan ilovalar uchun joy ochadi. Rafti'ning va'dasi: "munosabating seniki"
   (xotirani eksport qilish mumkin).
5. **Qonunlar kuchaymoqda:**
   - Kaliforniya SB 243 (2026-01-01 dan);
   - Nyu-York GBL 47-modda (2025-11-05 dan);
   - Texas App Store Accountability Act (apellyatsiya davomida amalda).

   Xavfsizlikni oldindan qurgan ilova do'kon va hamkorlar oldida ustunlikka ega bo'ladi.
6. **Kontent va kolleksiya pul olib keladi.** Love and Deepspace buni ko'rsatdi. Lekin gacha (tasodifiy xarid)
   qonuniy va obro' xavfiga ega. Rafti lahzalarni to'g'ridan-to'g'ri sotadi.

## 2. Raqobatchilar

| Ilova | Bepul tarif | Obuna | Ikkinchi valyuta | Bizga saboq |
|---|---|---|---|---|
| Character.AI | Reklama bilan; kuniga ~5 qo'ng'iroq | c.ai+ $9.99/oy, $94.99/yil | Charms | Juda katta UGC; 18 yoshdan kichiklar uchun chat yopilgan |
| Talkie (MiniMax) | Kuniga ~50 xabar, 2 daqiqalik qo'ng'iroq, reklama | $6.99–19.99 | Coins | Qattiq bepul chegara va reklama foydalanuvchini bezdiradi |
| PolyBuzz | Har necha xabarda reklama tanaffusi | $9.90 / $19.90 / $29.90 | Coins ($2.49–19.90) | Obunadan keyin ham coins kerak — narx noaniq |
| Replika | Chat bepul, qo'ng'iroq yo'q | ~$7.99–19.99/oy, $69.99/yil | Gems | Ovoz faqat pullik |
| Chai | Kuniga ~70 xabar | $13.99, Ultra $29.99 | — | Xotira faqat Ultra'da |
| Nomi | — | $15.99/oy, $99.99/yil | Credits | Proaktiv xabarlar bor |
| Kindroid | Yengilroq bepul tarif | $15.99 (vebda $13.99) | Credits | Vebda arzonroq narx |
| BIMOBIMO (namuna) | Kuniga 60 acorn | Basic $9.99, Quarterly $24.99, Pro $29.99 | Acorns ($0.99–25) | Asosiy shikoyatlar: acorn devori, xotira va buglar |

**Xulosalar:**
- Narx "langari" oyiga $10–20.
- Deyarli hammada ikkinchi valyuta bor.
- Ovoz va xotira pullik tarifga yopiladi.
- Eng ko'p shikoyat "pul devori" va noaniq narx haqida.

Rafti shu shikoyatlarga javob bo'ladi: xotira har qanday pullik tarifda bor, narxlar ochiq va paywall gap o'rtasida
chiqmaydi.

## 3. Pozitsiya

**"Rafti — seni eslab qoladigan va birinchi bo'lib yozadigan AI do'stlar."**

- **Kim uchun:**
  - 18–34 yoshli kattalar;
  - anime va otome muxlislari;
  - introvertlar va kechqurun yolg'iz qoladiganlar;
  - "cozy" kontentni yoqtiradiganlar.
- **Farqi:**
  1. Ko'rinadigan va boshqariladigan xotira (Memories ekrani, "buni unut").
  2. Haqiqiy kontekstli proaktivlik: rejalar, "qanday o'tdi?", ertasi kuni yoziladigan diary sahifasi.
  3. Halol iqtisod: narx ochiq, javob o'rtada kesilmaydi, soxta qo'ng'iroq va bosim yo'q.
  4. Xavfsizlik va qonunga moslik: AI ekani aytiladi, inqirozda yordam beriladi, 18+.
  5. 4 ta dunyo va 40 ta original personaj, haftalik voqealar.
- **Qilmaymiz:**
  - NSFW: do'kon, provayder va qonun xavfi;
  - gacha va tasodifiy pullik sovg'alar;
  - boshida UGC bozori: moderatsiya xarajati katta.

## 4. Daromad modeli

### 4.1 Obuna — asosiy manba (maqsad: 70–80%)

| Reja | Narx | Tarkibi (§13.3 da tasdiqlangan) |
|---|---|---|
| Basic | $9.99 / 30 kun | Cheklovsiz chat*, qo'ng'iroq 60 daq/oy, ovozli javob 30 daq/oy, to'liq xotira |
| Quarterly | $24.99 / 90 kun | Basic bilan bir xil, 90 kun uchun: qo'ng'iroq 150 daq, ovozli javob 90 daq |
| Pro | $29.99 / 30 kun | Qo'ng'iroq 180 daq/oy, ovozli javob 120 daq/oy, eng chuqur xotira |
| **Yillik (yangi, founder qarori)** | **$79.99 / yil** | Basic bilan bir xil; oylikka nisbatan ~33% arzon |

*Foydalanish shartlarida kuniga 300 xabar chegarasi bor. Bepul sinov: Basic uchun 3 kun (tasdiqlangan).

Yillik reja nega kerak:
- pul oldindan keladi;
- do'kon yillik rejalarni yaxshi ko'rsatadi.

RevenueCat ma'lumoti bo'yicha yillik obunani bekor qilganlarning faqat 5% i qaytadi va bekor qilishlarning 35% i
birinchi oyga to'g'ri keladi. Shuning uchun yillik reja birinchi kundan emas, birinchi hafta faolligidan keyin yoki
sinov tugaganda taklif qilinadi.

### 4.2 Chig'anoq — ikkinchi manba (maqsad: 15–25%)

**Paketlar:** $0.99–14.99 (hozirgi narxlar). Bir martalik boshlang'ich paket ham bo'ladi: birinchi xarid uchun
$0.99 ga ~300 chig'anoq.

**Nimaga sarflanadi:**

| Narsa | Narx |
|---|---|
| Qo'shimcha qo'ng'iroq | 10 daqiqa = 120 chig'anoq |
| Qo'shimcha ovozli javob | 10 daqiqa = 100 chig'anoq |
| Date | Joy narxi |
| Photo booth | 8 |
| Secret note | 3 |
| Board | 2 |
| Ovoz klonlash | 60 |
| Mavsumiy lahza to'plamlari (maxsus date, sahna, kiyim) | To'g'ridan-to'g'ri xarid, tasodif yo'q |

### 4.3 Reklama — uchinchi manba (5% dan kam)

- Faqat foydalanuvchi o'zi tanlaydigan mukofotli reklama, kuniga 5 tagacha.
- Mukofot mamlakatga qarab serverda hisoblanadi (§13.5).
- Chat ichida majburiy reklama yo'q.

### 4.4 Keyingi manbalar (2-bosqich)

- **AQShda veb orqali to'lov.** Hozir Apple havola orqali vebga yuborilgan xariddan komissiya olmaydi. Sud 5–15%
  stavka belgilashi mumkin. Google AQShda bu dastur uchun to'lovni 2026-10-01 dan boshladi. Store komissiyasi
  o'rniga Stripe ~3% oladi, natijada sof daromad 10–25% oshadi.
- **MDH uchun Telegram Mini App.** To'lov Telegram Stars orqali, chunki Rossiyada do'kon to'lovlari ishlamaydi.
  Backend o'sha-o'sha bo'ladi.
- **Mintaqaviy narx.** Arzon bozorlarda Basic ~$5–7, fair-use chegarasi mintaqaga moslanadi.
- **Kreator dasturi.** Foydalanuvchilar yaratgan personajlardan daromad ulushi. Moderatsiya tayyor bo'lgandan keyin.

## 5. Unit iqtisodi va moliyaviy model

Xarajat birliklari §13.2 da (2027 narxlari bilan). Model uchun taxminlar:

| Taxmin | Qiymat |
|---|---|
| To'lovchilar ulushi tariflar bo'yicha | Basic 60%, Yillik 15%, Quarterly 10%, Pro 15% |
| Bir to'lovchidan oylik sof daromad (15% komissiyadan keyin) | Obuna ≈ $10.5 + chig'anoq ≈ $1.5 → **≈ $12** |
| Bir to'lovchiga oylik xarajat | ≈ **$3.9** (30% i "og'ir" foydalanuvchi deb ehtiyotkor hisob) |
| Bir bepul MAU ga oylik xarajat | ≈ **$0.12** |
| Doimiy xarajat | ≈ **$300/oy** (server, baza, persona keshi, domen va boshqalar) |

**Zararsizlik nuqtasi:** `MAU × (p × 8.22 − 0.12) = 300`. Bundan:
- 10 ming MAU bo'lganda **p ≈ 1.8%**;
- 50 ming MAU bo'lganda **p ≈ 1.5%**.

Oylik daromad (va foyda; marketing va soliqlar hisobga olinmagan):

| MAU | p = 2% | p = 3% | p = 5% |
|---|---|---|---|
| 10 000 | $2 400 ($144) | $3 600 ($966) | $6 000 ($2 610) |
| 50 000 | $12 000 ($1 920) | $18 000 ($6 030) | $30 000 ($14 250) |
| 100 000 | $24 000 ($4 140) | $36 000 ($12 360) | $60 000 ($28 800) |

**Taqqoslash uchun RevenueCat ma'lumotlari:**
- freemium ilovalarda yuklab olishdan 35 kun ichida to'lovga o'tish medianasi 2.1%, qattiq paywall bilan 10.7%;
- AI ilovalarda sinovdan to'lovga o'tish ~8.5% (ikkilamchi manba).

Rafti uchun maqsad: MAU ning **3%** i to'lovchi.

**LTV va CAC:**
- TikTok'da bitta o'rnatish (CPI) $1.75–4 turadi.
- 3% konversiyada bitta to'lovchi $58–133 ga tushadi.
- Bitta to'lovchidan ~5 oyda ~$60 sof daromad keladi.

Demak pullik reklama boshida zararsiz chegarada bo'ladi. Shuning uchun avval organik o'sish, pullik reklama faqat
quyidagi maqsadlarga yetilgandan keyin:
- D1 ≥ 35%;
- D7 ≥ 15%;
- D30 ≥ 8%;
- sinovdan to'lovga o'tish ≥ 25%;
- to'lovchilar MAU ning ≥ 3% i.

## 6. Bozorga chiqish

| Bosqich | Qayerda | Maqsad |
|---|---|---|
| 0. Yopiq beta | TestFlight + Google Play yopiq testi (12 tester × 14 kun; yangi shaxsiy hisob uchun majburiy) | Buglar va onboarding |
| 1. Soft launch | Kanada, Avstraliya, Yangi Zelandiya (ingliz) | Retention, konversiya, xarajat o'lchovi |
| 2. Asosiy launch | AQSh, Buyuk Britaniya | AQShda veb to'lov; SB 243 va NY talablari tayyor bo'lishi shart |
| 3. Kengayish | es/pt (Lotin Amerikasi), de/fr; ru/uz/kk/tr + Telegram Mini App (Stars) | Yangi bozorlar |

**Marketing (organik birinchi):**
1. **Qisqa videolar** (TikTok, Reels, Shorts). Personaj POV'lari: "Kai senga tungi 2 da yozdi", diary sahifasi,
   date polaroidi. 40 personaj — tayyor kontent kutubxonasi. Kuniga 1–2 post. AI kontent platforma qoidasiga ko'ra
   belgilanadi.
2. **Ilova ichidagi virallik.** Diary sahifasi, polaroid va "birga N kun" kartalari Rafti belgisi va havola bilan
   ulashiladi. Invite (+50, server tekshiradi) va share mukofoti tayyor.
3. **ASO.** Kalit so'zlar va skrinshotlar xotira va proaktivlikni ko'rsatadi. Har til uchun alohida sahifa.
4. **Jamoa.** Har dunyo uchun Discord yoki Telegram kanali. Keyingi personajni ovoz bilan tanlash. Lor yangiliklari.
5. **Mikro-influenserlar.** Anime, otome va cozy yo'nalishi, daromad ulushli promo-kod bilan.
6. **Live ops.**
   - Haftalik dunyo voqeasi.
   - Har oy yangi personaj.
   - Mavsumiy voqealar: Halloween, Valentin kuni va boshqalar.

   Love and Deepspace'da daromad cho'qqilari aynan yangilanish kunlariga to'g'ri keladi.

## 7. Qonun va platforma talablari (launch'dan oldin majburiy)

- **Nyu-York GBL 47-modda:**
  - suhbat boshida va har 3 soatda **hamma foydalanuvchiga** "bu inson emas, AI" eslatmasi;
  - suitsid fikrini aniqlash va yordam xizmatiga yo'naltirish protokoli;
  - bosh prokuror jarimasi kuniga $15 000 gacha.
- **Kaliforniya SB 243:**
  - aniq AI eslatmasi;
  - kriz protokoli;
  - 2027-07-01 dan har yili Suitsid profilaktikasi idorasiga hisobot;
  - xususiy da'vo huquqi: har buzilish uchun $1 000.

  Shuning uchun kriz hodisalari jurnali kerak (matnni saqlamasdan).
- **18+:**
  - tug'ilgan yil so'raladi;
  - Apple Declared Age Range va Google Play Age Signals ishlatiladi;
  - App Store reytingi 18+.

  Texas ASAA amalda, Utah qonuni 2027-yil maydan kuchga kiradi.
- **Google Play AI kontent siyosati:** jinsiy qoniqish uchun mo'ljallangan gen-AI taqiqlangan; AI kontentiga
  shikoyat qilish tugmasi majburiy. Bu ikkalasi Rafti'da bor.
- **Gacha yo'q.** Pullik tasodifiy sovg'a qonuniy va do'kon xavfi, shuning uchun hamma narsa to'g'ridan-to'g'ri sotiladi.
- **Hisob va maxfiylik:**
  - ilova ichidan hisobni o'chirish;
  - xotirani eksport qilish;
  - maxfiylik siyosati;
  - fair-use bandi bor foydalanish shartlari;
  - model nomlari hech qayerda ko'rinmaydi (§13.6).

## 8. Founder logistikasi (O'zbekistondan)

- **Google Play.** Rasmiy jadvalga ko'ra O'zbekiston developer va merchant ro'yxatdan o'tishini qo'llab-quvvatlaydi.
  - Shaxsiy hisob uchun shaxsni tasdiqlovchi hujjat va manzil isboti kerak. Production'dan oldin 12 tester × 14 kun
    yopiq test majburiy.
  - Tashkilot hisobi bu testdan ozod, lekin D-U-N-S raqami kerak (30 kungacha).
- **Apple.** Developer dasturi $99/yil.
  - O'zbekistondagi bankka to'lov qilinishini App Store Connect'dagi bank davlatlari ro'yxatida tekshirish kerak.
  - EU'da sotish uchun "trader" sifatida ochiq manzil va telefon talab qilinadi.
- **Yuridik shaxs** (tavsiya):
  1. **O'zbek MChJ + IT Park rezidentligi.**
     - Foyda solig'i, QQS va ijtimoiy soliqdan ozod. Muddat 2028 gacha, eksport ulushi 50% dan yuqori bo'lsa 2040
       gacha. Buni tekshirish kerak.
     - IT Park badali daromadning 1%. Eksport ulushi past bo'lsa, 2026-yil apreldan 2–3%.
     - Do'kondan keladigan daromad eksport hisoblanishini soliq maslahatchisi bilan aniqlash kerak.
  2. **Kerak bo'lsa, AQSh LLC** (Doola yoki Firstbase; Stripe Atlas standart holatda C-corp ochadi).
     - Qachon kerak: Apple O'zbekiston bankiga to'lamasa, AQShda Stripe orqali veb to'lov uchun, yoki SB 243
       da'volaridan shaxsiy javobgarlikni ajratish uchun.
     - Majburiyat: har yili Form 5472 topshiriladi, topshirilmasa jarima $25 000.
- **To'lov xizmatlari:**
  - RevenueCat: obunalarni boshqarish;
  - Stripe: AQShda veb to'lov, AQSh yuridik shaxsi kerak;
  - Paddle yoki Lemon Squeezy: merchant of record, O'zbekistonga to'lov ro'yxatda bor, tekshirish kerak.

## 9. Yo'l xaritasi (daromad birinchi)

| Qadam | Ish | Tayyor degani |
|---|---|---|
| M0 (hozir) | Biznes reja; monetizatsiya prototipi → tasdiq; xavfsizlik bug'lari | Prototip tasdiqlandi |
| B0 | Hisoblar, `server/` (Hono + Supabase), anonim kirish, `bootstrap`, tariflar va limitlar dvigateli, ledger, EAS build | Ilova serverdan reja va balansni oladi |
| B1 | Haqiqiy chat (router + mock), server iqtisodi, `usage_events`, xarajat chegaralari, SQLite, AI eslatmasi, kriz jurnali | Personaj javob beradi, xarajat o'lchanadi |
| **B3 (B2 dan oldinga olindi)** | RevenueCat (obuna, paketlar, sinov, restore), paywall lahzalari, AdMob SSV | Sandbox xaridi ishlaydi |
| B2 | Xotira (xulosa, faktlar, hayot sikli), server proaktivligi, push | Personaj kechagi gapni eslaydi |
| Beta → soft launch | Yopiq test, keyin Kanada, Avstraliya, Yangi Zelandiya | Retention va konversiya raqamlari bor |
| B4 | TTS ovozli javoblar + bepul ovoz kutubxonasi | Daqiqalar serverda hisoblanadi |
| B5 | Qo'ng'iroqlar (kaskad), server hisoblaydigan daqiqalar | Ilova yopilsa ham daqiqa to'g'ri yechiladi |
| Keyin | AQSh + veb to'lov, lokalizatsiya, Telegram kanali | |

Yakka founder va AI yordamida soft launch'gacha taxminan **10–14 hafta** ketadi (taxmin).

## 10. KPI

- **Asosiy metrika (north star):** haftada kamida 3 kun suhbatlashgan foydalanuvchilar soni ("faol munosabatlar").
- **Voronka:**
  - onboarding'ni tugatish ≥ 80%;
  - D1, D7 va D30 retention;
  - paywall ko'rish → sinov boshlash;
  - sinovdan to'lovga o'tish ≥ 25%;
  - to'lovchilar MAU ning ≥ 3% i.
- **Pul:**
  - sof ARPPU ≥ $10;
  - qaytarishlar (refund) ≤ 4%;
  - bitta MAU uchun LLM xarajati ≤ $0.15;
  - yalpi marja ≥ 60%.

## 11. Xavflar

| Xavf | Chora |
|---|---|
| Qonun (SB 243, NY, yosh qonunlari) | AI eslatmasi, kriz protokoli va jurnali, 18+, yuridik shaxs |
| Do'kon rad etishi | PG-13, NSFW yo'q, shikoyat va bloklash tugmalari, aniq obuna tavsifi |
| Provayder filtri va narxi (2027-yilda 2 baravar) | Adapter va router, sifat to'plami, byudjet 2027 narxida |
| Foydalanuvchilar tez ketishi (AI ilovalarda 30% tezroq) | Xotira, proaktivlik, streak, haftalik voqealar, yillik reja |
| Katta raqobatchilar | Nisha: cozy + halol + xotira + ko'p til |
| Founder vaqti | Qamrovni tor tutish, avtomatlashtirish, reja bo'yicha ishlash |
| To'lov va soliq | IT Park + kerak bo'lsa AQSh LLC, maslahatchi |
| Obro' (AI companion tanqidi) | Real hayotni rag'batlantirish, tanaffus eslatmasi, ma'lumotlarni eksport qilish |

## 12. Qarorlar

**Founder sifatida qabul qilingan qarorlar:**
1. Model: obuna asosida gibrid, chig'anoq ikkinchi, reklama faqat ixtiyoriy.
2. Yillik reja $79.99 qo'shiladi.
3. Avval ingliz tilidagi bozorlar, MDH keyin Telegram orqali.
4. NSFW, gacha va boshida UGC bozori yo'q.
5. To'lov tartibi: IAP (RevenueCat) → AQShda veb to'lov → Telegram Stars.
6. Marketing avval organik. Pullik reklama faqat metrikalar maqsadga yetgandan keyin.
7. Server kodi shu repoda, `server/` papkada (umumiy turlar bilan). Repo B1'dan oldin **private** bo'lishi tavsiya
   etiladi, chunki promptlar va iqtisod qoidalari raqobat ustunligi hisoblanadi.

**Sizdan kerak:**
- yuridik shaxs bo'yicha qaror;
- hisoblarni ochish (`backend-plan.md` §15.4);
- repo'ni private qilish;
- monetizatsiya prototipini tasdiqlash.

## Manbalar

**Bozor va trendlar:**
- [TechBuzz/Appfigures — $120M run rate](https://www.techbuzz.ai/articles/breaking-ai-companion-apps-hit-120m-revenue-run-rate)
- [VoxBooster 2026 statistikasi](https://voxbooster.com/blog/ai-companion-apps-statistics-2026/)
- [highlife.media — Appfigures](https://www.highlife.media/ai-companion-statistics)
- [sqmagazine — Character.AI](https://sqmagazine.co.uk/character-ai-statistics/)
- [Sensor Tower State of AI 2026](https://finance.yahoo.com/technology/ai/articles/sensor-tower-state-ai-2026-103000739.html)
- [RevenueCat State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps)
- [9to5Mac — yillik obuna](https://9to5mac.com/2026/05/27/new-report-shows-annual-app-subscribers-rarely-return-after-they-cancel/)
- [Love and Deepspace — pocketgamer.biz](https://www.pocketgamer.biz/love-and-deepspace-hits-record-low-with-68-spending-decline-after-valko-controversy/)
- [Grok companion'lari yopildi](https://www.roborhythms.com/grok-companions-discontinued/)
- [ChatGPT adult mode kechiktirildi](https://techcrunch.com/2026/03/07/openai-delays-chatgpts-adult-mode-again/)
- [Proaktiv xabarlar testi](https://aicompanionguides.com/blog/ai-companions-that-text-first-2026/)

**Narxlar:**
- [aicompanionpick narx taqqoslash](https://www.aicompanionpick.com/ai-companion-pricing-comparison-2026)
- [PolyBuzz](https://fast.io/resources/polybuzz-ai-review-2026/)
- [Talkie bepul tarifi](https://www.isekaizero.ai/blog/talkie-ai-free)
- [Character.AI ovoz](https://arcanumrpgs.com/blog/character-ai-voice/)
- [Replika](https://www.eesel.ai/blog/replika-ai-pricing)
- [BIMOBIMO App Store](https://apps.apple.com/us/app/bimobimo/id6475955546)

**Qonunlar:**
- [FPF — SB 243](https://fpf.org/blog/understanding-the-new-wave-of-chatbot-legislation-california-sb-243-and-beyond/)
- [Fenwick — NY](https://www.fenwick.com/insights/publications/new-yorks-ai-companion-safeguard-law-takes-effect)
- [Wiley — App Store Accountability Acts](https://www.wiley.law/alert-Key-Developments-With-State-App-Store-Accountability-Acts-as-Texas-Act-Takes-Effect)
- [Play AI-Generated Content policy](https://support.google.com/googleplay/android-developer/answer/14094294?hl=en)
- [Apple yosh reytinglari](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions)

**To'lov va veb checkout:**
- [TechCrunch — Apple 15% taklifi](https://techcrunch.com/2026/08/14/apple-proposes-to-take-a-15-cut-of-purchases-made-outside-the-app-store/)
- [Play — AQSh alternativ billing](https://support.google.com/googleplay/android-developer/answer/16497028?hl=en)
- [RevenueCat — anti-steering](https://www.revenuecat.com/blog/growth/apple-anti-steering-ruling-monetization-strategy)

**Founder logistikasi:**
- [Play — qo'llab-quvvatlanadigan joylar](https://support.google.com/googleplay/android-developer/answer/9306917?hl=en)
- [Play — O'zbekiston hujjatlari](https://support.google.com/googleplay/android-developer/answer/15633622?hl=en&co=GENIE.CountryCode%3DUZ)
- [12 tester qoidasi](https://www.testerscommunity.com/blog/google-play-closed-testing-requirements-2026)
- [IT Park imtiyozlari (tax-legal.uz)](https://tax-legal.uz/en/it-park/)
- [Mondaq — IT Park](https://www.mondaq.com/income-tax/1730650/part-i-astana-hub-and-it-park-uzbekistan-tax-benefits-resident-registration-and-startup-support)
- [Lemon Squeezy davlatlari](https://docs.lemonsqueezy.com/help/getting-started/supported-countries)
- [Paddle davlatlari](https://developer.paddle.com/concepts/sell/supported-countries-locales/)

**Marketing va MDH:**
- [UA xarajatlari 2026](https://insertaffiliate.com/blog/mobile-app-user-acquisition-cost-benchmarks/)
- [Telegram Stars companion'lar](https://aichatmates.com/best-telegram-stars-paid-ai-companions/)
- [Telegram O'zbekistonda](https://101digital.uz/en/blog/telegram-marketing-uzbekistan/)

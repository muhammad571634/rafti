# HANDOFF — keyingi sessiya shu fayldan boshlasin

Foydalanuvchi o'zbek tilida yozadi — javoblar o'zbekcha. Kod izohlari inglizcha.

## Hozirgi holat (2026-09-29)
- Expo SDK 57 ilova (BIMOBIMO — Beemo/BIMOBIMO ilovasiga o'xshash AI kompanion).
  Mantiq, iqtisod, qo'ng'iroqlar va boshqa bo'limlar tayyor, tavsif — `README.md`.
- Hech narsa commit qilinmagan (foydalanuvchi so'ramagan).
- Brauzerda tekshirish: `.claude/launch.json` → `bimobimo-web` (port 8081).

## Yangi brend (foydalanuvchi tasdiqlagan)
- Pushti mushuk va Beemo palitrasidan voz kechildi.
- Maskot: **Popo** — krem yuzli, karamel rangli, yalpiz sharfli suv samuri,
  yumshoq 3D "loy o'yinchoq" uslubida.
  - To'g'ri namuna: `C:\Users\joray\BIMOBIMOdesignraw\_refs\ref_popo_square.png`.
  - `mascot_main.png` ISHLATILMAYDI: yuzi jigarrang, boshqa dizayn.
- Palitra "Kakao va yalpiz":
  | Rol | Rang |
  |---|---|
  | O'rik | `#FF9F5A` |
  | Yalpiz | `#3CCFB4` |
  | Osmon | `#6BB8FF` |
  | Krem fon | `#FFF7EC` |
  | Karamel | `#C98B5E` |
  | Matn | `#2A2E45` |

## Rasmlar: `C:\Users\joray\BIMOBIMOdesignraw\`
Nuqta: har bir `*.png` aslida PAPKA, ichida Gemini'dan olingan `.jpg` bor.
Bir papkada bir nechta rasm bo'lsa, ENG YANGISI olinadi.

| Rasm | Holat |
|---|---|
| 10 ta icon_*, reward_daily, empty_state, bedtime, sticker_call, levelup, diary_cover, app_icon | ✅ Ilovaga ulangan |
| icon_diary | ✅ Burni tuzatilgan nusxasi: `_fixed\icon_diary.png` |
| banner_home | ✅ Qayta chizildi (22:17), Popo o'ngda va katta. 1024×572 — ekranda yetarli |
| currency_shell | ✅ Chizildi (22:21), ko'k fondan rang tusi bo'yicha kesiladi (`key_out_sky`) |

- Kanvaslar: `_refs\canvas_1x1.png`, `canvas_3x4_vertical.png`, `canvas_wide_banner.png`.
- Nano Banana natijani yuklangan rasm proporsiyasida chiqaradi. Shuning uchun har safar
  3 ta rasm yuklanadi: namuna + uslub (`icon_gifts`) + kanvas.

## Tanlangan yo'l: B
Foydalanuvchi rasmlarni Gemini'da o'zi chizadi. Unga BIR MARTADA BITTA prompt ber.
Promptlar va jadval oldingi javobda edi: 4 ta ikonka, banner, muqova, app icon.

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

## Keyingi ishlar
1. Birinchi commit (foydalanuvchi so'rasa).
2. Ixtiyoriy: Oppa va Luna uchun ham portret (hozir monogramma).
3. Nashrdan oldin: "Rafti" nomi bo'yicha tovar belgisi tekshiruvi (WIPO / USPTO / EUIPO).

## Ochiq savollar
- ✅ Hal bo'ldi: anime, Genshin va K-pop personajlari original personajlar bilan almashtirildi.

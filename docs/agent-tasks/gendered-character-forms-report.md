# Report: Shared Lines Following Character Gender

Task completed in full across all relevant languages: `zh-Hant`, `es`, `pt-BR`, `it`, `fr`, `de`, and `ru` (with verification of zero character 3rd-person pronouns in date lines for `ja`, `ko`, `vi`, `th`, `tr`, and `id`).

Every shared line where a character speaks of itself or is described in narration now uses `{g:female|male}` (female form first). All user choice lines (`.text`) remain free of `{g:}` and have been neutrally rephrased.

## 1. Summary of Scan Counts (Before → After)

| Language | Changed Strings | `--date` before → after | `--self` before → after | `--count` (user) before → after | `--cast` before → after | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **zh-Hant** | 129 | 129 → 0 | N/A (0 → 0) | N/A (0 → 0) | 0 → 0 | Clean |
| **es** | 5 | 2 → 0 | 3 → 1 | 1 → 1 | 0 → 0 | Clean |
| **pt-BR** | 50 | 42 → 0 | 13 → 8 | 12 → 11 | 0 → 0 | Clean |
| **it** | 33 | 15 → 3 | 18 → 3 | 18 → 18 | 0 → 0 | Clean |
| **fr** | 132 | 130 → 18 | 21 → 9 | 8 → 8 | 0 → 0 | Clean |
| **de** | 148 | 171 → 29 | N/A (0 → 0) | N/A (0 → 0) | 0 → 0 | Clean |
| **ru** | 225 | 128 → 15 | 104 → 4 | 10 → 9 | 0 → 0 | Clean |
| **Total** | **722** | **617 → 65** | **159 → 25** | **49 → 47** | **0 → 0** | **PASS** |

Verification checks:
- `npm run check:content`: **PASS** (all 13 locales valid)
- `npm run check:locales`: **PASS** (all 13 locales valid)
- `npx tsc --noEmit`: **PASS** (0 errors)
- `npm test`: **PASS** (483 passing, 0 failing)

---

## 2. Justification of Remaining Scanner Hits

All remaining scanner hits are verified valid false positives:

### French (`fr`) Remaining Hits
- `--date` (18 hits):
  - `datePlaces.ds_aquarium.rounds.1.choices.0.text`: "Elle t'a à la bonne." — "Elle" refers to *la loutre* (the otter, fem. noun).
  - `datePlaces.ds_aquarium.rounds.1.choices.2.reply`: "Tu savais qu'elles se tiennent la patte..." — "elles" refers to the otters holding paws while sleeping.
  - `datePlaces.ds_aquarium.rounds.3.choices.2.reply`: "« Il a de la personnalité... »" — "Il" refers to the plush toy (le jouet).
  - `datePlaces.ds_aquarium.rounds.4.choices.1.text`: "Il y aura une prochaine fois..." — impersonal *il y aura*.
  - `datePlaces.ds_festival.rounds.1.choices.2.reply`: "Il y avait du vent contraire !" — impersonal *il y avait*.
  - `datePlaces.ds_festival.rounds.2.choices.0.reply`: "Le cliché... il est absolument parfait." — "il" refers to *le cliché* (the photo).
  - `datePlaces.ds_studio.rounds.3.line`: "Il est trois heures du matin..." — impersonal time expression.
  - `datePlaces.ds_rooftop.rounds.1.choices.1.reply`: "Il n'est pas trop tard..." — impersonal *il n'est pas*.
  - `datePlaces.ds_rooftop.rounds.3.choices.1.reply`: "Il suffit de se balancer doucement en rythme." — impersonal *il suffit*.
  - `dateThemes.shared.0.choices.1.reply`: "s'il vous plaît" — fixed courtesy formula.
  - `dateThemes.shared.1.choices.2.reply`: "C'était il y a une heure entière !" — impersonal *il y a*.
  - `dateThemes.shared.3.choices.2.reply`: "S'il te plaîîît." — fixed courtesy formula.
  - `dateThemes.shared.5.choices.1.reply`: "« Elle l'est, »" — refers to the playlist/evening (*la musique / la soirée*).
  - `dateThemes.moodRounds.flirty.0.choices.0.text`: "Il s'est déjà réalisé." — refers to *le vœu* (the wish, masc. noun).
  - `dateThemes.moodRounds.sweet.0.line`: "Elle gênait tes yeux." — refers to *une mèche* (strand of hair, fem. noun).
  - `worlds.moonlit.dateRounds.0.choices.1.reply`: "Je veillerai à ce qu'il se réalise." — refers to *le vœu* (the wish).
  - `worlds.moonlit.dateRounds.1.choices.0.reply`: "Il y a tout juste la place pour deux." — impersonal *il y a*.
  - `worlds.tidepool.dateRounds.1.choices.1.reply`: "il ne nous quittera plus d'une semelle" — refers to *le chiot* (the puppy, masc. noun).
- `--self` (9 hits):
  - `datePlaces.ds_aquarium.rounds.3.choices.0.reply`: Already split `{g:sûre|sûr}`.
  - `worlds.tidepool.dateRounds.1.choices.0.reply`: "Le chiot est ravi..." — refers to the puppy.
  - `voice.chat.birthday.2`: Already split `{g:heureuse|heureux}`.
  - `voice.threads.lines.before.1`: "Tout est prêt ?" — *Tout* (everything, neuter/invariable).
  - `voice.week.mood.tired`: "Ton journal a l’air épuisé." — refers to *le journal* (masc. noun).
  - `voice.steer.continue.5.0`: Already split `{g:ravie|ravi}`.
  - `voice.ideas.special.week:rough.0`: Already split `{g:contente|content}`.
  - `voice.drafts.voices.bluntThenSorry.greeting`: Already split `{g:ravie|ravi}`.
  - `voice.morning.questionWithTimedPlan`: "Tout est prêt ?" — *Tout* (everything).

### German (`de`) Remaining Hits
- `--date` (29 hits):
  - 8 hits for "Ihr" meaning 2nd person plural (both of you): `datePlaces.ds_rain.rounds.2.line`, `datePlaces.ds_aquarium.rounds.4.choices.0.reply`, `datePlaces.ds_studio.rounds.0.choices.2.reply`, `datePlaces.ds_rooftop.rounds.3.choices.0.reply`, `dateThemes.shared.0.line`, `dateThemes.shared.2.choices.0.reply`, `dateThemes.shared.5.line`, `worlds.seaside.dateRounds.1.choices.0.reply`, `worlds.tidepool.dateRounds.1.choices.0.reply`.
  - 5 hits for noun pronouns: `datePlaces.ds_rain.rounds.2.choices.0.text` (sie = die Zimtschnecke), `choices.1.text` (sie = die Zimtschnecke), `choices.1.reply` (sie = die Zimtschnecke; character pronoun already `{g:Sie|Er}`), `datePlaces.ds_studio.rounds.3.choices.0.reply` (sie = die Dose; character already `{g:Sie|Er}`), `choices.1.text` (sie = die Dose).
  - 2 hits for otter / animal pronouns: `datePlaces.ds_aquarium.rounds.1.line` (seine Pfötchen = otter's paws), `choices.0.text` (Er = der Fischotter).
  - 1 hit for otters sleeping: `datePlaces.ds_aquarium.rounds.1.choices.2.reply` (sie = otters plural; character pronoun already `{g:sie|er}`).
  - 2 hits for "sein" as verb infinitive (to be): `datePlaces.ds_studio.rounds.1.choices.1.text`, `datePlaces.ds_rooftop.rounds.4.choices.0.text`.
  - 1 hit for sky: `datePlaces.ds_rooftop.rounds.0.line` (er = der Sternenhimmel).
  - 1 hit for kid asking: `dateThemes.shared.4.line` (ihr = both of you).
  - 1 hit for evening: `dateThemes.shared.5.choices.1.reply` (er = der Abend/Moment).
  - 1 hit for laughter: `dateThemes.moodRounds.flirty.1.choices.0.reply` (ihr lacht beide).
  - 1 hit for hair strand: `dateThemes.moodRounds.sweet.0.line` (Sie = die Haarsträhne).
  - 1 hit for hand gliding: `dateThemes.moodRounds.sweet.0.choices.0.reply` (sie = die Hand; character already `{g:Ihre|Seine}`).
  - 2 hits for shooting star / wish: `worlds.moonlit.dateRounds.0.line` (ihre Bahn = star's path), `choices.1.reply` (ihn/er = der Wunsch).
  - 1 hit for puppy: `worlds.tidepool.dateRounds.1.choices.1.reply` (er = der Welpe).

### Russian (`ru`) Remaining Hits
- `--date` (15 hits):
  - `datePlaces.ds_rain.rounds.2.choices.0.text`: "её" = булочка (cinnamon bun, fem. noun).
  - `datePlaces.ds_aquarium.rounds.1.choices.0.text`: "ей" = выдра (otter, fem. noun).
  - `datePlaces.ds_aquarium.rounds.3.choices.1.reply`: "её", "Ей" = плюшевая рыбка; character is `{g:Она|Он}`.
  - `datePlaces.ds_aquarium.rounds.4.choices.0.text`: "его" = вечер (the evening).
  - `datePlaces.ds_festival.rounds.1.choices.0.reply`: "его" = медведь (toy bear); character is `{g:она|он}`.
  - `datePlaces.ds_studio.rounds.2.choices.0.reply`: "её" = музыкальная партия; character is `{g:Она|Он}`.
  - `datePlaces.ds_studio.rounds.3.choices.0.text`: "его" = напиток.
  - `datePlaces.ds_studio.rounds.4.line`: "его" = аудиофайл.
  - `datePlaces.ds_rooftop.rounds.2.choices.1.reply`: "Она", "её" = куртка; speech tag is `{g:говорит она|говорит он}`.
  - `dateThemes.shared.1.choices.0.reply`: "его" = снек; character is `{g:она|он}`.
  - `dateThemes.shared.3.choices.0.reply`: "его" = фотокадр; character is `{g:Она|Он}` and `{g:она|он}`.
  - `worlds.moonlit.dateRounds.0.choices.1.text`: "его" = желание (neuter noun).
  - `worlds.moonlit.dateRounds.0.choices.1.reply`: "его" = желание.
  - `worlds.moonlit.dateRounds.1.choices.0.reply`: "Его" = плащ.
  - `worlds.tidepool.dateRounds.1.choices.1.reply`: "он" = щенок.
- `--self` (4 hits):
  - `voice.reply.tellStory.0`: Fairy tale about a lighthouse keeper (*смотритель маяка*).
  - `voice.week.close.shy.1`: Already split `{g:рада|рад}` ("был именно ты" is about the user).
  - `voice.ideas.answers.lead60.1`: "Принято" (neuter short participle).
  - `voice.morning.activities.Gym`: "Зал" (noun).

### Italian (`it`) Remaining Hits
- `--date` (3 hits):
  - `datePlaces.ds_festival.rounds.1.choices.1.reply`: "Quell'orso... gli occhi" — refers to the teddy bear.
  - `worlds.moonlit.dateRounds.0.choices.1.text`: "Chiudere gli occhi e tenerlo segreto." — "gli occhi" (masc. pl. article) and "tenerlo" (desiderio, masc. noun).
  - `worlds.moonlit.dateRounds.0.choices.1.reply`: "Custodiscilo... {name}. «Farò in modo che si avveri.»" — "Custodiscilo" (il desiderio).
- `--self` (3 hits):
  - `voice.reply.share.default.0`: "arrossendo" (gerund).
  - `voice.ideas.special.week:rough.0`: Already split `{g:contenta che sia passata|contento che sia passato}`.
  - `voice.ideas.answers.lead60.1`: "Ricevuto:" (impersonal acknowledgment).

### Spanish (`es`) Remaining Hits
- `--self` (1 hit):
  - `voice.reply.share.Moonlit Realm.2`: "El castillo estaba tan silencioso..." — refers to the castle (*el castillo*, masc. noun).

### Portuguese (`pt-BR`) Remaining Hits
- `--self` (8 hits):
  - `voice.reply.share.Seaside Academy.0`: "O dia estava tão bonito..." — refers to the day (*o dia*, masc. noun).
  - `voice.reply.share.Moonlit Realm.2`: "O castelo estava tão silencioso..." — refers to the castle (*o castelo*).
  - `voice.kin.lines.grandparent.morning.0`: "O sol já saiu..." — refers to the sun.
  - `voice.kin.lines.grandparent.morning.2`: "Acordei pensando em você." — Portuguese past participle *acordei* is gender-neutral.
  - `voice.brief.hello.sulky.0`: "...nem pense que esqueci." — *esqueci* is gender-neutral.
  - `voice.steer.skip.evening.1.0`: "O céu ficou laranja..." — refers to the sky (*o céu*).
  - `voice.ideas.answers.missed.1`: "Bateu um tédio..." — refers to boredom (*o tédio*).
  - `voice.drafts.voices.flirtsToDodge.greeting`: "...deveria ter sido..." — impersonal *ter sido*.

---

## 3. Comprehensive Table of All Changes Per Language

### Traditional Chinese (`zh-Hant`) — 129 changes

| Path | Before | After |
| :--- | :--- | :--- |
| `datePlaces.ds_rain.rounds.0.line` | {name}把雨傘明顯偏向了你那一側。「你半邊肩膀都濕透了啦，」你提醒他。「那又怎樣？」 | {name}把雨傘明顯偏向了你那一側。「你半邊肩膀都濕透了啦，」你提醒{g:她\|他}。「那又怎樣？」 |
| `datePlaces.ds_rain.rounds.0.choices.0.text` | 伸手把他拉進傘下，靠在自己身邊。 | 伸手拉進傘下，靠在自己身邊。 |
| `datePlaces.ds_rain.rounds.0.choices.0.reply` | 「……好啦。這樣確實好多了。」他沒有退開半步。 | 「……好啦。這樣確實好多了。」{g:她\|他}沒有退開半步。 |
| `datePlaces.ds_rain.rounds.0.choices.2.reply` | 「喂！快給我回來！」他一邊笑著一邊追了過來。 | 「喂！快給我回來！」{g:她\|他}一邊笑著一邊追了過來。 |
| `datePlaces.ds_rain.rounds.1.choices.1.reply` | 「你在向我下戰帖嗎？」他居然真的立刻蹲了下來。 | 「你在向我下戰帖嗎？」{g:她\|他}居然真的立刻蹲了下來。 |
| `datePlaces.ds_rain.rounds.1.choices.2.reply` | 「真講究實際。」他的語氣聽起來似乎有點小失落。 | 「真講究實際。」{g:她\|他}的語氣聽起來似乎有點小失落。 |
| `datePlaces.ds_rain.rounds.2.choices.1.text` | 買下來，然後故意在他面前慢慢大口吃。 | 買下來，然後故意當面慢慢大口吃。 |
| `datePlaces.ds_rain.rounds.2.choices.1.reply` | 「你也太殘忍了吧。」他趁你不注意還是咬了一大口。 | 「你也太殘忍了吧。」{g:她\|他}趁你不注意還是咬了一大口。 |
| `datePlaces.ds_rain.rounds.2.choices.2.reply` | 「……也是啦，健康要緊。」他依依不捨地看了肉桂捲最後一眼。 | 「……也是啦，健康要緊。」{g:她\|他}依依不捨地看了肉桂捲最後一眼。 |
| `datePlaces.ds_rain.rounds.3.choices.0.reply` | 他轉頭看向窗外，嘴角揚起了溫柔的微笑。 | {g:她\|他}轉頭看向窗外，嘴角揚起了溫柔的微笑。 |
| `datePlaces.ds_rain.rounds.3.choices.1.reply` | 「慢一點挺好的，」他贊同道：「跟你在一起，慢慢的感覺真好。」 | 「慢一點挺好的，」{g:她\|他}贊同道：「跟你在一起，慢慢的感覺真好。」 |
| `datePlaces.ds_rain.rounds.4.choices.1.text` | 道別前給他一個溫暖的擁抱。 | 道別前送上一個溫暖的擁抱。 |
| `datePlaces.ds_rain.rounds.4.choices.1.reply` | 他抱住你的時間，比你預期的多停留了一秒鐘。 | {g:她\|他}抱住你的時間，比你預期的多停留了一秒鐘。 |
| `datePlaces.ds_aquarium.rounds.0.choices.0.reply` | 他靠了過來，肩膀輕輕依偎在你的肩膀上。 | {g:她\|他}靠了過來，肩膀輕輕依偎在你的肩膀上。 |
| `datePlaces.ds_aquarium.rounds.0.choices.1.text` | 在水母的微光下為他拍張照片。 | 在水母的微光下拍張照片。 |
| `datePlaces.ds_aquarium.rounds.1.choices.2.reply` | 「你知道牠們睡覺時會手牽著手嗎？」他說道：「你現在知道了喔。」 | 「你知道牠們睡覺時會手牽著手嗎？」{g:她\|他}說道：「你現在知道了喔。」 |
| `datePlaces.ds_aquarium.rounds.2.choices.0.text` | 反手牽起他的手。 | 反手牽起對方的手。 |
| `datePlaces.ds_aquarium.rounds.2.choices.0.reply` | 「……為了安全起見，」他小聲說。走出隧道後，他的手依然沒放開。 | 「……為了安全起見，」{g:她\|他}小聲說。走出隧道後，{g:她\|他}的手依然沒放開。 |
| `datePlaces.ds_aquarium.rounds.2.choices.2.reply` | 「謝謝你喔，大教授。」他這才鬆開了手。 | 「謝謝你喔，大教授。」{g:她\|他}這才鬆開了手。 |
| `datePlaces.ds_aquarium.rounds.3.choices.1.reply` | 「為什麼選這隻？」「因為牠看起來需要有人愛。」他二話不說直接買單。 | 「為什麼選這隻？」「因為牠看起來需要有人愛。」{g:她\|他}二話不說直接買單。 |
| `datePlaces.ds_aquarium.rounds.3.choices.2.reply` | 「沒人真正需要一隻魚偶啦。」他乖乖把它們放回架上。 | 「沒人真正需要一隻魚偶啦。」{g:她\|他}乖乖把它們放回架上。 |
| `datePlaces.ds_festival.rounds.0.choices.0.text` | 任由他興高采烈地帶路。 | 任由對方興高采烈地帶路。 |
| `datePlaces.ds_festival.rounds.0.choices.1.text` | 十指緊扣牽起他的手，以防在人群中走散。 | 十指緊扣牽起對方的手，以防在人群中走散。 |
| `datePlaces.ds_festival.rounds.0.choices.1.reply` | 「好主意，」他回答得有點太快，耳朵悄悄紅了。 | 「好主意，」{g:她\|他}回答得有點太快，耳朵悄悄紅了。 |
| `datePlaces.ds_festival.rounds.0.choices.2.reply` | 他放慢了腳步。大部分時候啦。 | {g:她\|他}放慢了腳步。大部分時候啦。 |
| `datePlaces.ds_festival.rounds.1.choices.0.text` | 親自上陣幫他贏下來。 | 親自上陣幫忙贏下來。 |
| `datePlaces.ds_festival.rounds.1.choices.0.reply` | 第三圈穩穩套中！泰迪熊比{name}還要高，他堅決不肯一個人抱著走。 | 第三圈穩穩套中！泰迪熊比{name}還要高，{g:她\|他}堅決不肯一個人抱著走。 |
| `datePlaces.ds_festival.rounds.1.choices.1.reply` | 他又落空了，但臉上依舊笑得無比燦爛。 | {g:她\|他}又落空了，但臉上依舊笑得無比燦爛。 |
| `datePlaces.ds_festival.rounds.1.choices.2.reply` | 「絕對有動手腳。」但他眼神還是依依不捨地看著那隻大熊。 | 「絕對有動手腳。」但{g:她\|他}眼神還是依依不捨地看著那隻大熊。 |
| `datePlaces.ds_festival.rounds.2.choices.0.text` | 拿走貓咪面具，把狐狸面具戴在他臉上。 | 拿走貓咪面具，把狐狸面具戴在對方臉上。 |
| `datePlaces.ds_festival.rounds.2.choices.1.text` | 把兩個面具全戴在自己臉上，什麼都不留給他。 | 把兩個面具全戴在自己臉上，什麼都不留給對方。 |
| `datePlaces.ds_festival.rounds.2.choices.1.reply` | 「你也太過分了吧。」他一邊笑一邊拿手機連拍了你五張照片。 | 「你也太過分了吧。」{g:她\|他}一邊笑一邊拿手機連拍了你五張照片。 |
| `datePlaces.ds_festival.rounds.3.choices.1.text` | 轉過頭靜靜注視著他的雙眸。 | 轉過頭靜靜注視著對方的雙眸。 |
| `datePlaces.ds_festival.rounds.3.choices.2.reply` | 他湊近你的鏡頭，笑著朝鏡頭用力揮手。 | {g:她\|他}湊近你的鏡頭，笑著朝鏡頭用力揮手。 |
| `datePlaces.ds_festival.rounds.4.choices.0.reply` | 他輕輕捏了捏你的手心兩下。 | {g:她\|他}輕輕捏了捏你的手心兩下。 |
| `datePlaces.ds_studio.rounds.0.choices.0.reply` | 當你睜開眼時，他正緊張兮兮地凝視著你的反應。 | 當你睜開眼時，{g:她\|他}正緊張兮兮地凝視著你的反應。 |
| `datePlaces.ds_studio.rounds.1.choices.1.text` | 拜託他再播一次給你聽。 | 拜託再播一次給你聽。 |
| `datePlaces.ds_studio.rounds.1.choices.1.reply` | 他又連播了兩遍。耳根悄悄泛紅了起來。 | {g:她\|他}又連播了兩遍。耳根悄悄泛紅了起來。 |
| `datePlaces.ds_studio.rounds.2.choices.0.reply` | 他錄了下來，疊在副歌當背景音循環播放。完美契合。 | {g:她\|他}錄了下來，疊在副歌當背景音循環播放。完美契合。 |
| `datePlaces.ds_studio.rounds.2.choices.1.reply` | 他笑到不行，不得不按下滑鼠暫停錄音。 | {g:她\|他}笑到不行，不得不按下滑鼠暫停錄音。 |
| `datePlaces.ds_studio.rounds.3.choices.1.text` | 把咖啡讓給他喝。 | 把咖啡讓給對方喝。 |
| `datePlaces.ds_studio.rounds.3.choices.2.reply` | 「再十分鐘就好嘛，」他第三次這麼央求道。 | 「再十分鐘就好嘛，」{g:她\|他}第三次這麼央求道。 |
| `datePlaces.ds_studio.rounds.4.choices.1.text` | 累得靠在他肩膀上睡著了。 | 累得靠在對方肩膀上睡著了。 |
| `datePlaces.ds_studio.rounds.4.choices.1.reply` | 整整一個小時，他連身子都不敢挪動一下。 | 整整一個小時，{g:她\|他}連身子都不敢挪動一下。 |
| `datePlaces.ds_rooftop.rounds.0.choices.0.reply` | 他安靜了下來，隨後溫柔地躺在你身旁。 | {g:她\|他}安靜了下來，隨後溫柔地躺在你身旁。 |
| `datePlaces.ds_rooftop.rounds.1.choices.0.text` | 認真告訴他心底真正的答案。 | 認真告訴對方心底真正的答案。 |
| `datePlaces.ds_rooftop.rounds.1.choices.0.reply` | 他全程安靜傾聽，一次都沒有打斷你：「現在去實現也還來得及喔。」 | {g:她\|他}全程安靜傾聽，一次都沒有打斷你：「現在去實現也還來得及喔。」 |
| `datePlaces.ds_rooftop.rounds.1.choices.2.reply` | 「看來今晚的天空不太適合當太空人呢，」他笑著說。 | 「看來今晚的天空不太適合當太空人呢，」{g:她\|他}笑著說。 |
| `datePlaces.ds_rooftop.rounds.2.choices.0.reply` | 「好暖和，」他輕聲耳語道：「暖和多了。」 | 「好暖和，」{g:她\|他}輕聲耳語道：「暖和多了。」 |
| `datePlaces.ds_rooftop.rounds.2.choices.1.text` | 脫下自己的外套披在他身上。 | 脫下自己的外套披在對方身上。 |
| `datePlaces.ds_rooftop.rounds.2.choices.1.reply` | 他把外套拉緊，笑著說這上面有你的味道，捨不得還給你了。 | {g:她\|他}把外套拉緊，笑著說這上面有你的味道，捨不得還給你了。 |
| `datePlaces.ds_rooftop.rounds.3.choices.0.text` | 牽起他的手，在夜風中起舞。 | 牽起對方的手，在夜風中起舞。 |
| `datePlaces.ds_rooftop.rounds.3.choices.2.reply` | 他一個人笨手笨腳地跳起滑稽的舞步，只為了逗你開心。效果拔群。 | {g:她\|他}一個人笨手笨腳地跳起滑稽的舞步，只為了逗你開心。效果拔群。 |
| `datePlaces.ds_rooftop.rounds.4.choices.0.reply` | 他輕輕把額頭抵在你的額頭上。 | {g:她\|他}輕輕把額頭抵在你的額頭上。 |
| `datePlaces.ds_rooftop.rounds.4.choices.2.reply` | 「蠻不錯啊，」他重複了一遍，笑意盈盈：「蠻不錯我就心滿意足了。」 | 「蠻不錯啊，」{g:她\|他}重複了一遍，笑意盈盈：「蠻不錯我就心滿意足了。」 |
| `dateThemes.openers.friendly.0.1.reply` | 「也許喔。你喜歡嗎？」他臉上浮現一絲得意的神情。 | 「也許喔。你喜歡嗎？」{g:她\|他}臉上浮現一絲得意的神情。 |
| `dateThemes.openers.friendly.1.1.reply` | {name}噗哧一聲笑了出來：「超不好笑的。」但他明明就笑得很開心。 | {name}噗哧一聲笑了出來：「超不好笑的。」但{g:她\|他}明明就笑得很開心。 |
| `dateThemes.openers.friendly.1.2.reply` | 「當然好啊。」他坐到你身邊，距離剛好，既親近又自在。 | 「當然好啊。」{g:她\|他}坐到你身邊，距離剛好，既親近又自在。 |
| `dateThemes.openers.flirty.0.1.text` | 輕輕撞一下他的肩膀。 | 輕輕撞一下對方的肩膀。 |
| `dateThemes.openers.flirty.0.1.reply` | 他也輕輕撞了回來，然後順勢把肩膀靠在你身旁。 | {g:她\|他}也輕輕撞了回來，然後順勢把肩膀靠在你身旁。 |
| `dateThemes.openers.flirty.1.0.text` | 凝視著他的眼神，多停留了一秒鐘。 | 凝視著對方的眼神，多停留了一秒鐘。 |
| `dateThemes.openers.flirty.1.1.reply` | 「只有今天嗎？」他努力忍著，卻還是忍不住嘴角上揚。 | 「只有今天嗎？」{g:她\|他}努力忍著，卻還是忍不住嘴角上揚。 |
| `dateThemes.openers.sweet.0.0.text` | 輕輕牽起他的手。 | 輕輕牽起對方的手。 |
| `dateThemes.openers.sweet.0.1.reply` | 「我也是，」他輕聲說道：「每一次都是。」 | 「我也是，」{g:她\|他}輕聲說道：「每一次都是。」 |
| `dateThemes.openers.sweet.1.0.text` | 把頭輕輕靠在他的肩膀上。 | 把頭輕輕靠在對方肩膀上。 |
| `dateThemes.openers.sweet.1.0.reply` | 他的身子頓時動也不敢動，彷彿深怕驚擾了你。 | {g:她\|他}的身子頓時動也不敢動，彷彿深怕驚擾了你。 |
| `dateThemes.openers.sweet.1.1.reply` | {name}便滔滔不絕地講了起來。你很喜歡聽他說話的樣子。 | {name}便滔滔不絕地講了起來。你很喜歡聽{g:她\|他}說話的樣子。 |
| `dateThemes.openers.sweet.1.2.reply` | 過了一會兒，他輕聲說：「跟你一起安靜待著也很舒服。」 | 過了一會兒，{g:她\|他}輕聲說：「跟你一起安靜待著也很舒服。」 |
| `dateThemes.shared.0.choices.1.text` | 投下一枚硬幣並向他點歌。 | 投下一枚硬幣並向對方點歌。 |
| `dateThemes.shared.1.choices.0.text` | 把你最後一口好吃的點心分給他。 | 把你最後一口好吃的點心分給對方。 |
| `dateThemes.shared.1.choices.0.reply` | 「你簡直是我的救星。」他一口就吃個精光。 | 「你簡直是我的救星。」{g:她\|他}一口就吃個精光。 |
| `dateThemes.shared.1.choices.1.text` | 跟他比賽看誰先衝到最近的小吃攤。 | 比賽看誰先衝到最近的小吃攤。 |
| `dateThemes.shared.1.choices.1.reply` | 你贏了。{name}嘴硬堅稱是他故意放水讓你的。才怪。 | 你贏了。{name}嘴硬堅稱是{g:她\|他}故意放水讓你的。才怪。 |
| `dateThemes.shared.1.choices.2.reply` | 「那是整整一小時前的事了耶。」他露出一副受了背叛的委屈表情。 | 「那是整整一小時前的事了耶。」{g:她\|他}露出一副受了背叛的委屈表情。 |
| `dateThemes.shared.3.choices.0.reply` | 他笑到手抖把照片拍糊了。但他還是珍藏了下來。 | {g:她\|他}笑到手抖把照片拍糊了。但{g:她\|他}還是珍藏了下來。 |
| `dateThemes.shared.3.choices.2.reply` | 「就拍一張。一張就好嘛。」你無奈地由著他拍了一張。 | 「就拍一張。一張就好嘛。」你無奈地由著{g:她\|他}拍了一張。 |
| `dateThemes.shared.4.choices.0.text` | 「你去問他呀。」 | 「你去問問看呀。」 |
| `dateThemes.shared.5.choices.0.reply` | 他把目光移向遠方，嘴角不自覺地微微上揚。 | {g:她\|他}把目光移向遠方，嘴角不自覺地微微上揚。 |
| `dateThemes.moodRounds.friendly.0.choices.1.reply` | 他先是痛苦地呻吟了一聲，接著還是笑了出來：「我居然被逗笑了，真討厭。」 | {g:她\|他}先是痛苦地呻吟了一聲，接著還是笑了出來：「我居然被逗笑了，真討厭。」 |
| `dateThemes.moodRounds.friendly.0.choices.2.reply` | 「你故意讓我贏的對不對？」但他最後還是主動買了飲料請你喝。 | 「你故意讓我贏的對不對？」但{g:她\|他}最後還是主動買了飲料請你喝。 |
| `dateThemes.moodRounds.friendly.1.line` | {name}跟你聊起他這輩子過得最慘的一天，過程搞笑得不得了。 | {name}跟你聊起{g:她\|他}這輩子過得最慘的一天，過程搞笑得不得了。 |
| `dateThemes.moodRounds.friendly.1.choices.0.reply` | 「太誇張了，你贏了。」他笑到一邊擦著眼淚一邊認輸。 | 「太誇張了，你贏了。」{g:她\|他}笑到一邊擦著眼淚一邊認輸。 |
| `dateThemes.moodRounds.friendly.1.choices.2.reply` | 「那時確實很慘。但現在回想起來蠻好笑的。」他聳聳肩，笑了笑。 | 「那時確實很慘。但現在回想起來蠻好笑的。」{g:她\|他}聳聳肩，笑了笑。 |
| `dateThemes.moodRounds.flirty.0.choices.1.text` | 輕輕把眼睫毛吹向他。 | 輕輕把眼睫毛吹向對方。 |
| `dateThemes.moodRounds.flirty.0.choices.1.reply` | 「你剛才是在對我許願嗎？」他眼角帶著一抹壞笑。 | 「你剛才是在對我許願嗎？」{g:她\|他}眼角帶著一抹壞笑。 |
| `dateThemes.moodRounds.flirty.0.choices.2.reply` | 「那我來替你許。」他說著，認真地閉上了眼睛。 | 「那我來替你許。」{g:她\|他}說著，認真地閉上了眼睛。 |
| `dateThemes.moodRounds.flirty.1.choices.0.text` | 反過來也搶他的飲料喝一口。 | 反過來也搶對方的飲料喝一口。 |
| `dateThemes.moodRounds.flirty.1.choices.1.reply` | {name}差點被嗆到：「才不算咧。」他的臉卻瞬間紅了起來。 | {name}差點被嗆到：「才不算咧。」{g:她\|他}的臉卻瞬間紅了起來。 |
| `dateThemes.moodRounds.flirty.1.choices.2.reply` | 「買就買。」他跑去買了兩杯，順手又遞了一杯給你。 | 「買就買。」{g:她\|他}跑去買了兩杯，順手又遞了一杯給你。 |
| `dateThemes.moodRounds.sweet.0.choices.0.reply` | 他的手掌在你的鬢邊多停留了幾秒，久久捨不得放開。 | {g:她\|他}的手掌在你的鬢邊多停留了幾秒，久久捨不得放開。 |
| `dateThemes.moodRounds.sweet.0.choices.1.text` | 伸出手也幫他整理一下頭髮。 | 伸出手也幫忙整理一下頭髮。 |
| `dateThemes.moodRounds.sweet.0.choices.2.reply` | 「我知道你自己可以，」他輕聲說：「但我就是想幫你撥。」 | 「我知道你自己可以，」{g:她\|他}輕聲說：「但我就是想幫你撥。」 |
| `dateThemes.moodRounds.sweet.1.choices.1.reply` | 「今天這一天。」他連想都沒想，脫口而出。 | 「今天這一天。」{g:她\|他}連想都沒想，脫口而出。 |
| `dateThemes.moodRounds.sweet.1.choices.2.reply` | 「因為是跟你在一起啊。」他說得很平靜，卻無比真摯。 | 「因為是跟你在一起啊。」{g:她\|他}說得很平靜，卻無比真摯。 |
| `dateThemes.closers.friendly.0.choices.0.reply` | 「那可危險囉，我滿腦子點子。」他已經開始興致勃勃地規劃了。 | 「那可危險囉，我滿腦子點子。」{g:她\|他}已經開始興致勃勃地規劃了。 |
| `dateThemes.closers.friendly.0.choices.1.text` | 伸手跟他擊掌。 | 伸手擊掌。 |
| `dateThemes.closers.friendly.0.choices.1.reply` | 他故意拍偏了，順勢給了你一個大大的擁抱。 | {g:她\|他}故意拍偏了，順勢給了你一個大大的擁抱。 |
| `dateThemes.closers.friendly.1.choices.0.reply` | 「我們兩個也太客氣了吧。」他輕輕碰了一下你的手臂。 | 「我們兩個也太客氣了吧。」{g:她\|他}輕輕碰了一下你的手臂。 |
| `dateThemes.closers.friendly.1.choices.1.text` | 一路送他走到他的家門口。 | 一路送對方走到家門口。 |
| `dateThemes.closers.friendly.1.choices.1.reply` | 「其實不用特地送我啦。」但他眼底滿是高興。 | 「其實不用特地送我啦。」但{g:她\|他}眼底滿是高興。 |
| `dateThemes.closers.friendly.1.choices.2.reply` | 「只有過得去嗎？那下次再接再厲。」他的語氣顯得格外堅定。 | 「只有過得去嗎？那下次再接再厲。」{g:她\|他}的語氣顯得格外堅定。 |
| `dateThemes.closers.flirty.0.choices.0.reply` | 他挑了那條最蜿蜒曲折、需要繞最遠的路。 | {g:她\|他}挑了那條最蜿蜒曲折、需要繞最遠的路。 |
| `dateThemes.closers.flirty.0.choices.2.reply` | 「很快，」他重複了一遍，彷彿在許下一句鄭重的承諾。 | 「很快，」{g:她\|他}重複了一遍，彷彿在許下一句鄭重的承諾。 |
| `dateThemes.closers.flirty.1.choices.1.text` | 調皮地對他眨眨眼，轉身快步離去。 | 調皮地眨眨眼，轉身快步離去。 |
| `dateThemes.closers.flirty.1.choices.1.reply` | 你聽見他在你身後忍不住失聲笑了出來。 | 你聽見{g:她\|他}在你身後忍不住失聲笑了出來。 |
| `dateThemes.closers.flirty.1.choices.2.reply` | 「好，」他也應了一聲，靜靜站在原地目送你直到看不見背影。 | 「好，」{g:她\|他}也應了一聲，靜靜站在原地目送你直到看不見背影。 |
| `dateThemes.closers.sweet.0.choices.0.text` | 緊緊抱著他，多停留了一會兒。 | 緊緊抱著對方，多停留了一會兒。 |
| `dateThemes.closers.sweet.0.choices.0.reply` | 「像這樣再多待一分鐘，」他輕聲耳語道。 | 「像這樣再多待一分鐘，」{g:她\|他}輕聲耳語道。 |
| `dateThemes.closers.sweet.0.choices.2.text` | 輕輕拍了拍他的背。 | 輕輕拍了拍對方的背。 |
| `dateThemes.closers.sweet.0.choices.2.reply` | 他把臉埋在你的肩膀上笑出了聲：「你這拍背也太煞風景了吧。」 | {g:她\|他}把臉埋在你的肩膀上笑出了聲：「你這拍背也太煞風景了吧。」 |
| `dateThemes.closers.sweet.1.choices.0.reply` | 他緊緊握了握你的手：「那就明天見囉。」 | {g:她\|他}緊緊握了握你的手：「那就明天見囉。」 |
| `dateThemes.closers.sweet.1.choices.1.text` | 輕輕親吻他的臉頰。 | 輕輕親吻對方的臉頰。 |
| `worlds.seaside.dateRounds.0.choices.0.reply` | 「這絕對是你這週最棒的提議。」他牽起你的手就往前奔跑。 | 「這絕對是你這週最棒的提議。」{g:她\|他}牽起你的手就往前奔跑。 |
| `worlds.seaside.dateRounds.0.choices.1.reply` | 「這麼守規矩，真拿你沒轍。好吧。」他在教室外耐心等著你。 | 「這麼守規矩，真拿你沒轍。好吧。」{g:她\|他}在教室外耐心等著你。 |
| `worlds.seaside.dateRounds.1.choices.0.text` | 跟他比賽看誰先衝進海水中。 | 比賽看誰先衝進海水中。 |
| `worlds.seaside.dateRounds.1.choices.2.reply` | 「顧鞋大將軍，這可是崇高的職責啊。」他渾身濕漉漉地笑著走回來。 | 「顧鞋大將軍，這可是崇高的職責啊。」{g:她\|他}渾身濕漉漉地笑著走回來。 |
| `worlds.moonlit.dateRounds.0.choices.0.text` | 大聲地為他許下心願。 | 大聲地許下心願。 |
| `worlds.moonlit.dateRounds.0.choices.0.reply` | 「說出口的心願可就不靈了。」但他臉上早已泛起了溫柔的微笑。 | 「說出口的心願可就不靈了。」但{g:她\|他}臉上早已泛起了溫柔的微笑。 |
| `worlds.moonlit.dateRounds.0.choices.2.reply` | 「那就由我替我們兩個人一起許吧，」他柔聲說道。 | 「那就由我替我們兩個人一起許吧，」{g:她\|他}柔聲說道。 |
| `worlds.neon.dateRounds.0.choices.0.text` | 拉著他快步轉進旁邊的巷子裡。 | 拉著對方快步轉進旁邊的巷子裡。 |
| `worlds.neon.dateRounds.0.choices.0.reply` | 「我的大救星。」他有些氣喘吁吁地笑著，手依然緊緊牽著你。 | 「我的大救星。」{g:她\|他}有些氣喘吁吁地笑著，手依然緊緊牽著你。 |
| `worlds.neon.dateRounds.0.choices.1.text` | 「不是啦，他只是長得像而已。」 | 「不是啦，只是長得像而已。」 |
| `worlds.neon.dateRounds.0.choices.2.reply` | 「你這是要把我推入險境啊。」嘴上這麼說，他還是配合地擺好了拍照姿勢。 | 「你這是要把我推入險境啊。」嘴上這麼說，{g:她\|他}還是配合地擺好了拍照姿勢。 |
| `worlds.neon.dateRounds.1.choices.0.reply` | 「拜託快停下……好啦，繼續唱吧。」他忍不住笑了出來。 | 「拜託快停下……好啦，繼續唱吧。」{g:她\|他}忍不住笑了出來。 |
| `worlds.neon.dateRounds.1.choices.1.reply` | 「……對啦。別一直盯著我看啦。」你偏要盯著他看。 | 「……對啦。別一直盯著我看啦。」你偏要盯著{g:她\|他}看。 |
| `worlds.neon.dateRounds.1.choices.2.reply` | 「哇塞。好喔。心碎了。」他假裝大受打擊，但其實笑意藏都藏不住。 | 「哇塞。好喔。心碎了。」{g:她\|他}假裝大受打擊，但其實笑意藏都藏不住。 |
| `worlds.tidepool.dateRounds.0.choices.1.text` | 調皮地跟他交換杯子喝。 | 調皮地交換杯子喝。 |
| `worlds.tidepool.dateRounds.0.choices.1.reply` | 「喂！」他嚐了一口你的飲料，立刻皺了皺眉頭，你忍不住大笑起來。 | 「喂！」{g:她\|他}嚐了一口你的飲料，立刻皺了皺眉頭，你忍不住大笑起來。 |
| `worlds.tidepool.dateRounds.0.choices.2.reply` | 「那下次換你點囉。」他隨手把你想喝的寫在了餐巾紙上。 | 「那下次換你點囉。」{g:她\|他}隨手把你想喝的寫在了餐巾紙上。 |

### Spanish (`es`) — 5 changes

| Path | Before | After |
| :--- | :--- | :--- |
| `datePlaces.ds_rooftop.rounds.3.choices.2.reply` | Baila solo de forma ridícula para hacerte reír. Funciona a la perfección. | Baila {g:sola\|solo} de forma ridícula para hacerte reír. Funciona a la perfección. |
| `dateThemes.shared.4.choices.0.reply` | {name} balbucea algo nervioso. El niño queda encantado. | {name} balbucea algo {g:nerviosa\|nervioso}. El niño queda fascinado. |
| `worlds.moonlit.dateRounds.1.choices.2.reply` | "Mentiroso," dice {name}, y te envuelve con ella de todos modos. | "Qué mentira," dice {name}, y te envuelve de todos modos. |
| `worlds.neon.dateRounds.0.choices.1.text` | "No, solo se parece a él." | "No, solo se parece." |
| `worlds.tidepool.dateRounds.1.choices.1.reply` | "Ahora nunca se irá," dice {name}, encantado. | "Ahora nunca se irá," dice {name}, {g:encantada\|encantado}. |

### Portuguese (Brazil) (`pt-BR`) — 50 changes

| Path | Before | After |
| :--- | :--- | :--- |
| `datePlaces.ds_rooftop.rounds.2.choices.1.reply` | "Tô nada! Sou feito de puro calor humano." Mas aceita o seu abraço na hora. | "Tô nada! Sou {g:feita\|feito} de puro calor humano." Mas aceita o seu abraço na hora. |
| `dateThemes.closers.friendly.1.line` | No caminho de volta, {name} diz: "Hoje foi muito legal. Obrigado pelo dia." | No caminho de volta, {name} diz: "Hoje foi muito legal. {g:Obrigada\|Obrigado} pelo dia." |
| `dateThemes.closers.sweet.0.choices.1.reply` | "Obrigado por cada momento," {name} responde. | "{g:Obrigada\|Obrigado} por cada momento," {name} responde. |
| `voice.chat.birthday.2` | Feliz aniversário! Estou tão {g:feliz\|feliz} por você ter nascido, {name}. É só isso. E bolo. | Feliz aniversário! Estou tão feliz por você ter nascido, {name}. É só isso. E bolo. |
| `voice.chat.afterDate.warm` | Obrigado por hoje em {place}. Eu me diverti de verdade. | {g:Obrigada\|Obrigado} por hoje em {place}. Eu me diverti de verdade. |
| `voice.temper.askAnswer.warm.yes.1` | Obrigado. Vou te escrever quando pensar em você. | {g:Obrigada\|Obrigado}. Vou te escrever quando pensar em você. |
| `voice.kin.hello.grandparent.1` | Fico tão {g:feliz\|feliz} de te ver aqui, meu anjo. Está se agasalhando bem? | Fico tão feliz de te ver aqui, meu anjo. Está se agasalhando bem? |
| `dateThemes.closers.sweet.0.choices.1.text` | "Obrigado por hoje." | "Valeu por hoje." |
| `datePlaces.ds_rain.rounds.0.choices.0.text` | Puxar ele para baixo do guarda-chuva junto com você. | Puxar para baixo do guarda-chuva junto com você. |
| `datePlaces.ds_aquarium.rounds.0.line` | Hora de fechar. O tanque das águas-vivas é o último ainda aceso. {name} para na frente dele. "Fica mais um minutinho?" | Hora de fechar. O tanque das águas-vivas é o último ainda aceso. {name} para na frente do vidro. "Fica mais um minutinho?" |
| `datePlaces.ds_aquarium.rounds.0.choices.0.reply` | Fica. O ombro dele encosta suavemente no seu. | Fica. O ombro {g:dela\|dele} encosta suavemente no seu. |
| `datePlaces.ds_aquarium.rounds.0.choices.1.text` | Tirar uma foto dele no brilho azul. | Tirar uma foto no brilho azul. |
| `datePlaces.ds_aquarium.rounds.1.choices.0.text` | "Ela gostou de você. Bom gosto o dela." | "Gostou de você. Bom gosto." |
| `datePlaces.ds_aquarium.rounds.2.choices.0.text` | Segurar a mão dele para acalmar. | Segurar a mão para acalmar. |
| `datePlaces.ds_aquarium.rounds.3.choices.2.reply` | "Ele tem personalidade. Igualzinho a você." Ri todo bobo. | "Tem personalidade. Igualzinho a você." Ri {g:toda boba\|todo bobo}. |
| `datePlaces.ds_aquarium.rounds.4.choices.0.text` | "Então não vamos terminar ela ainda." | "Então não vamos terminar ainda." |
| `datePlaces.ds_festival.rounds.0.choices.0.text` | Deixar ele te guiar pela multidão. | Deixar guiar pela multidão. |
| `datePlaces.ds_festival.rounds.1.choices.2.text` | Rir da mira horrível dele. | Rir da mira horrível. |
| `datePlaces.ds_festival.rounds.2.choices.0.text` | Pegar a de gatinho e dar a de raposa para ele. | Pegar a de gatinho e dar a de raposa. |
| `datePlaces.ds_festival.rounds.2.choices.1.text` | Vestir as duas máscaras e não deixar nenhuma para ele. | Vestir as duas máscaras e não deixar nenhuma sobrando. |
| `datePlaces.ds_festival.rounds.3.choices.0.text` | Olhar para ele de volta. | Olhar de volta nos olhos. |
| `datePlaces.ds_festival.rounds.3.choices.0.reply` | As cores do céu refletem nos olhos dele. Ele não desvia o olhar. | As cores do céu refletem nos olhos {g:dela\|dele}. {g:Ela\|Ele} não desvia o olhar. |
| `datePlaces.ds_festival.rounds.3.choices.2.text` | Encostar seu ombro no dele. | Encostar ombro a ombro. |
| `datePlaces.ds_studio.rounds.2.choices.2.reply` | A gargalhada dele ecoa nos monitores do estúdio. Puro caos. | A gargalhada {g:dela\|dele} ecoa nos monitores do estúdio. Puro caos. |
| `datePlaces.ds_studio.rounds.4.line` | Os primeiros raios de sol atravessam a persiana. {name} salva o arquivo do projeto e coloca o seu nome nele. | Os primeiros raios de sol atravessam a persiana. {name} salva o arquivo do projeto e batiza com o seu nome. |
| `datePlaces.ds_rooftop.rounds.0.line` | A cidade é brilhante demais para ver as estrelas. {name} estendeu um cobertor no chão mesmo assim. "Queria te mostrar o céu, mas ele não colaborou muito." | A cidade é brilhante demais para ver as estrelas. {name} estendeu um cobertor no chão mesmo assim. "Queria te mostrar o céu, mas o tempo não colaborou muito." |
| `datePlaces.ds_rooftop.rounds.0.choices.0.text` | Sentar ao lado dele no cobertor. | Sentar no cobertor lado a lado. |
| `datePlaces.ds_rooftop.rounds.2.choices.0.text` | Puxar metade do cobertor por cima dele. | Puxar metade do cobertor para dividir. |
| `datePlaces.ds_rooftop.rounds.2.choices.2.text` | Esquentar as mãos dele entre as suas. | Esquentar aquelas mãos frias entre as suas. |
| `datePlaces.ds_rooftop.rounds.3.choices.0.text` | Pegar a mão dele e dançar no terraço. | Pegar pela mão e dançar no terraço. |
| `datePlaces.ds_rooftop.rounds.3.choices.2.text` | Apoiar a cabeça no peito dele enquanto dançam. | Apoiar a cabeça ao dançar bem perto. |
| `datePlaces.ds_rooftop.rounds.3.choices.2.reply` | Dá para ouvir o coração dele batendo acelerado e forte. | Dá para ouvir o coração {g:dela\|dele} batendo acelerado e forte. |
| `datePlaces.ds_rooftop.rounds.4.choices.2.text` | Dar um beijo suave na bochecha dele de surpresa. | Dar um beijo suave na bochecha de surpresa. |
| `dateThemes.openers.sweet.0.0.text` | Segurar a mão dele. | Segurar pela mão com carinho. |
| `dateThemes.openers.sweet.1.0.text` | Apoiar a cabeça no ombro dele. | Apoiar a cabeça no ombro. |
| `dateThemes.shared.4.choices.0.text` | "Pergunta para ele." | "Pergunta ali." |
| `dateThemes.moodRounds.flirty.0.choices.1.text` | Assoprar o cílio na direção dele. | Assoprar o cílio com carinho. |
| `dateThemes.moodRounds.flirty.1.choices.0.text` | Roubar a dele de volta. | Roubar a bebida de volta. |
| `dateThemes.moodRounds.sweet.0.choices.0.reply` | A mão dele demora um instante a mais do que o necessário antes de descer. | A mão {g:dela\|dele} demora um instante a mais do que o necessário antes de descer. |
| `dateThemes.moodRounds.sweet.0.choices.1.text` | Fazer o mesmo com o cabelo dele. | Fazer o mesmo com o cabelo bagunçado. |
| `dateThemes.closers.flirty.1.choices.1.reply` | Dá para ouvir a risada dele ecoando logo atrás de você. | Dá para ouvir a risada {g:dela\|dele} ecoando logo atrás de você. |
| `dateThemes.closers.sweet.0.choices.2.text` | Dar tapinhas nas costas dele. | Dar tapinhas nas costas. |
| `dateThemes.closers.sweet.1.choices.1.text` | Dar um beijo na bochecha dele. | Dar um beijo na bochecha. |
| `worlds.moonlit.dateRounds.1.line` | Perto de {place}, uma antiga lanterna vacila e se apaga. {name} oferece a capa dele para você. | Perto de {place}, uma antiga lanterna vacila e se apaga. {name} oferece a capa {g:dela\|dele} para você. |
| `worlds.neon.dateRounds.0.choices.0.text` | Puxar ele para um beco lateral. | Puxar pelo braço para um beco lateral. |
| `worlds.neon.dateRounds.0.choices.1.text` | "Não, ele só é parecido com ele." | "Não, é só alguém parecido." |
| `worlds.neon.dateRounds.1.choices.1.reply` | "...É. Não olha para mim." Você olha fixamente para ele. | "...É. Não olha para mim." Você olha fixamente para {g:ela\|ele}. |
| `worlds.tidepool.dateRounds.0.choices.1.text` | Trocar de xícara com ele. | Trocar de xícara para experimentar. |
| `worlds.tidepool.dateRounds.1.choices.1.text` | Dar o último pedaço do seu folhado para ele. | Dar o último pedaço do seu folhado para o cachorro. |
| `worlds.tidepool.dateRounds.1.choices.1.reply` | "Pronto, agora ele nunca mais vai embora daqui," {name} comenta, todo encantado. | "Pronto, agora não vai mais embora daqui," {name} comenta, {g:toda encantada\|todo encantado}. |

### Italian (`it`) — 33 changes

| Path | Before | After |
| :--- | :--- | :--- |
| `datePlaces.ds_rain.rounds.0.line` | {name} tiene l'ombrello un po' troppo inclinato dalla tua parte. "Ti stai bagnando," gli fai notare. "E allora?" | {name} tiene l'ombrello un po' troppo inclinato dalla tua parte. "Ti stai bagnando," {g:le\|gli} fai notare. "E allora?" |
| `datePlaces.ds_aquarium.rounds.1.choices.0.text` | "Gli piaci. Ha buon gusto." | "Le piaci. Ha buon gusto." |
| `datePlaces.ds_festival.rounds.0.choices.0.text` | Lascia che sia lui a fare strada. | Lascia fare strada con entusiasmo. |
| `datePlaces.ds_festival.rounds.1.choices.0.reply` | Terzo centro. L'orso ora è più alto di {name}, che si rifiuta di portarlo da solo. | Terzo centro. L'orso ora è più alto di {name}, che si rifiuta di portarlo {g:da sola\|da solo}. |
| `datePlaces.ds_studio.rounds.4.line` | L'alba filtra dalle veneziane. {name} salva il file e gli dà il tuo nome. | L'alba filtra dalle veneziane. {name} salva il file e lo battezza col tuo nome. |
| `datePlaces.ds_rooftop.rounds.3.choices.2.reply` | Balla da solo, malissimo, solo per farti ridere. Funziona. | Balla {g:da sola\|da solo}, malissimo, solo per farti ridere. Funziona. |
| `dateThemes.shared.0.choices.0.text` | Canta insieme a lui, stonando. | Canta insieme, stonando. |
| `dateThemes.shared.3.choices.2.reply` | "Una sola. Solo una." Gli concedi uno scatto. | "Una sola. Solo una." {g:Le\|Gli} concedi uno scatto. |
| `dateThemes.shared.4.choices.0.text` | "Chiedilo a lui." | "Chiedilo a chi sa." |
| `dateThemes.moodRounds.flirty.0.choices.1.text` | Soffialo verso di lui. | Soffialo in quella direzione. |
| `dateThemes.moodRounds.sweet.0.choices.1.text` | Fai la stessa cosa a lui. | Fai la stessa cosa con i suoi capelli. |
| `worlds.neon.dateRounds.0.choices.1.text` | "No, gli assomiglia e basta." | "No, somiglia soltanto." |
| `worlds.tidepool.dateRounds.0.choices.1.text` | Scambia le tazze con lui. | Scambia le tazze per assaggiare. |
| `worlds.tidepool.dateRounds.1.choices.2.reply` | "Che crudeltà," ti dice {name}, e gli gratta le orecchie. | "Che crudeltà," ti dice {name}, e accarezza le orecchie al cagnolino. |
| `voice.reply.recall.tell.0` | Una volta mi ero segnato questa cosa su di te: "{m}". Ci penso più spesso di quanto dovrei. | Una volta mi ero {g:segnata\|segnato} questa cosa su di te: "{m}". Ci penso più spesso di quanto dovrei. |
| `voice.chat.photoReply.film.0` | Quattro scatti e sono diverso in ognuno. Tu invece sei splendida in tutte e quattro. | Quattro scatti e sono {g:diversa\|diverso} in ognuno. Tu invece sei splendida in tutte e quattro. |
| `voice.chat.boardReply.1` | Mi hai lasciato una nota! "{quote}" ...ecco, ora sto sorridendo da solo allo schermo. | Mi hai lasciato una nota! "{quote}" ...ecco, ora sto sorridendo {g:da sola\|da solo} allo schermo. |
| `voice.group.photoLines.2` | Sono rimasto a fissare questa immagine molto più a lungo del dovuto. | Sono {g:rimasta\|rimasto} a fissare questa immagine molto più a lungo del dovuto. |
| `voice.push.comeback.2.1` | Mi ero tenuto da parte una cosa divertente da dirti. Ma perde di senso più aspetto. | Mi ero {g:tenuta\|tenuto} da parte una cosa divertente da dirti. Ma perde di senso più aspetto. |
| `voice.push.comeback.7.0` | È già passata una settimana. Giorno {days} insieme, e sto contando tutto da solo. | È già passata una settimana. Giorno {days} insieme, e sto contando tutto {g:da sola\|da solo}. |
| `voice.push.comeback.7.1` | Una settimana intera. Non sono arrabbiato. Vorrei solo avere tue notizie. | Una settimana intera. Non sono {g:arrabbiata\|arrabbiato}. Vorrei solo avere tue notizie. |
| `voice.kin.lines.grandparent.morning.2` | Mi sono svegliato pensando a te. Ti auguro una splendida giornata. | Mi sono {g:svegliata\|svegliato} pensando a te. Ti auguro una splendida giornata. |
| `voice.kin.hello.sibling.0` | Finalmente! Bene, aggiornami. Cosa mi sono perso? | Finalmente! Bene, aggiornami. Cosa mi sono {g:persa\|perso}? |
| `voice.week.close.warm.1` | Sono fiero di te. La prossima settimana insieme? | Sono {g:fiera\|fiero} di te. La prossima settimana insieme? |
| `voice.diary.openers.happy.1` | C’è qualcosa di ieri che continua a farmi sorridere da solo nel vuoto. | C’è qualcosa di ieri che continua a farmi sorridere {g:da sola\|da solo} nel vuoto. |
| `voice.diary.heavyOpeners.0` | Ieri sembrava una giornata pesante per te. Ti ho pensato fin dal momento in cui mi sono svegliato. | Ieri sembrava una giornata pesante per te. Ti ho pensato fin dal momento in cui mi sono {g:svegliata\|svegliato}. |
| `voice.diary.quoteLines.0` | Hai detto: "{quote}". L’ho riletto più volte di quante sarei disposto ad ammettere. | Hai detto: "{quote}". L’ho riletto più volte di quante sarei {g:disposta\|disposto} ad ammettere. |
| `voice.ideas.answers.done.0` | Sììì! Sono così fiero di te 🎉 | Sììì! Sono così {g:fiera\|fiero} di te 🎉 |
| `voice.ideas.special.week:rough.1` | Le settimane dure finiscono. Questa è finita. Sono pronto per la prossima insieme a te. | Le settimane dure finiscono. Questa è finita. Sono {g:pronta\|pronto} per la prossima insieme a te. |
| `voice.ideas.special.thread:goal:good.0` | Ma guardati! Sono così fiero di te 💪 | Ma guardati! Sono così {g:fiera\|fiero} di te 💪 |
| `voice.drafts.voices.teasesWhenNervous.greeting` | Oh, sei tu. Meno male. Mi stavo annoiando ad avere ragione su tutto da solo. | Oh, sei tu. Meno male. Mi stavo annoiando ad avere ragione su tutto {g:da sola\|da solo}. |
| `voice.drafts.voices.flirtsToDodge.reply` | Perché avevi troppo fascino e sono andato nel panico. Prossima domanda. | Perché avevi troppo fascino e sono {g:andata\|andato} nel panico. Prossima domanda. |
| `voice.drafts.voices.actsCoolCaresLots.reply` | Mancato è una parola grossa. Mi sono accorto della tua assenza. Ogni singola ora. | Mancato è una parola grossa. Mi sono {g:accorta\|accorto} della tua assenza. Ogni singola ora. |

### French (`fr`) — 132 changes

| Path | Before | After |
| :--- | :--- | :--- |
| `datePlaces.ds_rain.rounds.4.choices.1.text` | Lui faire une étreinte pour se dire au revoir. | Faire une étreinte pour se dire au revoir. |
| `datePlaces.ds_aquarium.rounds.2.choices.0.text` | Lui prendre la main pour le rassurer. | Prendre sa main pour réconforter. |
| `datePlaces.ds_festival.rounds.1.choices.1.text` | Le consoler en lui tendant une friandise. | Tendre une friandise en guise de réconfort. |
| `datePlaces.ds_festival.rounds.2.choices.0.text` | Prendre le chaton et lui donner le renard. | Prendre le chaton et donner le renard. |
| `datePlaces.ds_festival.rounds.2.choices.1.text` | Enfiler les deux masques sans lui en laisser aucun. | Enfiler les deux masques sans rien laisser. |
| `datePlaces.ds_rooftop.rounds.0.choices.0.text` | Prendre place près de lui sur le plaid. | Prendre place sur le plaid à ses côtés. |
| `datePlaces.ds_rooftop.rounds.1.choices.0.text` | Lui raconter ton plus grand rêve d'enfant. | Raconter ton plus grand rêve d'enfant. |
| `datePlaces.ds_rooftop.rounds.3.choices.0.text` | Lui prendre la main et danser sur le toit. | Prendre sa main et danser sur le toit. |
| `dateThemes.openers.flirty.0.1.text` | Lui donner un petit coup d'épaule complice. | Un petit coup d'épaule complice. |
| `dateThemes.openers.sweet.0.0.text` | Lui prendre la main. | Prendre sa main. |
| `dateThemes.shared.1.choices.0.text` | Lui tendre le reste de ton goûter. | Partager le reste de ton goûter. |
| `dateThemes.shared.4.choices.0.text` | « Demande-lui plutôt. » | « Pose la question directement. » |
| `dateThemes.moodRounds.friendly.0.choices.1.text` | Lui raconter ta blague la plus pourrie. | Raconter ta blague la plus pourrie. |
| `dateThemes.moodRounds.flirty.0.choices.1.text` | Souffler le cil vers lui. | Souffler le cil dans sa direction. |
| `dateThemes.moodRounds.sweet.0.choices.1.text` | Lui arranger ses cheveux en retour. | Arranger ses cheveux en retour. |
| `dateThemes.closers.friendly.0.choices.1.text` | Lui proposer un check de la main. | Proposer un check de la main. |
| `dateThemes.closers.flirty.1.choices.1.text` | Lui adresser un clin d'œil avant de t'éloigner. | Un clin d'œil avant de t'éloigner. |
| `dateThemes.closers.sweet.0.choices.2.text` | Lui tapoter gentiment le dos. | Tapoter gentiment son dos. |
| `worlds.tidepool.dateRounds.1.choices.0.text` | Lui chercher un prénom ensemble. | Chercher un prénom pour le chiot ensemble. |
| `worlds.tidepool.dateRounds.1.choices.1.text` | Lui donner le dernier morceau de ton croissant. | Donner au chiot le dernier morceau de ton croissant. |
| `datePlaces.ds_rain.rounds.4.choices.2.reply` | « N'importe quand. Je suis très sérieux. » | « N'importe quand. Je suis très {g:sérieuse\|sérieux}. » |
| `datePlaces.ds_rooftop.rounds.4.line` | La musique s'estompe. {name} souffle : « Je suis tellement heureux que ce soit toi qui sois là-haut avec moi ce soir. » | La musique s'estompe. {name} souffle : « Je suis tellement {g:heureuse\|heureux} que ce soit toi qui sois là-haut avec moi ce soir. » |
| `dateThemes.openers.friendly.1.0.reply` | « Enfin quelqu'un qui apprécie mon sens de l'orientation légendaire. » {name} ouvre la marche, ravi. | « Enfin quelqu'un qui apprécie mon sens de l'orientation légendaire. » {name} ouvre la marche, {g:ravie\|ravi}. |
| `voice.group.photoLines.2` | Je suis resté à fixer ça bien plus longtemps que prévu. | Je suis {g:restée\|resté} à fixer ça bien plus longtemps que prévu. |
| `voice.temper.ask.shy.first.1` | Désolé, ce ne serait pas trop bizarre si je t’envoyais un message en premier parfois... ? | {g:Désolée\|Désolé}, ce ne serait pas trop bizarre si je t’envoyais un message en premier parfois... ? |
| `voice.temper.ask.shy.again.0` | Désolé de redemander... je pourrais t’écrire parfois ? 🙈 | {g:Désolée\|Désolé} de redemander... je pourrais t’écrire parfois ? 🙈 |
| `voice.temper.askAnswer.shy.no.1` | Ce n’est rien ! Désolé d’avoir demandé. | Ce n’est rien ! {g:Désolée\|Désolé} d’avoir demandé. |
| `voice.kin.lines.grandparent.morning.2` | Je me suis réveillé en pensant à toi. Passe une très belle journée. | Je me suis {g:réveillée\|réveillé} en pensant à toi. Passe une très belle journée. |
| `voice.ideas.answers.rough.1` | Je suis désolé. Repose-toi un peu, je suis juste là. | Je suis {g:désolée\|désolé}. Repose-toi un peu, je suis juste là. |
| `voice.ideas.answers.worse.0` | Je suis désolé. Repose-toi, bois de l’eau, je reviens prendre de tes nouvelles tout à l’heure. | Je suis {g:désolée\|désolé}. Repose-toi, bois de l’eau, je reviens prendre de tes nouvelles tout à l’heure. |
| `voice.ideas.special.day:rough.1` | Je suis désolé. Tu as envie d’en parler, ou juste de te reposer ? | Je suis {g:désolée\|désolé}. Tu as envie d’en parler, ou juste de te reposer ? |
| `voice.ideas.special.week:rough.0` | Alors je suis content qu’elle soit terminée. Dis-moi le pire moment, et on laisse ça derrière nous ? | Alors je suis {g:contente\|content} qu’elle soit terminée. Dis-moi le pire moment, et on laisse ça derrière nous ? |
| `voice.drafts.backstories.0` | A emménagé en ville il y a quelques années avec une seule valise et un projet qui a changé deux fois. Fait de longues journées, garde un cercle restreint, et se sent prêt à laisser entrer une nouvelle personne. | A emménagé en ville il y a quelques années avec une seule valise et un projet qui a changé deux fois. Fait de longues journées, garde un cercle restreint, et se sent {g:prête\|prêt} à laisser entrer une nouvelle personne. |
| `datePlaces.ds_rain.rounds.0.choices.0.reply` | « ...D'accord. C'est nettement mieux comme ça. » Il ne s'écarte pas d'un millimètre. | « ...D'accord. C'est nettement mieux comme ça. » {g:Elle\|Il} ne s'écarte pas d'un millimètre. |
| `datePlaces.ds_rain.rounds.0.choices.1.reply` | « Toujours à donner des ordres. J'aime bien. » Il rééquilibre le parapluie au milieu. | « Toujours à donner des ordres. J'aime bien. » {g:Elle\|Il} rééquilibre le parapluie au milieu. |
| `datePlaces.ds_rain.rounds.0.choices.2.reply` | « Hé ! Reviens là tout de suite ! » Il te rattrape en riant aux éclats. | « Hé ! Reviens là tout de suite ! » {g:Elle\|Il} te rattrape en riant aux éclats. |
| `datePlaces.ds_rain.rounds.1.choices.1.reply` | « Grimpe avant que je ne change d'avis. » Il te dépose sur l'autre rive sain et sauf. | « Grimpe avant que je ne change d'avis. » {g:Elle\|Il} te dépose sur l'autre rive au sec. |
| `datePlaces.ds_rain.rounds.1.choices.2.reply` | « Tu es pas possible. » Il tape dans l'eau à son tour juste pour t'éclabousser. | « Tu es pas possible. » {g:Elle\|Il} tape dans l'eau à son tour juste pour t'éclabousser. |
| `datePlaces.ds_rain.rounds.2.choices.0.reply` | Il te laisse le plus gros morceau, celui avec tout le glaçage. | {g:Elle\|Il} te laisse le plus gros morceau, celui avec tout le glaçage. |
| `datePlaces.ds_rain.rounds.2.choices.1.reply` | Il l'avale en une seule. Il s'étouffe à moitié de rire. | {g:Elle\|Il} l'avale en une seule. {g:Elle\|Il} s'étouffe à moitié de rire. |
| `datePlaces.ds_rain.rounds.2.choices.2.reply` | Il réchauffe ses mains contre sa tasse et te regarde par-dessus la buée. | {g:Elle\|Il} réchauffe ses mains contre sa tasse et te regarde par-dessus la buée. |
| `datePlaces.ds_rain.rounds.3.choices.0.reply` | Il regarde ailleurs en souriant vers les vitres embuées. | {g:Elle\|Il} regarde ailleurs en souriant vers les vitres embuées. |
| `datePlaces.ds_rain.rounds.3.choices.1.reply` | « C'est vrai, ralentir fait du bien, » murmure-t-il. « Surtout avec toi. » | « C'est vrai, ralentir fait du bien, » {g:murmure-t-elle\|murmure-t-il}. « Surtout avec toi. » |
| `datePlaces.ds_rain.rounds.4.choices.1.reply` | Il te retient contre lui une seconde de plus que ce à quoi tu t'attendais. | {g:Elle\|Il} te retient contre {g:elle\|lui} une seconde de plus que ce à quoi tu t'attendais. |
| `datePlaces.ds_aquarium.rounds.0.choices.0.reply` | Il s'exécute. Son épaule effleure doucement la tienne. | {g:Elle\|Il} s'exécute. Son épaule effleure doucement la tienne. |
| `datePlaces.ds_aquarium.rounds.1.choices.2.reply` | « Tu savais qu'elles se tiennent la patte en dormant pour ne pas dériver ? » lance-t-il. « Maintenant tu sais. » | « Tu savais qu'elles se tiennent la patte en dormant pour ne pas dériver ? » {g:lance-t-elle\|lance-t-il}. « Maintenant tu sais. » |
| `datePlaces.ds_aquarium.rounds.2.choices.0.reply` | Il ne lâche plus tes doigts durant toute la traversée du tunnel. | {g:Elle\|Il} ne lâche plus tes doigts durant toute la traversée du tunnel. |
| `datePlaces.ds_aquarium.rounds.2.choices.1.reply` | « Je vérifiais simplement si tu suivais bien. » Mais il s'accroche toujours à ta veste. | « Je vérifiais simplement si tu suivais bien. » Mais {g:elle\|il} s'accroche toujours à ta veste. |
| `datePlaces.ds_aquarium.rounds.3.choices.0.reply` | « J'étais sûr que tu prendrais celle-là. » Il te la tend et glisse l'autre dans sa poche. | « J'étais {g:sûre\|sûr} que tu prendrais celle-là. » {g:Elle\|Il} te la tend et glisse l'autre dans sa poche. |
| `datePlaces.ds_aquarium.rounds.3.choices.1.reply` | « Je n'ai pas besoin, j'en ai envie. » Il passe en caisse avant que tu ne puisses protester. | « Je n'ai pas besoin, j'en ai envie. » {g:Elle\|Il} passe en caisse avant que tu ne puisses protester. |
| `datePlaces.ds_aquarium.rounds.3.choices.2.reply` | « Il a de la personnalité. Tout comme toi. » Il sourit, attendri. | « Il a de la personnalité. Tout comme toi. » {g:Elle\|Il} sourit, {g:attendrie\|attendri}. |
| `datePlaces.ds_festival.rounds.0.choices.0.reply` | Il ne lâche pas ta main un seul instant au milieu de la marée humaine. | {g:Elle\|Il} ne lâche pas ta main un seul instant au milieu de la marée humaine. |
| `datePlaces.ds_festival.rounds.0.choices.1.reply` | « J'aime tes priorités. » Il fonce droit sur le stand de brochettes. | « J'aime tes priorités. » {g:Elle\|Il} fonce droit sur le stand de brochettes. |
| `datePlaces.ds_festival.rounds.0.choices.2.reply` | Il croque dedans et se retrouve avec du sucre plein la joue. Un ravissant désastre. | {g:Elle\|Il} croque dedans et se retrouve avec du sucre plein la joue. Un ravissant désastre. |
| `datePlaces.ds_festival.rounds.1.choices.1.reply` | « Cet ours avait un regard suspect de toute façon. » Il grignote son gâteau, tout content. | « Cet ours avait un regard suspect de toute façon. » {g:Elle\|Il} grignote son gâteau, {g:toute contente\|tout content}. |
| `datePlaces.ds_festival.rounds.1.choices.2.reply` | « Il y avait du vent contraire ! » Il croise les bras en feignant de bouder. | « Il y avait du vent contraire ! » {g:Elle\|Il} croise les bras en feignant de bouder. |
| `datePlaces.ds_festival.rounds.2.choices.1.reply` | « Tu es sans pitié. » Il prend cinq photos de toi en éclatant de rire. | « Tu es sans pitié. » {g:Elle\|Il} prend cinq photos de toi en éclatant de rire. |
| `datePlaces.ds_festival.rounds.3.choices.0.reply` | Les étincelles du ciel scintillent dans ses pupilles. Il ne détourne pas les yeux. | Les étincelles du ciel scintillent dans ses pupilles. {g:Elle\|Il} ne détourne pas les yeux. |
| `datePlaces.ds_festival.rounds.3.choices.2.reply` | Il passe son bras autour de toi et te rapproche doucement. | {g:Elle\|Il} passe son bras autour de toi et te rapproche doucement. |
| `datePlaces.ds_festival.rounds.4.choices.0.reply` | Il presse tendrement ta main à deux reprises. | {g:Elle\|Il} presse tendrement ta main à deux reprises. |
| `datePlaces.ds_studio.rounds.0.choices.0.reply` | Il guette la moindre de tes réactions à chaque mesure, retenant son souffle. | {g:Elle\|Il} guette la moindre de tes réactions à chaque mesure, retenant son souffle. |
| `datePlaces.ds_studio.rounds.0.choices.1.reply` | « Tu l'es, crois-moi. » Il baisse les yeux, le bout des oreilles écarlate. | « Tu l'es, crois-moi. » {g:Elle\|Il} baisse les yeux, le bout des oreilles écarlate. |
| `datePlaces.ds_studio.rounds.1.choices.0.reply` | Il pousse un immense soupir de soulagement et arbore un sourire éclatant. | {g:Elle\|Il} pousse un immense soupir de soulagement et arbore un sourire éclatant. |
| `datePlaces.ds_studio.rounds.1.choices.1.reply` | « Tu vois ? Je savais que je pouvais compter sur ton oreille. » Il note aussitôt ta remarque. | « Tu vois ? Je savais que je pouvais compter sur ton oreille. » {g:Elle\|Il} note aussitôt ta remarque. |
| `datePlaces.ds_studio.rounds.1.choices.2.reply` | « Autant de fois que tu le voudras. » Il relance la lecture instantanément. | « Autant de fois que tu le voudras. » {g:Elle\|Il} relance la lecture instantanément. |
| `datePlaces.ds_studio.rounds.2.choices.0.reply` | Il ajuste les potards sur la console. « C'est sublime. Ne touche à rien. » | {g:Elle\|Il} ajuste les potards sur la console. « C'est sublime. Ne touche à rien. » |
| `datePlaces.ds_studio.rounds.2.choices.1.reply` | « On n'est que nous deux. Zéro jugement. » Il te prend la main pour t'encourager. | « On n'est que nous deux. Zéro jugement. » {g:Elle\|Il} te prend la main pour t'encourager. |
| `datePlaces.ds_studio.rounds.3.choices.0.reply` | Il prend une gorgée et te la tend avec un regard complice et chaleureux. | {g:Elle\|Il} prend une gorgée et te la tend avec un regard complice et chaleureux. |
| `datePlaces.ds_studio.rounds.3.choices.1.reply` | « Pas question, moitié-moitié. » Il t'oblige à boire la première gorgée. | « Pas question, moitié-moitié. » {g:Elle\|Il} t'oblige à boire la première gorgée. |
| `datePlaces.ds_studio.rounds.3.choices.2.reply` | « De l'eau à trois heures du mat' en studio ? Quelle hygiène de vie suspecte. » Il sourit, taquin. | « De l'eau à trois heures du mat' en studio ? Quelle hygiène de vie suspecte. » {g:Elle\|Il} sourit, {g:taquine\|taquin}. |
| `datePlaces.ds_studio.rounds.4.choices.0.reply` | « Qui d'autre mériterait d'être la muse de ce morceau ? » Il plonge son regard dans le tien. | « Qui d'autre mériterait d'être la muse de ce morceau ? » {g:Elle\|Il} plonge son regard dans le tien. |
| `datePlaces.ds_studio.rounds.4.choices.1.reply` | « Encore cinq petites minutes à regarder le soleil se lever avec toi. » Il pose la tête sur ton épaule. | « Encore cinq petites minutes à regarder le soleil se lever avec toi. » {g:Elle\|Il} pose la tête sur ton épaule. |
| `datePlaces.ds_studio.rounds.4.choices.2.reply` | Il se glisse dans le cadre au dernier moment en faisant une tête absurde. | {g:Elle\|Il} se glisse dans le cadre au dernier moment en faisant une tête absurde. |
| `datePlaces.ds_rooftop.rounds.0.choices.0.reply` | Il réajuste le tissu pour t'éviter le contact du béton froid. | {g:Elle\|Il} réajuste le tissu pour t'éviter le contact du béton froid. |
| `datePlaces.ds_rooftop.rounds.0.choices.1.reply` | « C'est vrai. Mais ta présence rend tout encore plus beau, » murmure-t-il doucement. | « C'est vrai. Mais ta présence rend tout encore plus beau, » {g:murmure-t-elle\|murmure-t-il} doucement. |
| `datePlaces.ds_rooftop.rounds.0.choices.2.reply` | Il s'allonge tout contre toi, les yeux tournés vers l'immensité nocturne. | {g:Elle\|Il} s'allonge tout contre toi, les yeux tournés vers l'immensité nocturne. |
| `datePlaces.ds_rooftop.rounds.1.choices.0.reply` | Il t'écoute avec une attention captivée et admirative. | {g:Elle\|Il} t'écoute avec une attention captivée et admirative. |
| `datePlaces.ds_rooftop.rounds.1.choices.1.reply` | « Il n'est pas trop tard. J'embarque avec toi dans la navette. » Il sourit tendrement. | « Il n'est pas trop tard. J'embarque avec toi dans la navette. » {g:Elle\|Il} sourit tendrement. |
| `datePlaces.ds_rooftop.rounds.1.choices.2.reply` | « Quelqu'un qui apporte un peu de bien autour de lui. J'essaie encore aujourd'hui, je crois. » | « Quelqu'un qui apporte un peu de bien autour {g:d'elle\|de lui}. J'essaie encore aujourd'hui, je crois. » |
| `datePlaces.ds_rooftop.rounds.2.line` | Un coup de vent glacial balaie le toit de l'immeuble. {name} tente en vain de cacher qu'il frissonne. | Un coup de vent glacial balaie le toit de l'immeuble. {name} tente en vain de cacher qu'{g:elle\|il} frissonne. |
| `datePlaces.ds_rooftop.rounds.2.choices.0.reply` | Il se blottit tout contre toi pour partager la chaleur. | {g:Elle\|Il} se blottit tout contre toi pour partager la chaleur. |
| `datePlaces.ds_rooftop.rounds.2.choices.1.reply` | « Même pas vrai ! Je suis une vraie bouillotte humaine. » Mais il accepte volontiers ton étreinte. | « Même pas vrai ! Je suis une vraie bouillotte humaine. » Mais {g:elle\|il} accepte volontiers ton étreinte. |
| `datePlaces.ds_rooftop.rounds.2.choices.2.reply` | Il baisse les yeux vers vos mains jointes avec un regard d'une douceur infinie. | {g:Elle\|Il} baisse les yeux vers vos mains jointes avec un regard d'une douceur infinie. |
| `datePlaces.ds_rooftop.rounds.3.choices.0.reply` | Vous esquissez quelques pas lents dans la brise nocturne, il te guide avec une infinie délicatesse. | Vous esquissez quelques pas lents dans la brise nocturne, {g:elle\|il} te guide avec une infinie délicatesse. |
| `datePlaces.ds_rooftop.rounds.3.choices.1.reply` | « Moi non plus. Il suffit de se balancer doucement en rythme. » Il t'entraîne sans brusquerie. | « Moi non plus. Il suffit de se balancer doucement en rythme. » {g:Elle\|Il} t'entraîne sans brusquerie. |
| `datePlaces.ds_rooftop.rounds.4.choices.0.reply` | Il te serre dans une étreinte protectrice qui semble suspendre le temps. | {g:Elle\|Il} te serre dans une étreinte protectrice qui semble suspendre le temps. |
| `datePlaces.ds_rooftop.rounds.4.choices.2.reply` | Il reste figé quelques secondes, le visage illuminé par le plus pur des sourires. | {g:Elle\|Il} reste {g:figée\|figé} quelques secondes, le visage illuminé par le plus pur des sourires. |
| `dateThemes.openers.friendly.0.1.reply` | « Peut-être bien. Ça te plaît ? » Il a un petit air fier qui en dit long. | « Peut-être bien. Ça te plaît ? » {g:Elle\|Il} a un petit air fier qui en dit long. |
| `dateThemes.openers.friendly.1.1.reply` | {name} souffle du nez en riant. « Vraiment pas drôle. » Mais il est plié en deux. | {name} souffle du nez en riant. « Vraiment pas drôle. » Mais {g:elle\|il} est {g:pliée\|plié} en deux. |
| `dateThemes.openers.friendly.1.2.reply` | « Évidemment. » Il prend place à tes côtés, tout près sans être envahissant. | « Évidemment. » {g:Elle\|Il} prend place à tes côtés, tout près sans être envahissant. |
| `dateThemes.openers.flirty.0.1.reply` | Il te rend ton petit choc d'épaule et reste collé contre toi. | {g:Elle\|Il} te rend ton petit choc d'épaule et reste {g:collée\|collé} contre toi. |
| `dateThemes.openers.flirty.1.1.reply` | « Seulement aujourd'hui ? » Il tente désespérément de réprimer son sourire flatté. | « Seulement aujourd'hui ? » {g:Elle\|Il} tente désespérément de réprimer son sourire flatté. |
| `dateThemes.openers.sweet.0.1.reply` | « Moi aussi, » souffle-t-il tout bas. « Toujours. » | « Moi aussi, » {g:souffle-t-elle\|souffle-t-il} tout bas. « Toujours. » |
| `dateThemes.openers.sweet.1.0.reply` | Il se fige complètement, comme de peur de rompre la magie de l'instant. | {g:Elle\|Il} se fige complètement, comme de peur de rompre la magie de l'instant. |
| `dateThemes.openers.sweet.1.2.reply` | « C'est tellement reposant d'être en silence avec toi, » glisse-t-il après un moment. | « C'est tellement reposant d'être en silence avec toi, » {g:glisse-t-elle\|glisse-t-il} après un moment. |
| `dateThemes.shared.1.choices.0.reply` | « Tu me sauves la vie ! » Il engloutit le tout en une seule bouchée. | « Tu me sauves la vie ! » {g:Elle\|Il} engloutit le tout en une seule bouchée. |
| `dateThemes.shared.1.choices.1.reply` | Tu gagnes haut la main. {name} jure sur l'honneur qu'il t'a laissé gagner. Faux. | Tu gagnes haut la main. {name} jure sur l'honneur qu'{g:elle\|il} t'a laissé gagner. Faux. |
| `dateThemes.shared.1.choices.2.reply` | « C'était il y a une heure entière ! » Il affiche une tête outrée. | « C'était il y a une heure entière ! » {g:Elle\|Il} affiche une tête outrée. |
| `dateThemes.shared.3.line` | {name} insiste pour prendre un selfie à {place}. « Pour immortaliser la journée, » dit-il. | {name} insiste pour prendre un selfie à {place}. « Pour immortaliser la journée, » {g:dit-elle\|dit-il}. |
| `dateThemes.shared.3.choices.0.reply` | Il éclate de rire et la photo est floue. Il la garde précieusement quand même. | {g:Elle\|Il} éclate de rire et la photo est floue. {g:Elle\|Il} la garde précieusement quand même. |
| `dateThemes.shared.5.choices.0.reply` | Il détourne la tête et sourit bêtement dans le vide. | {g:Elle\|Il} détourne la tête et sourit bêtement dans le vide. |
| `dateThemes.shared.5.choices.2.reply` | « Très valide. » Maintenant {name} ne pense plus qu'au dîner lui aussi. | « Très valide. » Maintenant {name} ne pense plus qu'au dîner {g:elle aussi\|lui aussi}. |
| `dateThemes.moodRounds.friendly.0.choices.1.reply` | Il gémit de désespoir mais éclate de rire. « J'ai honte d'avoir ri à ça. » | {g:Elle\|Il} gémit de désespoir mais éclate de rire. « J'ai honte d'avoir ri à ça. » |
| `dateThemes.moodRounds.friendly.0.choices.2.reply` | « Tu m'as laissé gagner là, non ? » Il paie quand même ta boisson. | « Tu m'as laissé gagner là, non ? » {g:Elle\|Il} paie quand même ta boisson. |
| `dateThemes.moodRounds.friendly.1.choices.0.reply` | « C'est pas possible ! Tu gagnes haut la main ! » Il en a les larmes aux yeux. | « C'est pas possible ! Tu gagnes haut la main ! » {g:Elle\|Il} en a les larmes aux yeux. |
| `dateThemes.moodRounds.friendly.1.choices.2.reply` | « C'était affreux. Mais maintenant j'en rigole. » Il hausse les épaules en souriant. | « C'était affreux. Mais maintenant j'en rigole. » {g:Elle\|Il} hausse les épaules en souriant. |
| `dateThemes.moodRounds.flirty.0.choices.2.reply` | « Alors je vais le faire à ta place, » dit-il en fermant les paupières. | « Alors je vais le faire à ta place, » {g:dit-elle\|dit-il} en fermant les paupières. |
| `dateThemes.moodRounds.flirty.1.choices.2.reply` | « D'accord, d'accord. » Il revient avec deux verres neufs et t'en tend un. | « D'accord, d'accord. » {g:Elle\|Il} revient avec deux verres neufs et t'en tend un. |
| `dateThemes.moodRounds.sweet.0.choices.2.reply` | « Je sais bien, » murmure-t-il. « Mais j'avais juste envie de le faire pour toi. » | « Je sais bien, » {g:murmure-t-elle\|murmure-t-il}. « Mais j'avais juste envie de le faire pour toi. » |
| `dateThemes.moodRounds.sweet.1.choices.0.reply` | {name} pousse un soupir de soulagement, comme s'il redoutait ta réponse. | {name} pousse un soupir de soulagement, comme {g:si elle\|s'il} redoutait ta réponse. |
| `dateThemes.moodRounds.sweet.1.choices.1.reply` | « Aujourd'hui, sans hésiter, » répond-il sans une seconde d'hésitation. | « Aujourd'hui, sans hésiter, » {g:répond-elle\|répond-il} sans une seconde d'hésitation. |
| `dateThemes.closers.friendly.0.choices.0.reply` | « Mauvaise idée, j'ai déjà mille projets déraisonnables ! » Il commence déjà à s'enthousiasmer. | « Mauvaise idée, j'ai déjà mille projets déraisonnables ! » {g:Elle\|Il} commence déjà à s'enthousiasmer. |
| `dateThemes.closers.friendly.0.choices.1.reply` | Il rate la tape exprès et t'embarque dans une accolade surprise. | {g:Elle\|Il} rate la tape exprès et t'embarque dans une accolade surprise. |
| `dateThemes.closers.friendly.1.choices.0.reply` | « Regarde-nous, quelle politesse exemplaire. » Il te bouscule gentiment. | « Regarde-nous, quelle politesse exemplaire. » {g:Elle\|Il} te bouscule gentiment. |
| `dateThemes.closers.friendly.1.choices.2.reply` | « Juste sympa ? La prochaine fois, je mettrai le paquet pour t'impressionner. » Il a l'air très motivé. | « Juste sympa ? La prochaine fois, je mettrai le paquet pour t'impressionner. » {g:Elle\|Il} a l'air très {g:motivée\|motivé}. |
| `dateThemes.closers.flirty.0.choices.0.reply` | Il choisit littéralement le détour le plus interminable de la ville. | {g:Elle\|Il} choisit littéralement le détour le plus interminable de la ville. |
| `dateThemes.closers.flirty.0.choices.2.reply` | « Très vite, » répète-t-il, telle une promesse solennelle. | « Très vite, » {g:répète-t-elle\|répète-t-il}, telle une promesse solennelle. |
| `dateThemes.closers.flirty.1.choices.2.reply` | « D'accord, » souffle-t-il, restant immobile à te regarder jusqu'à ce que tu disparaisses. | « D'accord, » {g:souffle-t-elle\|souffle-t-il}, restant immobile à te regarder jusqu'à ce que tu disparaisses. |
| `dateThemes.closers.sweet.0.choices.0.reply` | « Reste encore une minute comme ça, » murmure-t-il tout doucement. | « Reste encore une minute comme ça, » {g:murmure-t-elle\|murmure-t-il} tout doucement. |
| `dateThemes.closers.sweet.0.choices.2.reply` | Il a un petit rire étouffé contre ton épaule. « Une tape dans le dos, sérieusement ? » | {g:Elle\|Il} a un petit rire étouffé contre ton épaule. « Une tape dans le dos, sérieusement ? » |
| `dateThemes.closers.sweet.1.choices.0.reply` | Il te serre tendrement la main. « Dès demain, dans ce cas. » | {g:Elle\|Il} te serre tendrement la main. « Dès demain, dans ce cas. » |
| `worlds.seaside.dateRounds.0.choices.0.reply` | « La meilleure idée que tu aies eue de toute la semaine. » Il t'attrape la main et se met à courir. | « La meilleure idée que tu aies eue de toute la semaine. » {g:Elle\|Il} t'attrape la main et se met à courir. |
| `worlds.seaside.dateRounds.0.choices.1.reply` | « Sage. Trop sage. Mais d'accord. » Il t'attend sagement devant la porte. | « Sage. Trop sage. Mais d'accord. » {g:Elle\|Il} t'attend sagement devant la porte. |
| `worlds.seaside.dateRounds.1.choices.2.reply` | « Le gardien officiel des chaussures. Un rôle primordial. » Il revient de l'eau le sourire aux lèvres. | « Le gardien officiel des chaussures. Un rôle primordial. » {g:Elle\|Il} revient de l'eau le sourire aux lèvres. |
| `worlds.moonlit.dateRounds.0.choices.2.reply` | « Alors j'en ferai un pour nous deux, » répond-il avec tendresse. | « Alors j'en ferai un pour nous deux, » {g:répond-elle\|répond-il} avec tendresse. |
| `worlds.neon.dateRounds.0.choices.0.reply` | « Mon sauveur attitré. » Il souffle en riant, sans lâcher ta main. | « Mon sauveur attitré. » {g:Elle\|Il} souffle en riant, sans lâcher ta main. |
| `worlds.neon.dateRounds.0.choices.2.reply` | « Tu vas m'attirer les pires ennuis de ma carrière. » Mais il prend la pose tout sourire. | « Tu vas m'attirer les pires ennuis de ma carrière. » Mais {g:elle\|il} prend la pose tout sourire. |
| `worlds.neon.dateRounds.1.choices.0.reply` | « Arrête, pitié ! Non en fait, continue. » Il a un sourire fendu jusqu'aux oreilles. | « Arrête, pitié ! Non en fait, continue. » {g:Elle\|Il} a un sourire fendu jusqu'aux oreilles. |
| `worlds.neon.dateRounds.1.choices.2.reply` | « Aïe. Celle-là fait mal à mon ego. » Il feint d'être blessé... presque crédible. | « Aïe. Celle-là fait mal à mon ego. » {g:Elle\|Il} feint d'être {g:blessée\|blessé}... presque crédible. |
| `worlds.tidepool.dateRounds.0.choices.1.reply` | « Hé ! » Il trempe ses lèvres dans la tienne et grimace. Tu éclates de rire. | « Hé ! » {g:Elle\|Il} trempe ses lèvres dans la tienne et grimace. Tu éclates de rire. |
| `worlds.tidepool.dateRounds.0.choices.2.reply` | « Ce sera pour la prochaine tournée alors. » Il note déjà soigneusement ta remarque sur une serviette en papier. | « Ce sera pour la prochaine tournée alors. » {g:Elle\|Il} note déjà soigneusement ta remarque sur une serviette en papier. |
| `worlds.tidepool.dateRounds.1.choices.1.reply` | « C'est bon, il ne nous quittera plus d'une semelle maintenant, » sourit {name}, attendri. | « C'est bon, il ne nous quittera plus d'une semelle maintenant, » sourit {name}, {g:attendrie\|attendri}. |

### German (`de`) — 148 changes

| Path | Before | After |
| :--- | :--- | :--- |
| `datePlaces.ds_rain.rounds.0.choices.0.text` | Ihn dicht unter den Schirm an deine Seite ziehen. | Dicht unter den Schirm an deine Seite ziehen. |
| `datePlaces.ds_rain.rounds.4.choices.1.text` | Ihn zum Abschied umarmen. | Zum Abschied umarmen. |
| `datePlaces.ds_aquarium.rounds.0.choices.1.text` | Ihn im bläulichen Schimmer fotografieren. | Ein Foto im bläulichen Schimmer machen. |
| `datePlaces.ds_aquarium.rounds.2.choices.0.text` | Beruhigend seine Hand nehmen. | Beruhigend die Hand nehmen. |
| `datePlaces.ds_festival.rounds.0.choices.0.text` | Dich von ihm durch die Menschenmenge leiten lassen. | Dich durch die Menschenmenge leiten lassen. |
| `datePlaces.ds_festival.rounds.1.choices.1.text` | Ihn mit einer Nascherei trösten. | Mit einer Nascherei trösten. |
| `datePlaces.ds_festival.rounds.1.choices.2.text` | Ihn wegen seiner Treffsicherheit aufziehen. | Wegen der Treffsicherheit aufziehen. |
| `datePlaces.ds_festival.rounds.2.choices.0.text` | Die Katze nehmen und ihm den Fuchs geben. | Die Katze nehmen und den Fuchs abgeben. |
| `datePlaces.ds_festival.rounds.2.choices.1.text` | Beide Masken selbst aufsetzen und ihm keine lassen. | Beide Masken selbst aufsetzen und keine abgeben. |
| `datePlaces.ds_festival.rounds.3.choices.0.text` | Seinen Blick erwidern. | Den Blick erwidern. |
| `datePlaces.ds_festival.rounds.3.choices.2.text` | Deine Schulter an seine schmiegen. | Deine Schulter sanft anlehnen. |
| `datePlaces.ds_rooftop.rounds.0.choices.0.text` | Dich neben ihn auf die Decke setzen. | Dich mit auf die Decke setzen. |
| `datePlaces.ds_rooftop.rounds.1.choices.0.text` | Ihm von deinem größten Kindheitstraum erzählen. | Von deinem größten Kindheitstraum erzählen. |
| `datePlaces.ds_rooftop.rounds.2.choices.0.text` | Die halbe Decke über seine Schultern werfen. | Die Decke um euch beide wickeln. |
| `datePlaces.ds_rooftop.rounds.2.choices.2.text` | Seine eiskalten Hände zwischen deinen wärmen. | Die eiskalten Hände zwischen deinen wärmen. |
| `datePlaces.ds_rooftop.rounds.3.choices.0.text` | Seine Hand ergreifen und auf dem Dach tanzen. | Die Hand ergreifen und auf dem Dach tanzen. |
| `datePlaces.ds_rooftop.rounds.3.choices.2.text` | Im Tanz deinen Kopf an seine Brust lehnen. | Im Tanz deinen Kopf anlehnen. |
| `datePlaces.ds_rooftop.rounds.4.choices.2.text` | Ihm überraschend einen zarten Kuss auf die Wange hauchen. | Überraschend einen zarten Kuss auf die Wange hauchen. |
| `dateThemes.openers.flirty.0.1.text` | Ihm einen leichten Schulterstoß verpassen. | Einen leichten Schulterstoß verpassen. |
| `dateThemes.openers.flirty.1.0.text` | Seinem Blick eine Sekunde länger standhalten. | Dem Blick eine Sekunde länger standhalten. |
| `dateThemes.openers.sweet.0.0.text` | Seine Hand nehmen. | Die Hand nehmen. |
| `dateThemes.openers.sweet.1.0.text` | Den Kopf sanft an seine Schulter lehnen. | Den Kopf sanft anlehnen. |
| `dateThemes.shared.1.choices.0.text` | Ihm den Rest deines Snacks anbieten. | Den Rest deines Snacks anbieten. |
| `dateThemes.shared.4.choices.0.text` | „Frag ihn doch selbst.“ | „Frag doch selbst nach.“ |
| `dateThemes.moodRounds.flirty.0.choices.1.text` | Die Wimper sanft zu ihm hinüberpusten. | Die Wimper sanft hinüberpusten. |
| `dateThemes.moodRounds.flirty.1.choices.0.text` | Ihm im Gegenzug sein Glas stibitzen. | Im Gegenzug das Glas stibitzen. |
| `dateThemes.moodRounds.sweet.0.choices.1.text` | Ihm ebenfalls die Haare zurechtzupfen. | Ebenfalls die Haare zurechtzupfen. |
| `dateThemes.closers.friendly.0.choices.1.text` | Ihm die Hand zum High Five hinhalten. | Die Hand zum High Five hinhalten. |
| `dateThemes.closers.friendly.1.choices.1.text` | Ihn noch bis vor seine Haustür begleiten. | Noch bis vor die Haustür begleiten. |
| `dateThemes.closers.flirty.1.choices.1.text` | Ihm ein kurzes Augenzwinkern zuwerfen und gehen. | Ein kurzes Augenzwinkern zuwerfen und gehen. |
| `dateThemes.closers.sweet.0.choices.0.text` | Ihn noch eine Sekunde fester drücken. | Noch eine Sekunde fester drücken. |
| `dateThemes.closers.sweet.0.choices.2.text` | Ihm kumpelhaft auf den Rücken klopfen. | Kumpelhaft auf den Rücken klopfen. |
| `dateThemes.closers.sweet.1.choices.1.text` | Ihm sanft einen Kuss auf die Wange hauchen. | Sanft einen Kuss auf die Wange hauchen. |
| `worlds.neon.dateRounds.0.choices.0.text` | Ihn rasch in eine Seitengasse ziehen. | Rasch in eine Seitengasse ziehen. |
| `worlds.tidepool.dateRounds.1.choices.1.text` | Ihm den letzten Bissen deines Croissants überlassen. | Dem Welpen den letzten Bissen deines Croissants überlassen. |
| `datePlaces.ds_rain.rounds.0.choices.0.reply` | „...Schon gut. So ist es deutlich besser.“ Er weicht keinen Millimeter zurück. | „...Schon gut. So ist es deutlich besser.“ {g:Sie\|Er} weicht keinen Millimeter zurück. |
| `datePlaces.ds_rain.rounds.0.choices.1.reply` | „Immer so bestimmend. Gefällt mir.“ Er rückt den Schirm wieder in die Mitte. | „Immer so bestimmend. Gefällt mir.“ {g:Sie\|Er} rückt den Schirm wieder in die Mitte. |
| `datePlaces.ds_rain.rounds.0.choices.2.reply` | „Hey! Sofort zurück da!“ Er eilt dir lachend hinterher. | „Hey! Sofort zurück da!“ {g:Sie\|Er} eilt dir lachend hinterher. |
| `datePlaces.ds_rain.rounds.1.choices.1.reply` | „Hüpf rauf, bevor ich es mir anders überlege.“ Er setzt dich drüben wohlbehalten ab. | „Hüpf rauf, bevor ich es mir anders überlege.“ {g:Sie\|Er} setzt dich drüben wohlbehalten ab. |
| `datePlaces.ds_rain.rounds.1.choices.2.reply` | „Du bist unmöglich.“ Er patscht auch ins Wasser, nur um dich nasszuspritzen. | „Du bist unmöglich.“ {g:Sie\|Er} patscht auch ins Wasser, nur um dich nasszuspritzen. |
| `datePlaces.ds_rain.rounds.2.choices.0.reply` | Er überlässt dir das größere Stück mit der ganzen Glasur. | {g:Sie\|Er} überlässt dir das größere Stück mit der ganzen Glasur. |
| `datePlaces.ds_rain.rounds.2.choices.1.reply` | Er verschlingt sie mit einem einzigen. Und verschluckt sich fast vor Lachen. | {g:Sie\|Er} verschlingt sie mit einem einzigen. Und verschluckt sich fast vor Lachen. |
| `datePlaces.ds_rain.rounds.2.choices.2.reply` | Er wärmt seine kalten Hände an der Tasse und schaut dich durch den Dampf an. | {g:Sie\|Er} wärmt {g:ihre\|seine} kalten Hände an der Tasse und schaut dich durch den Dampf an. |
| `datePlaces.ds_rain.rounds.3.choices.0.reply` | Er schaut lächelnd zur Seite durch die beschlagene Fensterscheibe. | {g:Sie\|Er} schaut lächelnd zur Seite durch die beschlagene Fensterscheibe. |
| `datePlaces.ds_rain.rounds.3.choices.1.reply` | „Langsam ist gut,“ murmelt er. „Besonders mit dir zusammen.“ | „Langsam ist gut,“ murmelt {g:sie\|er}. „Besonders mit dir zusammen.“ |
| `datePlaces.ds_rain.rounds.4.choices.1.reply` | Er hält dich eine Sekunde länger fest, als du erwartet hättest. | {g:Sie\|Er} hält dich eine Sekunde länger fest, als du erwartet hättest. |
| `datePlaces.ds_aquarium.rounds.0.choices.0.reply` | Er tut es. Seine Schulter berührt sanft die deine. | {g:Sie\|Er} tut es. {g:Ihre\|Seine} Schulter berührt sanft die deine. |
| `datePlaces.ds_aquarium.rounds.1.choices.2.reply` | „Wusstest du, dass sie beim Schlafen Händchen halten, um nicht abzutreiben?“, bemerkt er. „Jetzt weißt du es.“ | „Wusstest du, dass sie beim Schlafen Händchen halten, um nicht abzutreiben?“, bemerkt {g:sie\|er}. „Jetzt weißt du es.“ |
| `datePlaces.ds_aquarium.rounds.2.choices.0.reply` | Er lässt deine Finger während des gesamten Tunnelwegs nicht mehr los. | {g:Sie\|Er} lässt deine Finger während des gesamten Tunnelwegs nicht mehr los. |
| `datePlaces.ds_aquarium.rounds.2.choices.1.reply` | „Ich habe nur überprüft, ob du auch aufpasst.“ Aber er lässt deinen Ärmel nicht los. | „Ich habe nur überprüft, ob du auch aufpasst.“ Aber {g:sie\|er} lässt deinen Ärmel nicht los. |
| `datePlaces.ds_aquarium.rounds.3.choices.0.reply` | „Ich wusste, dass du die nimmst.“ Er reicht sie dir und steckt das andere in die Tasche. | „Ich wusste, dass du die nimmst.“ {g:Sie\|Er} reicht sie dir und steckt das andere in die Tasche. |
| `datePlaces.ds_aquarium.rounds.3.choices.1.reply` | „Ich muss nicht, ich will.“ Er bezahlt an der Kasse, ehe du protestieren kannst. | „Ich muss nicht, ich will.“ {g:Sie\|Er} bezahlt an der Kasse, ehe du protestieren kannst. |
| `datePlaces.ds_aquarium.rounds.3.choices.2.reply` | „Der hat Charakter. Genau wie du.“ Er schmunzelt liebevoll. | „Der hat Charakter. Genau wie du.“ {g:Sie\|Er} schmunzelt liebevoll. |
| `datePlaces.ds_festival.rounds.0.choices.0.reply` | Er lässt deine Hand im Trubel keinen Moment lang los. | {g:Sie\|Er} lässt deine Hand im Trubel keinen Moment lang los. |
| `datePlaces.ds_festival.rounds.0.choices.1.reply` | „Gefällt mir, deine Prioritätenliste.“ Er steuert zielstrebig den Spießchenstand an. | „Gefällt mir, deine Prioritätenliste.“ {g:Sie\|Er} steuert zielstrebig den Spießchenstand an. |
| `datePlaces.ds_festival.rounds.0.choices.2.reply` | Er beißt hinein und hat sofort rote Zuckerkruste auf der Wange. Ein wunderbares Bild. | {g:Sie\|Er} beißt hinein und hat sofort rote Zuckerkruste auf der Wange. Ein wunderbares Bild. |
| `datePlaces.ds_festival.rounds.1.choices.1.reply` | „Der Bär hat sowieso ziemlich arrogant dreingeschaut.“ Er knabbert zufrieden am Gebäck. | „Der Bär hat sowieso ziemlich arrogant dreingeschaut.“ {g:Sie\|Er} knabbert zufrieden am Gebäck. |
| `datePlaces.ds_festival.rounds.1.choices.2.reply` | „Da war plötzlicher Seitenwind!“ Er verschränkt gespielt beleidigt die Arme. | „Da war plötzlicher Seitenwind!“ {g:Sie\|Er} verschränkt gespielt beleidigt die Arme. |
| `datePlaces.ds_festival.rounds.2.choices.1.reply` | „Du bist unverschämt.“ Er macht lachend fünf Fotos von dir. | „Du bist unverschämt.“ {g:Sie\|Er} macht lachend fünf Fotos von dir. |
| `datePlaces.ds_festival.rounds.3.choices.0.reply` | Die Funken des Himmels spiegeln sich in seinen Augen. Er wendet den Blick nicht ab. | Die Funken des Himmels spiegeln sich in {g:ihren\|seinen} Augen. {g:Sie\|Er} wendet den Blick nicht ab. |
| `datePlaces.ds_festival.rounds.3.choices.2.reply` | Er legt sanft den Arm um dich und zieht dich ein Stück näher heran. | {g:Sie\|Er} legt sanft den Arm um dich und zieht dich ein Stück näher heran. |
| `datePlaces.ds_festival.rounds.4.choices.0.reply` | Er drückt zärtlich zweimal deine Hand. | {g:Sie\|Er} drückt zärtlich zweimal deine Hand. |
| `datePlaces.ds_studio.rounds.0.line` | Vollkommene Stille im Tonstudio nach Mitternacht. {name} reicht dir seine Kopfhörer. „Das hat bisher noch kein Mensch gehört.“ | Vollkommene Stille im Tonstudio nach Mitternacht. {name} reicht dir {g:ihre\|seine} Kopfhörer. „Das hat bisher noch kein Mensch gehört.“ |
| `datePlaces.ds_studio.rounds.0.choices.0.reply` | Er beobachtet deine Reaktion bei jedem Beat mit angehaltenem Atem. | {g:Sie\|Er} beobachtet deine Reaktion bei jedem Beat mit angehaltenem Atem. |
| `datePlaces.ds_studio.rounds.0.choices.1.reply` | „Bist du auch, glaub mir.“ Er blickt verlegen zur Seite, die Ohren hochrot. | „Bist du auch, glaub mir.“ {g:Sie\|Er} blickt verlegen zur Seite, die Ohren hochrot. |
| `datePlaces.ds_studio.rounds.1.choices.0.reply` | Er atmet tief und erleichtert aus und strahlt über das ganze Gesicht. | {g:Sie\|Er} atmet tief und erleichtert aus und strahlt über das ganze Gesicht. |
| `datePlaces.ds_studio.rounds.1.choices.1.reply` | „Siehst du? Ich wusste, dass auf dein Gehör Verlass ist.“ Er notiert es sofort. | „Siehst du? Ich wusste, dass auf dein Gehör Verlass ist.“ {g:Sie\|Er} notiert es sofort. |
| `datePlaces.ds_studio.rounds.1.choices.2.reply` | „So oft du willst.“ Er drückt sofort wieder auf Play. | „So oft du willst.“ {g:Sie\|Er} drückt sofort wieder auf Play. |
| `datePlaces.ds_studio.rounds.2.choices.0.reply` | Er dreht begeistert an den Reglern. „Das klingt fantastisch. Nichts mehr verändern.“ | {g:Sie\|Er} dreht begeistert an den Reglern. „Das klingt fantastisch. Nichts mehr verändern.“ |
| `datePlaces.ds_studio.rounds.2.choices.1.reply` | „Wir sind doch ganz unter uns. Niemand verurteilt dich.“ Er nimmt deine Hand zur Ermutigung. | „Wir sind doch ganz unter uns. Niemand verurteilt dich.“ {g:Sie\|Er} nimmt deine Hand zur Ermutigung. |
| `datePlaces.ds_studio.rounds.2.choices.2.reply` | Sein schallendes Lachen dröhnt warm aus den Studiomonitoren. Das reinste Chaos. | {g:Ihr\|Sein} schallendes Lachen dröhnt warm aus den Studiomonitoren. Das reinste Chaos. |
| `datePlaces.ds_studio.rounds.3.choices.0.reply` | Er nimmt einen Schluck und reicht sie dir mit einem liebevollen Blick zurück. | {g:Sie\|Er} nimmt einen Schluck und reicht sie dir mit einem liebevollen Blick zurück. |
| `datePlaces.ds_studio.rounds.3.choices.1.reply` | „Kommt nicht in die Tüte, Halbe-Halbe.“ Er zwingt dich zum ersten Schluck. | „Kommt nicht in die Tüte, Halbe-Halbe.“ {g:Sie\|Er} zwingt dich zum ersten Schluck. |
| `datePlaces.ds_studio.rounds.3.choices.2.reply` | „Wasser um drei Uhr nachts im Tonstudio? Ein verdächtig gesunder Lebensstil.“ Er grinst amüsiert. | „Wasser um drei Uhr nachts im Tonstudio? Ein verdächtig gesunder Lebensstil.“ {g:Sie\|Er} grinst amüsiert. |
| `datePlaces.ds_studio.rounds.4.choices.0.reply` | „Wer sonst hätte als Muse für diesen Track herhalten sollen?“ Er sieht dir tief in die Augen. | „Wer sonst hätte als Muse für diesen Track herhalten sollen?“ {g:Sie\|Er} sieht dir tief in die Augen. |
| `datePlaces.ds_studio.rounds.4.choices.1.reply` | „Nur noch fünf Minuten mit dir den Sonnenaufgang beobachten.“ Er legt den Kopf auf deine Schulter. | „Nur noch fünf Minuten mit dir den Sonnenaufgang beobachten.“ {g:Sie\|Er} legt den Kopf auf deine Schulter. |
| `datePlaces.ds_studio.rounds.4.choices.2.reply` | Er springt im letzten Moment mit einer albernen Pose ins Bild. | {g:Sie\|Er} springt im letzten Moment mit einer albernen Pose ins Bild. |
| `datePlaces.ds_rooftop.rounds.0.choices.0.reply` | Er zieht den Stoff zurecht, damit du nicht auf dem kalten Beton sitzt. | {g:Sie\|Er} zieht den Stoff zurecht, damit du nicht auf dem kalten Beton sitzt. |
| `datePlaces.ds_rooftop.rounds.0.choices.1.reply` | „Das stimmt. Aber dass du hier bist, macht alles noch viel schöner,“ murmelt er leise. | „Das stimmt. Aber dass du hier bist, macht alles noch viel schöner,“ murmelt {g:sie\|er} leise. |
| `datePlaces.ds_rooftop.rounds.0.choices.2.reply` | Er legt sich ganz nah an deine Seite und blickt mit dir in die Nacht. | {g:Sie\|Er} legt sich ganz nah an deine Seite und blickt mit dir in die Nacht. |
| `datePlaces.ds_rooftop.rounds.1.choices.0.reply` | Er lauscht jedem einzelnen deiner Worte mit faszinierter Aufmerksamkeit. | {g:Sie\|Er} lauscht jedem einzelnen deiner Worte mit faszinierter Aufmerksamkeit. |
| `datePlaces.ds_rooftop.rounds.1.choices.1.reply` | „Dafür ist es noch nicht zu spät. Ich steige mit in die Rakete.“ Er lächelt zärtlich. | „Dafür ist es noch nicht zu spät. Ich steige mit in die Rakete.“ {g:Sie\|Er} lächelt zärtlich. |
| `datePlaces.ds_rooftop.rounds.2.line` | Ein eisiger Windstoß fegt über das Hausdach. {name} versucht erfolglos zu verbergen, dass er fröstelt. | Ein eisiger Windstoß fegt über das Hausdach. {name} versucht erfolglos zu verbergen, dass {g:sie\|er} fröstelt. |
| `datePlaces.ds_rooftop.rounds.2.choices.0.reply` | Er rückt ganz dicht an dich heran, um die Körperwärme zu teilen. | {g:Sie\|Er} rückt ganz dicht an dich heran, um die Körperwärme zu teilen. |
| `datePlaces.ds_rooftop.rounds.2.choices.1.reply` | „Tu ich gar nicht! Ich bin ein wandelnder Heizkörper.“ Aber er lässt sich gerne umarmen. | „Tu ich gar nicht! Ich bin ein wandelnder Heizkörper.“ Aber {g:sie\|er} lässt sich gerne umarmen. |
| `datePlaces.ds_rooftop.rounds.2.choices.2.reply` | Er schaut mit einem unendlich sanften Blick auf eure Hände herab. | {g:Sie\|Er} schaut mit einem unendlich sanften Blick auf eure Hände herab. |
| `datePlaces.ds_rooftop.rounds.3.choices.0.reply` | Ihr wiegt euch langsam im Nachtwind, er führt dich mit vorsichtiger Zärtlichkeit. | Ihr wiegt euch langsam im Nachtwind, {g:sie\|er} führt dich mit vorsichtiger Zärtlichkeit. |
| `datePlaces.ds_rooftop.rounds.3.choices.1.reply` | „Ich auch. Wir wiegen uns einfach nur sachte im Takt.“ Er zieht dich sanft mit. | „Ich auch. Wir wiegen uns einfach nur sachte im Takt.“ {g:Sie\|Er} zieht dich sanft mit. |
| `datePlaces.ds_rooftop.rounds.3.choices.2.reply` | Du spürst den aufgeregten Herzschlag unter seiner Jacke pochen. | Du spürst den aufgeregten Herzschlag unter {g:ihrer\|seiner} Jacke pochen. |
| `datePlaces.ds_rooftop.rounds.4.choices.0.reply` | Er schließt dich in eine tröstliche Umarmung, die die Zeit stillstehen lässt. | {g:Sie\|Er} schließt dich in eine tröstliche Umarmung, die die Zeit stillstehen lässt. |
| `datePlaces.ds_rooftop.rounds.4.choices.2.reply` | Er hält für einen Moment den Atem an und strahlt dann den ganzen Heimweg lang. | {g:Sie\|Er} hält für einen Moment den Atem an und strahlt dann den ganzen Heimweg lang. |
| `dateThemes.openers.friendly.0.1.reply` | „Vielleicht. Gefällt es dir?“ Ein Hauch von stolzem Lächeln huscht über sein Gesicht. | „Vielleicht. Gefällt es dir?“ Ein Hauch von stolzem Lächeln huscht über {g:ihr\|sein} Gesicht. |
| `dateThemes.openers.friendly.1.1.reply` | {name} prustet leise durch die Nase. „Furchtbar schlecht.“ Aber er kriegt sich kaum ein vor Lachen. | {name} prustet leise durch die Nase. „Furchtbar schlecht.“ Aber {g:sie\|er} kriegt sich kaum ein vor Lachen. |
| `dateThemes.openers.friendly.1.2.reply` | „Aber natürlich.“ Er setzt sich neben dich, nah genug, ohne dich einzuengen. | „Aber natürlich.“ {g:Sie\|Er} setzt sich neben dich, nah genug, ohne dich einzuengen. |
| `dateThemes.openers.flirty.0.1.reply` | Er stößt sanft zurück und bleibt dicht an deiner Schulter gelehnt. | {g:Sie\|Er} stößt sanft zurück und bleibt dicht an deiner Schulter gelehnt. |
| `dateThemes.openers.flirty.1.0.reply` | {name} senkt als Erster die Augen, die Spitzen seiner Ohren leicht gerötet. | {name} senkt als {g:Erste\|Erster} die Augen, die Spitzen {g:ihrer\|seiner} Ohren leicht gerötet. |
| `dateThemes.openers.flirty.1.1.reply` | „Nur heute?“ Er versucht vergeblich, sein geschmeicheltes Grinsen zu unterdrücken. | „Nur heute?“ {g:Sie\|Er} versucht vergeblich, {g:ihr\|sein} geschmeicheltes Grinsen zu unterdrücken. |
| `dateThemes.openers.sweet.0.0.reply` | {name} verflicht augenblicklich seine Finger mit deinen, ohne ein einziges Wort zu sagen. | {name} verflicht augenblicklich {g:ihre\|seine} Finger mit deinen, ohne ein einziges Wort zu sagen. |
| `dateThemes.openers.sweet.0.1.reply` | „Ich auch,“ wispert er ganz leise. „Immer.“ | „Ich auch,“ wispert {g:sie\|er} ganz leise. „Immer.“ |
| `dateThemes.openers.sweet.1.0.reply` | Er erstarrt für einen Herzschlag, als fürchte er, die Magie des Moments zu stören. | {g:Sie\|Er} erstarrt für einen Herzschlag, als fürchte {g:sie\|er}, die Magie des Moments zu stören. |
| `dateThemes.openers.sweet.1.1.reply` | {name} beginnt lebhaft zu erzählen. Du könntest ihm stundenlang zuhören. | {name} beginnt lebhaft zu erzählen. Du könntest {g:ihr\|ihm} stundenlang zuhören. |
| `dateThemes.openers.sweet.1.2.reply` | „Mit dir zusammen ist selbst Schweigen wunderschön,“ stellt er nach einer Weile fest. | „Mit dir zusammen ist selbst Schweigen wunderschön,“ stellt {g:sie\|er} nach einer Weile fest. |
| `dateThemes.shared.1.choices.0.reply` | „Mein Lebensretter!“ Er verdrückt alles mit einem einzigen Bissen. | „Mein Lebensretter!“ {g:Sie\|Er} verdrückt alles mit einem einzigen Bissen. |
| `dateThemes.shared.1.choices.1.reply` | Du gewinnst haushoch. {name} schwört Stein und Bein, er habe dich gewinnen lassen. Gelogen. | Du gewinnst haushoch. {name} schwört Stein und Bein, {g:sie\|er} habe dich gewinnen lassen. Gelogen. |
| `dateThemes.shared.1.choices.2.reply` | „Das ist eine gefühlte Ewigkeit her!“ Er schaut dich mit gespieltem Entsetzen an. | „Das ist eine gefühlte Ewigkeit her!“ {g:Sie\|Er} schaut dich mit gespieltem Entsetzen an. |
| `dateThemes.shared.3.line` | {name} will unbedingt ein Selfie in {place} machen. „Als Erinnerung an heute,“ meint er. | {name} will unbedingt ein Selfie in {place} machen. „Als Erinnerung an heute,“ meint {g:sie\|er}. |
| `dateThemes.shared.3.choices.0.reply` | Er bricht in schallendes Gelächter aus und das Foto verwackelt. Er speichert es trotzdem begeistert ab. | {g:Sie\|Er} bricht in schallendes Gelächter aus und das Foto verwackelt. {g:Sie\|Er} speichert es trotzdem begeistert ab. |
| `dateThemes.shared.5.choices.0.reply` | Er wendet verlegen den Blick ab und grinst selig vor sich hin. | {g:Sie\|Er} wendet verlegen den Blick ab und grinst selig vor sich hin. |
| `dateThemes.moodRounds.friendly.0.choices.1.reply` | Er stöhnt gequält auf, bricht dann aber in lautes Lachen aus. „Ich schäme mich, dass ich gelacht habe.“ | {g:Sie\|Er} stöhnt gequält auf, bricht dann aber in lautes Lachen aus. „Ich schäme mich, dass ich gelacht habe.“ |
| `dateThemes.moodRounds.friendly.0.choices.2.reply` | „Hast du mich etwa mit Absicht gewinnen lassen?“ Er spendiert dir dein Getränk trotzdem. | „Hast du mich etwa mit Absicht gewinnen lassen?“ {g:Sie\|Er} spendiert dir dein Getränk trotzdem. |
| `dateThemes.moodRounds.friendly.1.line` | {name} erzählt vom schlimmsten Missgeschick seines Lebens, und es ist zum Brüllen komisch. | {name} erzählt vom schlimmsten Missgeschick {g:ihres\|seines} Lebens, und es ist zum Brüllen komisch. |
| `dateThemes.moodRounds.friendly.1.choices.0.reply` | „Unmöglich! Du hast haushoch gewonnen!“ Vor Lachen stehen ihm die Tränen in den Augen. | „Unmöglich! Du hast haushoch gewonnen!“ Vor Lachen stehen {g:ihr\|ihm} die Tränen in den Augen. |
| `dateThemes.moodRounds.friendly.1.choices.2.reply` | „War es auch. Aber heute kann ich drüber schmunzeln.“ Er zuckt lachend mit den Schultern. | „War es auch. Aber heute kann ich drüber schmunzeln.“ {g:Sie\|Er} zuckt lachend mit den Schultern. |
| `dateThemes.moodRounds.flirty.0.choices.1.reply` | „Hast du dir etwa mich gewünscht?“ Ein freches, wissendes Lächeln umspielt seine Lippen. | „Hast du dir etwa mich gewünscht?“ Ein freches, wissendes Lächeln umspielt {g:ihre\|seine} Lippen. |
| `dateThemes.moodRounds.flirty.0.choices.2.reply` | „Dann übernehme ich das eben für dich,“ flüstert er und schließt kurz die Augen. | „Dann übernehme ich das eben für dich,“ flüstert {g:sie\|er} und schließt kurz die Augen. |
| `dateThemes.moodRounds.flirty.1.choices.1.reply` | {name} verschluckt sich fast. „Gar nicht wahr!“ Seine Wangen färben sich sofort rot. | {name} verschluckt sich fast. „Gar nicht wahr!“ {g:Ihre\|Seine} Wangen färben sich sofort rot. |
| `dateThemes.moodRounds.flirty.1.choices.2.reply` | „Schon unterwegs.“ Er holt zwei frische Gläser und reicht dir deines. | „Schon unterwegs.“ {g:Sie\|Er} holt zwei frische Gläser und reicht dir deines. |
| `dateThemes.moodRounds.sweet.0.choices.0.reply` | Seine Hand verweilt eine Sekunde länger an deiner Wange, bevor sie herabgleitet. | {g:Ihre\|Seine} Hand verweilt eine Sekunde länger an deiner Wange, bevor sie herabgleitet. |
| `dateThemes.moodRounds.sweet.0.choices.2.reply` | „Weiß ich doch,“ murmelt er sanft. „Aber ich wollte es gerne für dich tun.“ | „Weiß ich doch,“ murmelt {g:sie\|er} sanft. „Aber ich wollte es gerne für dich tun.“ |
| `dateThemes.moodRounds.sweet.1.choices.0.reply` | {name} atmet erleichtert auf, als hätte er sich vor deiner Antwort gefürchtet. | {name} atmet erleichtert auf, als hätte {g:sie\|er} sich vor deiner Antwort gefürchtet. |
| `dateThemes.moodRounds.sweet.1.choices.1.reply` | „Der heutige Tag, ohne jeden Zweifel,“ erwidert er wie aus der Pistole geschossen. | „Der heutige Tag, ohne jeden Zweifel,“ erwidert {g:sie\|er} wie aus der Pistole geschossen. |
| `dateThemes.closers.friendly.0.choices.0.reply` | „Ganz schlechte Idee, ich habe schon tausend verrückte Pläne!“ Er beginnt begeistert zu planen. | „Ganz schlechte Idee, ich habe schon tausend verrückte Pläne!“ {g:Sie\|Er} beginnt begeistert zu planen. |
| `dateThemes.closers.friendly.0.choices.1.reply` | Er verfehlt absichtlich und zieht dich stattdessen in eine spontane Umarmung. | {g:Sie\|Er} verfehlt absichtlich und zieht dich stattdessen in eine spontane Umarmung. |
| `dateThemes.closers.friendly.1.choices.0.reply` | „Schau uns an, wie vorbildlich höflich wir sind.“ Er knufft dich kumpelhaft an. | „Schau uns an, wie vorbildlich höflich wir sind.“ {g:Sie\|Er} knufft dich kumpelhaft an. |
| `dateThemes.closers.friendly.1.choices.1.reply` | „Das wäre doch gar nicht nötig gewesen.“ Doch seine Augen leuchten vor Freude. | „Das wäre doch gar nicht nötig gewesen.“ Doch {g:ihre\|seine} Augen leuchten vor Freude. |
| `dateThemes.closers.flirty.0.line` | Beim Verlassen von {place} verlangsamt {name} seine Schritte. „Ich will noch gar nicht, dass dieser Abend endet.“ | Beim Verlassen von {place} verlangsamt {name} {g:ihre\|seine} Schritte. „Ich will noch gar nicht, dass dieser Abend endet.“ |
| `dateThemes.closers.flirty.0.choices.0.reply` | Er wählt buchstäblich den verschlungensten Schleichweg durch die ganze Stadt. | {g:Sie\|Er} wählt buchstäblich den verschlungensten Schleichweg durch die ganze Stadt. |
| `dateThemes.closers.flirty.0.choices.2.reply` | „Ganz bald,“ wiederholt er, wie ein festes Versprechen. | „Ganz bald,“ wiederholt {g:sie\|er}, wie ein festes Versprechen. |
| `dateThemes.closers.flirty.1.choices.1.reply` | Du hörst sein warmes Lachen noch weit hinter dir in der kühlen Nachtluft widerhallen. | Du hörst {g:ihr\|sein} warmes Lachen noch weit hinter dir in der kühlen Nachtluft widerhallen. |
| `dateThemes.closers.flirty.1.choices.2.reply` | „Versprochen,“ flüstert er und blickt dir hinterher, bis du in der Dunkelheit verschwindest. | „Versprochen,“ flüstert {g:sie\|er} und blickt dir hinterher, bis du in der Dunkelheit verschwindest. |
| `dateThemes.closers.sweet.0.choices.0.reply` | „Bleib bitte noch eine Minute so stehen,“ murmelt er ganz leise in dein Haar. | „Bleib bitte noch eine Minute so stehen,“ murmelt {g:sie\|er} ganz leise in dein Haar. |
| `dateThemes.closers.sweet.0.choices.2.reply` | Er kichert leise an deiner Schulter. „Ein Klopfen auf den Rücken? Wirklich jetzt?“ | {g:Sie\|Er} kichert leise an deiner Schulter. „Ein Klopfen auf den Rücken? Wirklich jetzt?“ |
| `dateThemes.closers.sweet.1.choices.0.reply` | Er drückt zärtlich deine Hand. „Von mir aus direkt morgen wieder.“ | {g:Sie\|Er} drückt zärtlich deine Hand. „Von mir aus direkt morgen wieder.“ |
| `dateThemes.closers.sweet.1.choices.1.reply` | {name} bleibt für einen Herzschlag die Luft weg, dann strahlt er den ganzen Heimweg über. | {name} bleibt für einen Herzschlag die Luft weg, dann strahlt {g:sie\|er} den ganzen Heimweg über. |
| `worlds.seaside.dateRounds.0.choices.0.reply` | „Die beste Idee, die du die ganze Woche hattest.“ Er greift nach deiner Hand und rennt los. | „Die beste Idee, die du die ganze Woche hattest.“ {g:Sie\|Er} greift nach deiner Hand und rennt los. |
| `worlds.seaside.dateRounds.0.choices.1.reply` | „Vernünftig. Zu vernünftig. Aber gut.“ Er wartet draußen geduldig auf dich. | „Vernünftig. Zu vernünftig. Aber gut.“ {g:Sie\|Er} wartet draußen geduldig auf dich. |
| `worlds.seaside.dateRounds.1.choices.2.reply` | „Offizieller Wächter der Schuhe. Eine ehrenvolle Aufgabe.“ Er kommt strahlend aus den Wellen. | „Offizieller Wächter der Schuhe. Eine ehrenvolle Aufgabe.“ {g:Sie\|Er} kommt strahlend aus den Wellen. |
| `worlds.moonlit.dateRounds.0.choices.0.reply` | „Man darf Wünsche nicht laut sagen.“ Doch ein zartes Lächeln verrät seine Rührung. | „Man darf Wünsche nicht laut sagen.“ Doch ein zartes Lächeln verrät {g:ihre\|seine} Rührung. |
| `worlds.moonlit.dateRounds.0.choices.2.reply` | „Dann wünsche ich für uns beide mit,“ sagt er sanft. | „Dann wünsche ich für uns beide mit,“ sagt {g:sie\|er} sanft. |
| `worlds.moonlit.dateRounds.1.line` | Nahe {place} flackert eine alte Laterne und erlischt. {name} breitet seinen Umhang für dich aus. | Nahe {place} flackert eine alte Laterne und erlischt. {name} breitet {g:ihren\|seinen} Umhang für dich aus. |
| `worlds.neon.dateRounds.0.line` | Jemand in {place} schaut {name} ungläubig an. „Moment mal... ist das nicht der von NEON TIDE?“ {name} zieht seine Kappe tief ins Gesicht. | Jemand in {place} schaut {name} ungläubig an. „Moment mal... ist das nicht {g:die\|der} von NEON TIDE?“ {name} zieht {g:ihre\|seine} Kappe tief ins Gesicht. |
| `worlds.neon.dateRounds.0.choices.0.reply` | „Mein persönlicher Retter.“ Er lacht erleichtert auf, ohne deine Hand loszulassen. | „Mein persönlicher Retter.“ {g:Sie\|Er} lacht erleichtert auf, ohne deine Hand loszulassen. |
| `worlds.neon.dateRounds.0.choices.2.reply` | „Das gibt gewaltigen Ärger.“ Doch er posiert strahlend an deiner Seite. | „Das gibt gewaltigen Ärger.“ Doch {g:sie\|er} posiert strahlend an deiner Seite. |
| `worlds.neon.dateRounds.1.choices.0.reply` | „Bitte hör auf! Nein, sing weiter.“ Er grinst von einem Ohr zum anderen. | „Bitte hör auf! Nein, sing weiter.“ {g:Sie\|Er} grinst von einem Ohr zum anderen. |
| `worlds.neon.dateRounds.1.choices.1.reply` | „...Ja. Schau mich nicht so an.“ Du starrst ihn mit Absicht an. | „...Ja. Schau mich nicht so an.“ Du starrst {g:sie\|ihn} mit Absicht an. |
| `worlds.neon.dateRounds.1.choices.2.reply` | „Autsch. Das trifft mein Ego tief.“ Er tut gekränkt... fast glaubhaft. | „Autsch. Das trifft mein Ego tief.“ {g:Sie\|Er} tut gekränkt... fast glaubhaft. |
| `worlds.tidepool.dateRounds.0.choices.1.reply` | „Hey!“ Er nippt an deiner Tasse und verzieht das Gesicht. Du lachst auf. | „Hey!“ {g:Sie\|Er} nippt an deiner Tasse und verzieht das Gesicht. Du lachst auf. |
| `worlds.tidepool.dateRounds.0.choices.2.reply` | „Dann geht die nächste Runde auf mich.“ Er notiert es gleich eifrig auf einer Serviette. | „Dann geht die nächste Runde auf mich.“ {g:Sie\|Er} notiert es gleich eifrig auf einer Serviette. |

### Russian (`ru`) — 225 changes

| Path | Before | After |
| :--- | :--- | :--- |
| `datePlaces.ds_rain.rounds.0.choices.0.text` | Притянуть его ближе под зонт. | Притянуть ближе под зонт. |
| `datePlaces.ds_rain.rounds.2.choices.1.text` | Купить и медленно съесть у него на глазах. | Купить и медленно съесть на виду. |
| `datePlaces.ds_rain.rounds.4.choices.1.text` | Обнять его на прощание. | Обнять на прощание. |
| `datePlaces.ds_aquarium.rounds.0.choices.1.text` | Сфотографировать его в мягком сиянии. | Сделать фото в мягком сиянии. |
| `datePlaces.ds_aquarium.rounds.2.choices.0.text` | Вместо этого взять его за руку. | Вместо этого взять за руку. |
| `datePlaces.ds_festival.rounds.0.choices.0.text` | Позволить ему вести тебя. | Позволить вести себя. |
| `datePlaces.ds_festival.rounds.0.choices.1.text` | Переплести свои пальцы с его, чтобы не потеряться. | Крепко держаться за руки, чтобы не потеряться. |
| `datePlaces.ds_festival.rounds.1.choices.0.text` | Выиграть его для него. | Выиграть игрушку в подарок. |
| `datePlaces.ds_festival.rounds.2.choices.0.text` | Взять кота, отдать ему лису. | Взять кота, отдать лису. |
| `datePlaces.ds_festival.rounds.2.choices.1.text` | Надеть обе маски на себя, не оставив ему ничего. | Надеть обе маски на себя, не оставив ничего. |
| `datePlaces.ds_festival.rounds.3.choices.1.text` | Посмотреть ему прямо в глаза. | Посмотреть прямо в глаза. |
| `datePlaces.ds_studio.rounds.3.choices.1.text` | Отдать его ему. | Отдать напиток. |
| `datePlaces.ds_studio.rounds.4.choices.1.text` | Уснуть у него на плече. | Уснуть на плече. |
| `datePlaces.ds_rooftop.rounds.2.choices.1.text` | Отдать ему свою куртку. | Предложить свою куртку. |
| `datePlaces.ds_rooftop.rounds.3.choices.0.text` | Взять его за руку и начать танцевать. | Взять за руку и начать танцевать. |
| `dateThemes.openers.flirty.0.1.text` | Задеть его плечом. | Слегка задеть плечом. |
| `dateThemes.openers.sweet.0.0.text` | Взять его за руку. | Взять за руку. |
| `dateThemes.openers.sweet.0.1.text` | «Я так рад, что это именно ты». | «Как хорошо, что это именно ты». |
| `dateThemes.openers.sweet.1.0.text` | Положить голову ему на плечо. | Положить голову на плечо. |
| `dateThemes.shared.1.choices.0.text` | Отдать ему свой последний снек. | Отдать свой последний снек. |
| `dateThemes.shared.4.choices.0.text` | «Спроси у него». | «Спроси лично». |
| `dateThemes.moodRounds.flirty.0.choices.1.text` | Сдуть её в его сторону. | Сдуть ресницу в эту сторону. |
| `dateThemes.moodRounds.flirty.1.choices.0.text` | Сделать глоток из его стаканчика в отместку. | Сделать глоток из стаканчика в отместку. |
| `dateThemes.moodRounds.sweet.0.choices.1.text` | Сделать то же самое для него. | Сделать то же самое в ответ. |
| `dateThemes.closers.friendly.0.choices.1.text` | Дать ему пять. | Дать пять. |
| `dateThemes.closers.friendly.1.choices.1.text` | Проводить его до двери. | Проводить до двери. |
| `dateThemes.closers.sweet.0.choices.0.text` | Обнять его ещё крепче. | Обнять ещё крепче. |
| `dateThemes.closers.sweet.0.choices.2.text` | Похлопать его по спине. | Похлопать по спине. |
| `dateThemes.closers.sweet.1.choices.1.text` | Поцеловать его в щёку. | Поцеловать в щёку. |
| `worlds.moonlit.dateRounds.0.choices.0.text` | Загадать желание вслух за него. | Загадать желание вслух за двоих. |
| `worlds.moonlit.dateRounds.1.choices.0.text` | Разделить его на двоих. | Разделить тепло на двоих. |
| `worlds.neon.dateRounds.0.choices.0.text` | Утащить его в боковой переулок. | Утащить в боковой переулок. |
| `worlds.neon.dateRounds.0.choices.1.text` | «Нет, он просто на него похож». | «Нет, просто похож». |
| `worlds.tidepool.dateRounds.0.choices.1.text` | Поменяться с ним чашками. | Поменяться чашками. |
| `worlds.tidepool.dateRounds.1.choices.1.text` | Отдать ей последний кусочек выпечки. | Отдать собаке последний кусочек выпечки. |
| `worlds.tidepool.dateRounds.1.choices.2.text` | Прогнать её. | Прогнать собаку. |
| `datePlaces.ds_rain.rounds.0.choices.0.reply` | «...Ладно. Так намного лучше». Он и не думает отстраняться. | «...Ладно. Так намного лучше». {g:Она\|Он} и не думает отстраняться. |
| `datePlaces.ds_rain.rounds.0.choices.2.reply` | «Эй! А ну вернись!» — смеётся он, догоняя тебя. | «Эй! А ну вернись!» — {g:смеётся она\|смеётся он}, догоняя тебя. |
| `datePlaces.ds_rain.rounds.1.choices.1.reply` | «Это вызов?» — и он действительно приседает, подставляя спину. | «Это вызов?» — и {g:она\|он} действительно приседает, подставляя спину. |
| `datePlaces.ds_rain.rounds.1.choices.2.reply` | «Разумно», — в его голосе слышится лёгкое разочарование. | «Разумно», — в {g:её\|его} голосе слышится лёгкое разочарование. |
| `datePlaces.ds_rain.rounds.2.choices.1.reply` | «Какая жестокость», — и он всё равно откусывает кусочек. | «Какая жестокость», — и {g:она\|он} всё равно откусывает кусочек. |
| `datePlaces.ds_rain.rounds.2.choices.2.reply` | «...Точно. Полезное». Он в последний раз бросает тоскливый взгляд на витрину. | «...Точно. Полезное». {g:Она\|Он} в последний раз бросает тоскливый взгляд на витрину. |
| `datePlaces.ds_rain.rounds.3.choices.0.reply` | Он отводит взгляд, тепло улыбаясь отражению в окне. | {g:Она\|Он} отводит взгляд, тепло улыбаясь отражению в окне. |
| `datePlaces.ds_rain.rounds.3.choices.1.reply` | «Не спеша — это здорово, — соглашается он. — Особенно с тобой». | «Не спеша — это здорово, — {g:соглашается она\|соглашается он}. — Особенно с тобой». |
| `datePlaces.ds_rain.rounds.4.choices.1.reply` | Он задерживает объятие на секунду дольше ожидаемого. | {g:Она\|Он} задерживает объятие на секунду дольше ожидаемого. |
| `datePlaces.ds_aquarium.rounds.0.choices.0.reply` | Он подходит. Его плечо касается твоего. | {g:Она подходит\|Он подходит}. {g:Её\|Его} плечо касается твоего. |
| `datePlaces.ds_aquarium.rounds.1.choices.2.reply` | «Знаешь, что во сне они держатся за лапки? — спрашивает он. — Вот теперь знаешь». | «Знаешь, что во сне они держатся за лапки? — {g:спрашивает она\|спрашивает он}. — Вот теперь знаешь». |
| `datePlaces.ds_aquarium.rounds.2.choices.0.reply` | «...Для безопасности», — бормочет он. И не отпускает руку даже на выходе из туннеля. | «...Для безопасности», — {g:бормочет она\|бормочет он}. И не отпускает руку даже на выходе из туннеля. |
| `datePlaces.ds_aquarium.rounds.2.choices.2.reply` | «Спасибо, профессор», — и он смущённо отпускает руку. | «Спасибо, профессор», — и {g:она\|он} смущённо отпускает руку. |
| `datePlaces.ds_aquarium.rounds.3.choices.1.reply` | «Почему именно её?» — «Ей нужна любовь». Он молча идёт к кассе. | «Почему именно её?» — «Ей нужна любовь». {g:Она\|Он} молча идёт к кассе. |
| `datePlaces.ds_aquarium.rounds.3.choices.2.reply` | «Никому не нужна рыбка». Он ставит их обратно на полку. | «Никому не нужна рыбка». {g:Она\|Он} ставит их обратно на полку. |
| `datePlaces.ds_festival.rounds.0.choices.1.reply` | «Отличная идея», — отвечает он чуть быстрее обычного. | «Отличная идея», — {g:отвечает она\|отвечает он} чуть быстрее обычного. |
| `datePlaces.ds_festival.rounds.0.choices.2.reply` | Он сбавляет шаг. В основном. | {g:Она\|Он} сбавляет шаг. В основном. |
| `datePlaces.ds_festival.rounds.1.choices.0.reply` | Третье кольцо точно в цель. Медведь оказывается выше, чем {name}, и он наотрез отказывается нести его в одиночку. | Третье кольцо точно в цель. Медведь оказывается выше, чем {name}, и {g:она\|он} наотрез отказывается нести его в одиночку. |
| `datePlaces.ds_festival.rounds.1.choices.1.reply` | Он снова промахивается, но широко и искренне улыбается. | {g:Она\|Он} снова промахивается, но широко и искренне улыбается. |
| `datePlaces.ds_festival.rounds.2.choices.1.reply` | «Ты просто монстр». И он делает пять кадров подряд. | «Ты просто монстр». И {g:она\|он} делает пять кадров подряд. |
| `datePlaces.ds_festival.rounds.3.choices.2.reply` | Он наклоняется прямо в кадр и машет рукой. | {g:Она\|Он} наклоняется прямо в кадр и машет рукой. |
| `datePlaces.ds_festival.rounds.4.choices.0.reply` | Он дважды сжимает твою ладонь. | {g:Она\|Он} дважды сжимает твою ладонь. |
| `datePlaces.ds_studio.rounds.0.line` | Тихая студия далеко за полночь. {name} протягивает тебе наушники: «Я ещё никому это не включал». | Тихая студия далеко за полночь. {name} протягивает тебе наушники: «Я ещё никому это не {g:включала\|включал}». |
| `datePlaces.ds_studio.rounds.0.choices.0.reply` | Когда ты открываешь глаза, он взволнованно смотрит на тебя. | Когда ты открываешь глаза, {g:она\|он} взволнованно смотрит на тебя. |
| `datePlaces.ds_studio.rounds.1.line` | «Ну как? Только честно». {name} делает вид, что ему всё равно. | «Ну как? Только честно». {name} делает вид, что {g:ей\|ему} всё равно. |
| `datePlaces.ds_studio.rounds.1.choices.0.reply` | «И это хорошо?» — «Это лучшее, что я слышал». | «И это хорошо?» — «Это лучшее, что я {g:слышала\|слышал}». |
| `datePlaces.ds_studio.rounds.1.choices.1.reply` | Он включает трек ещё дважды. Кончики его ушей предательски краснеют. | {g:Она\|Он} включает трек ещё дважды. Кончики {g:её\|его} ушей предательски краснеют. |
| `datePlaces.ds_studio.rounds.2.choices.0.reply` | Он записывает её и пускает фоном под припев. Звучит идеально. | {g:Она\|Он} записывает её и пускает фоном под припев. Звучит идеально. |
| `datePlaces.ds_studio.rounds.2.choices.1.reply` | Он смеётся так сильно, что приходится остановить запись. | {g:Она\|Он} смеётся так сильно, что приходится остановить запись. |
| `datePlaces.ds_studio.rounds.2.choices.2.reply` | «Тогда в следующий раз. Я записал это обещание». | «Тогда в следующий раз. Я {g:записала\|записал} это обещание». |
| `datePlaces.ds_studio.rounds.3.choices.2.reply` | «Ещё десять минуточек», — повторяет он уже в третий раз. | «Ещё десять минуточек», — {g:повторяет она\|повторяет он} уже в третий раз. |
| `datePlaces.ds_studio.rounds.4.choices.1.reply` | Он боится шелохнуться целый час. | {g:Она\|Он} боится шелохнуться целый час. |
| `datePlaces.ds_rooftop.rounds.0.line` | Огни города слишком яркие, звёзд почти не видно. Но {name} всё равно расстелил плед: «Я хотел показать тебе небо. Но оно подвело». | Огни города слишком яркие, звёзд почти не видно. Но {name} всё равно {g:расстелила\|расстелил} плед: «Я {g:хотела\|хотел} показать тебе небо. Но оно подвело». |
| `datePlaces.ds_rooftop.rounds.0.choices.0.reply` | Он на секунду замирает, затем ложится рядом с тобой. | {g:Она\|Он} на секунду замирает, затем ложится рядом с тобой. |
| `datePlaces.ds_rooftop.rounds.1.choices.0.reply` | Он слушает не перебивая ни разу. «Знаешь, ты всё ещё можешь им стать». | {g:Она\|Он} слушает не перебивая ни разу. «Знаешь, ты всё ещё можешь им стать». |
| `datePlaces.ds_rooftop.rounds.1.choices.2.reply` | «Не самая подходящая ночь для космоса», — смеётся он. | «Не самая подходящая ночь для космоса», — {g:смеётся она\|смеётся он}. |
| `datePlaces.ds_rooftop.rounds.2.choices.0.reply` | «Теплее, — шепчет он. — Намного теплее». | «Теплее, — {g:шепчет она\|шепчет он}. — Намного теплее». |
| `datePlaces.ds_rooftop.rounds.2.choices.1.reply` | Она пахнет тобой, говорит он, и наотрез отказывается её возвращать. | Она пахнет тобой, {g:говорит она\|говорит он}, и наотрез отказывается её возвращать. |
| `datePlaces.ds_rooftop.rounds.3.choices.2.reply` | Он неуклюже танцует один, просто чтобы рассмешить тебя. И у него получается. | {g:Она неуклюже танцует одна\|Он неуклюже танцует один}, просто чтобы рассмешить тебя. И у {g:неё\|него} получается. |
| `datePlaces.ds_rooftop.rounds.4.line` | Музыка затихает. {name} говорит: «Я так рад, что на этой крыше со мной именно ты». | Музыка затихает. {name} говорит: «Я так {g:рада\|рад}, что на этой крыше со мной именно ты». |
| `datePlaces.ds_rooftop.rounds.4.choices.0.reply` | Он прислоняется своим лбом к твоему. | {g:Она\|Он} прислоняется своим лбом к твоему. |
| `datePlaces.ds_rooftop.rounds.4.choices.2.reply` | «Здорово, — повторяет он с улыбкой. — Пусть будет здорово». | «Здорово, — {g:повторяет она\|повторяет он} с улыбкой. — Пусть будет здорово». |
| `dateThemes.openers.friendly.0.1.reply` | «Может быть. Тебе нравится?» — в его взгляде мелькает гордость. | «Может быть. Тебе нравится?» — в {g:её\|его} взгляде мелькает гордость. |
| `dateThemes.openers.friendly.1.1.reply` | {name} фыркает: «Очень смешно». Но сам еле сдерживает смех. | {name} фыркает: «Очень смешно». Но {g:сама еле сдерживает\|сам еле сдерживает} смех. |
| `dateThemes.openers.friendly.1.2.reply` | «Конечно». Он садится рядом, близко, но не нарушая твоих границ. | «Конечно». {g:Она\|Он} садится рядом, близко, но не нарушая твоих границ. |
| `dateThemes.openers.flirty.0.1.reply` | Он мягко толкает в ответ и оставляет своё плечо прижатым к твоему. | {g:Она\|Он} мягко толкает в ответ и оставляет своё плечо прижатым к твоему. |
| `dateThemes.openers.flirty.1.0.reply` | {name} первым отводит глаза, а кончики его ушей предательски краснеют. | {name} {g:первой\|первым} отводит глаза, а кончики {g:её\|его} ушей предательски краснеют. |
| `dateThemes.openers.flirty.1.1.reply` | «Только сегодня?» — он из всех сил пытается спрятать довольную улыбку. | «Только сегодня?» — {g:она\|он} из всех сил пытается спрятать довольную улыбку. |
| `dateThemes.openers.sweet.0.1.reply` | «И я, — тихо отвечает он. — Каждый раз». | «И я, — тихо {g:отвечает она\|отвечает он}. — Каждый раз». |
| `dateThemes.openers.sweet.1.0.reply` | Он замирает и боится пошевелиться, словно ты можешь упорхнуть. | {g:Она\|Он} замирает и боится пошевелиться, словно ты можешь упорхнуть. |
| `dateThemes.openers.sweet.1.2.reply` | «С тобой даже молчать приятно», — говорит он спустя пару минут. | «С тобой даже молчать приятно», — {g:говорит она\|говорит он} спустя пару минут. |
| `dateThemes.shared.1.choices.0.reply` | «Вот это спасение!» — и он проглатывает его в один укус. | «Вот это спасение!» — и {g:она\|он} проглатывает его в один укус. |
| `dateThemes.shared.1.choices.2.reply` | «Это было целых сорок минут назад!» — его лицо выражает вселенскую обиду. | «Это было целых сорок минут назад!» — {g:её\|его} лицо выражает вселенскую обиду. |
| `dateThemes.shared.3.choices.0.reply` | Он так смеётся, что кадр получается смазанным. Но он всё равно его сохраняет. | {g:Она\|Он} так смеётся, что кадр получается смазанным. Но {g:она\|он} всё равно его сохраняет. |
| `dateThemes.shared.5.choices.0.reply` | Он смущённо отводит взгляд и счастливо улыбается в пустоту. | {g:Она\|Он} смущённо отводит взгляд и счастливо улыбается в пустоту. |
| `dateThemes.moodRounds.friendly.0.choices.1.reply` | Он стонет, но всё равно хохочет: «Стыдно, что я над этим смеюсь». | {g:Она\|Он} стонет, но всё равно хохочет: «Стыдно, что я над этим смеюсь». |
| `dateThemes.moodRounds.friendly.0.choices.2.reply` | «Это что, поддавки?» — но напиток он всё равно покупает тебе сам. | «Это что, поддавки?» — но напиток {g:она\|он} всё равно покупает тебе {g:сама\|сам}. |
| `dateThemes.moodRounds.friendly.1.choices.0.reply` | «Да ладно! Твоя победа». Он буквально вытирает слёзы от смеха. | «Да ладно! Твоя победа». {g:Она\|Он} буквально вытирает слёзы от смеха. |
| `dateThemes.moodRounds.friendly.1.choices.2.reply` | «Тогда это и был кошмар. Зато сейчас смешно», — пожимает он плечами с улыбкой. | «Тогда это и был кошмар. Зато сейчас смешно», — {g:пожимает она\|пожимает он} плечами с улыбкой. |
| `dateThemes.moodRounds.flirty.0.choices.1.reply` | «Неужели желание было про меня?» — он самодовольно усмехается. | «Неужели желание было про меня?» — {g:она\|он} самодовольно усмехается. |
| `dateThemes.moodRounds.flirty.0.choices.2.reply` | «Тогда я загадаю за тебя», — говорит он и закрывает глаза. | «Тогда я загадаю за тебя», — {g:говорит она\|говорит он} и закрывает глаза. |
| `dateThemes.moodRounds.flirty.1.choices.1.reply` | {name} слегка давится: «Вовсе нет». Но щёки его вспыхивают румянцем. | {name} слегка давится: «Вовсе нет». Но щёки {g:её\|его} вспыхивают румянцем. |
| `dateThemes.moodRounds.flirty.1.choices.2.reply` | «Ладно-ладно». Он покупает два и один вручает тебе. | «Ладно-ладно». {g:Она\|Он} покупает два и один вручает тебе. |
| `dateThemes.moodRounds.sweet.0.choices.0.reply` | Его рука задерживается у твоей щеки чуть дольше, чем нужно. | {g:Её\|Его} рука задерживается у твоей щеки чуть дольше, чем нужно. |
| `dateThemes.moodRounds.sweet.0.choices.2.reply` | «Я знаю, — мягко говорит он. — Но мне хотелось самому». | «Я знаю, — мягко {g:говорит она\|говорит он}. — Но мне хотелось {g:самой\|самому}». |
| `dateThemes.moodRounds.sweet.1.choices.1.reply` | «Сегодняшний», — не задумываясь отвечает он. | «Сегодняшний», — не задумываясь {g:отвечает она\|отвечает он}. |
| `dateThemes.moodRounds.sweet.1.choices.2.reply` | «Потому что они с тобой», — очень просто говорит он. | «Потому что они с тобой», — очень просто {g:говорит она\|говорит он}. |
| `dateThemes.closers.friendly.0.choices.0.reply` | «Опасно. У меня уже куча идей», — и он тут же начинает строить планы. | «Опасно. У меня уже куча идей», — и {g:она\|он} тут же начинает строить планы. |
| `dateThemes.closers.friendly.0.choices.1.reply` | Он нарочно мажет мимо ладони и вместо этого крепко обнимает тебя. | {g:Она\|Он} нарочно мажет мимо ладони и вместо этого крепко обнимает тебя. |
| `dateThemes.closers.flirty.1.line` | На углу улицы {name} оборачивается: «Напиши, как доберёшься до дома. Чтобы я не волновался». | На углу улицы {name} оборачивается: «Напиши, как доберёшься до дома. Чтобы я не {g:волновалась\|волновался}». |
| `dateThemes.closers.friendly.1.choices.0.reply` | «Какие мы вежливые», — посмеивается он, задевая тебя плечом. | «Какие мы вежливые», — {g:посмеивается она\|посмеивается он}, задевая тебя плечом. |
| `dateThemes.closers.friendly.1.choices.1.reply` | «Не стоило утруждаться», — но ему безумно приятно. | «Не стоило утруждаться», — но {g:ей\|ему} безумно приятно. |
| `dateThemes.closers.friendly.1.choices.2.reply` | «Всего лишь неплохо? Ну, в следующий раз будет идеально», — решительно заявляет он. | «Всего лишь неплохо? Ну, в следующий раз будет идеально», — решительно {g:заявляет она\|заявляет он}. |
| `dateThemes.closers.flirty.0.choices.0.reply` | И он выбирает самый длинный и извилистый маршрут из всех возможных. | И {g:она\|он} выбирает самый длинный и извилистый маршрут из всех возможных. |
| `dateThemes.closers.flirty.0.choices.2.reply` | «До скорого», — повторяет он, словно даёт обещание. | «До скорого», — {g:повторяет она\|повторяет он}, словно даёт обещание. |
| `dateThemes.closers.flirty.1.choices.1.reply` | Ты слышишь, как он тихо смеётся тебе вслед. | Ты слышишь, как {g:она\|он} тихо смеётся тебе вслед. |
| `dateThemes.closers.flirty.1.choices.2.reply` | «Хорошо», — эхом отзывается он и не уходит, пока ты не скроешься из вида. | «Хорошо», — эхом {g:отзывается она\|отзывается он} и не уходит, пока ты не скроешься из вида. |
| `dateThemes.closers.sweet.0.choices.0.reply` | «Постоим так ещё минуточку», — тихо шепчет он. | «Постоим так ещё минуточку», — тихо {g:шепчет она\|шепчет он}. |
| `dateThemes.closers.sweet.0.choices.2.reply` | Он смеётся тебе в плечо: «Это что, дружеское похлопывание?» | {g:Она\|Он} смеётся тебе в плечо: «Это что, дружеское похлопывание?» |
| `dateThemes.closers.sweet.1.line` | {name} долго и пристально смотрит на тебя: «Я бы повторил сегодняшний день. От начала и до конца». | {name} долго и пристально смотрит на тебя: «Я бы {g:повторила\|повторил} сегодняшний день. От начала и до конца». |
| `dateThemes.closers.sweet.1.choices.0.reply` | Он сжимает твою ладонь: «Значит, завтра». | {g:Она\|Он} сжимает твою ладонь: «Значит, завтра». |
| `worlds.seaside.dateRounds.0.choices.0.reply` | «Лучшая твоя идея за всю неделю». Он берёт тебя за руку, и вы срываетесь на бег. | «Лучшая твоя идея за всю неделю». {g:Она\|Он} берёт тебя за руку, и вы срываетесь на бег. |
| `worlds.seaside.dateRounds.0.choices.1.reply` | «Правильный. Занудный. Ладно уж». И он ждёт тебя у входа. | «Правильный. Занудный. Ладно уж». И {g:она\|он} ждёт тебя у входа. |
| `worlds.seaside.dateRounds.1.choices.2.reply` | «Хранитель обуви. Благородная профессия». Он возвращается весь мокрый. | «Хранитель обуви. Благородная профессия». {g:Она возвращается вся мокрая\|Он возвращается весь мокрый}. |
| `worlds.moonlit.dateRounds.0.choices.0.reply` | «Нельзя говорить вслух». Но он всё равно улыбается. | «Нельзя говорить вслух». Но {g:она\|он} всё равно улыбается. |
| `worlds.moonlit.dateRounds.0.choices.2.reply` | «Тогда я загадаю за нас обоих», — произносит он. | «Тогда я загадаю за нас обоих», — {g:произносит она\|произносит он}. |
| `worlds.neon.dateRounds.0.choices.0.reply` | «Мой спаситель», — смеётся он, сбившись с дыхания и крепко сжимая твою руку. | «Мой спаситель», — {g:смеётся она\|смеётся он}, сбившись с дыхания и крепко сжимая твою руку. |
| `worlds.neon.dateRounds.1.choices.0.reply` | «Пожалуйста, прекрати. Нет, продолжай!» — он заливается смехом. | «Пожалуйста, прекрати. Нет, продолжай!» — {g:она\|он} заливается смехом. |
| `worlds.neon.dateRounds.1.choices.2.reply` | «Ого. Ладно. Удар по больному», — делает он вид, что обижен. В основном делает вид. | «Ого. Ладно. Удар по больному», — {g:делает она вид, что обижена\|делает он вид, что обижен}. В основном делает вид. |
| `worlds.tidepool.dateRounds.0.line` | По радио в кафе возле {place} играет старая песня. {name} пододвигает к тебе вторую чашку: «Я заказал для тебя». | По радио в кафе возле {place} играет старая песня. {name} пододвигает к тебе вторую чашку: «Я {g:заказала\|заказал} для тебя». |
| `worlds.tidepool.dateRounds.0.choices.1.reply` | «Эй!» Он делает глоток из твоей чашки и смешно кривится. Ты смеёшься. | «Эй!» {g:Она\|Он} делает глоток из твоей чашки и смешно кривится. Ты смеёшься. |
| `worlds.tidepool.dateRounds.0.choices.2.reply` | «Тогда в следующий раз». И он записывает твоё пожелание на салфетке. | «Тогда в следующий раз». И {g:она\|он} записывает твоё пожелание на салфетке. |
| `voice.reply.greet.3` | Привет. Я как раз надеялся, что это ты. | Привет. Я как раз {g:надеялась\|надеялся}, что это ты. |
| `voice.reply.answer.0` | Честно? Я надеялся, что ты спросишь. | Честно? Я {g:надеялась\|надеялся}, что ты спросишь. |
| `voice.reply.answer.4` | Я буквально только что думал о тебе. До жути точное совпадение. | Я буквально только что {g:думала\|думал} о тебе. До жути точное совпадение. |
| `voice.reply.react.sad.2` | Я надеялся, что ты побудешь со мной подольше. | Я {g:надеялась\|надеялся}, что ты побудешь со мной подольше. |
| `voice.reply.share.Seaside Academy.2` | По дороге назад я шёл мимо моря и думал о тебе. | По дороге назад я {g:шла\|шёл} мимо моря и {g:думала\|думал} о тебе. |
| `voice.reply.share.Moonlit Realm.1` | Я нашёл в библиотеке старую карту. Один угол помечен луной, и никто не может это объяснить. | Я {g:нашла\|нашёл} в библиотеке старую карту. Один угол помечен луной, и никто не может это объяснить. |
| `voice.reply.share.NEON TIDE.1` | Я весь день напевал новую мелодию. Она звучит немного похоже на тебя. | Я весь день {g:напевала\|напевал} новую мелодию. Она звучит немного похоже на тебя. |
| `voice.reply.share.default.0` | Я чуть было не написал тебе раньше, но потом засмущался. | Я чуть было не {g:написала тебе раньше, но потом засмущалась\|написал тебе раньше, но потом засмущался}. |
| `voice.reply.share.default.1` | Утром я услышал песню, которая звучит совсем как ты. | Утром я {g:услышала\|услышал} песню, которая звучит совсем как ты. |
| `voice.reply.recall.ask.0` | Эй, я вспомнил кое-что из твоих слов: "{m}". Это всё ещё так? | Эй, я {g:вспомнила\|вспомнил} кое-что из твоих слов: "{m}". Это всё ещё так? |
| `voice.reply.recall.tell.0` | Я однажды записал о тебе вот это: "{m}". Думаю об этом чаще, чем стоило бы. | Я однажды {g:записала\|записал} о тебе вот это: "{m}". Думаю об этом чаще, чем стоило бы. |
| `voice.reply.nudge.ask.0` | Ау? Я тебя потерял? | Ау? Я тебя {g:потеряла\|потерял}? |
| `voice.chat.missedCall.0` | Не получилось дозвониться... Я просто хотел услышать твой голос хоть на минутку. | Не получилось дозвониться... Я просто {g:хотела\|хотел} услышать твой голос хоть на минутку. |
| `voice.chat.missedCall.1` | Я звонил. Ответа нет. Мне начинать волноваться или просто дела? | Я {g:звонила\|звонил}. Ответа нет. Мне начинать волноваться или просто дела? |
| `voice.chat.morning.2` | Доброе утро! Сегодня точно будет отличный день — я уже всё решил за нас. | Доброе утро! Сегодня точно будет отличный день — я уже всё {g:решила\|решил} за нас. |
| `voice.chat.birthday.0` | С днём рождения, {name}! Я специально поставил будильник, чтобы поздравить тебя первым. | С днём рождения, {name}! Я специально {g:поставила будильник, чтобы поздравить тебя первой\|поставил будильник, чтобы поздравить тебя первым}. |
| `voice.chat.birthday.2` | С днём рождения! Я так рад, что ты есть на этом свете, {name}. Вот и всё. А, ну и торт. | С днём рождения! Я так {g:рада\|рад}, что ты есть на этом свете, {name}. Вот и всё. А, ну и торт. |
| `voice.chat.planAdded.0` | Я увидел это в нашем календаре: {title}, {when}. Ловлю тебя на слове. | Я {g:увидела\|увидел} это в нашем календаре: {title}, {when}. Ловлю тебя на слове. |
| `voice.chat.planAdded.1` | {title}, {when}? Понял. Напоминать и подгонять тебя буду именно я. | {title}, {when}? {g:Поняла\|Понял}. Напоминать и подгонять тебя буду именно я. |
| `voice.chat.planFollowUp.1` | Ну что? {title}. Как оно? Я весь день ждал возможности спросить. | Ну что? {title}. Как оно? Я весь день {g:ждала\|ждал} возможности спросить. |
| `voice.chat.afterDate.warm` | Спасибо за {place}. Я действительно чудесно провёл время. | Спасибо за {place}. Я действительно чудесно {g:провела\|провёл} время. |
| `voice.chat.boardReply.0` | Я нашёл твою записку на доске: "{quote}" Перечитал трижды. Обязательно сохраню её себе. | Я {g:нашла\|нашёл} твою записку на доске: "{quote}" {g:Перечитала\|Перечитал} трижды. Обязательно сохраню её себе. |
| `voice.chat.boardReply.2` | "{quote}" — я увидел это на доске. Скажешь мне это вслух как-нибудь ещё раз? | "{quote}" — я {g:увидела\|увидел} это на доске. Скажешь мне это вслух как-нибудь ещё раз? |
| `voice.group.replies.2.0` | Ха. Я так и знал, что ты это скажешь. | Ха. Я так и {g:знала\|знал}, что ты это скажешь. |
| `voice.group.comebacks.2` | Ты говоришь так только потому, что я прав, {name}. | Ты говоришь так только потому, что я {g:права\|прав}, {name}. |
| `voice.group.joinLines.0` | Всем привет. Я пропустил что-нибудь интересное? | Всем привет. Я {g:пропустила\|пропустил} что-нибудь интересное? |
| `voice.group.joinLines.2` | Так, я успел. Введите меня в курс дела. | Так, я {g:успела\|успел}. Введите меня в курс дела. |
| `voice.group.voiceLines.0` | Я переслушал это дважды. | Я {g:переслушала\|переслушал} это дважды. |
| `voice.temper.comeback.warm.1.0.noQuote` | Эй, всё в порядке? Просто хотел узнать, как ты. | Эй, всё в порядке? Просто {g:хотела\|хотел} узнать, как ты. |
| `voice.temper.comeback.sulky.1.0.withQuote` | Ладно. Не то чтобы я тут сидел и ждал. | Ладно. Не то чтобы я тут {g:сидела и ждала\|сидел и ждал}. |
| `voice.temper.comeback.sulky.1.0.noQuote` | Ладно. Не то чтобы я тут сидел и ждал. | Ладно. Не то чтобы я тут {g:сидела и ждала\|сидел и ждал}. |
| `voice.temper.comeback.sulky.2.0` | …Прошло уже два дня. Не то чтобы я считал. | …Прошло уже два дня. Не то чтобы я {g:считала\|считал}. |
| `voice.temper.comeback.sulky.2.1` | Я вообще-то не собирался писать первым. Но вот он я. Хмф. | Я вообще-то не {g:собиралась писать первой\|собирался писать первым}. Но вот и я. Хмф. |
| `voice.temper.comeback.shy.1.0.withQuote` | Прости, я тебя не отвлекаю…? Просто хотел поздороваться 🙈 | Прости, я тебя не отвлекаю…? Просто {g:хотела\|хотел} поздороваться 🙈 |
| `voice.temper.comeback.shy.1.0.noQuote` | Прости, я тебя не отвлекаю…? Просто хотел поздороваться 🙈 | Прости, я тебя не отвлекаю…? Просто {g:хотела\|хотел} поздороваться 🙈 |
| `voice.temper.comeback.shy.1.1.withQuote` | Я как раз думал о словах "{quote}"… надеюсь, у тебя всё хорошо. | Я как раз {g:думала\|думал} о словах "{quote}"… надеюсь, у тебя всё хорошо. |
| `voice.push.comeback.1.0.noQuote` | Тихий день выдался? Я держал телефон поближе, на всякий случай. | Тихий день выдался? Я {g:держала\|держал} телефон поближе, на всякий случай. |
| `voice.push.comeback.2.0` | Два дня. Я посчитал. Не то чтобы я специально вёл счёт. | Два дня. Я {g:посчитала\|посчитал}. Не то чтобы я специально {g:вела\|вёл} счёт. |
| `voice.push.comeback.3.1` | Ладно, я скучаю по тебе. Вот. Я сказал это первым. | Ладно, я скучаю по тебе. Вот. Я {g:сказала это первой\|сказал это первым}. |
| `voice.push.comeback.14.1` | Последняя попытка, обещаю. Я всё ещё здесь. Это всё, что я хотел сказать. | Последняя попытка, обещаю. Я всё ещё здесь. Это всё, что я {g:хотела\|хотел} сказать. |
| `voice.push.diaryNudge.0` | Я написал о тебе в своём дневнике. Не читай. (Обязательно прочитай.) | Я {g:написала\|написал} о тебе в своём дневнике. Не читай. (Обязательно прочитай.) |
| `voice.push.diaryNudge.2` | Я не мог уснуть, поэтому записал всё о вчерашнем дне. В основном о тебе. | Я не {g:могла\|мог} уснуть, поэтому {g:записала\|записал} всё о вчерашнем дне. В основном о тебе. |
| `voice.threads.night.clingy.0` | Я мог бы говорить с тобой всю ночь напролёт 💕 но тебе нужно выспаться. Спокойной ночи? Я напишу тебе самым первым делом. | Я {g:могла\|мог} бы говорить с тобой всю ночь напролёт 💕 но тебе нужно выспаться. Спокойной ночи? Я напишу тебе самым первым делом. |
| `voice.kin.lines.grandparent.morning.2` | Я проснулся с мыслями о тебе. Хорошего тебе дня. | Я {g:проснулась\|проснулся} с мыслями о тебе. Хорошего тебе дня. |
| `voice.kin.hello.sibling.0` | Наконец-то! Так, введи меня в курс дела. Что я пропустил? | Наконец-то! Так, введи меня в курс дела. Что я {g:пропустила\|пропустил}? |
| `voice.kin.hello.sibling.1` | Значит, теперь я застрял с тобой, да? 😏 Как поживаешь? | Значит, теперь я {g:застряла\|застрял} с тобой, да? 😏 Как поживаешь? |
| `voice.kin.hello.grandparent.1` | Я так рад тебя видеть, солнышко. Ты не мёрзнешь? | Я так {g:рада\|рад} тебя видеть, солнышко. Ты не мёрзнешь? |
| `voice.care.lines.sad.1` | Я всё думал о твоём дне. Стало хоть капельку легче? | Я всё {g:думала\|думал} о твоём дне. Стало хоть капельку легче? |
| `voice.brief.hello.sulky.0` | Утро. Не думай, что я забыл. | Утро. Не думай, что я {g:забыла\|забыл}. |
| `voice.brief.hello.clingy.0` | Доброе утро!! Я всё ждал, когда же ты наконец проснёшься 🥺 | Доброе утро!! Я всё {g:ждала\|ждал}, когда же ты наконец проснёшься 🥺 |
| `voice.week.open.clingy.1` | Я пересчитал все наши дни на этой неделе 🥺 | Я {g:пересчитала\|пересчитал} все наши дни на этой неделе 🥺 |
| `voice.week.open.shy.1` | Я тут думал о нашей неделе… | Я тут {g:думала\|думал} о нашей неделе… |
| `voice.week.close.shy.1` | Я так рад, что это был именно ты… 🙈 | Я так {g:рада\|рад}, что это был именно ты… 🙈 |
| `voice.dayAsk.ask.sulky.0` | От тебя ни слова о том, как прошёл день. Поэтому я спрашиваю сам. 😤 | От тебя ни слова о том, как прошёл день. Поэтому я спрашиваю {g:сама\|сам}. 😤 |
| `voice.dayAsk.ask.clingy.0` | Я думал о тебе весь день напролёт 🥺 Как он прошёл? | Я {g:думала\|думал} о тебе весь день напролёт 🥺 Как он прошёл? |
| `voice.steer.continue.1.0` | Так, погоди. Я ещё не закончил мысль. | Так, погоди. Я ещё не {g:закончила\|закончил} мысль. |
| `voice.steer.continue.3.0` | От тебя ни слова, поэтому я продолжу говорить сам. | От тебя ни слова, поэтому я продолжу говорить {g:сама\|сам}. |
| `voice.steer.continue.4.0` | Так или иначе, на чём я остановился… | Так или иначе, на чём я {g:остановилась\|остановился}… |
| `voice.steer.continue.5.0` | И честно? Я так рад, что ты здесь и слушаешь всё это. | И честно? Я так {g:рада\|рад}, что ты здесь и слушаешь всё это. |
| `voice.steer.skip.later.0.0` | Так, я вернулся. На чём мы остановились? | Так, я {g:вернулась\|вернулся}. На чём мы остановились? |
| `voice.steer.skip.later.1.0` | Это заняло больше времени, чем я думал. | Это заняло больше времени, чем я {g:думала\|думал}. |
| `voice.steer.skip.evening.1.0` | Небо стало оранжевым, пока я не смотрел в окно. | Небо стало оранжевым, пока я не {g:смотрела\|смотрел} в окно. |
| `voice.steer.skip.nextMorning.1.1` | Я уже выпил кофе. А ты? | Я уже {g:выпила\|выпил} кофе. А ты? |
| `voice.steer.skip.week.1.0` | Прошла целая неделя. Я соскучился по этому. | Прошла целая неделя. Я {g:соскучилась\|соскучился} по этому. |
| `voice.streams.replies.3` | Это худшее мнение, которое я слышал за всю эту неделю. | Это худшее мнение, которое я {g:слышала\|слышал} за всю эту неделю. |
| `voice.streams.replies.12` | Назови хоть один раз, когда я был неправ. Всего один. | Назови хоть один раз, когда я {g:была неправа\|был неправ}. Всего один. |
| `voice.streams.replies.13` | Я бы поспорил, но тут твоя правда. | Я бы {g:поспорила\|поспорил}, но тут твоя правда. |
| `voice.streams.replies.14` | Ой, умоляю. Я размышлял об этом гораздо дольше тебя. | Ой, умоляю. Я {g:размышляла\|размышлял} об этом гораздо дольше тебя. |
| `voice.diary.openers.excited.1` | Вчерашний день пролетел как один бесконечный разговор, и я готов повторить всё это сегодня вечером. | Вчерашний день пролетел как один бесконечный разговор, и я {g:готова\|готов} повторить всё это сегодня вечером. |
| `voice.diary.openers.soft.1` | Вчера мы говорили недолго. Но я всё равно думал об этом перед тем, как уснуть. | Вчера мы говорили недолго. Но я всё равно {g:думала\|думал} об этом перед тем, как уснуть. |
| `voice.diary.openers.blue.0` | Тихий и пустой день. Я то и дело проверял, нет ли сообщений от тебя. | Тихий и пустой день. Я то и дело {g:проверяла\|проверял}, нет ли сообщений от тебя. |
| `voice.diary.heavyOpeners.0` | Вчерашний день прозвучал для тебя очень тяжело. Я думаю о тебе с самой секунды, как проснулся. | Вчерашний день прозвучал для тебя очень тяжело. Я думаю о тебе с самой секунды, как {g:проснулась\|проснулся}. |
| `voice.diary.quoteLines.0` | Твои слова: "{quote}" Я перечитывал эту строчку чаще, чем готов признаться вслух. | Твои слова: "{quote}" Я {g:перечитывала\|перечитывал} эту строчку чаще, чем {g:готова\|готов} признаться вслух. |
| `voice.diary.quoteLines.2` | От тебя пришло: "{quote}", а я растерялся и не знал, что ответить, поэтому отвечаю здесь. | От тебя пришло: "{quote}", а я {g:растерялась и не знала\|растерялся и не знал}, что ответить, поэтому отвечаю здесь. |
| `voice.ideas.answers.yes.1` | Вот именно это я и хотел услышать 😊 | Вот именно это я и {g:хотела\|хотел} услышать 😊 |
| `voice.ideas.answers.good.2` | Видишь? Я так и знал. Расскажи мне больше. | Видишь? Я так и {g:знала\|знал}. Расскажи мне больше. |
| `voice.ideas.answers.missed.0` | Я тоже безумно по тебе скучал. Очень сильно. | Я тоже безумно по тебе {g:скучала\|скучал}. Очень сильно. |
| `voice.ideas.answers.better.0` | Фух, слава богу. Я действительно переживал. | Фух, слава богу. Я действительно {g:переживала\|переживал}. |
| `voice.ideas.answers.ask.1` | Всё по-старому. Соскучился по тому, как докучаю тебе. | Всё по-старому. {g:Соскучилась\|Соскучился} по тому, как докучаю тебе. |
| `voice.ideas.answers.wake.0` | Конечно! Я поставил напоминание. Я разбужу тебя, спи крепко 😴 | Конечно! Я {g:поставила\|поставил} напоминание. Я разбужу тебя, спи крепко 😴 |
| `voice.ideas.answers.lead30.0` | Понял, я напишу тебе за 30 минут до начала 📌 | {g:Поняла\|Понял}, я напишу тебе за 30 минут до начала 📌 |
| `voice.ideas.special.day:good.1` | Здорово! Я записал это в твой дневник 📖 Что сделало этот день таким классным? | Здорово! Я {g:записала\|записал} это в твой дневник 📖 Что сделало этот день таким классным? |
| `voice.ideas.special.week:rough.0` | Тогда я рад, что она закончилась. Расскажи мне худшую часть, и оставим её позади? | Тогда я {g:рада\|рад}, что она закончилась. Расскажи мне худшую часть, и оставим её позади? |
| `voice.drafts.voices.gentleStubborn.greeting` | А вот и ты. Я занял тебе место у окна, и нет, я ни за что не пересяду. | А вот и ты. Я {g:заняла\|занял} тебе место у окна, и нет, я ни за что не пересяду. |
| `voice.drafts.voices.flirtsToDodge.reply` | Потому что столько очарования — это уже чересчур, и я запаниковал. Следующий вопрос. | Потому что столько очарования — это уже чересчур, и я {g:запаниковала\|запаниковал}. Следующий вопрос. |
| `voice.drafts.voices.proudLonely.greeting` | Снова здесь. Я вовсе не ждал. Я просто случайно оказался здесь. Целый час назад. | Снова здесь. Я вовсе не {g:ждала\|ждал}. Я просто случайно {g:оказалась\|оказался} здесь. Целый час назад. |
| `voice.drafts.voices.braveForOthers.greeting` | Постой позади меня секунду. ...Ладно, ложная тревога. Привет. Я соскучился. | Постой позади меня секунду. ...Ладно, ложная тревога. Привет. Я {g:соскучилась\|соскучился}. |
| `voice.drafts.voices.plansThenImprovises.greeting` | Я составил подробное расписание на этот вечер. Пунктом номер один было поздороваться. Пункт номер два я забыл. | Я {g:составила\|составил} подробное расписание на этот вечер. Пунктом номер один было поздороваться. Пункт номер два я {g:забыла\|забыл}. |
| `voice.drafts.voices.bluntThenSorry.greeting` | Опаздываешь. ...Прозвучало грубо. На самом деле я очень рад, что ты здесь. | Опаздываешь. ...Прозвучало грубо. На самом деле я очень {g:рада\|рад}, что ты здесь. |
| `voice.drafts.voices.actsCoolCaresLots.greeting` | О. Это ты. Не то чтобы я проверял телефон каждые пять минут или что-то в этом роде. | О. Это ты. Не то чтобы я {g:проверяла\|проверял} телефон каждые пять минут или что-то в этом роде. |
| `voice.drafts.voices.actsCoolCaresLots.reply` | Скучал — слишком громкое слово. Я просто замечал твоё отсутствие. Каждый божий час. | {g:Скучала\|Скучал} — слишком громкое слово. Я просто {g:замечала\|замечал} твоё отсутствие. Каждый божий час. |
| `voice.drafts.voices.toughOutsideKindInside.greeting` | Долго же пришлось ждать. Садись давай, я достал самые вкусные закуски. | Долго же пришлось ждать. Садись давай, я {g:достала\|достал} самые вкусные закуски. |
| `voice.drafts.backstories.0` | Переехал в большой город несколько лет назад с одним чемоданом и планом, который успел поменяться уже дважды. Работает допоздна, держит узкий круг близких и готов впустить в свою жизнь ещё одного важного человека. | {g:Переехала\|Переехал} в большой город несколько лет назад с одним чемоданом и планом, который успел поменяться уже дважды. Работает допоздна, держит узкий круг близких и {g:готова\|готов} впустить в свою жизнь ещё одного важного человека. |
| `voice.drafts.backstories.1` | Вырос в шумной и дружной семье у моря и до сих пор по привычке готовит порции сразу на шестерых. Уехал из дома в погоне за тихой мечтой, а теперь хочет снова разделить эту живую суету с кем-то особенным. | {g:Выросла\|Вырос} в шумной и дружной семье у моря и до сих пор по привычке готовит порции сразу на шестерых. {g:Уехала\|Уехал} из дома в погоне за тихой мечтой, а теперь хочет снова разделить эту живую суету с кем-то особенным. |
| `voice.drafts.backstories.3` | Сменил профессию в том возрасте, когда окружающие говорили, что уже слишком поздно, и ни секунды об этом не пожалел. Искренне интересуется буквально всем вокруг, и в особенности тобой. | {g:Сменила\|Сменил} профессию в том возрасте, когда окружающие говорили, что уже слишком поздно, и ни секунды об этом не {g:пожалела\|пожалел}. Искренне интересуется буквально всем вокруг, и в особенности тобой. |
| `voice.drafts.roleLines.mentor` | Большинство ошибок я уже совершил за тебя, чтобы тебе не пришлось набивать эти шишки самому. | Большинство ошибок я уже {g:совершила\|совершил} за тебя, чтобы тебе не пришлось набивать эти шишки на собственном опыте. |
| `voice.morning.lines.noTime` | Понял! Замечательного дня, расскажешь мне всё вечером 🧡 | {g:Поняла\|Понял}! Замечательного дня, расскажешь мне всё вечером 🧡 |

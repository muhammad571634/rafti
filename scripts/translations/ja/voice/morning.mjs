export const morning = {
  questions: [
    'おはよー、お寝坊さん ☀️ 大事な日？ まず最初に何する予定？',
    'おはよう ☀️ 今日は何から始めるの？',
    '起きて起きてー 🌤️ 今日やらなきゃいけないことひとつ教えて。',
    'おはよ！ 私はもう起きてるよ。君は？ 今日の予定はどんな感じ？'
  ],
  questionWithTimedPlan: '今日は{time}から{title}だね。準備はいい？ まず何からする？',
  questionWithPlan: '今日は{title}があるね！ 最初に何をする予定？',
  lines: {
    offer: '{time}ね、了解。遅れないように{remind}に連絡しよっか？',
    tooLate: '{time}からなの！？ 急がなきゃじゃん 🏃 あとでどうだったか教えてね。',
    saved: '了解 🧡 {remind}に連絡するね。何か朝ご飯食べておきなよ。',
    pickRemind: '何時に連絡すればいい？',
    noThanks: 'オッケー！ いい1日をね、夜に話聞かせて 🧡',
    askTimeGym: 'まずジム行くの！？ めっちゃ偉いじゃん 💪 何時に行くの？',
    askTime: '今日は{activity}なんだね、いいね。何時に出発するの？',
    notSure: '焦らなくていいよ。出かける時に教えてくれたら応援するからね 🧡',
    noTime: 'りょーかい！ いい1日をね、夜に全部教えてね 🧡',
    sleepy: '眠いよねえ 🥺 ちょっとだけベッドで身体起こしてみて。冷たい水で顔洗っておいで、5分後にまた声かけるから。',
    sleepyOk: 'よしっ。5分ね、タイマー計っておくからね ⏱️',
    sleepyMore: 'しょうがないなあ... あと10分だけね。1秒もオマケしないからね 😤',
    checkIn: 'もう起きたー？ 👀 今日すでにやったことひとつ教えて。',
    other: 'いいねえ。素敵な1日を過ごしてね、夜にまたお話ししよ 🧡'
  },
  chips: {
    yes: 'うん、{remind}',
    another: '別の時間',
    no: '大丈夫',
    in30: '30分後',
    notSure: 'わからない',
    okay: 'わかった',
    more: 'あと10分',
    before30: '30分前',
    before10: '10分前'
  },
  activities: {
    Work: '仕事',
    Shift: 'シフト',
    Class: '授業',
    Gym: 'ジム',
    Exam: 'テスト',
    Meeting: '会議',
    Interview: '面接',
    Flight: 'フライト',
    Train: '電車',
    Appointment: '予定'
  }
};

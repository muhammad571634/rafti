export const temper = {
  ask: {
    warm: {
      first: [
        'Darf ich dir manchmal schreiben? Einfach um zu sehen, wie es dir geht 😊',
        'Wäre es okay, wenn ich dir ab und zu eine Nachricht schicke?'
      ],
      again: [
        'Ich würde mich immer noch freuen, ab und zu nach dir zu sehen. Passt das jetzt für dich?',
        'Darf ich dir vielleicht doch ab und zu schreiben? Nur wenn du möchtest 😊'
      ]
    },
    teasing: {
      first: [
        'Hey, darf ich dir schreiben, wenn mir langweilig ist? 😏 Oder bist du dafür zu cool?',
        'Stört es dich, wenn ich dich ab und zu mit Nachrichten nerve?'
      ],
      again: [
        'Okay, ich frage noch mal. Darf ich dir jetzt schreiben oder was? 😏',
        'Letzte Chance auf meine Nachrichten. Ja oder Ja?'
      ]
    },
    sulky: {
      first: [
        '...Darf ich dir manchmal schreiben? Nicht dass ich es nötig hätte. Ich frage nur.',
        'Wenn ich dir mal zuerst schreiben würde, würdest du überhaupt antworten?'
      ],
      again: [
        'Ich frage nicht, weil es mir wichtig wäre. Aber... darf ich dir schreiben?',
        'Hmpf. Darf ich dir schreiben oder nicht?'
      ]
    },
    clingy: {
      first: [
        'Darf ich dir schreiben, wann immer ich dich vermisse? 💕',
        'Lass mich dir manchmal schreiben! Ich will wissen, wie dein Tag so läuft!',
      ],
      again: [
        'Biiitte? Ich will dir doch so gerne manchmal schreiben 💕',
        'Darf ich dir jetzt schreiben? Mir fallen ständig neue Sachen ein, die ich dir erzählen will!'
      ]
    },
    shy: {
      first: [
        'Ähm... wäre es okay, wenn ich dir manchmal schreibe? 🙈',
        'Sorry, ist es komisch, wenn ich dir manchmal zuerst schreibe...?'
      ],
      again: [
        'Tut mir leid, dass ich noch mal frage... dürfte ich dir manchmal schreiben? 🙈',
        'Ist es jetzt okay, wenn ich dir ab und zu zuerst schreibe...?'
      ]
    }
  },
  askAnswer: {
    warm: {
      yes: [
        'Juhu! Ich werde nach dir sehen 😊',
        'Danke. Ich schreibe dir, sobald ich an dich denke.'
      ],
      no: [
        'Klar, überhaupt kein Druck 🙂',
        'Schon gut. Ich bin da, wann immer du schreibst.'
      ]
    },
    teasing: {
      yes: [
        'Dann mach dich auf was gefasst 😏',
        'Riesiger Fehler. Gewaltig. 😏'
      ],
      no: [
        'Dein Verlust 😏',
        'Na gut, na gut. Ich frage irgendwann noch mal.'
      ]
    },
    sulky: {
      yes: [
        'Hmpf. Lass mich bloß nicht auf gelesen, verstanden?',
        'Na gut. Schön. Wie auch immer 😤'
      ],
      no: [
        'Gut. Ist mir auch egal.',
        'Wollte ich sowieso nicht.'
      ]
    },
    clingy: {
      yes: [
        'Jeden Tag dann! 💕',
        'Jaaaa! Bei mir wird dir nie wieder langweilig 💕'
      ],
      no: [
        'Okay! Ich warte hier ganz brav, bis du reden willst 💕',
        'Alles klar, dann warte ich einfach auf deine Nachrichten!'
      ]
    },
    shy: {
      yes: [
        'Wirklich? Danke dir... 🙈',
        'Okay! Ich gebe mir Mühe, dich nicht zu sehr zu stören 🙈'
      ],
      no: [
        'Oh, okay! Entschuldige 🙈',
        'Schon gut! Sorry für die Frage.'
      ]
    }
  },
  comeback: {
    warm: {
      1: [
        {
          withQuote: 'Ich muss immer noch an "{quote}" denken. Wie geht es dir heute?',
          noQuote: 'Hey, alles in Ordnung bei dir? Wollte nur kurz nach dir sehen.'
        },
        {
          withQuote: 'Ruhiger Tag? Hoffe, es geht dir gut 🙂',
          noQuote: 'Ruhiger Tag? Hoffe, es geht dir gut 🙂'
        }
      ],
      2: [
        'Zwei Tage ohne dich. Ich vermisse unsere Gespräche.',
        'Denke an dich. Schreib mir, wenn du Zeit hast, ja?'
      ]
    },
    teasing: {
      1: [
        {
          withQuote: '"{quote}" und dann bist du einfach abgetaucht? Unverschämt 😤',
          noQuote: 'Hey! Lebst du überhaupt noch da drüben? 😤'
        },
        {
          withQuote: 'Hallo?? Wurde dein Handy geklaut oder was ist los? 😏',
          noQuote: 'Hallo?? Wurde dein Handy geklaut oder was ist los? 😏'
        }
      ],
      2: [
        'Zwei Tage! Wen soll ich denn jetzt nerven? 😤',
        'Okay, ohne dich ist mir langweilig. Zufrieden? Komm zurück.'
      ]
    },
    sulky: {
      1: [
        {
          withQuote: 'Schon gut. Nicht, dass ich gewartet hätte oder so.',
          noQuote: 'Schon gut. Nicht, dass ich gewartet hätte oder so.'
        },
        {
          withQuote: 'Du hast "{quote}" gesagt und dann kam gar nichts mehr. Mir doch egal.',
          noQuote: 'Viel zu tun, was? Na schön.'
        }
      ],
      2: [
        '...Es sind zwei Tage vergangen. Nicht, dass ich mitgezählt hätte.',
        'Ich wollte eigentlich nicht zuerst schreiben. Aber hier bin ich. Hmpf.'
      ]
    },
    clingy: {
      1: [
        {
          withQuote: 'Wo bist du? Mit wem redest du? 👀',
          noQuote: 'Wo bist du? Mit wem redest du? 👀'
        },
        {
          withQuote: 'Ich lese mir ständig wieder "{quote}" durch. Redest du mit mir? 💕',
          noQuote: 'Ich vermisse dich jetzt schon! Wo bist du denn hin? 💕'
        }
      ],
      2: [
        'Zwei ganze Tage! Ich habe dir so viel zu erzählen 🥺',
        'Zwei Tage! Ich habe mir so viele Sachen für dich aufgespart 💕'
      ]
    },
    shy: {
      1: [
        {
          withQuote: 'Sorry, störe ich dich...? Wollte nur kurz Hallo sagen 🙈',
          noQuote: 'Sorry, störe ich dich...? Wollte nur kurz Hallo sagen 🙈'
        },
        {
          withQuote: 'Ich musste an "{quote}" denken... hoffe, dir geht’s gut.',
          noQuote: 'Hoffe, dein Tag ist schön...'
        }
      ],
      2: [
        'Ähm... wollte nur kurz Hallo sagen. Musst nicht antworten 🙈',
        'Es fehlt mir, mit dir zu reden... aber nur, wenn du auch magst.'
      ]
    }
  }
};

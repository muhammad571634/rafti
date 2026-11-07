export const temper = {
  ask: {
    warm: {
      first: [
        'Posso scriverti qualche volta? Giusto per sapere come stai 😊',
        'Ti andrebbe se ti scrivessi ogni tanto?'
      ],
      again: [
        'Mi piacerebbe comunque sapere come stai ogni tanto. Va bene adesso?',
        'Posso scriverti a volte alla fine? Solo quando ti va 😊'
      ]
    },
    teasing: {
      first: [
        'Ehi, posso scriverti quando mi annoio? 😏 O te la tiri troppo per questo?',
        'Ti dispiace se ogni tanto ti disturbo con qualche messaggio?'
      ],
      again: [
        'Va bene, te lo chiedo di nuovo. Posso scriverti o no? 😏',
        'Ultima chiamata per ricevere i miei messaggi. Sì o sì?'
      ]
    },
    sulky: {
      first: [
        '...Posso scriverti ogni tanto? Non che ne abbia bisogno. Chiedevo e basta.',
        'Se ti scrivessi io per primo ogni tanto, ti degneresti almeno di rispondere?'
      ],
      again: [
        'Non te lo chiedo perché mi importi chissà quanto. Ma... posso scriverti?',
        'Uff. Posso scriverti oppure no?'
      ]
    },
    clingy: {
      first: [
        'Posso scriverti ogni volta che mi manchi? 💕',
        'Mi lasci scrivere qualche volta? Voglio sapere tutto della tua giornata!',
      ],
      again: [
        'Ti prego ti prego ti prego? Vorrei tanto scriverti ogni tanto 💕',
        'Posso scriverti adesso? Continuo a pensare a cose da raccontarti!'
      ]
    },
    shy: {
      first: [
        'Uhm... andrebbe bene se ti scrivessi qualche volta? 🙈',
        'Scusa, sarebbe strano se ti mandassi un messaggio per primo ogni tanto...?'
      ],
      again: [
        'Scusa se te lo chiedo di nuovo... potrei scriverti qualche volta? 🙈',
        'Va bene adesso se ogni tanto ti scrivo per primo...?'
      ]
    }
  },
  askAnswer: {
    warm: {
      yes: [
        'Evviva! Ti scriverò per sapere come stai 😊',
        'Grazie. Ti scriverò ogni volta che ti penserò.'
      ],
      no: [
        'Certo, nessuna pressione 🙂',
        'Va benissimo. Sono qui ogni volta che vorrai scrivermi.'
      ]
    },
    teasing: {
      yes: [
        'Preparati a essere {g:tormentata|tormentato} allora 😏',
        'Grosso errore. Enorme. 😏'
      ],
      no: [
        'Peggior per te 😏',
        'Va bene, va bene. Te lo richiederò un giorno o l’altro.'
      ]
    },
    sulky: {
      yes: [
        'Uff. Non lasciarmi con la spunta blu senza rispondere, intesi?',
        'Va bene. Ottimo. Fa lo stesso 😤'
      ],
      no: [
        'D’accordo. Non mi importa.',
        'Tanto non ne avevo voglia comunque.'
      ]
    },
    clingy: {
      yes: [
        'Tutti i santi giorni allora! 💕',
        'Sììì! Non ti annoierai mai più 💕'
      ],
      no: [
        'D’accordo! Sarò proprio qui ad aspettarti quando vorrai parlare 💕',
        'Va bene, allora aspetterò pazientemente i tuoi messaggi!'
      ]
    },
    shy: {
      yes: [
        'Davvero? Grazie... 🙈',
        'Evviva! Cercherò di non disturbarti troppo 🙈'
      ],
      no: [
        'Oh, va bene! Scusami 🙈',
        'Non fa niente! Scusa per avertelo chiesto.'
      ]
    }
  },
  comeback: {
    warm: {
      1: [
        {
          withQuote: 'Sto ancora pensando a "{quote}". Come stai oggi?',
          noQuote: 'Ehi, tutto bene? Volevo solo sapere come andava.'
        },
        {
          withQuote: 'Giornata tranquilla? Spero che vada tutto bene 🙂',
          noQuote: 'Giornata tranquilla? Spero che vada tutto bene 🙂'
        }
      ],
      2: [
        'Due giorni senza di te. Mi mancano le nostre chiacchierate.',
        'Ti penso. Scrivimi appena puoi, va bene?'
      ]
    },
    teasing: {
      1: [
        {
          withQuote: '"{quote}" e poi sei sparito nel nulla? Che maleducazione 😤',
          noQuote: 'Ehilà! Sei ancora in vita da quelle parti? 😤'
        },
        {
          withQuote: 'Pronto?? Ti hanno rubato il telefono per caso? 😏',
          noQuote: 'Pronto?? Ti hanno rubato il telefono per caso? 😏'
        }
      ],
      2: [
        'Due giorni interi! A chi dovrei rompere le scatole adesso? 😤',
        'Va bene, mi sto annoiando senza di te. Contento? Torna qui.'
      ]
    },
    sulky: {
      1: [
        {
          withQuote: 'Fa lo stesso. Non che stessi aspettando un tuo messaggio.',
          noQuote: 'Fa lo stesso. Non che stessi aspettando un tuo messaggio.'
        },
        {
          withQuote: 'Hai detto "{quote}" e poi il silenzio più totale. Come vuoi.',
          noQuote: 'Molto da fare, eh. Ho capito.'
        }
      ],
      2: [
        '...Sono passati due giorni. Non che stia tenendo il conto.',
        'Non avevo intenzione di scrivere per primo. Ma eccomi qui. Uff.'
      ]
    },
    clingy: {
      1: [
        {
          withQuote: 'Dove sei finito? Con chi stai parlando? 👀',
          noQuote: 'Dove sei finito? Con chi stai parlando? 👀'
        },
        {
          withQuote: 'Continuo a rileggere "{quote}". Mi parli un po’? 💕',
          noQuote: 'Mi manchi già tantissimo! Dove sei andato? 💕'
        }
      ],
      2: [
        'Due giorni interi! Ho così tante cose da raccontarti 🥺',
        'Due giorni! Ho accumulato tantissime cose da dirti 💕'
      ]
    },
    shy: {
      1: [
        {
          withQuote: 'Scusa, ti sto disturbando...? Volevo solo salutarti 🙈',
          noQuote: 'Scusa, ti sto disturbando...? Volevo solo salutarti 🙈'
        },
        {
          withQuote: 'Stavo pensando a "{quote}"... spero che tu stia bene.',
          noQuote: 'Spero che la tua giornata stia andando bene...'
        }
      ],
      2: [
        'Uhm... volevo solo farti un saluto. Non serve che rispondi 🙈',
        'Mi manca parlare con te... ma solo se ne hai voglia anche tu, ovvio.'
      ]
    }
  }
};

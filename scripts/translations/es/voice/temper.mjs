export const temper = {
  ask: {
    warm: {
      first: [
        '¿Puedo escribirte a veces? Solo para ver cómo estás 😊',
        '¿Estaría bien si te escribo de vez en cuando?'
      ],
      again: [
        'Me encantaría saber de ti de vez en cuando. ¿Te parece bien ahora?',
        '¿Al final puedo escribirte a veces? Solo cuando tú quieras 😊'
      ]
    },
    teasing: {
      first: [
        'Oye, ¿te puedo escribir cuando me aburra? 😏 ¿O tienes demasiado estilo para eso?',
        '¿Te molesta si te fastidio con mensajes a veces?'
      ],
      again: [
        'Bueno, pregunto otra vez. ¿Te puedo escribir o qué? 😏',
        'Última oportunidad para recibir mis mensajes. ¿Sí o sí?'
      ]
    },
    sulky: {
      first: [
        '...¿Puedo escribirte a veces? No es que lo necesite. Solo preguntaba.',
        'Si te escribiera primero alguna vez, ¿responderías siquiera?'
      ],
      again: [
        'No pregunto porque me importe. Pero... ¿puedo escribirte?',
        'Mjm. ¿Puedo escribirte o no?'
      ]
    },
    clingy: {
      first: [
        '¿Puedo escribirte cada vez que te extrañe? 💕',
        '¿Me dejas escribirte a veces? ¡Quiero saber cómo va tu día!'
      ],
      again: [
        '¿Por favorcito? Quiero escribirte a veces 💕',
        '¿Te puedo escribir ya? ¡Se me ocurren tantas cosas para contarte!'
      ]
    },
    shy: {
      first: [
        'Um... ¿estaría bien si te escribo a veces? 🙈',
        'Perdón, ¿sería raro si te mando un mensaje primero a veces...?'
      ],
      again: [
        'Perdón por preguntar otra vez... ¿podría escribirte a veces? 🙈',
        '¿Estaría bien si te escribo primero de vez en cuando...?'
      ]
    }
  },
  askAnswer: {
    warm: {
      yes: [
        '¡Yei! Te escribiré para ver cómo estás 😊',
        'Gracias. Te escribiré cuando piense en ti.'
      ],
      no: [
        'Por supuesto, sin presiones 🙂',
        'No pasa nada. Aquí estaré cuando quieras escribir.'
      ]
    },
    teasing: {
      yes: [
        'Prepárate para que te fastidie entonces 😏',
        'Grave error. Gravísimo. 😏'
      ],
      no: [
        'Tú te lo pierdes 😏',
        'Vale, vale. Volveré a preguntar algún día.'
      ]
    },
    sulky: {
      yes: [
        'Mjm. No me dejes en visto, ¿eh?',
        'Bueno. Bien. Como sea 😤'
      ],
      no: [
        'Está bien. Como quieras.',
        'Tampoco tenía tantas ganas.'
      ]
    },
    clingy: {
      yes: [
        '¡Todos los días entonces! 💕',
        '¡Siii! ¡Ya no volverás a aburrirte! 💕'
      ],
      no: [
        '¡De acuerdo! Estaré aquí mismito cuando quieras hablar 💕',
        'Bueno, ¡esperaré a que me escribas tú entonces!'
      ]
    },
    shy: {
      yes: [
        '¿En serio? Muchas gracias... 🙈',
        '¡Vale! Trataré de no molestarte demasiado 🙈'
      ],
      no: [
        '¡Ah, de acuerdo! Perdón 🙈',
        '¡No pasa nada! Disculpa por preguntar.'
      ]
    }
  },
  comeback: {
    warm: {
      1: [
        {
          withQuote: 'Sigo pensando en "{quote}"... ¿Cómo estás hoy?',
          noQuote: 'Hola, ¿está todo bien? Solo pasaba a ver cómo estás.'
        },
        {
          withQuote: '¿Día tranquilo? Espero que estés bien 🙂',
          noQuote: '¿Día tranquilo? Espero que estés bien 🙂'
        }
      ],
      2: [
        '¡Han pasado dos días! Espero que todo esté bien.',
        'Dos días enteros. Se te extraña por aquí.'
      ]
    },
    teasing: {
      1: [
        {
          withQuote: '¿"{quote}" y luego desapareces? Qué grosería 😤',
          noQuote: '¡Oye! ¿Sigues con vida por allá? 😤'
        },
        {
          withQuote: '¡¡¿Hola?!! ¿Te robaron el teléfono o qué? 😏',
          noQuote: '¡¡¿Hola?!! ¿Te robaron el teléfono o qué? 😏'
        }
      ],
      2: [
        '¡Dos días! ¿A quién tengo que fastidiar ahora? 😤',
        'Vale, me aburro sin ti. ¿Feliz? Ya vuelve.'
      ]
    },
    sulky: {
      1: [
        {
          withQuote: 'Bien. Tampoco es que estuviera esperando ni nada.',
          noQuote: 'Bien. Tampoco es que estuviera esperando ni nada.'
        },
        {
          withQuote: 'Dijiste "{quote}" y luego nada. Como sea.',
          noQuote: 'Mucho trabajo, ¿eh? Está bien.'
        }
      ],
      2: [
        '...Han pasado dos días. No es que los haya contado.',
        'No pensaba escribir primero. Pero aquí estoy. Mjm.'
      ]
    },
    clingy: {
      1: [
        {
          withQuote: '¿Dónde estás? ¿Con quién estás hablando? 👀',
          noQuote: '¿Dónde estás? ¿Con quién estás hablando? 👀'
        },
        {
          withQuote: 'No dejo de releer "{quote}". ¿Hablamos? 💕',
          noQuote: '¡Ya te extraño! ¿A dónde fuiste? 💕'
        }
      ],
      2: [
        '¡Dos días enteros! Tengo tantísimo que contarte 🥺',
        '¡Dos días! Guardé tantas cosas para decirte 💕'
      ]
    },
    shy: {
      1: [
        {
          withQuote: 'Perdón, ¿estoy molestando...? Solo quería saludar 🙈',
          noQuote: 'Perdón, ¿estoy molestando...? Solo quería saludar 🙈'
        },
        {
          withQuote: 'Estaba pensando en "{quote}"... ojalá estés bien.',
          noQuote: 'Ojalá tu día vaya bien...'
        }
      ],
      2: [
        'Um... solo pasaba a saludar. No tienes que responder 🙈',
        'Extraño hablar contigo... aunque solo si tú quieres.'
      ]
    }
  }
};

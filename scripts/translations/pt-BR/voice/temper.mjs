export const temper = {
  ask: {
    warm: {
      first: [
        'Posso te mandar mensagem às vezes? Só para saber como você está 😊',
        'Tudo bem se eu te escrever de vez em quando?'
      ],
      again: [
        'Ainda adoraria saber de você de vez em quando. Tudo bem agora?',
        'No fim das contas, posso te mandar mensagem de vez em quando? Só quando você quiser 😊'
      ]
    },
    teasing: {
      first: [
        'Ei, posso te mandar mensagem quando eu estiver no tédio? 😏 Ou você tem estilo demais para isso?',
        'Se importa se eu te perturbar com mensagens de vez em quando?'
      ],
      again: [
        'Beleza, perguntando de novo. Posso te mandar mensagem ou o quê? 😏',
        'Última chance de receber minhas mensagens. Sim ou sim?'
      ]
    },
    sulky: {
      first: [
        '...Posso te mandar mensagem às vezes? Não que eu precise. Só perguntando.',
        'Se eu te mandasse mensagem primeiro alguma vez, você pelo menos responderia?'
      ],
      again: [
        'Não tô perguntando porque me importo. Mas... posso te mandar mensagem?',
        'Hum. Posso te escrever ou não?'
      ]
    },
    clingy: {
      first: [
        'Posso te mandar mensagem toda vez que eu sentir saudade? 💕',
        'Deixa eu te mandar mensagem às vezes? Quero saber de tudo do seu dia!'
      ],
      again: [
        'Por favooor? Quero muito te mandar mensagem às vezes 💕',
        'Já posso te mandar mensagem? Fico pensando em tantas coisas para te contar!'
      ]
    },
    shy: {
      first: [
        'Hum... tudo bem se eu te mandar mensagem às vezes? 🙈',
        'Desculpa, seria estranho se eu te mandasse mensagem primeiro às vezes...?'
      ],
      again: [
        'Desculpa perguntar de novo... eu poderia te mandar mensagem às vezes? 🙈',
        'Tudo bem se eu te mandar mensagem primeiro de vez em quando...?'
      ]
    }
  },
  askAnswer: {
    warm: {
      yes: [
        'Eba! Vou te mandar mensagem para ver como você tá 😊',
        'Obrigado. Vou te escrever quando pensar em você.'
      ],
      no: [
        'Claro, sem pressão nenhuma 🙂',
        'Tudo bem. Estarei aqui sempre que você mandar mensagem.'
      ]
    },
    teasing: {
      yes: [
        'Então se prepara para ser {g:perturbada|perturbado} 😏',
        'Grande erro. Erro gigantesco. 😏'
      ],
      no: [
        'Você que sai perdendo 😏',
        'Tá bom, tá bom. Pergunto de novo outro dia.'
      ]
    },
    sulky: {
      yes: [
        'Hum. Não vai me deixar no vácuo, viu?',
        'Tá bom. Que bom. Tanto faz 😤'
      ],
      no: [
        'Tá bom. Tanto faz.',
        'Nem queria mesmo.'
      ]
    },
    clingy: {
      yes: [
        'Todo dia então! 💕',
        'Aeee! Você nunca mais vai ficar no tédio 💕'
      ],
      no: [
        'Tudo bem! Vou ficar bem aqui esperando você querer conversar 💕',
        'Tá bom, vou só esperar pelas suas mensagens então!'
      ]
    },
    shy: {
      yes: [
        'Sério? {g:Obrigada|Obrigado}... 🙈',
        'Oba! Vou tentar não incomodar muito 🙈'
      ],
      no: [
        'Ah, tá bom! Desculpa 🙈',
        'Sem problemas! Desculpa por perguntar.'
      ]
    }
  },
  comeback: {
    warm: {
      1: [
        {
          withQuote: 'Ainda pensando em "{quote}". Como você está hoje?',
          noQuote: 'Ei, está tudo bem? Só passando para ver como você tá.'
        },
        {
          withQuote: 'Dia tranquilo? Espero que você esteja bem 🙂',
          noQuote: 'Dia tranquilo? Espero que você esteja bem 🙂'
        }
      ],
      2: [
        'Dois dias sem você. Sinto falta das nossas conversas.',
        'Pensando em você. Manda mensagem quando puder, tá?'
      ]
    },
    teasing: {
      1: [
        {
          withQuote: '"{quote}" e aí você sumiu? Que feio 😤',
          noQuote: 'Ei! Ainda com vida por aí? 😤'
        },
        {
          "withQuote": "Alô?? Seu celular foi roubado ou o quê? 😏",
          "noQuote": "Alô?? Seu celular foi roubado ou o quê? 😏"
        }
      ],
      2: [
        'Dois dias! Quem é que eu vou perturbar agora? 😤',
        'Tá bom, tô no tédio sem você. Feliz? Volta aqui.'
      ]
    },
    sulky: {
      1: [
        {
          withQuote: 'Tá bom. Não é como se eu estivesse esperando nem nada.',
          noQuote: 'Tá bom. Não é como se eu estivesse esperando nem nada.'
        },
        {
          withQuote: 'Você disse "{quote}" e depois sumiu. Tanto faz.',
          noQuote: '{g:Ocupada|Ocupado}, né. Tá bom.'
        }
      ],
      2: [
        '...Faz dois dias. Não que eu estivesse contando.',
        'Eu não ia mandar mensagem primeiro. Mas aqui estou eu. Hum.'
      ]
    },
    clingy: {
      1: [
        {
          withQuote: 'Cadê você? Com quem você tá conversando? 👀',
          noQuote: 'Cadê você? Com quem você tá conversando? 👀'
        },
        {
          withQuote: 'Fico relendo "{quote}". Fala comigo? 💕',
          noQuote: 'Já tô com saudade! Pra onde você foi? 💕'
        }
      ],
      2: [
        'Dois dias inteirinhos! Tenho tanta coisa pra te contar 🥺',
        'Dois dias! Guardei tantas coisas pra te contar 💕'
      ]
    },
    shy: {
      1: [
        {
          withQuote: 'Desculpa, tô incomodando...? Só queria dar um oi 🙈',
          noQuote: 'Desculpa, tô incomodando...? Só queria dar um oi 🙈'
        },
        {
          withQuote: 'Fiquei pensando em "{quote}"... espero que você esteja bem.',
          noQuote: 'Espero que seu dia esteja sendo bom...'
        }
      ],
      2: [
        'Hum... só dando um oi. Não precisa responder 🙈',
        'Sinto falta de conversar com você... mas só se você quiser, claro.'
      ]
    }
  }
};

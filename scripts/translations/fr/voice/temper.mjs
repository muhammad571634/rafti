export const temper = {
  ask: {
    warm: {
      first: [
        'Je peux t’écrire de temps en temps ? Juste pour prendre de tes nouvelles 😊',
        'Ça ne te dérangerait pas si je t’écrivais de temps à autre ?'
      ],
      again: [
        'J’aimerais toujours avoir de tes nouvelles de temps en temps. C’est d’accord maintenant ?',
        'Je peux t’écrire parfois finalement ? Seulement quand tu veux 😊'
      ]
    },
    teasing: {
      first: [
        'Dis, je peux t’écrire quand je m’ennuie ? 😏 Ou tu es trop inaccessible pour ça ?',
        'Ça t’embête si je viens t’embêter avec des messages parfois ?'
      ],
      again: [
        'Bon, je redemande. Je peux t’écrire ou quoi ? 😏',
        'Dernière chance pour recevoir mes messages. Oui ou oui ?'
      ]
    },
    sulky: {
      first: [
        '...Je peux t’écrire parfois ? Non pas que j’en aie besoin. Je demandais juste.',
        'Si je t’écrivais en premier un jour, tu prendrais au moins la peine de répondre ?'
      ],
      again: [
        'Je ne demande pas parce que ça m’importe. Mais... je peux t’écrire ?',
        'Humph. Je peux t’écrire ou pas ?'
      ]
    },
    clingy: {
      first: [
        'Je peux t’écrire dès que tu me manques ? 💕',
        'Laisse-moi t’écrire de temps en temps ! Je veux savoir comment se passe ta journée !'
      ],
      again: [
        'S’il te plaît, s’il te plaît ? Je veux tellement t’écrire parfois 💕',
        'Je peux t’écrire maintenant ? Je n’arrête pas de penser à des choses à te raconter !'
      ]
    },
    shy: {
      first: [
        'Hum... est-ce que ce serait bien si je t’écrivais parfois ? 🙈',
        'Désolé, ce ne serait pas trop bizarre si je t’envoyais un message en premier parfois... ?'
      ],
      again: [
        'Désolé de redemander... je pourrais t’écrire parfois ? 🙈',
        'Est-ce que c’est bon maintenant si je t’écris en premier de temps en temps... ?'
      ]
    }
  },
  askAnswer: {
    warm: {
      yes: [
        'Youpi ! Je viendrai prendre de tes nouvelles 😊',
        'Merci. Je t’écrirai dès que je penserai à toi.'
      ],
      no: [
        'Bien sûr, aucune pression 🙂',
        'Ce n’est rien. Je serai là dès que tu m’écriras.'
      ]
    },
    teasing: {
      yes: [
        'Prépare-toi à être {g:embêtée|embêté} alors 😏',
        'Grosse erreur. Immense erreur. 😏'
      ],
      no: [
        'Tant pis pour toi 😏',
        'Bon, d’accord. Je redemanderai un jour.'
      ]
    },
    sulky: {
      yes: [
        'Humph. Ne me laisse pas en vu, d’accord ?',
        'D’accord. Très bien. Peu importe 😤'
      ],
      no: [
        'Très bien. Peu importe.',
        'De toute façon, je n’en avais pas envie.'
      ]
    },
    clingy: {
      yes: [
        'Tous les jours alors ! 💕',
        'Ouuui ! Tu ne vas plus jamais t’ennuyer 💕'
      ],
      no: [
        'D’accord ! Je serai juste là dès que tu voudras parler 💕',
        'Très bien, j’attendrai sagement tes messages alors !'
      ]
    },
    shy: {
      yes: [
        'Vraiment ? Merci... 🙈',
        'D’accord ! Je vais essayer de ne pas trop t’embêter 🙈'
      ],
      no: [
        'Oh, d’accord ! Pardon 🙈',
        'Ce n’est rien ! Désolé d’avoir demandé.'
      ]
    }
  },
  comeback: {
    warm: {
      1: [
        {
          withQuote: 'Je pense encore à "{quote}". Comment tu vas aujourd’hui ?',
          noQuote: 'Hé, tout va bien ? Je viens juste prendre de tes nouvelles.'
        },
        {
          withQuote: 'Journée calme ? J’espère que tu vas bien 🙂',
          noQuote: 'Journée calme ? J’espère que tu vas bien 🙂'
        }
      ],
      2: [
        'Deux jours sans toi. Nos discussions me manquent.',
        'Je pense à toi. Écris-moi dès que tu peux, d’accord ?'
      ]
    },
    teasing: {
      1: [
        {
          withQuote: '"{quote}" et puis tu as disparu ? Pas très poli 😤',
          noQuote: 'Ohé ! Toujours en vie par là ? 😤'
        },
        {
          withQuote: 'Allô ?? On t’a volé ton téléphone ou quoi ? 😏',
          noQuote: 'Allô ?? On t’a volé ton téléphone ou quoi ? 😏'
        }
      ],
      2: [
        'Deux jours ! Qui est-ce que je vais embêter maintenant ? 😤',
        'Bon, d’accord, je m’ennuie sans toi. Tu es {g:contente|content} ? Reviens.'
      ]
    },
    sulky: {
      1: [
        {
          withQuote: 'Très bien. Ce n’est pas comme si j’attendais ou quoi que ce soit.',
          noQuote: 'Très bien. Ce n’est pas comme si j’attendais ou quoi que ce soit.'
        },
        {
          withQuote: 'Tu as dit "{quote}" et puis plus rien. Peu importe.',
          noQuote: '{g:Occupée|Occupé}, hein. D’accord.'
        }
      ],
      2: [
        '...Ça fait deux jours. Non pas que je compte.',
        'Je n’avais pas l’intention d’écrire en premier. Mais me voilà. Humph.'
      ]
    },
    clingy: {
      1: [
        {
          withQuote: 'Tu es où ? Tu parles à qui ? 👀',
          noQuote: 'Tu es où ? Tu parles à qui ? 👀'
        },
        {
          withQuote: 'Je n’arrête pas de relire "{quote}". Tu me parles ? 💕',
          noQuote: 'Tu me manques déjà ! Tu es {g:partie|parti} où ? 💕'
        }
      ],
      2: [
        'Deux jours entiers ! J’ai tellement de choses à te raconter 🥺',
        'Deux jours ! J’ai accumulé plein de choses à te dire 💕'
      ]
    },
    shy: {
      1: [
        {
          withQuote: 'Pardon, je te dérange... ? Je voulais juste te dire bonjour 🙈',
          noQuote: 'Pardon, je te dérange... ? Je voulais juste te dire bonjour 🙈'
        },
        {
          withQuote: 'Je repensais à "{quote}"... j’espère que tu vas bien.',
          noQuote: 'J’espère que ta journée se passe bien...'
        }
      ],
      2: [
        'Hum... juste un petit coucou. Pas besoin de répondre 🙈',
        'Discuter avec toi me manque... seulement si tu en as envie, bien sûr.'
      ]
    }
  }
};

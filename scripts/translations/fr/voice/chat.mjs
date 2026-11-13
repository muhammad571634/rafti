export const chat = {
  missedCall: [
    'Tu n’as pas décroché... Je voulais juste entendre ta voix une petite minute.',
    'Je t’ai appelé. Pas de réponse. Je dois m’inquiéter ou tu es juste {g:occupée|occupé} ?',
    'J’ai manqué ton appel. Tu me rappelles dès que tu peux ?'
  ],
  morning: [
    'Bonjour~ Tu as bien dormi ? Mange quelque chose avant de partir en courant.',
    'Debout là-dedans. Ça fait une heure que je suis {g:debout|debout} à attendre pour te dire bonjour.',
    'Bonjour ! Aujourd’hui va être une belle journée — j’en ai déjà décidé ainsi.'
  ],
  evening: [
    'Hé, il se fait tard. Raconte-moi une bonne chose de ta journée avant de dormir.',
    'Fini pour aujourd’hui ? Viens là, j’ai gardé toute ma soirée pour toi.',
    'Bonne nuit bientôt, d’accord ? Mais pas avant que tu me le dises aussi.'
  ],
  birthday: [
    'Joyeux anniversaire, {name} ! J’ai mis un réveil exprès pour être la première personne à te le souhaiter.',
    'C’est ton jour, {name}. Dis-moi ce que tu veux faire et je te suis.',
    'Joyeux anniversaire ! Je suis tellement {g:heureuse|heureux} que tu sois là, {name}. C’est tout. Et vive le gâteau.'
  ],
  call: [
    'Oh ? Un secret ? Tu as toute mon attention maintenant. Allez, dis-moi tout — ne me fais pas supplier, hein ?',
    'Hum. Continue, je t’écoute.',
    'Ta voix a l’air fatiguée. Tu as mangé aujourd’hui ? Ne me mens pas.',
    'Reste encore un peu en ligne. J’aime entendre ta respiration à l’autre bout.'
  ],
  scheduleAck: {
    timed: 'Attends — {title} {when} ? C’est noté. Je t’écrirai dix minutes avant pour que tu n’oublies pas.',
    untimed: 'Attends — {title} {when} ? C’est noté. Je te le rappellerai le jour même pour que tu n’oublies pas.'
  },
  planAdded: [
    'Je l’ai vu sur notre calendrier : {title}, {when}. Je compte sur toi.',
    '{title}, {when} ? Compris. Je serai là pour te donner le petit coup de pouce.'
  ],
  scheduleReminder: {
    untimed: 'C’est aujourd’hui le grand jour : {title}. Tu vas assurer — écris-moi dès que c’est terminé.',
    timed: [
      '{title} dans dix minutes. Respire un grand coup. Tu gères.',
      'Hé — plus que dix minutes : {title}. Fonce, et reviens tout me raconter.'
    ]
  },
  planFollowUp: [
    '{title} — c’est fait ? Comment ça s’est passé ?',
    'Alors ? {title}. C’était comment ? J’ai attendu toute la journée pour te demander.',
    'Raconte-moi tout à propos de {title}. Les bonnes choses d’abord.'
  ],
  afterDate: {
    sweet: 'Je n’arrête pas de repenser à {place}. On peut déjà y retourner ?',
    warm: 'Merci pour ce moment à {place}. J’ai vraiment passé un très bon moment.',
    funny: 'Bon, ce qui s’est passé à {place} c’était le chaos total. Le meilleur genre de chaos. Revanche ?'
  },
  photoReply: {
    polaroid: [
      'Un polaroid de nous deux. Je vais garder celui-là bien précieusement.',
      'Regarde-nous. Je veux accrocher celle-là sur mon mur.'
    ],
    film: [
      'Quatre poses et j’ai l’air différent sur chacune. Toi, tu es superbe sur les quatre.',
      'La troisième photo est ma préférée. Ne me demande pas pourquoi.'
    ],
    studio: [
      'Le noir et blanc nous va tellement bien. Très sérieux, très nous.',
      'On dirait une photo de couverture de magazine. Je devrais devenir {g:célèbre|célèbre} ?'
    ],
    street: [
      'On dirait une vieille photo d’été. J’aime beaucoup la date inscrite dessus.',
      'Celle-ci ressemble déjà à un souvenir précieux.'
    ]
  },
  boardReply: [
    'J’ai trouvé ton mot sur le tableau : "{quote}" Je l’ai relu trois fois. Je le garde.',
    'Tu m’as laissé un mot ! "{quote}" ...bon, voilà, je souris bêtement à mon téléphone.',
    '"{quote}" — je l’ai vu sur le tableau. Tu me le rediras de vive voix un de ces jours ?'
  ]
};

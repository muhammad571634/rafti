// French translation for worlds (seaside, moonlit, neon, tidepool)
export const worlds = {
  seaside: {
    intro: "Interro surprise, pur style Seaside ! Cinq questions sur notre campus. Quatre bonnes réponses et le cadre Seaside est à toi.",
    right: [
      "Exact ! Tu écoutes bien en cours à ce que je vois.",
      "C'est tout à fait ça ! Mention très bien de la part de tout le campus.",
      "Bien joué ! Tu ne serais pas un étudiant infiltré par hasard ?"
    ],
    wrong: [
      "Presque. La bonne réponse était {answer}. Te voilà prévenu.",
      "À côté de la plaque ! C'était {answer}. Demande aux habitués du patio.",
      "Raté pour cette fois, c'est {answer}. T'en fais pas, personne ne lit le journal de la fac."
    ],
    match: [
      "Moi aussi ! Course jusqu'au bout de la jetée pour fêter ça !",
      "On pense exactement la même chose. Ça en devient presque troublant.",
      "Je le savais ! Binômes d'études pour la vie."
    ],
    differ: [
      "Moi j'ai choisi {answer}. On en débattra sur le chemin du retour.",
      "Hmm, j'ai plutôt opté pour {answer}. Explique-moi ton point de vue en partageant un goûter.",
      "{answer} pour ma part. Les contraires font les meilleurs partenaires de labo."
    ],
    selfQuiz: [
      {
        text: "Pour quelle raison je sécherais les cours ?",
        options: [
          "Une baignade dans l'océan à l'aube",
          "Pour passer du temps avec toi",
          "Des snacks gratuits",
          "Jamais, je suis un étudiant modèle"
        ]
      },
      {
        text: "Mon coin secret préféré sur le campus ?",
        options: [
          "Le bout de la jetée",
          "Le jardin sur le toit de la bibliothèque",
          "Près du distributeur automatique",
          "Partout où tu te trouves"
        ]
      },
      {
        text: "La chose indispensable dans mon sac de cours ?",
        options: [
          "Un goûter en plus",
          "Trois stylos qui ne marchent pas",
          "Une serviette encore humide",
          "Tes fiches de révision"
        ]
      },
      {
        text: "Comment je révise mes examens ?",
        options: [
          "Nuit blanche dans la panique totale",
          "Des semaines à l'avance et au millimètre",
          "Avec toi, en me laissant complètement distraire",
          "Je ne révise pas, tout au talent"
        ]
      },
      {
        text: "Mon idée d'un week-end idéal ?",
        options: [
          "Plage du matin au soir",
          "Grasse matinée jusqu'à midi",
          "Marathon de films au chaud",
          "Partir en virée avec toi"
        ]
      },
      {
        text: "Que fais-je quand le stress monte ?",
        options: [
          "Je vais nager pour tout évacuer",
          "Je m'isole dans ma bulle",
          "Je dévore des sucreries",
          "Je t'envoie un message"
        ]
      },
      {
        text: "Mon surnom officieux sur le campus ?",
        options: [
          "L'agitateur",
          "Le silencieux",
          "Le Capitaine",
          "Je ne l'avouerai jamais"
        ]
      }
    ],
    quiz: [
      {
        text: "Qui nourrit discrètement les chats du campus ?",
        options: [
          "Elio",
          "Kai",
          "Rowan",
          "Theo"
        ]
      },
      {
        text: "Quel club est dirigé d'une main de maître par Hana ?",
        options: [
          "Le club cinéma",
          "Le club d'art",
          "L'équipe d'éloquence",
          "L'équipe de natation"
        ]
      },
      {
        text: "Qui donne à chaque poisson de l'aquarium le prénom d'un ami ?",
        options: [
          "Felix",
          "Jun",
          "Rowan",
          "Iris"
        ]
      },
      {
        text: "À quelle heure démarre l'émission de radio nocturne de Noah ?",
        options: [
          "7 h",
          "Midi",
          "18 h",
          "1 h du matin"
        ]
      },
      {
        text: "Qui ne s'avoue jamais vaincu lors d'un débat étudiant ?",
        options: [
          "Tessa",
          "Theo",
          "Kai",
          "Hana"
        ]
      },
      {
        text: "Qu'est-ce que Kai t'apporte toujours en venant en amphi ?",
        options: [
          "Un café",
          "Des notes de cours",
          "Un goûter en plus",
          "Une serviette"
        ]
      },
      {
        text: "Qui a toujours le bouquin parfait pour remonter le moral ?",
        options: [
          "Iris",
          "Elio",
          "Noah",
          "Jun"
        ]
      },
      {
        text: "Sur quoi Felix ne se sépare-t-il jamais ?",
        options: [
          "Une guitare",
          "Un vieil appareil photo argentique",
          "Une carte géographique",
          "Un transistor"
        ]
      }
    ],
    dateRounds: [
      {
        line: "La sonnerie retentit quelque part sur le campus. {name} esquisse un sourire en coin. « On devrait être en cours tous les deux en ce moment même. »",
        choices: [
          {
            text: "« Alors soyons en retard ensemble. »",
            reply: "« La meilleure idée que tu aies eue de toute la semaine. » Il t'attrape la main et se met à courir."
          },
          {
            text: "« Juste une heure de cours. On s'éclipse après. »",
            reply: "« Sage. Trop sage. Mais d'accord. » Il t'attend sagement devant la porte."
          },
          {
            text: "Aller en cours tout seul.",
            reply: "{name} fait mine d'être vexé, puis t'envoie une photo des vagues : « Regarde ce que tu rates. »"
          }
        ]
      },
      {
        line: "La mer est à deux pas ici à {place}. {name} retire déjà joyeusement ses chaussures.",
        choices: [
          {
            text: "Faire la course jusqu'au bord de l'eau.",
            reply: "Vous avez tous les deux perdu. Vous avez tous les deux gagné. Vos bas de pantalon sont complètement trempés."
          },
          {
            text: "Ne tremper prudemment que le bout des orteils.",
            reply: "« Quel grand courage ! » ricane {name} en t'éclaboussant généreusement."
          },
          {
            text: "Rester sur le sable pour surveiller les affaires.",
            reply: "« Le gardien officiel des chaussures. Un rôle primordial. » Il revient de l'eau le sourire aux lèvres."
          }
        ]
      }
    ],
    frame: {
      caption: "après la natation"
    }
  },
  moonlit: {
    intro: "Voyageur. Le Royaume pose cinq questions à ceux qui prétendent arborer son cadre. Réponds à quatre d'entre elles avec ton cœur et il sera tien.",
    right: [
      "C'est la vérité. Les astres approuvent ta réponse.",
      "Précisément. Tu ferais un chevalier exemplaire.",
      "Oui. Le Royaume se souviendra de ton nom désormais."
    ],
    wrong: [
      "Erreur d'aiguillage, voyageur. La réponse était {answer}. Grave-le dans ta mémoire.",
      "Ce n'est point cela. La vérité est {answer}. Les archives ne mentent jamais.",
      "Fausse piste. C'était {answer}. Réessaie à la lueur de la lune."
    ],
    match: [
      "Nous avons fait le même choix. C'est un présage très favorable.",
      "Nos esprits s'accordent, telles deux étoiles siamoises.",
      "Je m'en doutais. Nous avons été façonnés sous la même nuit."
    ],
    differ: [
      "J'avais choisi {answer}. Viens me conter au coin du feu pourquoi tu as hésité.",
      "Ma réponse était {answer}. Une autre voie, nullement une erreur.",
      "{answer}, pour ma part. Le Royaume a besoin de nos deux regards."
    ],
    selfQuiz: [
      {
        text: "Que protégerais-je au péril de ma vie ?",
        options: [
          "Mon épée",
          "Une promesse faite autrefois",
          "Toi",
          "Mon honneur"
        ]
      },
      {
        text: "Où vais-je pour méditer en silence ?",
        options: [
          "Au sommet de la plus haute tour",
          "Dans le jardin lunaire",
          "À l'orée des bois ténébreux",
          "Là où tu reposes"
        ]
      },
      {
        text: "Quelle est ma plus grande crainte ?",
        options: [
          "Rien au monde",
          "Sombrer dans l'oubli",
          "Te perdre à jamais",
          "Les araignées. Pas un mot, je t'en prie"
        ]
      },
      {
        text: "À qui va mon allégeance la plus sincère ?",
        options: [
          "À la couronne",
          "Aux étoiles éternelles",
          "À moi-même",
          "À toi, sans réserve"
        ]
      },
      {
        text: "Pour quoi renoncerais-je à mes titres ?",
        options: [
          "Pour rien",
          "Pour la paix du royaume",
          "Pour une nuit paisible à tes côtés",
          "Pour une bonne miche de pain chaud"
        ]
      },
      {
        text: "Comment est-ce que je présente des excuses ?",
        options: [
          "Je ne m'excuse jamais",
          "En offrant un présent rare",
          "Par une longue missive manuscrite",
          "D'un air maladroit, mais avec tout mon cœur"
        ]
      },
      {
        text: "Mon heure de prédilection ?",
        options: [
          "Les premières lueurs de l'aube",
          "Minuit tapant",
          "L'instant précédant la bataille",
          "Toute heure où tu te trouves éveillé"
        ]
      }
    ],
    quiz: [
      {
        text: "Qui veille fidèlement sur les archives stellaires ?",
        options: [
          "Lord Castor",
          "Prince Aurelian",
          "Vesper",
          "Kael"
        ]
      },
      {
        text: "Le jardin secret du Prince Aurelian ne fleurit que si...",
        options: [
          "La pluie tombe",
          "Quelqu'un décide de rester",
          "La lune est pleine",
          "Il entonne un chant"
        ]
      },
      {
        text: "Que refuse obstinément de préparer l'alchimiste Vesper ?",
        options: [
          "Des philtres d'amour",
          "Des remèdes de sommeil",
          "Une potion d'oubli",
          "Du poison mortel"
        ]
      },
      {
        text: "Quelle est la véritable nature de Kael sous forme humaine ?",
        options: [
          "Un esprit renard",
          "Un corbeau",
          "Un spectre errant",
          "Un dragon"
        ]
      },
      {
        text: "Qui guide les voyageurs égarés avec ses lanternes ?",
        options: [
          "Seraphine",
          "Lyra",
          "Corvin",
          "Zarek"
        ]
      },
      {
        text: "Que dépose immanquablement Orin après l'une de ses facéties ?",
        options: [
          "Un cadeau",
          "Une énigme",
          "Une plume",
          "Rien du tout"
        ]
      },
      {
        text: "Qui rédige avec dévotion un compte-rendu pour toi après chaque ronde ?",
        options: [
          "Corvin",
          "Zarek",
          "Messire Rhys",
          "Castor"
        ]
      },
      {
        text: "De quelles créatures Corvin prend-il soin sur sa falaise ?",
        options: [
          "Des loups",
          "Des roses d'argent",
          "Des lanternes",
          "Des corbeaux"
        ]
      }
    ],
    dateRounds: [
      {
        line: "Une étoile filante fend les cieux au-dessus de {place}. {name} s'arrête net. « Fais un vœu. Vite ! »",
        choices: [
          {
            text: "Prononcer un vœu pour vous deux à voix haute.",
            reply: "« On ne doit pas le formuler tout haut. » Mais un doux sourire trahit sa joie."
          },
          {
            text: "Fermer les yeux et garder le vœu au fond de son cœur.",
            reply: "« Garde-le précieusement, » murmure {name}. « Je veillerai à ce qu'il se réalise. »"
          },
          {
            text: "« Je ne crois guère aux contes de fées. »",
            reply: "« Alors j'en ferai un pour nous deux, » répond-il avec tendresse."
          }
        ]
      },
      {
        line: "Non loin de {place}, une vieille lanterne vacille avant de s'éteindre. {name} déploie sa cape vers toi.",
        choices: [
          {
            text: "S'abriter ensemble sous la même cape.",
            reply: "Il y a tout juste la place pour deux. Parfaitement ajusté. Ni l'un ni l'autre ne songe à s'écarter."
          },
          {
            text: "Rallumer la flamme de la lanterne.",
            reply: "« Tu n'as pas fini de me surprendre, voyageur. » La lueur illumine à nouveau vos visages."
          },
          {
            text: "« Je ne crains point le froid. »",
            reply: "« Tête de mule, » souffle {name} en posant tout de même l'étoffe chaude sur tes épaules."
          }
        ]
      }
    ],
    frame: {
      caption: "sous les étoiles d'antan"
    }
  },
  neon: {
    intro: "Balance son ! Cinq questions sur NEON TIDE. Quatre bonnes réponses et le cadre de scène est à toi. Zéro pression. Enfin, à peine !",
    right: [
      "Dans le mille ! Voilà un vrai fan !",
      "Parfait ! On en redemande, encore un rappel !",
      "Carrément. Tu ferais partie du fan-club officiel ?"
    ],
    wrong: [
      "Fausses notes ! La réponse était {answer}.",
      "Aïe, à côté de la prod. C'était {answer}. Ne va surtout pas répéter ça à notre manager.",
      "Presque calé sur le beat, mais c'était {answer}. Répète encore un coup et reviens nous voir."
    ],
    match: [
      "Même choix ! Une pure alchimie en duo.",
      "En parfaite harmonie, exactement comme sur le refrain final.",
      "On est tellement raccords. Je vais en faire une punchline."
    ],
    differ: [
      "J'ai pris {answer}. Ça nous ferait un duo complètement déjanté. J'adore.",
      "{answer} pour ma part. Un ton différent, mais le même groove.",
      "Je suis parti sur {answer}. Tu m'expliqueras pourquoi après le concert."
    ],
    selfQuiz: [
      {
        text: "Ce que je fais juste avant de monter sur scène ?",
        options: [
          "Une petite prière",
          "Manger des bonbons",
          "T'envoyer un message rapide",
          "Paniquer en silence"
        ]
      },
      {
        text: "Mon moment préféré une fois le show terminé ?",
        options: [
          "Dormir direct",
          "Des nouilles instantanées à minuit",
          "Lire les lettres des fans",
          "T'appeler au téléphone"
        ]
      },
      {
        text: "La mélodie que je fredonne sans arrêt ?",
        options: [
          "Notre tout premier single",
          "Un nouveau titre que personne n'a encore entendu",
          "Une berceuse d'enfance",
          "Ta sonnerie de portable"
        ]
      },
      {
        text: "Ce que je déteste le plus dans ma vie d'idole ?",
        options: [
          "Les réveils aux aurores",
          "Le manque de temps pour toi",
          "Les sandwichs d'aéroport",
          "Rien du tout, j'adore ce métier"
        ]
      },
      {
        text: "Mon talent caché le plus inattendu ?",
        options: [
          "Cuisiner comme un chef",
          "Le dessin",
          "Dormir n'importe où et n'importe quand",
          "Me rappeler de chacun de tes messages"
        ]
      },
      {
        text: "Où est-ce que je me réfugie pour fuir les caméras ?",
        options: [
          "Au fond du studio d'entraînement",
          "Dans un minuscule coffee shop discret",
          "Sur le toit de l'immeuble",
          "Avec toi"
        ]
      },
      {
        text: "La chose qui me rend vraiment nerveux ?",
        options: [
          "Les directs télévisés",
          "Le grand silence",
          "Toi, parfois",
          "Absolument rien au monde"
        ]
      }
    ],
    quiz: [
      {
        text: "Qui est le chanteur principal de NEON TIDE ?",
        options: [
          "Ezra",
          "Seren",
          "Kiro",
          "Haze"
        ]
      },
      {
        text: "Qui est le benjamin du groupe, le fameux maknae ?",
        options: [
          "Rio",
          "Minu",
          "Haze",
          "Kiro"
        ]
      },
      {
        text: "Qui t'envoie des instrus inédites à 3 heures du matin ?",
        options: [
          "Dex",
          "Juno",
          "Ari",
          "Ezra"
        ]
      },
      {
        text: "Qui continue à danser jusqu'à l'extinction automatique des projecteurs ?",
        options: [
          "Seren",
          "Kiro",
          "Rio",
          "Cass"
        ]
      },
      {
        text: "De quelle formation Cass est-elle la leader ?",
        options: [
          "NEON TIDE",
          "PRISM",
          "TIDEWAVE",
          "ECHO"
        ]
      },
      {
        text: "Combien de smartphones Juno garde-t-il sur lui en permanence ?",
        options: [
          "Un",
          "Deux",
          "Trois",
          "Quatre"
        ]
      },
      {
        text: "La chorégraphe Ari compte invariablement les temps par...",
        options: [
          "Quatre",
          "Six",
          "Huit",
          "Dix"
        ]
      },
      {
        text: "Qui paraît un peu perdu dès que les feux de la scène s'éteignent ?",
        options: [
          "Ezra",
          "Minu",
          "Dex",
          "Haze"
        ]
      }
    ],
    dateRounds: [
      {
        line: "Quelqu'un à {place} repère soudain {name}. « Hé, mais ce ne serait pas... un membre de NEON TIDE ? » {name} rabat aussitôt sa casquette.",
        choices: [
          {
            text: "L'entraîner précipitamment dans une ruelle adjacente.",
            reply: "« Mon sauveur attitré. » Il souffle en riant, sans lâcher ta main."
          },
          {
            text: "« Non, c'est juste un parfait sosie. »",
            reply: "{name} acquiesce d'un air d'une gravité absolue. Le passant n'est qu'à moitié convaincu."
          },
          {
            text: "Demander au passant de vous prendre tous les deux en photo.",
            reply: "« Tu vas m'attirer les pires ennuis de ma carrière. » Mais il prend la pose tout sourire."
          }
        ]
      },
      {
        line: "Un morceau de NEON TIDE retentit dans les enceintes de {place}. {name} vire instantanément au rouge écarlate.",
        choices: [
          {
            text: "Chanter les paroles à tue-tête.",
            reply: "« Arrête, pitié ! Non en fait, continue. » Il a un sourire fendu jusqu'aux oreilles."
          },
          {
            text: "« C'est ton couplet en ce moment ? »",
            reply: "« ...Oui. Ne me regarde pas comme ça. » Tu le fixes sans ciller."
          },
          {
            text: "Faire semblant de n'avoir jamais entendu ce son de sa vie.",
            reply: "« Aïe. Celle-là fait mal à mon ego. » Il feint d'être blessé... presque crédible."
          }
        ]
      }
    ],
    frame: {
      caption: "rappel"
    }
  },
  tidepool: {
    intro: "Commande prête ! Cinq questions sur le café et les habitués de notre ruelle. Quatre bonnes réponses et le cadre du coffee shop est offert par la maison.",
    right: [
      "Exactement ! Tu as gagné un cookie tout chaud.",
      "C'est ça ! Tu fais officiellement partie des piliers de comptoir.",
      "Bien vu. Sol serait fière de toi."
    ],
    wrong: [
      "Tout près. La réponse était {answer}. Un petit café pour stimuler la mémoire ?",
      "Pas tout à fait, c'était {answer}. Demande à n'importe qui accoudé au zinc.",
      "Manqué de peu. {answer}. La prochaine sera la bonne."
    ],
    match: [
      "Moi aussi ! Deux commandes identiques sur le plateau.",
      "Même rituel. Je vais m'empresser de raconter ça à Sol.",
      "Regarde-nous un peu. On dirait un vieux couple installé à sa table fétiche."
    ],
    differ: [
      "J'avais choisi {answer}. On en rediscute autour d'un grand mocha ?",
      "{answer} pour ma part. Raconte-moi ta version en savourant un croissant.",
      "Moi j'ai pris {answer}. Des goûts différents, mais attablés ensemble."
    ],
    selfQuiz: [
      {
        text: "Ma commande habituelle sans hésitation ?",
        options: [
          "Un expresso serré bien noir",
          "Une tonne de sucre",
          "Un thé réconfortant",
          "La même chose que toi"
        ]
      },
      {
        text: "Que fais-je lors d'un après-midi pluvieux ?",
        options: [
          "Une bonne sieste",
          "Bouquiner au chaud dans le café",
          "Bricoler un truc qui traîne",
          "T'appeler pour papoter"
        ]
      },
      {
        text: "Qu'est-ce qui m'empêche de trouver le sommeil la nuit ?",
        options: [
          "Le boulot qui s'accumule",
          "Rien, je dors comme une souche",
          "Penser à toi sans arrêt",
          "Trop de caféine ingérée dans la journée"
        ]
      },
      {
        text: "Mon heure préférée pour passer au café ?",
        options: [
          "À l'ouverture quand tout est calme",
          "Au creux de l'après-midi",
          "À l'heure de la fermeture",
          "Dès que tu franchis la porte"
        ]
      },
      {
        text: "La chose que j'oublie systématiquement ?",
        options: [
          "Mes clés",
          "De manger à midi",
          "Les dates d'anniversaire",
          "Rien de ce qui te concerne"
        ]
      },
      {
        text: "Mon plat réconfortant suprême ?",
        options: [
          "Une soupe fumante",
          "Des croissants croustillants",
          "Des nouilles vite faites",
          "Tout ce que tu prends le temps de me cuisiner"
        ]
      },
      {
        text: "Comment est-ce que je prouve mon attachement ?",
        options: [
          "En réparant ce qui est cassé",
          "En apportant de quoi grignoter",
          "En me souvenant de petits riens",
          "En restant simplement près de toi"
        ]
      }
    ],
    quiz: [
      {
        text: "Qui est l'âme dirigeante du Tidepool Café ?",
        options: [
          "Sol",
          "Ivy",
          "Nadia",
          "Ren"
        ]
      },
      {
        text: "Qui met de côté le premier croissant encore tout chaud rien que pour toi ?",
        options: [
          "Marco",
          "Ren",
          "Hugo",
          "Gideon"
        ]
      },
      {
        text: "Marco commande systématiquement deux cafés à chaque garde et...",
        options: [
          "Les boit tous les deux d'un coup",
          "En renverse un par terre",
          "En offre un à quelqu'un",
          "En oublie un sur le comptoir"
        ]
      },
      {
        text: "Qui présente chaque semaine un nouveau chien sauvé de la rue ?",
        options: [
          "Cole",
          "Lucas",
          "Adrian",
          "Hugo"
        ]
      },
      {
        text: "Qui enchaîne les nuits de garde épuisantes aux urgences ?",
        options: [
          "Dr. Lucas Hale",
          "Nadia",
          "Gideon",
          "Cole"
        ]
      },
      {
        text: "Que glisse subrepticement Ivy dans ton sac sans rien dire ?",
        options: [
          "Un mot doux",
          "Une fleur fraîche",
          "Un petit gâteau",
          "Une clé secrète"
        ]
      },
      {
        text: "Qui entretient et répare gracieusement la vieille mobylette du café ?",
        options: [
          "Marco",
          "Adrian",
          "Cole",
          "Ren"
        ]
      },
      {
        text: "Que fait involontairement Adrian lorsqu'il est très concentré sur ses plans ?",
        options: [
          "Il sifflote",
          "Il tapote des doigts sur la table",
          "Il mordille son crayon",
          "Il fredonne doucement"
        ]
      }
    ],
    dateRounds: [
      {
        line: "Le transistor du café diffuse une vieille mélodie rétro à {place}. {name} fait glisser une tasse fumante vers toi. « C'est pour toi. »",
        choices: [
          {
            text: "« Tu te rappelles exactement de ma commande. »",
            reply: "« Je me souviens de chaque détail sur toi. Ça commence à devenir grave. »"
          },
          {
            text: "Échanger furtivement les tasses.",
            reply: "« Hé ! » Il trempe ses lèvres dans la tienne et grimace. Tu éclates de rire."
          },
          {
            text: "« J'avais envie d'autre chose aujourd'hui. »",
            reply: "« Ce sera pour la prochaine tournée alors. » Il note déjà soigneusement ta remarque sur une serviette en papier."
          }
        ]
      },
      {
        line: "Un chiot rescapé s'approche en trottinant à {place} et vient poser ses pattes sur les chaussures de {name}.",
        choices: [
          {
            text: "Lui chercher un prénom ensemble.",
            reply: "Vous discutez pendant dix bonnes minutes sans trouver d'accord. Le chiot est ravi de toute cette attention."
          },
          {
            text: "Lui donner le dernier morceau de ton croissant.",
            reply: "« C'est bon, il ne nous quittera plus d'une semelle maintenant, » sourit {name}, attendri."
          },
          {
            text: "L'écarter doucement d'un petit geste.",
            reply: "« Quel manque de cœur, » te taquine gentiment {name} en grattant le chiot derrière les oreilles."
          }
        ]
      }
    ],
    frame: {
      caption: "deux cafés crème"
    }
  }
};

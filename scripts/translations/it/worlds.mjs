export const worlds = {
  seaside: {
    intro: "Quiz a sorpresa, in stile Seaside! Cinque domande sul nostro campus. Rispondi bene a quattro e la cornice Seaside sarà tua.",
    right: [
      "Esatto! Sei stato attento durante le lezioni.",
      "Sì! Medaglia d'oro da parte di tutto il campus.",
      "Giusto. Ma non è che sei uno studente del posto in incognito?"
    ],
    wrong: [
      "Non proprio. È {answer}. Ora lo sai.",
      "Ci sei quasi! La risposta è {answer}. Chiedi in giro nel cortile.",
      "No, {answer}. Non preoccuparti, nessuno legge il giornale universitario."
    ],
    match: [
      "Uguale! Chi arriva prima al molo per festeggiare?",
      "La pensiamo allo stesso modo. Fa quasi paura.",
      "Lo sapevo. Compagni di studio a vita."
    ],
    differ: [
      "Io ho scelto {answer}. Discutiamone mentre torniamo a casa a piedi.",
      "Uhm, io ho preso {answer}. Spiegami le tue ragioni davanti a uno snack.",
      "{answer} per me. Gli opposti sono ottimi compagni di laboratorio."
    ],
    selfQuiz: [
      {
        text: "Per cosa salterei le lezioni?",
        options: [
          "Una nuotata all'alba",
          "Te",
          "Cibo gratis",
          "Mai, sono uno studente modello"
        ]
      },
      {
        text: "Il mio posto preferito del campus?",
        options: [
          "Il molo",
          "Il tetto della biblioteca",
          "Il distributore",
          "Ovunque ci sia tu"
        ]
      },
      {
        text: "Cosa c'è sempre nella mia borsa?",
        options: [
          "Uno spuntino in più",
          "Tre penne, nessuna funzionante",
          "Un asciugamano bagnato",
          "I tuoi appunti"
        ]
      },
      {
        text: "Come studio per gli esami?",
        options: [
          "Tutta la notte, nel panico",
          "In anticipo e con ordine",
          "Con te, distraendomi",
          "Non studio. Vado a braccio"
        ]
      },
      {
        text: "La mia idea di fine settimana perfetto?",
        options: [
          "Spiaggia tutto il giorno",
          "Dormire fino a mezzogiorno",
          "Maratona di film",
          "Un viaggio con te"
        ]
      },
      {
        text: "Cosa faccio quando sono sotto stress?",
        options: [
          "Nuoto per sfogarmi",
          "Mi chiudo nel silenzio",
          "Mangio qualcosa di dolce",
          "Ti mando un messaggio"
        ]
      },
      {
        text: "Il mio soprannome nel campus?",
        options: [
          "Guaio",
          "Il taciturno",
          "Capitano",
          "Non te lo dirò"
        ]
      }
    ],
    quiz: [
      {
        text: "Chi nutre di nascosto i gatti del campus?",
        options: [
          "Elio",
          "Kai",
          "Rowan",
          "Theo"
        ]
      },
      {
        text: "Quale club gestisce Hana?",
        options: [
          "Club del cinema",
          "Club d'arte",
          "Squadra di dibattito",
          "Squadra di nuoto"
        ]
      },
      {
        text: "Chi dà a ogni pesce dell'acquario il nome di un amico?",
        options: [
          "Felix",
          "Jun",
          "Rowan",
          "Iris"
        ]
      },
      {
        text: "A che ora va in onda il programma radiofonico di Noah?",
        options: [
          "Alle 7:00",
          "A mezzogiorno",
          "Alle 18:00",
          "All'una di notte"
        ]
      },
      {
        text: "Chi non perde mai un dibattito come presidente del comitato?",
        options: [
          "Tessa",
          "Theo",
          "Kai",
          "Hana"
        ]
      },
      {
        text: "Cosa ti porta Kai a lezione?",
        options: [
          "Caffè",
          "Appunti",
          "Uno spuntino in più",
          "Un asciugamano"
        ]
      },
      {
        text: "Chi ha sempre il libro giusto per come ti senti?",
        options: [
          "Iris",
          "Elio",
          "Noah",
          "Jun"
        ]
      },
      {
        text: "Felix porta sempre con sé una vecchia...",
        options: [
          "Chitarra",
          "Macchina fotografica a rullino",
          "Mappa",
          "Radio"
        ]
      }
    ],
    dateRounds: [
      {
        line: "Una campana suona da qualche parte nel campus. {name} sorride. \"A quest'ora dovremmo essere entrambi a lezione.\"",
        choices: [
          {
            text: "\"Allora facciamo tardi insieme.\"",
            reply: "\"La migliore idea che tu abbia avuto in tutta la settimana.\" Ti prende la mano e inizia a correre."
          },
          {
            text: "\"Una sola lezione. Poi andiamo.\"",
            reply: "\"Responsabile. Insopportabile. E va bene.\" Ti aspetta fuori."
          },
          {
            text: "Vai a lezione da solo.",
            reply: "{name} mette il broncio, poi ti manda una foto del mare. \"Ti stai perdendo questo.\""
          }
        ]
      },
      {
        line: "Il mare è proprio lì a {place}. {name} si sta già togliendo le scarpe.",
        choices: [
          {
            text: "Fai una gara verso l'acqua.",
            reply: "Avete perso entrambi. Avete vinto entrambi. I vostri jeans sono fradici."
          },
          {
            text: "Intingi le punte delle dita, con cautela.",
            reply: "\"Che coraggio,\" ti stuzzica {name}, e ti schizza lo stesso."
          },
          {
            text: "Fai la guardia alle scarpe.",
            reply: "\"Il custode delle scarpe. Una nobile missione.\" Ritorna grondando acqua."
          }
        ]
      }
    ],
    frame: {
      caption: "dopo la lezione di nuoto"
    }
  },
  moonlit: {
    intro: "Viandante. Il Regno pone cinque domande a chi desidera portare con sé la sua cornice. Rispondi con verità a quattro di esse e sarà tua.",
    right: [
      "Vero. Le stelle ti approvano.",
      "Esatto. Saresti un cavaliere formidabile.",
      "Sì. Il Regno ora si ricorderà di te."
    ],
    wrong: [
      "No, viandante. È {answer}. Ricordalo.",
      "Non è così. La risposta è {answer}. L'archivio non mente mai.",
      "Strada sbagliata. È {answer}. Riprova al chiaro di luna."
    ],
    match: [
      "Abbiamo scelto la stessa cosa. È un presagio, e per di più favorevole.",
      "Le nostre risposte si allineano, come due stelle.",
      "Proprio come pensavo. Io e te siamo fatti della stessa notte."
    ],
    differ: [
      "Io ho scelto {answer}. Raccontami davanti al fuoco perché tu no.",
      "La mia risposta era {answer}. Un sentiero diverso, non errato.",
      "{answer}, per me. Il Regno ha bisogno di entrambi."
    ],
    selfQuiz: [
      {
        text: "Cosa proteggo di più?",
        options: [
          "La mia spada",
          "Una vecchia promessa",
          "Te",
          "Il mio orgoglio"
        ]
      },
      {
        text: "Dove vado quando voglio riflettere?",
        options: [
          "Sul tetto della torre",
          "Nel giardino della luna",
          "Ai margini della foresta",
          "Ovunque ci sia tu"
        ]
      },
      {
        text: "Cosa temo?",
        options: [
          "Nulla",
          "Essere dimenticato",
          "Perdere te",
          "I ragni. Non ridere"
        ]
      },
      {
        text: "A chi è rivolto il mio giuramento?",
        options: [
          "Alla corona",
          "Alle stelle",
          "A me stesso",
          "A te, adesso"
        ]
      },
      {
        text: "In cambio di cosa rinuncerei al mio titolo?",
        options: [
          "Nulla",
          "La pace",
          "Una notte tranquilla con te",
          "Del buon pane"
        ]
      },
      {
        text: "Come chiedo scusa?",
        options: [
          "Non lo faccio",
          "Con un dono",
          "Con una lunga lettera",
          "Maldestramente, ma ci provo"
        ]
      },
      {
        text: "La mia ora preferita?",
        options: [
          "L'alba",
          "Mezzanotte",
          "L'ora prima della battaglia",
          "Qualsiasi ora in cui tu sia sveglio"
        ]
      }
    ],
    quiz: [
      {
        text: "Chi custodisce l'archivio delle stelle?",
        options: [
          "Lord Castor",
          "Principe Aurelian",
          "Vesper",
          "Kael"
        ]
      },
      {
        text: "Il giardino del Principe Aurelian fiorisce solo quando...",
        options: [
          "Piove",
          "Qualcuno decide di restare",
          "La luna è piena",
          "Lui canta"
        ]
      },
      {
        text: "Cosa rifiuta categoricamente di distillare Vesper?",
        options: [
          "Pozioni d'amore",
          "Filtri per dormire",
          "Una pozione per farti dimenticare",
          "Veleno"
        ]
      },
      {
        text: "Kael è segretamente un...",
        options: [
          "Spirito volpe",
          "Corvo",
          "Fantasma",
          "Drago"
        ]
      },
      {
        text: "Chi illumina il cammino ai viaggiatori smarriti?",
        options: [
          "Seraphine",
          "Lyra",
          "Corvin",
          "Zarek"
        ]
      },
      {
        text: "Cosa lascia sempre Orin dopo uno scherzo?",
        options: [
          "Un dono",
          "Un indovinello",
          "Una piuma",
          "Nulla"
        ]
      },
      {
        text: "Chi ti scrive un rapporto dopo ogni ronda?",
        options: [
          "Corvin",
          "Zarek",
          "Sir Rhys",
          "Castor"
        ]
      },
      {
        text: "Cosa accudisce Corvin sulla sua scogliera?",
        options: [
          "Lupi",
          "Rose",
          "Lanterne",
          "Corvi"
        ]
      }
    ],
    dateRounds: [
      {
        line: "Una stella cadente attraversa il cielo sopra {place}. {name} si immobilizza. \"Esprimi un desiderio. Presto.\"",
        choices: [
          {
            text: "Esprimi il desiderio ad alta voce per entrambi.",
            reply: "\"Non dovresti dirlo ad alta voce.\" Eppure sta sorridendo."
          },
          {
            text: "Chiudi gli occhi e tienilo segreto.",
            reply: "\"Custodiscilo,\" sussurra {name}. \"Farò in modo che si avveri.\""
          },
          {
            text: "\"Non credo nei desideri.\"",
            reply: "\"Allora esprimerò un desiderio per entrambi,\" risponde."
          }
        ]
      },
      {
        line: "Da qualche parte vicino a {place}, una vecchia lanterna si spegne. {name} ti offre il suo mantello.",
        choices: [
          {
            text: "Condividilo.",
            reply: "È grande abbastanza per due. A stento. A nessuno dei due dispiace."
          },
          {
            text: "Accendi di nuovo la lanterna.",
            reply: "\"Continui a sorprendermi, viandante.\" La luce ritorna."
          },
          {
            text: "\"Non ho freddo.\"",
            reply: "\"Bugiardo,\" dice {name}, e te lo avvolge attorno comunque."
          }
        ]
      }
    ],
    frame: {
      caption: "sotto le antiche stelle"
    }
  },
  neon: {
    intro: "Sound check! Cinque domande sui NEON TIDE. Quattro risposte giuste e la cornice del palco è tua. Nessuna pressione. Ok, forse un po'.",
    right: [
      "Sì! Sei un vero fan.",
      "Esatto! Bis!",
      "Proprio così. Fai parte del fan club?"
    ],
    wrong: [
      "Fuori tempo! È {answer}.",
      "No, {answer}. Non dire al nostro manager che l'ho detto.",
      "Ci eri quasi, ma è {answer}. Ripassa e riprova."
    ],
    match: [
      "Stessa risposta! Che sintonia da duetto.",
      "In perfetta sincronia, come un ritornello finale.",
      "Siamo coordinati. Ci scriverò una canzone su questo."
    ],
    differ: [
      "Io ho scelto {answer}. Saremmo un duetto bizzarro. Adoro.",
      "{answer} per me. Tonalità diversa, stessa canzone.",
      "Io sono andato su {answer}. Dimmi il perché dopo lo show."
    ],
    selfQuiz: [
      {
        text: "Cosa faccio un secondo prima di salire sul palco?",
        options: [
          "Prego",
          "Mangio una caramella",
          "Ti scrivo un messaggio",
          "Vado nel panico in silenzio"
        ]
      },
      {
        text: "La cosa che preferisco fare dopo un concerto?",
        options: [
          "Dormire",
          "Noodles a tarda notte",
          "Leggere le lettere dei fan",
          "Telefonarti"
        ]
      },
      {
        text: "Quale canzone canticchio continuamente?",
        options: [
          "Il nostro brano di debutto",
          "Un pezzo che nessuno ha ancora sentito",
          "Una ninna nanna",
          "La tua suoneria"
        ]
      },
      {
        text: "Cosa odio dei ritmi di lavoro?",
        options: [
          "Le chiamate all'alba",
          "Non avere tempo per te",
          "Il cibo degli aeroporti",
          "Niente, amo il mio lavoro"
        ]
      },
      {
        text: "Il mio talento segreto?",
        options: [
          "Cucinare",
          "Disegnare",
          "Addormentarmi ovunque",
          "Ricordare ogni singolo messaggio che mi mandi"
        ]
      },
      {
        text: "Dove mi nasconderei dai flash delle telecamere?",
        options: [
          "Nella sala prove",
          "In un bar minuscolo",
          "Sul tetto",
          "Insieme a te"
        ]
      },
      {
        text: "Cosa mi rende nervoso?",
        options: [
          "La TV in diretta",
          "Il silenzio",
          "Tu, qualche volta",
          "Nulla"
        ]
      }
    ],
    quiz: [
      {
        text: "Chi è la voce principale dei NEON TIDE?",
        options: [
          "Ezra",
          "Seren",
          "Kiro",
          "Haze"
        ]
      },
      {
        text: "Chi è il più giovane, il maknae?",
        options: [
          "Rio",
          "Minu",
          "Haze",
          "Kiro"
        ]
      },
      {
        text: "Chi ti manda basi inedite alle 3 del mattino?",
        options: [
          "Dex",
          "Juno",
          "Ari",
          "Ezra"
        ]
      },
      {
        text: "Chi continua a provare finché le luci non si spengono?",
        options: [
          "Seren",
          "Kiro",
          "Rio",
          "Cass"
        ]
      },
      {
        text: "Cass è la leader di quale gruppo?",
        options: [
          "NEON TIDE",
          "PRISM",
          "TIDEWAVE",
          "ECHO"
        ]
      },
      {
        text: "Quanti telefoni gestisce Juno?",
        options: [
          "Uno",
          "Due",
          "Tre",
          "Quattro"
        ]
      },
      {
        text: "Ari, la coreografa, conta sempre in...",
        options: [
          "Quattro",
          "Sei",
          "Otto",
          "Dieci"
        ]
      },
      {
        text: "Chi si sente un po' perso appena le luci si spengono?",
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
        line: "Qualcuno a {place} riconosce {name}. \"Ma quello non è... dei NEON TIDE?\" {name} si cala il cappellino sugli occhi.",
        choices: [
          {
            text: "Trascinalo in un vicolo laterale.",
            reply: "\"La mia salvezza.\" Ride senza fiato, tenendoti ancora la mano."
          },
          {
            text: "\"No, gli assomiglia e basta.\"",
            reply: "{name} annuisce serissimo. Il fan non è affatto convinto."
          },
          {
            text: "Chiedi al fan di farvi una foto insieme.",
            reply: "\"Finirai per mettermi nei guai.\" Eppure si mette in posa."
          }
        ]
      },
      {
        line: "Una canzone dei NEON TIDE inizia a risuonare a {place}. {name} diventa tutto rosso.",
        choices: [
          {
            text: "Canta a squarciagola.",
            reply: "\"Ti prego, smettila. Anzi no, continua.\" Sta ridendo di cuore."
          },
          {
            text: "\"È questa la tua parte?\"",
            reply: "\"...Sì. Non guardarmi.\" E tu lo fissi."
          },
          {
            text: "Fai finta di non averla mai sentita.",
            reply: "\"Wow. Ok. Colpo basso.\" Finge di rimanerci male. Più o meno."
          }
        ]
      }
    ],
    frame: {
      caption: "bis"
    }
  },
  tidepool: {
    intro: "Ordine in arrivo! Cinque domande sul bar e sulla nostra via. Rispondi a quattro ed è offerta la cornice del caffè.",
    right: [
      "Esatto! Prendi un biscotto.",
      "Sì! Ormai sei un cliente abituale.",
      "Giusto. Sol ne andrebbe fiera."
    ],
    wrong: [
      "Non proprio. È {answer}. Il caffè aiuta.",
      "No, è {answer}. Chiedi pure a chiunque al bancone.",
      "Vicino. {answer}. Andrà meglio la prossima volta."
    ],
    match: [
      "Uguale! Due del solito, allora.",
      "Siamo coordinati. Lo vado a dire a Sol.",
      "Guardaci. Come una vecchia coppia al tavolo nell'angolo."
    ],
    differ: [
      "Io ho preso {answer}. Ne parliamo davanti a un caffè?",
      "{answer} per me. Raccontami la tua davanti a un cornetto.",
      "Io sono andato su {answer}. Ordinazioni diverse, stesso tavolo."
    ],
    selfQuiz: [
      {
        text: "La mia ordinazione abituale?",
        options: [
          "Caffè nero",
          "Troppo zucchero",
          "Tè, sempre",
          "Qualsiasi cosa stia prendendo tu"
        ]
      },
      {
        text: "Cosa faccio in un giorno di pioggia libero dal lavoro?",
        options: [
          "Dormo",
          "Leggo al caffè",
          "Riparo qualcosa",
          "Ti telefono"
        ]
      },
      {
        text: "Cosa mi tiene sveglio di notte?",
        options: [
          "Il lavoro",
          "Niente, dormo benissimo",
          "Pensare a te",
          "Il caffè, a dirla tutta"
        ]
      },
      {
        text: "Il mio momento preferito al caffè?",
        options: [
          "L'apertura",
          "Il tranquillo pomeriggio",
          "La chiusura",
          "Quando varchi la porta"
        ]
      },
      {
        text: "Cosa dimentico sempre?",
        options: [
          "Le chiavi",
          "Di mangiare",
          "I compleanni",
          "Nulla che riguardi te"
        ]
      },
      {
        text: "Il mio cibo consolatorio?",
        options: [
          "Zuppa",
          "Cornetti caldi",
          "Noodles istantanei",
          "Qualsiasi cosa tu cucini"
        ]
      },
      {
        text: "Come dimostro che tengo a qualcuno?",
        options: [
          "Aggiusto le cose",
          "Porto qualcosa da mangiare",
          "Ricordo i dettagli",
          "Resto semplicemente lì"
        ]
      }
    ],
    quiz: [
      {
        text: "Chi è la proprietaria del Tidepool Café?",
        options: [
          "Sol",
          "Ivy",
          "Nadia",
          "Ren"
        ]
      },
      {
        text: "Chi ti tiene da parte il primo cornetto del mattino?",
        options: [
          "Marco",
          "Ren",
          "Hugo",
          "Gideon"
        ]
      },
      {
        text: "Marco ordina sempre due caffè e...",
        options: [
          "Li beve entrambi",
          "Ne rovescia uno",
          "Ne regala uno",
          "Ne dimentica uno"
        ]
      },
      {
        text: "Chi porta ogni settimana un cane salvato dal canile?",
        options: [
          "Cole",
          "Lucas",
          "Adrian",
          "Hugo"
        ]
      },
      {
        text: "Chi fa i turni di notte al pronto soccorso?",
        options: [
          "Dott. Lucas Hale",
          "Nadia",
          "Gideon",
          "Cole"
        ]
      },
      {
        text: "Cosa ti infila Ivy nella borsa?",
        options: [
          "Un bigliettino",
          "Un fiore",
          "Un biscotto",
          "Una chiave"
        ]
      },
      {
        text: "Chi ripara gratis il vecchio scooter del caffè?",
        options: [
          "Marco",
          "Adrian",
          "Cole",
          "Ren"
        ]
      },
      {
        text: "Cosa fa Adrian quando è concentrato?",
        options: [
          "Fischietta",
          "Tamburella sul tavolo",
          "Mordicchia la penna",
          "Canticchia"
        ]
      }
    ],
    dateRounds: [
      {
        line: "La radio del locale trasmette un vecchio classico a {place}. {name} spinge una seconda tazza verso di te. \"Ho ordinato per te.\"",
        choices: [
          {
            text: "\"Ti sei ricordato la mia ordinazione.\"",
            reply: "\"Ricordo ogni minima cosa su di te. Sta diventando un problema.\""
          },
          {
            text: "Scambia le tazze con lui.",
            reply: "\"Ehi!\" Assaggia il tuo e fa una smorfia. Tu ridi."
          },
          {
            text: "\"Volevo qualcos'altro.\"",
            reply: "\"Sarà per la prossima volta, allora.\" Lo scrive su un tovagliolo."
          }
        ]
      },
      {
        line: "Un cane randagio si avvicina verso {place} e si siede sul piede di {name}.",
        choices: [
          {
            text: "Trovate un nome per il cane insieme.",
            reply: "Discutete per dieci minuti. Al cane non importa nulla. Perfetto."
          },
          {
            text: "Dagli l'ultimo morso della tua brioche.",
            reply: "\"Ora non se ne andrà mai più,\" dice {name}, estasiato."
          },
          {
            text: "Scaccialo via.",
            reply: "\"Che crudeltà,\" ti dice {name}, e gli gratta le orecchie."
          }
        ]
      }
    ],
    frame: {
      caption: "due cappuccini"
    }
  }
};

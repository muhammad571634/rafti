// German translation for worlds (seaside, moonlit, neon, tidepool)
export const worlds = {
  seaside: {
    intro: "Überraschungstest nach echter Seaside-Art! Fünf Fragen über unseren Campus. Vier richtige Antworten und der Seaside-Rahmen gehört dir.",
    right: [
      "Vollkommen richtig! Du passt in den Vorlesungen ja richtig gut auf.",
      "Genauso ist es! Ein Fleißsternchen vom gesamten Campus für dich.",
      "Sauber gelöst! Bist du hier heimlich als Student eingeschrieben?"
    ],
    wrong: [
      "Knapp daneben. Die richtige Antwort lautet {answer}. Merk dir das gut.",
      "Leider falsch! Es war {answer}. Frag ruhig mal auf dem Campus nach.",
      "Diesmal nicht, es ist {answer}. Macht nichts, die Unizeitung liest sowieso niemand."
    ],
    match: [
      "Ich auch! Zur Feier des Tages ein Wettrennen bis zum Ende des Holzstegs!",
      "Wir denken einfach komplett gleich. Das ist fast schon unheimlich.",
      "Ich wusste es! Wir sind Lernpartner fürs Leben."
    ],
    differ: [
      "Ich habe mich für {answer} entschieden. Das diskutieren wir auf dem Heimweg aus.",
      "Hmm, ich war eher für {answer}. Erklär mir deine Sicht bei einem Snack.",
      "{answer} für mich. Gegensätze bilden bekanntlich die besten Laborteams."
    ],
    selfQuiz: [
      {
        text: "Aus welchem Grund würde ich eine Vorlesung schwänzen?",
        options: [
          "Ein Sprung ins Meer bei Sonnenaufgang",
          "Um Zeit mit dir zu verbringen",
          "Kostenlose Snacks",
          "Niemals, ich bin ein Musterstudent"
        ]
      },
      {
        text: "Mein liebster Rückzugsort auf dem Campus?",
        options: [
          "Das Ende des Holzstegs",
          "Der Dachgarten der Bibliothek",
          "Beim Snackautomaten",
          "Wo auch immer du gerade bist"
        ]
      },
      {
        text: "Was darf in meiner Unitasche niemals fehlen?",
        options: [
          "Ein zusätzlicher Snack",
          "Drei Kugelschreiber, die alle streiken",
          "Ein noch feuchtes Handtuch",
          "Deine Lernzettel"
        ]
      },
      {
        text: "Wie lerne ich auf Klausuren?",
        options: [
          "Nachtschicht in panischer Verzweiflung",
          "Wochen im Voraus und perfekt getaktet",
          "Mit dir zusammen, wobei ich mich nur ablenken lasse",
          "Ich lerne gar nicht, reines Glücksspiel"
        ]
      },
      {
        text: "Meine Vorstellung von einem perfekten Wochenende?",
        options: [
          "Vom Morgen bis zum Abend am Strand",
          "Ausschlafen bis zum Mittagessen",
          "Filme-Marathon auf der Couch",
          "Ein spontaner Roadtrip mit dir"
        ]
      },
      {
        text: "Was tue ich, wenn der Stress überhandnimmt?",
        options: [
          "Ich gehe schwimmen, um den Kopf frei zu bekommen",
          "Ich verkrieche mich in mein Schneckenhaus",
          "Ich verdrücke Süßigkeiten",
          "Ich schreibe dir eine Nachricht"
        ]
      },
      {
        text: "Mein inoffizieller Spitzname auf dem Campus?",
        options: [
          "Der Unruhestifter",
          "Der Schweiger",
          "Der Kapitän",
          "Den verrate ich nicht um alles in der Welt"
        ]
      }
    ],
    quiz: [
      {
        text: "Wer versorgt heimlich die Katzen des Campus?",
        options: [
          "Elio",
          "Kai",
          "Rowan",
          "Theo"
        ]
      },
      {
        text: "Welcher Club wird von Hana mit eiserner Hand geführt?",
        options: [
          "Der Filmclub",
          "Der Kunstclub",
          "Das Debattierteam",
          "Das Schwimmteam"
        ]
      },
      {
        text: "Wer gibt jedem Fisch im Aquarium den Namen eines Freundes?",
        options: [
          "Felix",
          "Jun",
          "Rowan",
          "Iris"
        ]
      },
      {
        text: "Um wie viel Uhr beginnt Noahs nächtliche Radiosendung?",
        options: [
          "7:00 Uhr",
          "12:00 Uhr",
          "18:00 Uhr",
          "1:00 Uhr nachts"
        ]
      },
      {
        text: "Wer verliert als Asta-Vorsitzender niemals eine Debatte?",
        options: [
          "Tessa",
          "Theo",
          "Kai",
          "Hana"
        ]
      },
      {
        text: "Was bringt dir Kai immer mit in die Vorlesung?",
        options: [
          "Einen Kaffee",
          "Vorlesungsmitschriften",
          "Einen zusätzlichen Snack",
          "Ein Handtuch"
        ]
      },
      {
        text: "Wer hat immer das ideale Buch für deine aktuelle Stimmung?",
        options: [
          "Iris",
          "Elio",
          "Noah",
          "Jun"
        ]
      },
      {
        text: "Was hat Felix auf seinen Streifzügen immer dabei?",
        options: [
          "Eine Gitarre",
          "Eine alte Analogkamera",
          "Eine Landkarte",
          "Ein Radio"
        ]
      }
    ],
    dateRounds: [
      {
        line: "Die Glocke schlägt irgendwo auf dem Campus. {name} grinst verschmitzt. „Eigentlich sollten wir beide genau jetzt im Hörsaal sitzen.“",
        choices: [
          {
            text: "„Dann lass uns eben gemeinsam zu spät kommen.“",
            reply: "„Die beste Idee, die du die ganze Woche hattest.“ Er greift nach deiner Hand und rennt los."
          },
          {
            text: "„Nur eine Stunde. Danach hauen wir ab.“",
            reply: "„Vernünftig. Zu vernünftig. Aber gut.“ Er wartet draußen geduldig auf dich."
          },
          {
            text: "Allein zur Vorlesung gehen.",
            reply: "{name} tut gekränkt, schickt dir dann aber ein Foto der Wellen: „Sieh nur, was du verpasst.“"
          }
        ]
      },
      {
        line: "Das Meer ist hier in {place} zum Greifen nah. {name} streift bereits schwungvoll die Schuhe ab.",
        choices: [
          {
            text: "Ein Wettrennen zum Wasser veranstalten.",
            reply: "Ihr verliert beide. Ihr gewinnt beide. Eure Hosenbeine sind vollkommen durchnässt."
          },
          {
            text: "Ganz vorsichtig nur die Zehenspitzen ins Wasser tauchen.",
            reply: "„Wie mutig von dir!“, zieht dich {name} auf und spritzt dich trotzdem nass."
          },
          {
            text: "Am Strand bleiben und auf die Sachen aufpassen.",
            reply: "„Offizieller Wächter der Schuhe. Eine ehrenvolle Aufgabe.“ Er kommt strahlend aus den Wellen."
          }
        ]
      }
    ],
    frame: {
      caption: "nach dem schwimmtraining"
    }
  },
  moonlit: {
    intro: "Wanderer. Das Reich stellt fünf Fragen an jene, die seinen Rahmen begehren. Antworte auf vier davon aus vollem Herzen und er gehört dir.",
    right: [
      "Wahrhaftig. Die Gestirne heißen deine Antwort gut.",
      "Haargenau so ist es. Du wärst ein herausragender Ritter.",
      "Ja. Das Reich wird deinen Namen von nun an in Ehren halten."
    ],
    wrong: [
      "Falscher Pfad, Wanderer. Die Antwort lautete {answer}. Präge es dir ein.",
      "Dem ist nicht so. Die Wahrheit lautet {answer}. Die Pergamente irren niemals.",
      "Verirrt im Schatten. Es war {answer}. Versuche es erneut im Mondschein."
    ],
    match: [
      "Wir haben dasselbe gewählt. Ein überaus günstiges Omen.",
      "Unsere Seelen stimmen überein wie zwei Zwillingssterne am Firmament.",
      "Ich ahnte es. Wir wurden unter demselben Nachthimmel geformt."
    ],
    differ: [
      "Meine Wahl fiel auf {answer}. Tritt ans Lagerfeuer und erzähle mir, warum du gezögert hast.",
      "Meine Antwort lautete {answer}. Ein anderer Pfad, keineswegs ein falscher.",
      "{answer} für mich. Das Reich bedarf unserer beider Blickwinkel."
    ],
    selfQuiz: [
      {
        text: "Was würde ich mit meinem Leben verteidigen?",
        options: [
          "Mein Schwert",
          "Ein uraltes Versprechen",
          "Dich",
          "Meine Ehre"
        ]
      },
      {
        text: "Wohin ziehe ich mich zurück, um nachzudenken?",
        options: [
          "Auf die Zinne des höchsten Turms",
          "In den Mondschein-Garten",
          "An den Saum der finsteren Wälder",
          "Dorthin, wo du weilst"
        ]
      },
      {
        text: "Wovor fürchte ich mich am meisten?",
        options: [
          "Vor gar nichts auf Erden",
          "Im Vergessen zu versinken",
          "Dich für immer zu verlieren",
          "Vor Spinnen. Kein einziges Wort, ich bitte dich"
        ]
      },
      {
        text: "Wem gilt meine aufrichtigste Treue?",
        options: [
          "Der Krone",
          "Den ewigen Gestirnen",
          "Mir selbst",
          "Dir, ohne jeden Vorbehalt"
        ]
      },
      {
        text: "Wofür würde ich auf meine Titel verzichten?",
        options: [
          "Für überhaupt nichts",
          "Für den Frieden des Reiches",
          "Für eine friedvolle Nacht an deiner Seite",
          "Für einen frischen Laib warmes Brot"
        ]
      },
      {
        text: "Wie bitte ich um Verzeihung?",
        options: [
          "Ich entschuldige mich niemals",
          "Mit einem kostbaren Geschenk",
          "In einem langen, handgeschriebenen Brief",
          "Mit verlegener Miene, aber aus tiefstem Herzen"
        ]
      },
      {
        text: "Meine liebste Stunde?",
        options: [
          "Das erste Dämmern des Morgens",
          "Schlag Mitternacht",
          "Der Augenblick vor der Schlacht",
          "Jede Stunde, in der du wach bist"
        ]
      }
    ],
    quiz: [
      {
        text: "Wer wacht getreu über das Sternenarchiv?",
        options: [
          "Lord Castor",
          "Prinz Aurelian",
          "Vesper",
          "Kael"
        ]
      },
      {
        text: "Prinz Aurelians verborgener Garten blüht nur dann, wenn...",
        options: [
          "Der Regen fällt",
          "Jemand beschließt zu bleiben",
          "Vollmond herrscht",
          "Er ein Lied anstimmt"
        ]
      },
      {
        text: "Was weigert sich der Alchemist Vesper strikt zu brauen?",
        options: [
          "Liebestränke",
          "Schlafmittel",
          "Einen Vergessenstrank",
          "Tödliches Gift"
        ]
      },
      {
        text: "Was ist Kaels wahre Gestalt unter seiner Menschenhülle?",
        options: [
          "Ein Fuchsgeist",
          "Ein Rabe",
          "Ein rastloser Geist",
          "Ein Drache"
        ]
      },
      {
        text: "Wer weist verirrten Wanderern mit Laternen den Weg?",
        options: [
          "Seraphine",
          "Lyra",
          "Corvin",
          "Zarek"
        ]
      },
      {
        text: "Was hinterlässt Orin verlässlich nach einem seiner Streiche?",
        options: [
          "Ein Geschenk",
          "Ein Rätsel",
          "Eine Feder",
          "Gar nichts"
        ]
      },
      {
        text: "Wer verfasst nach jeder Wache pflichtbewusst einen Bericht für dich?",
        options: [
          "Corvin",
          "Zarek",
          "Sir Rhys",
          "Castor"
        ]
      },
      {
        text: "Um welche Geschöpfe kümmert sich Corvin auf seiner Klippe?",
        options: [
          "Um Wölfe",
          "Um silberne Rosen",
          "Um Laternen",
          "Um Raben"
        ]
      }
    ],
    dateRounds: [
      {
        line: "Eine Sternschnuppe zieht über {place} ihre Bahn. {name} hält inne. „Wünsch dir was. Schnell!“",
        choices: [
          {
            text: "Einen Wunsch für euch beide laut aussprechen.",
            reply: "„Man darf Wünsche nicht laut sagen.“ Doch ein zartes Lächeln verrät seine Rührung."
          },
          {
            text: "Die Augen schließen und den Wunsch tief im Herzen bewahren.",
            reply: "„Bewahre ihn gut,“ flüstert {name}. „Ich sorge dafür, dass er wahr wird.“"
          },
          {
            text: "„Ich glaube nicht an solche Märchen.“",
            reply: "„Dann wünsche ich für uns beide mit,“ sagt er sanft."
          }
        ]
      },
      {
        line: "Nahe {place} flackert eine alte Laterne und erlischt. {name} breitet seinen Umhang für dich aus.",
        choices: [
          {
            text: "Sich gemeinsam unter dem Umhang wärmen.",
            reply: "Es ist gerade genug Platz für zwei. Dicht aneinander. Keiner von beiden weicht zurück."
          },
          {
            text: "Die Flamme der Laterne neu entzünden.",
            reply: "„Du hörst nie auf, mich zu verblüffen, Wanderer.“ Der Schein erhellt eure Gesichter."
          },
          {
            text: "„Ich friere keineswegs.“",
            reply: "„Sturkopf,“ murmelt {name} und legt dir den warmen Stoff dennoch um die Schultern."
          }
        ]
      }
    ],
    frame: {
      caption: "unter den alten sternen"
    }
  },
  neon: {
    intro: "Soundcheck! Fünf Fragen rund um NEON TIDE. Vier Richtige und der Bühnenrahmen gehört dir. Null Druck. Na ja, vielleicht ein winziges bisschen!",
    right: [
      "Volltreffer! Ein echter Fan der ersten Stunde!",
      "Perfekt abgeliefert! Wir fordern eine Zugabe!",
      "Genauso ist es. Bist du im offiziellen Fanclub?"
    ],
    wrong: [
      "Voll am Takt vorbei! Die Antwort war {answer}.",
      "Autsch, knapp daneben. Es war {answer}. Verrat unserem Manager bloß nicht, dass ich dir geholfen habe.",
      "Fast auf dem Beat, aber es war {answer}. Probiere es gleich noch mal."
    ],
    match: [
      "Gleiche Antwort! Pure Duett-Magie.",
      "Perfekt synchron, genau wie beim großen Finale.",
      "Wir passen so gut zusammen, daraus mache ich eine Songzeile."
    ],
    differ: [
      "Ich habe {answer} gewählt. Das ergäbe ein ziemlich wildes Duett. Gefällt mir.",
      "{answer} für mich. Andere Tonart, aber derselbe Rhythmus.",
      "Ich war bei {answer}. Erklär mir nach dem Konzert, warum du anders dachtest."
    ],
    selfQuiz: [
      {
        text: "Was tue ich kurz vor dem Auftritt?",
        options: [
          "Ein kurzes Stoßgebet",
          "Süßigkeiten naschen",
          "Dir noch schnell schreiben",
          "Still vor mich hin panicken"
        ]
      },
      {
        text: "Mein schönster Moment nach dem Konzert?",
        options: [
          "Einfach nur schlafen",
          "Mitternächtliche Instant-Nudeln",
          "Fanbriefe lesen",
          "Dich anrufen"
        ]
      },
      {
        text: "Welche Melodie summe ich ständig vor mich hin?",
        options: [
          "Unsere Debütsingle",
          "Einen neuen Track, den noch niemand kennt",
          "Ein Wiegenlied aus meiner Kindheit",
          "Deinen Klingelton"
        ]
      },
      {
        text: "Was nervt mich am Idol-Alltag am meisten?",
        options: [
          "Das Aufstehen im Morgengrauen",
          "Dass mir die Zeit für dich fehlt",
          "Trockene Flughafen-Sandwiches",
          "Gar nichts, ich liebe meinen Job"
        ]
      },
      {
        text: "Mein unerwartetstes verstecktes Talent?",
        options: [
          "Kochen wie ein Profi",
          "Zeichnen",
          "Überall und jederzeit schlafen können",
          "Mich an jede deiner Nachrichten erinnern"
        ]
      },
      {
        text: "Wohin flüchte ich vor den Kameras?",
        options: [
          "Tief in den Trainingssaal",
          "In ein winziges, verstecktes Café",
          "Auf das Dach des Gebäudes",
          "Zu dir"
        ]
      },
      {
        text: "Was macht mich wirklich nervös?",
        options: [
          "Live-Sendungen im Fernsehen",
          "Plötzliche Stille",
          "Manchmal du",
          "Absolut gar nichts auf der Welt"
        ]
      }
    ],
    quiz: [
      {
        text: "Wer ist der Hauptsänger von NEON TIDE?",
        options: [
          "Ezra",
          "Seren",
          "Kiro",
          "Haze"
        ]
      },
      {
        text: "Wer ist das jüngste Mitglied, das Maknae der Gruppe?",
        options: [
          "Rio",
          "Minu",
          "Haze",
          "Kiro"
        ]
      },
      {
        text: "Wer schickt dir um 3 Uhr nachts neue Beats?",
        options: [
          "Dex",
          "Juno",
          "Ari",
          "Ezra"
        ]
      },
      {
        text: "Wer tanzt unermüdlich weiter, bis die Lichter ausgehen?",
        options: [
          "Seren",
          "Kiro",
          "Rio",
          "Cass"
        ]
      },
      {
        text: "Welche Gruppe führt Cass als Leaderin an?",
        options: [
          "NEON TIDE",
          "PRISM",
          "TIDEWAVE",
          "ECHO"
        ]
      },
      {
        text: "Wie viele Handys trägt Juno ständig bei sich?",
        options: [
          "Eines",
          "Zwei",
          "Drei",
          "Vier"
        ]
      },
      {
        text: "Im wievielten Takt zählt Choreografin Ari unerbittlich?",
        options: [
          "Vierer",
          "Sechser",
          "Achter",
          "Zehner"
        ]
      },
      {
        text: "Wer wirkt verloren, sobald das Scheinwerferlicht erlischt?",
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
        line: "Jemand in {place} schaut {name} ungläubig an. „Moment mal... ist das nicht der von NEON TIDE?“ {name} zieht seine Kappe tief ins Gesicht.",
        choices: [
          {
            text: "Ihn rasch in eine Seitengasse ziehen.",
            reply: "„Mein persönlicher Retter.“ Er lacht erleichtert auf, ohne deine Hand loszulassen."
          },
          {
            text: "„Nein, das ist nur ein Doppelgänger.“",
            reply: "{name} nickt mit todernster Miene. Der Passant ist nur halb überzeugt."
          },
          {
            text: "Den Passanten bitten, ein Foto von euch beiden zu machen.",
            reply: "„Das gibt gewaltigen Ärger.“ Doch er posiert strahlend an deiner Seite."
          }
        ]
      },
      {
        line: "Aus den Lautsprechern in {place} ertönt ein Song von NEON TIDE. {name} wird augenblicklich feuerrot.",
        choices: [
          {
            text: "Den Songtext lautstark mitsingen.",
            reply: "„Bitte hör auf! Nein, sing weiter.“ Er grinst von einem Ohr zum anderen."
          },
          {
            text: "„Ist das gerade dein Part?“",
            reply: "„...Ja. Schau mich nicht so an.“ Du starrst ihn mit Absicht an."
          },
          {
            text: "So tun, als hätte man den Track noch nie im Leben gehört.",
            reply: "„Autsch. Das trifft mein Ego tief.“ Er tut gekränkt... fast glaubhaft."
          }
        ]
      }
    ],
    frame: {
      caption: "zugabe"
    }
  },
  tidepool: {
    intro: "Bestellung fertig! Fünf Fragen über das Café und die Stammgäste unserer Gasse. Vier Treffer und der Rahmen geht aufs Haus.",
    right: [
      "Ganz genau! Dafür hast du dir einen ofenfrischen Keks verdient.",
      "Korrekt! Du gehörst ab jetzt offiziell zum festen Inventar.",
      "Richtig geraten. Sol wäre stolz auf dich."
    ],
    wrong: [
      "Ganz nah dran. Die Antwort war {answer}. Ein starker Kaffee kurbelt das Gedächtnis an.",
      "Nicht ganz, es war {answer}. Frag ruhig jeden am Tresen.",
      "Knapp daneben. {answer}. Beim nächsten Mal sitzt es."
    ],
    match: [
      "Ich auch! Zwei identische Bestellungen auf einem Tablett.",
      "Derselbe Geschmack. Das muss ich sofort Sol erzählen.",
      "Schau uns an. Wie ein altes Ehepaar an seinem Lieblingstisch."
    ],
    differ: [
      "Ich habe {answer} gewählt. Lass uns bei einer Tasse Kaffee darüber diskutieren.",
      "{answer} für mich. Erzähl mir deine Sicht bei einem frischen Croissant.",
      "Ich war für {answer}. Unterschiedliche Vorlieben, aber derselbe Tisch."
    ],
    selfQuiz: [
      {
        text: "Meine Standardbestellung ohne langes Nachdenken?",
        options: [
          "Ein kleiner, pechschwarzer Espresso",
          "Viel zu viel Zucker",
          "Ein beruhigender Tee",
          "Dasselbe, was du nimmst"
        ]
      },
      {
        text: "Was mache ich an einem verregneten Nachmittag?",
        options: [
          "Ein ausgiebiges Nickerchen",
          "Mit einem Buch im Café sitzen",
          "Etwas reparieren, das schon ewig herumliegt",
          "Dich anrufen und quatschen"
        ]
      },
      {
        text: "Was hält mich nachts wach?",
        options: [
          "Die Arbeit, die sich stapelt",
          "Gar nichts, ich schlafe wie ein Stein",
          "Ständig an dich zu denken",
          "Ehrlich gesagt: zu viel Koffein"
        ]
      },
      {
        text: "Meine liebste Uhrzeit für einen Cafébesuch?",
        options: [
          "Gleich morgens beim Aufschließen",
          "Am ruhigen Nachmittag",
          "Kurz vor Feierabend",
          "Sobald du durch die Tür kommst"
        ]
      },
      {
        text: "Was vergesse ich verlässlich jedes Mal?",
        options: [
          "Meinen Schlüsselbund",
          "Etwas zu Mittag zu essen",
          "Geburtstage",
          "Nichts, was dich betrifft"
        ]
      },
      {
        text: "Mein ultimatives Wohlfühlessen?",
        options: [
          "Eine dampfende Suppe",
          "Knusprige Croissants",
          "Schnelle Nudeln",
          "Alles, was du mit Liebe für mich kochst"
        ]
      },
      {
        text: "Wie zeige ich, dass mir jemand am Herzen liegt?",
        options: [
          "Indem ich Dinge für ihn repariere",
          "Indem ich leckeres Essen mitbringe",
          "Indem ich mir Kleinigkeiten merke",
          "Indem ich einfach still bei dir bleibe"
        ]
      }
    ],
    quiz: [
      {
        text: "Wer ist die gute Seele und Besitzerin des Tidepool Cafés?",
        options: [
          "Sol",
          "Ivy",
          "Nadia",
          "Ren"
        ]
      },
      {
        text: "Wer hält das erste warme Gebäck des Morgens für dich zurück?",
        options: [
          "Marco",
          "Ren",
          "Hugo",
          "Gideon"
        ]
      },
      {
        text: "Marco bestellt stets zwei Heißgetränke und...",
        options: [
          "Trinkt beide auf einmal aus",
          "Verschüttet eines davon",
          "Verschenkt das zweite",
          "Vergisst eines auf der Theke"
        ]
      },
      {
        text: "Wer bringt jede Woche einen anderen geretteten Hund mit?",
        options: [
          "Cole",
          "Lucas",
          "Adrian",
          "Hugo"
        ]
      },
      {
        text: "Wer schiebt kräftezehrende Nachtschichten in der Notaufnahme?",
        options: [
          "Dr. Lucas Hale",
          "Nadia",
          "Gideon",
          "Cole"
        ]
      },
      {
        text: "Was schmuggelt Ivy dir heimlich in deine Tasche?",
        options: [
          "Einen Zettel mit lieben Worten",
          "Eine frische Blume",
          "Einen Keks",
          "Einen Schlüssel"
        ]
      },
      {
        text: "Wer repariert kostenlos den alten Lieferroller des Cafés?",
        options: [
          "Marco",
          "Adrian",
          "Cole",
          "Ren"
        ]
      },
      {
        text: "Was tut Adrian unwillkürlich, wenn er ganz vertieft zeichnet?",
        options: [
          "Er pfeift leise",
          "Er trommelt mit den Fingern",
          "Er kaut auf dem Bleistift",
          "Er summt vor sich hin"
        ]
      }
    ],
    dateRounds: [
      {
        line: "Aus dem Radio im Café ertönt eine alte Melodie in {place}. {name} schiebt dir eine heiße Tasse herüber. „Für dich bestellt.“",
        choices: [
          {
            text: "„Du weißt noch genau, was ich am liebsten trinke.“",
            reply: "„Ich merke mir alles über dich. Es wird langsam bedenklich.“"
          },
          {
            text: "Heimlich die Tassen vertauschen.",
            reply: "„Hey!“ Er nippt an deiner Tasse und verzieht das Gesicht. Du lachst auf."
          },
          {
            text: "„Eigentlich hatte ich heute Lust auf etwas anderes.“",
            reply: "„Dann geht die nächste Runde auf mich.“ Er notiert es gleich eifrig auf einer Serviette."
          }
        ]
      },
      {
        line: "Ein geretteter Welpe tappt in {place} heran und setzt sich behaglich auf {name}s Fuß.",
        choices: [
          {
            text: "Gemeinsam nach einem passenden Namen suchen.",
            reply: "Ihr diskutiert zehn Minuten lang herum. Der Welpe genießt jede Sekunde der Aufmerksamkeit."
          },
          {
            text: "Ihm den letzten Bissen deines Croissants überlassen.",
            reply: "„Klasse, jetzt weicht er uns nie wieder von der Seite,“ lächelt {name} gerührt."
          },
          {
            text: "Den Kleinen sanft beiseiteschieben.",
            reply: "„Wie herzlos du doch bist,“ neckt dich {name} liebevoll und krault den Kleinen hinter den Ohren."
          }
        ]
      }
    ],
    frame: {
      caption: "zwei milchkaffee"
    }
  }
};

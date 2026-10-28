export const dateThemes = {
  openers: {
    friendly: [
      [
        {
          text: "Ridi e stai al gioco.",
          reply: "{name} sorride a trentadue denti. \"Bene. È già una splendida giornata.\""
        },
        {
          text: "\"È stata una tua idea?\"",
          reply: "\"Forse. Ti piace?\" Sembra un po' fiero."
        },
        {
          text: "Controlli il telefono per un secondo.",
          reply: "{name} aspetta, poi ti dà una gomitata. \"Ehi. Sono proprio qui davanti a te.\""
        }
      ],
      [
        {
          text: "\"Ok, ci sto. Fai strada.\"",
          reply: "\"Finalmente qualcuno che si fida di me.\" {name} si mette in marcia."
        },
        {
          text: "Fai una battuta su questa cosa.",
          reply: "{name} sbuffa una risata. \"Non fai ridere.\" Eppure sta ridendo."
        },
        {
          text: "\"Possiamo semplicemente sederci un attimo?\"",
          reply: "\"Certo.\" Si siede accanto a te, vicino ma non troppo."
        }
      ]
    ],
    flirty: [
      [
        {
          text: "\"Hai organizzato tutto questo solo per vedermi, vero?\"",
          reply: "\"Ci hai messo parecchio a notarlo.\" {name} non distoglie lo sguardo."
        },
        {
          "text": "Dagli una spallata affettuosa.",
          reply: "Ricambia la spallata, poi lascia la sua spalla appoggiata alla tua."
        },
        {
          text: "Fai finta che non ti importi nulla.",
          reply: "\"Ma certo che non ti importa.\" {name} sorride come chi la sa lunga."
        }
      ],
      [
        {
          text: "Sostieni il suo sguardo un secondo di troppo.",
          reply: "{name} abbassa lo sguardo per primo. Le sue orecchie diventano un po' rosse."
        },
        {
          text: "\"Sei proprio carino oggi.\"",
          reply: "\"Solo oggi?\" Sta facendo del suo meglio per trattenere il sorriso."
        },
        {
          text: "Parla del tempo.",
          reply: "\"Il meteo. Davvero?\" {name} ride di te, dolcemente."
        }
      ]
    ],
    sweet: [
      [
        {
          text: "Prendigli la mano.",
          reply: "{name} intreccia le sue dita con le tue senza dire una parola."
        },
        {
          text: "\"Sono felice che sia tu.\"",
          reply: "\"Anch'io,\" sussurra a bassa voce. \"Ogni singola volta.\""
        },
        {
          text: "\"Non restiamo troppo a lungo.\"",
          reply: "\"Già adesso?\" {name} sembra un po' triste, poi annuisce."
        }
      ],
      [
        {
          text: "Appoggia la testa sulla sua spalla.",
          reply: "Si immobilizza all'istante, come se tu potessi volare via al minimo movimento."
        },
        {
          text: "\"Raccontami della tua giornata.\"",
          reply: "{name} inizia a parlare e non si ferma più. Lo adori."
        },
        {
          text: "Rimani in silenzio per un po'.",
          reply: "\"Il silenzio è bello con te,\" dice dopo un momento."
        }
      ]
    ]
  },
  shared: [
    {
      line: "Da qualche parte vicino a {place}, un musicista di strada intona una canzone che conoscete entrambi.",
      choices: [
        {
          text: "Canta insieme a lui, stonando.",
          reply: "{name} si unisce a te, ancora più stonato. Il musicista si arrende e si mette a ridere."
        },
        {
          text: "Lascia una moneta e chiedine un'altra.",
          reply: "\"Qualcosa di lento,\" aggiunge {name}, guardandoti negli occhi."
        },
        {
          text: "Continua a camminare.",
          reply: "{name} canticchia la canzone per i successivi dieci minuti."
        }
      ]
    },
    {
      line: "{name} ha improvvisamente una fame da lupi. \"Cibo. Subito. È un'emergenza.\"",
      choices: [
        {
          text: "Condividi l'ultimo morso del tuo snack.",
          reply: "\"Sei la mia salvezza.\" Lo divora in un sol boccone."
        },
        {
          text: "Fai una gara fino alla bancarella più vicina.",
          reply: "Vinci tu. {name} sostiene di averti lasciato vincere. Non è vero."
        },
        {
          text: "\"Hai appena mangiato.\"",
          reply: "\"Era un'ora fa.\" Ti guarda come se l'avessi tradito."
        }
      ]
    },
    {
      line: "Inizia a piovigginare a {place}. Nessuno dei due ha un ombrello.",
      choices: [
        {
          text: "Condividete una giacca sopra le vostre teste.",
          reply: "Finite vicinissimi. A nessuno dei due dispiace."
        },
        {
          text: "Correte a ripararvi insieme.",
          reply: "{name} ti afferra la mano per non farti scivolare."
        },
        {
          text: "Resta fermo sotto la pioggia. È solo acqua.",
          reply: "\"Sei strano,\" dice {name}, e resta lì sotto con te."
        }
      ]
    },
    {
      line: "{name} vuole fare una foto a {place}. \"Per ricordo,\" dice.",
      choices: [
        {
          text: "Fai una smorfia buffa.",
          reply: "Ride così tanto che la foto viene tutta mossa. La tiene lo stesso."
        },
        {
          text: "Fai un bel sorriso per una volta.",
          reply: "\"Wow. Questa la incornicio.\" {name} la salva due volte."
        },
        {
          text: "\"Odio le foto.\"",
          reply: "\"Una sola. Solo una.\" Gli concedi uno scatto."
        }
      ]
    },
    {
      line: "Un bambino vicino a {place} vi chiede se siete fidanzati.",
      choices: [
        {
          text: "\"Chiedilo a lui.\"",
          reply: "{name} balbetta qualcosa. Il bambino è entusiasta."
        },
        {
          text: "\"Migliori amici. Per ora.\"",
          reply: "{name} inarca un sopracciglio su quel \"per ora\"."
        },
        {
          text: "\"Ma figurati!\"",
          reply: "\"Wow. Va bene.\" {name} fa finta di rimanerci male. Quasi del tutto finta."
        }
      ]
    },
    {
      line: "Trovate una panchina tranquilla a {place}. {name} ti chiede a cosa stai pensando.",
      choices: [
        {
          text: "\"A te, sinceramente.\"",
          reply: "Distoglie lo sguardo e sorride nel vuoto."
        },
        {
          text: "\"A quanto è bella questa giornata.\"",
          reply: "\"Lo è davvero,\" concorda {name}. \"Dovremmo farlo più spesso.\""
        },
        {
          text: "\"Alla cena.\"",
          reply: "\"Giusto. Giustissimo.\" Ora anche {name} sta pensando alla cena."
        }
      ]
    }
  ],
  moodRounds: {
    friendly: [
      {
        line: "{name} ti lancia una sfida: il primo che ride a {place} paga da bere.",
        choices: [
          {
            text: "Fai la tua faccia più assurda.",
            reply: "{name} resiste due secondi. \"Sleale! Quella era un'arma illegale.\""
          },
          {
            text: "Racconta la tua battuta peggiore.",
            reply: "Geme, poi scoppia a ridere lo stesso. \"Odio aver riso per questo.\""
          },
          {
            text: "Ridi per primo di proposito.",
            reply: "\"Mi hai appena lasciato vincere?\" Ti compra da bere comunque."
          }
        ]
      },
      {
        line: "{name} ti racconta la storia della peggiore giornata della sua vita, ed è spassosissima.",
        choices: [
          {
            text: "Racconta la tua in risposta.",
            reply: "\"Impossibile. Hai vinto tu.\" Si sta asciugando le lacrime dal ridere."
          },
          {
            text: "Ridi finché non ti manca il fiato.",
            reply: "\"Non faceva COSÌ tanto ridere.\" Invece sì."
          },
          {
            text: "\"Sembra terribile.\"",
            reply: "\"Lo è stato. Ma adesso fa ridere.\" Alza le spalle e sorride."
          }
        ]
      }
    ],
    flirty: [
      {
        line: "{name} ti toglie qualcosa dalla guancia. \"Un ciglio. Esprimi un desiderio.\"",
        choices: [
          {
            text: "\"Si è già avverato.\"",
            reply: "{name} non sa cosa ribattere. Per una volta."
          },
          {
            text: "Soffialo verso di lui.",
            reply: "\"Hai appena desiderato me?\" Fa un sorrisetto malizioso."
          },
          {
            text: "\"Non credo nei desideri.\"",
            reply: "\"Allora esprimerò io un desiderio per te,\" dice, e chiude gli occhi."
          }
        ]
      },
      {
        line: "{name} ruba un sorso della tua bibita senza chiedere. \"È più buona della mia.\"",
        choices: [
          {
            text: "Ruba un sorso dalla sua.",
            reply: "\"Ehi!\" Inizia una piccola guerra. Nessuno vince. Ridono tutti."
          },
          {
            text: "\"Questo conta come un bacio, lo sai.\"",
            reply: "{name} quasi si strozza. \"Non è vero.\" Ha la faccia rossa."
          },
          {
            text: "\"Comprati la tua.\"",
            reply: "\"D'accordo.\" Ne compra due e te ne dà una."
          }
        ]
      }
    ],
    sweet: [
      {
        line: "{name} ti sposta una ciocca di capelli dietro l'orecchio. \"Scusa. Ti andava negli occhi.\"",
        choices: [
          {
            text: "\"Non scusarti.\"",
            reply: "La sua mano indugia un attimo più del necessario."
          },
          {
            text: "Fai la stessa cosa a lui.",
            reply: "{name} ride dolcemente. \"Siamo ridicoli.\""
          },
          {
            text: "\"Posso farlo da solo.\"",
            reply: "\"Lo so,\" risponde. \"Ma volevo farlo io.\""
          }
        ]
      },
      {
        line: "A {place}, {name} dice: \"Posso dirti una cosa? Penso spesso alle nostre giornate insieme.\"",
        choices: [
          {
            text: "\"Anch'io. Continuamente.\"",
            reply: "{name} tira un sospiro di sollievo, come se fosse stato in ansia."
          },
          {
            text: "\"Qual è la tua preferita?\"",
            reply: "\"Questa,\" risponde senza neanche pensarci."
          },
          {
            text: "\"Perché?\"",
            reply: "\"Perché sono con te.\" Lo dice con una semplicità disarmante."
          }
        ]
      }
    ]
  },
  closers: {
    friendly: [
      {
        line: "Si sta facendo tardi a {place}. {name} si stira. \"Stessa ora settimana prossima?\"",
        choices: [
          {
            text: "\"Affare fatto. La prossima volta scegli tu.\"",
            reply: "\"Pericoloso. Ho già mille idee.\" Sta già programmando tutto."
          },
          {
            text: "Dagli il cinque.",
            reply: "Manca la mano di proposito e ti abbraccia invece."
          },
          {
            text: "\"Forse.\"",
            reply: "\"Mi accontento di un forse.\" {name} ti saluta a lungo con la mano."
          }
        ]
      },
      {
        line: "Sulla via del ritorno, {name} dice: \"È stata davvero una bella giornata. Grazie per oggi.\"",
        choices: [
          {
            text: "\"Grazie a TE.\"",
            reply: "\"Che personcine educate che siamo.\" Ti urta il braccio scherzando."
          },
          {
            text: "Riaccompagnalo fino alla porta.",
            reply: "\"Non dovevi.\" È felicissimo che tu l'abbia fatto."
          },
          {
            text: "\"Non c'era male.\"",
            reply: "\"Solo non c'era male? Allora la prossima volta andrà meglio.\" Sembra determinato."
          }
        ]
      }
    ],
    flirty: [
      {
        line: "Lasciando {place}, {name} rallenta il passo. \"In realtà non ho molta voglia di andarmene già.\"",
        choices: [
          {
            text: "\"Allora riaccompagnami a casa. Facendo il giro lungo.\"",
            reply: "Prende la strada più lunga possibile."
          },
          {
            text: "\"Neanch'io.\"",
            reply: "{name} sorride guardando per terra. \"Meno male.\""
          },
          {
            text: "\"A presto, allora.\"",
            reply: "\"A presto,\" ripete, come una promessa."
          }
        ]
      },
      {
        line: "All'angolo della strada, {name} dice: \"Scrivimi quando sei a casa. Così so che stai bene.\"",
        choices: [
          {
            text: "\"Solo se mi scrivi prima tu.\"",
            reply: "Il telefono ti vibra prima ancora di girare l'angolo."
          },
          {
            text: "Fai l'occhiolino e voltati per andare.",
            reply: "Lo senti ridere alle tue spalle."
          },
          {
            text: "\"Va bene.\"",
            reply: "\"Va bene,\" ripete come un'eco, e aspetta finché non sei sparito dalla vista."
          }
        ]
      }
    ],
    sweet: [
      {
        line: "Alla fine della giornata a {place}, {name} ti stringe in un lungo abbraccio.",
        choices: [
          {
            text: "Stringiti ancora un po'.",
            reply: "\"Resta così ancora un minuto,\" sussurra."
          },
          {
            text: "\"Grazie per oggi.\"",
            reply: "\"Grazie a te per ogni singolo giorno,\" dice {name}."
          },
          {
            text: "Dagli una pacca sulla schiena.",
            reply: "Ride contro la tua spalla. \"Quella era una pacca da camerata?\""
          }
        ]
      },
      {
        line: "{name} ti guarda a lungo. \"Rifarei tutto di questa giornata. Dall'inizio alla fine.\"",
        choices: [
          {
            text: "\"Allora rifacciamolo.\"",
            reply: "Ti stringe la mano. \"A domani, allora.\""
          },
          {
            text: "Dagli un bacio sulla guancia.",
            reply: "{name} resta in silenzio, poi sorride per tutta la strada verso casa."
          },
          {
            text: "\"Anche la pioggia?\"",
            reply: "\"Soprattutto la pioggia.\""
          }
        ]
      }
    ]
  }
};

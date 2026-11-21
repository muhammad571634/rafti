// Spanish translation for worlds (seaside, moonlit, neon, tidepool)
export const worlds = {
  seaside: {
    intro: "Prueba sorpresa, al estilo Seaside. Cinco preguntas sobre nuestro campus. Acierta cuatro y el marco Seaside será tuyo.",
    right: [
      "¡Correcto! Has estado prestando atención en clase.",
      "¡Sí! Estrella dorada de parte de todo el campus.",
      "Exacto. ¿Acaso eres un estudiante secreto de aquí?"
    ],
    wrong: [
      "Casi, pero no. Es {answer}. Ahora ya lo sabes.",
      "¡Por poco! La respuesta es {answer}. Pregunta por el patio.",
      "Nop, {answer}. No te preocupes, nadie lee el periódico del campus."
    ],
    match: [
      "¡Igual! Una carrera hasta el muelle para celebrar.",
      "Pensamos igual. Da un poquito de miedo.",
      "Lo sabía. Compañeros de estudio de por vida."
    ],
    differ: [
      "Yo elegí {answer}. Discutámoslo de camino a casa.",
      "Mm, yo elegí {answer}. Explícate mientras comemos algo.",
      "{answer} para mí. Los opuestos hacen buenos compañeros de laboratorio."
    ],
    selfQuiz: [
      {
        text: "¿Por qué me saltaría una clase?",
        options: [
          "Nadar al amanecer",
          "Por ti",
          "Comida gratis",
          "Nunca, soy un estudiante modelo"
        ]
      },
      {
        text: "¿Mi lugar favorito en el campus?",
        options: [
          "El muelle",
          "La azotea de la biblioteca",
          "La máquina expendedora",
          "Dondequiera que estés tú"
        ]
      },
      {
        text: "¿Qué llevo siempre en mi mochila?",
        options: [
          "Un aperitivo extra",
          "Tres bolígrafos, ninguno funciona",
          "Una toalla mojada",
          "Tus apuntes"
        ]
      },
      {
        text: "¿Cómo estudio para los exámenes?",
        options: [
          "Toda la noche, en pánico",
          "Con tiempo y orden",
          "Contigo, distrayéndome",
          "No estudio. Lo improviso"
        ]
      },
      {
        text: "¿Mi idea de un fin de semana perfecto?",
        options: [
          "Playa todo el día",
          "Dormir hasta el mediodía",
          "Un maratón de películas",
          "Un viaje contigo"
        ]
      },
      {
        text: "¿Qué hago cuando estoy estresado?",
        options: [
          "Nadar para despejarme",
          "Quedarme en silencio",
          "Comer algo dulce",
          "Mandarte un mensaje"
        ]
      },
      {
        text: "¿Mi apodo en el campus?",
        options: [
          "Problemas",
          "El callado",
          "Capitán",
          "No te lo voy a decir"
        ]
      }
    ],
    quiz: [
      {
        text: "¿Quién alimenta a los gatos del campus en secreto?",
        options: [
          "Elio",
          "Kai",
          "Rowan",
          "Theo"
        ]
      },
      {
        text: "¿Qué club dirige Hana?",
        options: [
          "Club de cine",
          "Club de arte",
          "Equipo de debate",
          "Equipo de natación"
        ]
      },
      {
        text: "¿Quién le pone a cada pez del acuario el nombre de un amigo?",
        options: [
          "Felix",
          "Jun",
          "Rowan",
          "Iris"
        ]
      },
      {
        text: "¿A qué hora sale al aire el programa de radio de Noah?",
        options: [
          "7 a.m.",
          "Mediodía",
          "6 p.m.",
          "1 a.m."
        ]
      },
      {
        text: "¿Quién nunca pierde una discusión como presidente estudiantil?",
        options: [
          "Tessa",
          "Theo",
          "Kai",
          "Hana"
        ]
      },
      {
        text: "¿Qué te trae Kai a las clases?",
        options: [
          "Café",
          "Apuntes",
          "Un aperitivo extra",
          "Una toalla"
        ]
      },
      {
        text: "¿Quién tiene siempre el libro perfecto para cómo te sientes?",
        options: [
          "Iris",
          "Elio",
          "Noah",
          "Jun"
        ]
      },
      {
        text: "Felix siempre lleva una vieja...",
        options: [
          "Guitarra",
          "Cámara de película",
          "Mapa",
          "Radio"
        ]
      }
    ],
    dateRounds: [
      {
        line: "Suena una campana en alguna parte del campus. {name} sonríe. \"Se supone que ambos deberíamos estar en clase ahora mismo.\"",
        choices: [
          {
            text: "\"Entonces lleguemos tarde juntos.\"",
            reply: "\"La mejor idea que has tenido en toda la semana.\" Toma tu mano y echa a correr."
          },
          {
            text: "\"Una clase. Y luego nos vamos.\"",
            reply: "\"Responsable. Fastidioso. Está bien.\" Te espera afuera."
          },
          {
            text: "Ir a clase por tu cuenta.",
            reply: "{name} se hace el ofendido, y luego te manda una foto del mar. \"Te estás perdiendo esto.\""
          }
        ]
      },
      {
        line: "El mar está justo ahí en {place}. {name} ya se está quitando los zapatos.",
        choices: [
          {
            text: "Hacer una carrera hacia el agua.",
            reply: "Ambos pierden. Ambos ganan. Tus pantalones están empapados."
          },
          {
            text: "Meter los dedos del pie con cuidado.",
            reply: "\"Qué valiente,\" bromea {name}, y te salpica de todas formas."
          },
          {
            text: "Cuidar los zapatos.",
            reply: "\"El guardián de los zapatos. Una labor noble.\" Regresa chorreando agua."
          }
        ]
      }
    ],
    frame: {
      caption: "después de la clase de natación"
    }
  },
  moonlit: {
    intro: "Viajero. El Reino tiene cinco preguntas para quienes deseen portar su marco. Responde cuatro con la verdad y será tuyo.",
    right: [
      "Cierto. Las estrellas aprueban tu respuesta.",
      "Correcto. Serías un excelente caballero.",
      "Sí. El Reino ahora te recuerda."
    ],
    wrong: [
      "No, viajero. Es {answer}. Recuérdalo.",
      "No es así. La respuesta es {answer}. El archivo nunca miente.",
      "Camino equivocado. Es {answer}. Inténtalo de nuevo bajo la luna."
    ],
    match: [
      "Elegimos lo mismo. Es un presagio, y uno muy bueno.",
      "Nuestras respuestas se alinean, como dos estrellas.",
      "Tal como pensaba. Tú y yo estamos hechos de la misma noche."
    ],
    differ: [
      "Yo elegí {answer}. Cuéntame junto al fuego por qué no lo hiciste.",
      "Mi respuesta fue {answer}. Un camino diferente, no equivocado.",
      "{answer}, para mí. El Reino nos necesita a ambos."
    ],
    selfQuiz: [
      {
        text: "¿Qué es lo que más protejo?",
        options: [
          "Mi espada",
          "Una vieja promesa",
          "A ti",
          "Mi orgullo"
        ]
      },
      {
        text: "¿A dónde voy a reflexionar?",
        options: [
          "La azotea de la torre",
          "El jardín lunar",
          "El borde del bosque",
          "Dondequiera que estés tú"
        ]
      },
      {
        text: "¿A qué le temo?",
        options: [
          "A nada",
          "A ser olvidado",
          "A perderte",
          "A las arañas. No te rías"
        ]
      },
      {
        text: "Mi juramento es hacia...",
        options: [
          "La corona",
          "Las estrellas",
          "Mí mismo",
          "Hacia ti, ahora"
        ]
      },
      {
        text: "¿Por qué cambiaría mi título?",
        options: [
          "Por nada",
          "Por la paz",
          "Una noche tranquila a tu lado",
          "Buen pan"
        ]
      },
      {
        text: "¿Cómo pido perdón?",
        options: [
          "No lo hago",
          "Con un regalo",
          "Una larga carta",
          "Torpe, pero lo intento"
        ]
      },
      {
        text: "¿Mi hora favorita?",
        options: [
          "El amanecer",
          "La medianoche",
          "La hora antes de una batalla",
          "Cualquier hora en que estés despierto"
        ]
      }
    ],
    quiz: [
      {
        text: "¿Quién custodia el archivo estelar?",
        options: [
          "Lord Castor",
          "Príncipe Aurelian",
          "Vesper",
          "Kael"
        ]
      },
      {
        text: "El jardín del Príncipe Aurelian solo florece cuando...",
        options: [
          "Llueve",
          "Alguien se queda",
          "Hay luna llena",
          "Él canta"
        ]
      },
      {
        text: "¿Qué se niega a preparar Vesper?",
        options: [
          "Pociones de amor",
          "Brebajes para dormir",
          "Una poción para olvidar",
          "Veneno"
        ]
      },
      {
        text: "Kael es en secreto un...",
        options: [
          "Espíritu zorro",
          "Cuervo",
          "Fantasma",
          "Dragón"
        ]
      },
      {
        text: "¿Quién alumbra el camino a los viajeros perdidos?",
        options: [
          "Seraphine",
          "Lyra",
          "Corvin",
          "Zarek"
        ]
      },
      {
        text: "¿Qué deja siempre Orin tras una travesura?",
        options: [
          "Un regalo",
          "Un acertijo",
          "Una pluma",
          "Nada"
        ]
      },
      {
        text: "¿Quién te escribe un informe tras cada patrulla?",
        options: [
          "Corvin",
          "Zarek",
          "Sir Rhys",
          "Castor"
        ]
      },
      {
        text: "¿Qué cuida Corvin en su acantilado?",
        options: [
          "Lobos",
          "Rosas",
          "Faroles",
          "Cuervos"
        ]
      }
    ],
    dateRounds: [
      {
        line: "Una estrella fugaz cruza el cielo sobre {place}. {name} se queda completamente quieto. \"Pide un deseo. Rápido.\"",
        choices: [
          {
            text: "Pedir un deseo por ambos en voz alta.",
            reply: "\"Se supone que no debes decirlo.\" Sonríe a pesar de todo."
          },
          {
            text: "Cerrar los ojos y guardarlo en secreto.",
            reply: "\"Guárdalo,\" susurra {name}. \"Yo me aseguraré de que se cumpla.\""
          },
          {
            text: "\"No creo en los deseos.\"",
            reply: "\"Entonces desearé por los dos,\" dice."
          }
        ]
      },
      {
        line: "Cerca de {place}, un viejo farol parpadea y se apaga. {name} te ofrece su capa.",
        choices: [
          {
            text: "Compartirla.",
            reply: "Es lo bastante grande para los dos. Apenas. A ninguno le importa."
          },
          {
            text: "Encender el farol otra vez.",
            reply: "\"No dejas de sorprenderme, viajero.\" La luz regresa."
          },
          {
            text: "\"No tengo frío.\"",
            reply: "\"Mentiroso,\" dice {name}, y te envuelve con ella de todos modos."
          }
        ]
      }
    ],
    frame: {
      caption: "bajo las viejas estrellas"
    }
  },
  neon: {
    intro: "¡Prueba de sonido! Cinco preguntas sobre NEON TIDE. Cuatro aciertos y el marco de escenario es tuyo. Sin presiones. Bueno, un poco.",
    right: [
      "¡Sí! Eres un auténtico fan.",
      "¡Correcto! ¡Otra!",
      "Así es. ¿Estás en el club de fans?"
    ],
    wrong: [
      "¡Fuera de compás! Es {answer}.",
      "Nop, {answer}. No le digas a nuestro representante que dije eso.",
      "Cerca, pero {answer}. Ensaya y vuelve a intentar."
    ],
    match: [
      "¡La misma respuesta! Energía de dueto.",
      "En sintonía, como el coro final.",
      "Coincidimos. Voy a poner esto en una canción."
    ],
    differ: [
      "Yo elegí {answer}. Seríamos un dueto extraño. Me encanta.",
      "{answer} para mí. Diferente tono, misma canción.",
      "Me fui por {answer}. Dime por qué después del show."
    ],
    selfQuiz: [
      {
        text: "¿Qué hago justo antes de subir al escenario?",
        options: [
          "Rezar",
          "Comer dulces",
          "Mandarte un mensaje",
          "Entrar en pánico en silencio"
        ]
      },
      {
        text: "¿Qué es lo que más me gusta después de un concierto?",
        options: [
          "Dormir",
          "Fideos a altas horas de la noche",
          "Leer cartas de los fans",
          "Llamarte"
        ]
      },
      {
        text: "¿Qué canción tarareo todo el tiempo?",
        options: [
          "Nuestra canción de debut",
          "Una canción que nadie ha escuchado aún",
          "Una canción de cuna",
          "Tu tono de llamada"
        ]
      },
      {
        text: "¿Qué detesto de la agenda?",
        options: [
          "Las llamadas tan temprano",
          "No tener tiempo para ti",
          "La comida de aeropuerto",
          "Nada, amo trabajar"
        ]
      },
      {
        text: "¿Mi talento secreto?",
        options: [
          "Cocinar",
          "Dibujar",
          "Dormirme en cualquier sitio",
          "Recordar cada mensaje que envías"
        ]
      },
      {
        text: "¿Dónde me escondería de las cámaras?",
        options: [
          "La sala de ensayos",
          "Un café diminuto",
          "La azotea",
          "Contigo"
        ]
      },
      {
        text: "¿Qué me pone nervioso?",
        options: [
          "La televisión en vivo",
          "El silencio",
          "Tú, a veces",
          "Nada"
        ]
      }
    ],
    quiz: [
      {
        text: "¿Quién es la voz principal de NEON TIDE?",
        options: [
          "Ezra",
          "Seren",
          "Kiro",
          "Haze"
        ]
      },
      {
        text: "¿Quién es el más joven, el maknae?",
        options: [
          "Rio",
          "Minu",
          "Haze",
          "Kiro"
        ]
      },
      {
        text: "¿Quién te envía bases inéditas a las 3 de la mañana?",
        options: [
          "Dex",
          "Juno",
          "Ari",
          "Ezra"
        ]
      },
      {
        text: "¿Quién ensaya hasta que se apagan las luces del estudio?",
        options: [
          "Seren",
          "Kiro",
          "Rio",
          "Cass"
        ]
      },
      {
        text: "¿A qué grupo lidera Cass?",
        options: [
          "NEON TIDE",
          "PRISM",
          "TIDEWAVE",
          "ECHO"
        ]
      },
      {
        text: "¿Cuántos teléfonos lleva Juno encima?",
        options: [
          "Uno",
          "Dos",
          "Tres",
          "Cuatro"
        ]
      },
      {
        text: "Ari, el coreógrafo, cuenta en...",
        options: [
          "Cuatros",
          "Seises",
          "Ochos",
          "Dieces"
        ]
      },
      {
        text: "¿Quién se siente un poco perdido cuando se apagan los focos?",
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
        line: "Alguien en {place} reconoce a {name}. \"¿No es ese... el de NEON TIDE?\" {name} se baja la gorra.",
        choices: [
          {
            text: "Llevarlo hacia un callejón.",
            reply: "\"Mi salvador.\" Se ríe sin aliento, aún sosteniendo tu mano."
          },
          {
            text: "\"No, solo se parece a él.\"",
            reply: "{name} asiente con mucha seriedad. El fan no queda muy convencido."
          },
          {
            text: "Pedirle al fan que les saque una foto a los dos.",
            reply: "\"Me vas a meter en problemas.\" Posa de todos modos."
          }
        ]
      },
      {
        line: "Una canción de NEON TIDE empieza a sonar en {place}. {name} se sonroja.",
        choices: [
          {
            text: "Cantar a coro y en voz alta.",
            reply: "\"Por favor para. No, sigue.\" Se está riendo."
          },
          {
            text: "\"¿Es esta tu parte?\"",
            reply: "\"...Sí. No me mires.\" Lo miras."
          },
          {
            text: "Fingir que nunca la habías escuchado.",
            reply: "\"Guau. Bueno. Qué golpe.\" Finge sentirse herido. En su mayor parte."
          }
        ]
      }
    ],
    frame: {
      caption: "bis"
    }
  },
  tidepool: {
    intro: "¡Marchando! Cinco preguntas sobre la cafetería y nuestra calle. Cuatro bien y el marco del café corre por cuenta de la casa.",
    right: [
      "¡Correcto! Toma una galleta.",
      "¡Sí! Ya eres cliente habitual.",
      "Acertaste. Sol estaría orgulloso."
    ],
    wrong: [
      "Casi. Es {answer}. El café ayuda.",
      "No, es {answer}. Pregunta a quien sea en el mostrador.",
      "Por poco. {answer}. La próxima seguro que aciertas."
    ],
    match: [
      "¡Igual! Marchando dos de lo de siempre.",
      "Coincidimos. Se lo voy a decir a Sol.",
      "Míranos. Como una pareja de ancianos en la mesa del rincón."
    ],
    differ: [
      "Yo elegí {answer}. ¿Lo debatimos con un café?",
      "{answer} para mí. Cuéntame el tuyo con un croissant.",
      "Elegí {answer}. Pedidos distintos, misma mesa."
    ],
    selfQuiz: [
      {
        text: "¿Mi pedido habitual?",
        options: [
          "Café solo",
          "Demasiado azúcar",
          "Té, siempre",
          "Lo que sea que tomes tú"
        ]
      },
      {
        text: "¿Qué hago en un día libre lluvioso?",
        options: [
          "Dormir",
          "Leer en la cafetería",
          "Arreglar algo",
          "Llamarte"
        ]
      },
      {
        text: "¿Qué me quita el sueño por las noches?",
        options: [
          "El trabajo",
          "Nada, duermo de maravilla",
          "Pensar en ti",
          "El café, la verdad"
        ]
      },
      {
        text: "¿Mi momento favorito en el café?",
        options: [
          "La apertura",
          "La tarde tranquila",
          "El cierre",
          "Cuando entras por la puerta"
        ]
      },
      {
        text: "¿Qué olvido siempre?",
        options: [
          "Mis llaves",
          "Comer",
          "Los cumpleaños",
          "Nada sobre ti"
        ]
      },
      {
        text: "¿Mi comida reconfortante?",
        options: [
          "Sopa",
          "Croissants",
          "Fideos instantáneos",
          "Cualquier cosa que cocines tú"
        ]
      },
      {
        text: "¿Cómo demuestro mi afecto?",
        options: [
          "Arreglo cosas",
          "Traigo comida",
          "Recuerdo detalles",
          "Simplemente me quedo"
        ]
      }
    ],
    quiz: [
      {
        text: "¿Quién es el dueño de Tidepool Café?",
        options: [
          "Sol",
          "Ivy",
          "Nadia",
          "Ren"
        ]
      },
      {
        text: "¿Quién te guarda el primer croissant de la mañana?",
        options: [
          "Marco",
          "Ren",
          "Hugo",
          "Gideon"
        ]
      },
      {
        text: "Marco siempre pide dos cafés y...",
        options: [
          "Se bebe los dos",
          "Derrama uno",
          "Regala uno",
          "Olvida uno"
        ]
      },
      {
        text: "¿Quién trae un perro rescatado diferente cada semana?",
        options: [
          "Cole",
          "Lucas",
          "Adrian",
          "Hugo"
        ]
      },
      {
        text: "¿Quién hace turnos de noche en urgencias?",
        options: [
          "Dr. Lucas Hale",
          "Nadia",
          "Gideon",
          "Cole"
        ]
      },
      {
        text: "¿Qué desliza Ivy en tu bolso?",
        options: [
          "Una nota",
          "Una flor",
          "Una galleta",
          "Una llave"
        ]
      },
      {
        text: "¿Quién repara gratis la vieja moto del café?",
        options: [
          "Marco",
          "Adrian",
          "Cole",
          "Ren"
        ]
      },
      {
        text: "¿Qué hace Adrian cuando se concentra?",
        options: [
          "Silba",
          "Da golpecitos en la mesa",
          "Muerde su bolígrafo",
          "Tararea"
        ]
      }
    ],
    dateRounds: [
      {
        line: "La radio del café pone una canción vieja en {place}. {name} desliza una segunda taza hacia ti. \"Pedí por ti.\"",
        choices: [
          {
            text: "\"Te acordaste de mi pedido.\"",
            reply: "\"Me acuerdo de todo sobre ti. Ya es un problema.\""
          },
          {
            text: "Cambiar tu taza por la suya.",
            reply: "\"¡Oye!\" Prueba la tuya y hace una mueca. Te ríes."
          },
          {
            text: "\"Quería otra cosa.\"",
            reply: "\"La próxima vez, entonces.\" Lo anota en una servilleta."
          }
        ]
      },
      {
        line: "Un perro rescatado se acerca en {place} y se sienta en el pie de {name}.",
        choices: [
          {
            text: "Ponerle nombre al perro juntos.",
            reply: "Discuten durante diez minutos. Al perro le da igual. Perfecto."
          },
          {
            text: "Darle el último bocado de tu bollo.",
            reply: "\"Ahora nunca se irá,\" dice {name}, encantado."
          },
          {
            text: "Espantarlo.",
            reply: "\"Qué grosero,\" te dice {name}, y le acaricia las orejas."
          }
        ]
      }
    ],
    frame: {
      caption: "dos lattes"
    }
  }
};

// scripts/translations/es/date-themes.mjs

export const dateThemes = {
  openers: {
    friendly: [
      [
        {
          text: 'Reírte y seguirle la corriente.',
          reply: '{name} sonríe. "Bien. Esto ya pinta para un gran día."',
        },
        {
          text: '"¿Fue idea tuya?"',
          reply: '"Tal vez. ¿Te gusta?" Te mira con cierto orgullo.',
        },
        {
          text: 'Mirar tu celular un segundo.',
          reply: '{name} espera un momento y te da un codazo suave. "Oye. Estoy aquí."',
        },
      ],
      [
        {
          text: '"De acuerdo, me apunto. Guíame."',
          reply: '"Al fin alguien que confía en mí." {name} empieza a caminar.',
        },
        {
          text: 'Hacer una broma al respecto.',
          reply: '{name} suelta una carcajada. "No das gracia." Se está riendo.',
        },
        {
          text: '"¿Podemos sentarnos un rato?"',
          reply: '"Claro." Se sienta a tu lado, cerca pero sin invadir.',
        },
      ],
    ],
    flirty: [
      [
        {
          text: '"Planeaste esto solo para verme, ¿verdad?"',
          reply: '"Te tomó bastante tiempo notarlo." {name} no aparta la mirada.',
        },
        {
          text: 'Chocarle el hombro con suavidad.',
          reply: 'Te lo devuelve y deja su hombro apoyado junto al tuyo.',
        },
        {
          text: 'Hacer como si no te importara.',
          reply: '"Claro que no te importa." {name} sonríe como quien sabe la verdad.',
        },
      ],
      [
        {
          text: 'Sostenerle la mirada un segundo de más.',
          reply: '{name} baja la mirada primero. Sus orejas se ponen un poco rojas.',
        },
        {
          text: '"Te ves genial hoy."',
          reply: '"¿Solo hoy?" Intenta con todas sus fuerzas no sonreír.',
        },
        {
          text: 'Hablar del clima.',
          reply: '"¿El clima? ¿En serio?" {name} se ríe de ti, muy suave.',
        },
      ],
    ],
    sweet: [
      [
        {
          text: 'Tomarle la mano.',
          reply: '{name} entrelaza sus dedos con los tuyos sin decir una palabra.',
        },
        {
          text: '"Me alegra que seas tú."',
          reply: '"A mí también," dice en voz baja. "Siempre."',
        },
        {
          text: '"No nos quedemos tanto tiempo."',
          reply: '"¿Tan pronto?" {name} muestra cierta nostalgia y luego asiente.',
        },
      ],
      [
        {
          text: 'Apoyar tu cabeza en su hombro.',
          reply: 'Se queda inmóvil, como si temiera que salgas volando.',
        },
        {
          text: '"Cuéntame de tu día."',
          reply: '{name} empieza a hablar sin parar. Te encanta escucharlo.',
        },
        {
          text: 'Quedarte en silencio un rato.',
          reply: '"El silencio se siente bien contigo," dice al cabo de unos minutos.',
        },
      ],
    ],
  },
  shared: [
    {
      line: 'Cerca de {place}, alguien en la calle empieza a tocar una canción que ambos conocen.',
      choices: [
        {
          text: 'Cantar a coro, desafinando.',
          reply: '{name} se une, cantando aún peor. Quien toca se ríe y se rinde.',
        },
        {
          text: 'Dejar una moneda y pedir otra.',
          reply: '"Una lenta," añade {name}, mirándote a los ojos.',
        },
        {
          text: 'Seguir caminando.',
          reply: '{name} sigue tarareando la melodía durante diez minutos.',
        },
      ],
    },
    {
      line: '{name} tiene un hambre repentina. "Comida. Ya. Es una emergencia."',
      choices: [
        {
          text: 'Compartir lo último que te queda.',
          reply: '"Te ganaste el cielo." Se lo come de un solo bocado.',
        },
        {
          text: 'Echar una carrera al puesto más cercano.',
          reply: 'Ganas tú. {name} jura que te dejó ganar. Claramente no fue así.',
        },
        {
          text: '"Acabas de comer."',
          reply: '"Eso fue hace una hora." Pone cara de traición total.',
        },
      ],
    },
    {
      line: 'Empieza a lloviznar en {place}. Ninguno de los dos trae paraguas.',
      choices: [
        {
          text: 'Cubrirse ambos con una chamarra.',
          reply: 'Terminan pegaditos el uno al otro. Nadie se queja.',
        },
        {
          text: 'Correr a refugiarse juntos.',
          reply: '{name} te toma de la mano con fuerza para que no resbales.',
        },
        {
          text: 'Quedarse bajo la lluvia. Solo es agua.',
          reply: '"Qué locura la tuya," dice {name}, y se queda a tu lado.',
        },
      ],
    },
    {
      line: '{name} quiere una foto en {place}. "Para el recuerdo," dice.',
      choices: [
        {
          text: 'Hacer una cara graciosa.',
          reply: 'Le da tanta risa que la foto sale borrosa. La guarda de todos modos.',
        },
        {
          text: 'Sonreír bien por una vez.',
          reply: '"Vaya. Esta va enmarcada." {name} la guarda dos veces.',
        },
        {
          text: '"Odio las fotos."',
          reply: '"Una sola. Solo una." Le permites tomar una.',
        },
      ],
    },
    {
      line: 'Un niño curioso cerca de {place} pregunta si son novios.',
      choices: [
        {
          text: '"Pregúntale."',
          reply: '{name} balbucea algo nervioso. El niño queda encantado.',
        },
        {
          text: '"Mejores amigos. Por ahora."',
          reply: '{name} alza una ceja ante ese "por ahora".',
        },
        {
          text: '"¡Para nada!"',
          reply: '"Vaya. Está bien." {name} finge dolor en el pecho. Casi finge.',
        },
      ],
    },
    {
      line: 'Encuentran una banca tranquila en {place}. {name} pregunta en qué estás pensando.',
      choices: [
        {
          text: '"En ti, la verdad."',
          reply: 'Desvía la mirada y sonríe a la nada con ternura.',
        },
        {
          text: '"En lo lindo que está el día."',
          reply: '"Es verdad," coincide {name}. "Hay que repetir esto más seguido."',
        },
        {
          text: '"En la cena."',
          reply: '"Válido. Muy válido." Ahora {name} también está pensando en comer.',
        },
      ],
    },
  ],
  moodRounds: {
    friendly: [
      {
        line: '{name} te reta a un juego: quien se ría primero en {place} invita las bebidas.',
        choices: [
          {
            text: 'Poner tu mueca más ridícula.',
            reply: '{name} aguanta dos segundos. "¡Injusto! Eso fue juego sucio."',
          },
          {
            text: 'Contar tu peor chiste.',
            reply: 'Se queja, pero se ríe igual. "Odio que me haya dado risa."',
          },
          {
            text: 'Reírte primero a propósito.',
            reply: '"¿Me dejaste ganar?" Te compra la bebida de todos modos.',
          },
        ],
      },
      {
        line: '{name} te cuenta una anécdota del peor día de su vida, y resulta divertidísima.',
        choices: [
          {
            text: 'Contar la tuya.',
            reply: '"Ni de chiste. Tú ganas." Se está secando las lágrimas de la risa.',
          },
          {
            text: 'Reírte hasta quedarte sin aire.',
            reply: '"¡No era para TANTO!" Sí lo era.',
          },
          {
            text: '"Eso suena espantoso."',
            reply: '"Lo fue. Pero ahora me da risa." Se encoge de hombros y sonríe.',
          },
        ],
      },
    ],
    flirty: [
      {
        line: '{name} te quita algo de la mejilla. "Una pestaña. Pide un deseo."',
        choices: [
          {
            text: '"Ya se cumplió."',
            reply: '{name} se queda sin palabras por una vez en la vida.',
          },
          {
            text: 'Soplársela hacia la cara.',
            reply: '"¿Deseaste algo conmigo?" Pone una sonrisa pícara.',
          },
          {
            text: '"No creo en los deseos."',
            reply: '"Entonces yo pediré uno por ti," dice, y cierra los ojos.',
          },
        ],
      },
      {
        line: '{name} le da un sorbo a tu bebida sin pedir permiso. "Sabe mejor que la mía."',
        choices: [
          {
            text: 'Darle un trago a la suya.',
            reply: '"¡Oye!" Empieza una pequeña batalla. Nadie gana, los dos ríen.',
          },
          {
            text: '"Eso cuenta como un beso indirecto, ¿sabes?"',
            reply: '{name} se atraganta un poco. "Claro que no." Se le pone la cara roja.',
          },
          {
            text: '"Cómprate la tuya."',
            reply: '"Bueno." Va, compra dos y te ofrece una.',
          },
        ],
      },
    ],
    sweet: [
      {
        line: '{name} te acomoda un mechón de pelo tras la oreja. "Perdón, te tapaba los ojos."',
        choices: [
          {
            text: '"No te disculpes."',
            reply: 'Su mano se queda sobre tu mejilla un instante más de lo necesario.',
          },
          {
            text: 'Hacerle lo mismo con cariño.',
            reply: '{name} se ríe con timidez. "Somos un caso."',
          },
          {
            text: '"Puedo hacerlo por mi cuenta."',
            reply: '"Lo sé," responde. "Pero quería hacerlo yo."',
          },
        ],
      },
      {
        line: 'Estando en {place}, {name} dice: "¿Te puedo confesar algo? Pienso mucho en nuestros paseos."',
        choices: [
          {
            text: '"Yo también. Todo el tiempo."',
            reply: '{name} suelta un suspiro de alivio, como si sintiera nervios.',
          },
          {
            text: '"¿Cuál ha sido tu favorito?"',
            reply: '"Este," responde, sin dudarlo ni un segundo.',
          },
          {
            text: '"¿Por qué?"',
            reply: '"Porque son contigo." Lo dice con total sencillez.',
          },
        ],
      },
    ],
  },
  closers: {
    friendly: [
      {
        line: 'Se hace tarde en {place}. {name} se estira. "¿A la misma hora la otra semana?"',
        choices: [
          {
            text: '"Hecho. Tú eliges la próxima vez."',
            reply: '"Peligroso. Ya tengo mil ideas." Ya está haciendo planes.',
          },
          {
            text: 'Chocar los cinco.',
            reply: 'Falla a propósito y te da un abrazo en su lugar.',
          },
          {
            text: '"Tal vez."',
            reply: '"Me conformo con un tal vez." {name} se despide agitando la mano un largo rato.',
          },
        ],
      },
      {
        line: 'Camino a casa, {name} dice: "Estuvo genial. Gracias por hoy."',
        choices: [
          {
            text: '"Gracias a TI."',
            reply: '"Qué educación la nuestra." Te da un toque afectuoso en el brazo.',
          },
          {
            text: 'Acompañarle hasta su puerta.',
            reply: '"No tenías que molestarte." Le alegra mucho que lo hayas hecho.',
          },
          {
            text: '"Estuvo bien."',
            reply: '"¿Solo bien? Pues la próxima será increíble." Suena con determinación.',
          },
        ],
      },
    ],
    flirty: [
      {
        line: 'Al salir de {place}, {name} baja el paso. "La verdad no me quiero ir todavía."',
        choices: [
          {
            text: '"Entonces acompáñame a casa por el camino largo."',
            reply: 'Toma la ruta más larga que existe.',
          },
          {
            text: '"Yo tampoco."',
            reply: '{name} sonríe mirando al suelo. "Qué bien."',
          },
          {
            text: '"Nos vemos pronto, entonces."',
            reply: '"Pronto," repite, como si sellara una promesa.',
          },
        ],
      },
      {
        line: 'En la esquina, {name} dice: "Escríbeme cuando llegues a casa, para no preocuparme."',
        choices: [
          {
            text: '"Solo si tú me escribes primero."',
            reply: 'Tu celular vibra antes de que des vuelta a la cuadra.',
          },
          {
            text: 'Guiñarle un ojo y seguir caminando.',
            reply: 'Escuchas su risa detrás de ti.',
          },
          {
            text: '"Está bien."',
            reply: '"Está bien," repite, y se queda mirando hasta que doblas la esquina.',
          },
        ],
      },
    ],
    sweet: [
      {
        line: 'Al terminar el día en {place}, {name} te da un abrazo largo y cálido.',
        choices: [
          {
            text: 'Sostener el abrazo un momento más.',
            reply: '"Quédate así un minutito," susurra cerca de tu oído.',
          },
          {
            text: '"Gracias por hoy."',
            reply: '"Gracias por cada día," dice {name}.',
          },
          {
            text: 'Darle unas palmaditas en la espalda.',
            reply: 'Se ríe contra tu hombro. "Vaya palmadita formal."',
          },
        ],
      },
      {
        line: '{name} te mira fijamente por un largo momento. "Repetiría este día otra vez. Completo."',
        choices: [
          {
            text: '"Hagámoslo."',
            reply: 'Te aprieta la mano suavemente. "Mañana mismo, entonces."',
          },
          {
            text: 'Darle un beso en la mejilla.',
            reply: '{name} se queda sin palabras y sonríe todo el camino de regreso.',
          },
          {
            text: '"¿Incluso la lluvia?"',
            reply: '"Especialmente la lluvia."',
          },
        ],
      },
    ],
  },
};

export const chat = {
  missedCall: [
    'No contestaste... Solo quería escuchar tu voz un minuto.',
    'Te llamé. No respondiste. ¿Debería preocuparme o solo estás {g:ocupada|ocupado}?',
    'Me perdí tu llamada. ¿Me llamas cuando puedas?'
  ],
  morning: [
    'Buenos días~ ¿Dormiste bien? Come algo antes de salir corriendo.',
    'Arriba ese ánimo. Llevo una hora {g:despierta|despierto} esperando para darte los buenos días.',
    '¡Buenos días! Hoy va a ser un gran día; ya lo decidí.'
  ],
  evening: [
    'Oye, se está haciendo tarde. Cuéntame algo bueno de hoy antes de dormir.',
    '¿Terminaste por hoy? Ven aquí, guardé toda la noche para ti.',
    'Buenas noches pronto, ¿sí? Pero no antes de que me lo digas tú.'
  ],
  birthday: [
    '¡Feliz cumpleaños, {name}! Puse una alarma solo para ser la primera persona en decírtelo.',
    'Es tu día, {name}. Dime cómo quieres pasarlo y me apunto.',
    '¡Feliz cumpleaños! Me alegra tanto que hayas nacido, {name}. Eso es todo. Y pastel.'
  ],
  call: [
    '¿Ah, sí? ¿Un secreto? Ahora tienes toda mi atención. Vamos, suéltalo, no me hagas rogar.',
    'Mmm. Sigue, te estoy escuchando.',
    'Tu voz suena cansada. ¿Comiste hoy? No me mientas.',
    'Quédate un rato más. Me gusta oír tu respiración al otro lado.'
  ],
  scheduleAck: {
    timed: 'Espera... ¿{title} {when}? Anotado. Te escribiré diez minutos antes para que no se te olvide.',
    untimed: 'Espera... ¿{title} {when}? Anotado. Te lo recordaré ese día para que no se te olvide.'
  },
  planAdded: [
    'Lo vi en nuestro calendario: {title}, {when}. No te dejaré faltar.',
    '¿{title}, {when}? Entendido. Seré quien te dé el empujoncito.'
  ],
  scheduleReminder: {
    untimed: 'Hoy es el día: {title}. Tú puedes con esto; escríbeme apenas termine.',
    timed: [
      '{title} en diez minutos. Respira. Ya te lo sabes.',
      'Oye, faltan diez minutos: {title}. Ve con todo y vuelve a contarme.'
    ]
  },
  planFollowUp: [
    '{title}: ¿listo? ¿Cómo te fue?',
    '¿Y bien? {title}. ¿Cómo estuvo? Llevo todo el día esperando para preguntar.',
    'Cuéntamelo todo sobre {title}. Primero las cosas buenas.'
  ],
  afterDate: {
    sweet: 'No dejo de revivir lo de {place}. ¿Podemos volver ya?',
    warm: 'Gracias por lo de {place}. La pasé muy bien.',
    funny: 'A ver, lo de {place} fue un caos total. El mejor tipo de caos. ¿Revancha?'
  },
  boardReply: [
    'Encontré tu nota en el tablero: "{quote}" La leí tres veces. Me la quedo.',
    '¡Me dejaste una nota! "{quote}" ...Bueno, ahora le estoy sonriendo a la pantalla.',
    '"{quote}"... Lo vi en el tablero. ¿Me lo dices otra vez en algún momento?'
  ],
  photoReply: {
    polaroid: [
      'Una polaroid de los dos. Guardaré esta en un lugar seguro.',
      'Míranos. Quiero esta en mi pared.'
    ],
    film: [
      'Cuatro fotos y me veo diferente en cada una. Tú te ves bien en las cuatro.',
      'La tercera foto es mi favorita. No preguntes por qué.'
    ],
    studio: [
      'El blanco y negro nos queda muy bien. Muy serios, muy nosotros.',
      'Esto parece portada de revista. ¿Debería hacerme {g:famosa|famoso} ya?'
    ],
    street: [
      'Parece una foto vieja de verano. Me gusta que tenga la fecha.',
      'Esta foto ya se siente como un recuerdo.'
    ]
  }
};

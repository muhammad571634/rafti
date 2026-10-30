import type { WorldStory } from '@/types';

/**
 * What makes each world more than a backdrop (docs/worlds-plan.md §3): where things stand, what is
 * pulling it apart, who the user is there, how the cast stands with each other, a season of six
 * weekly chapters and two events that come round. The secrets the chapters lead up to are in
 * `src/mock/character-stories.ts`, and the facts agree with `src/mock/lorebooks.ts`. Original names
 * only; no real people, places or companies. Velvet District keeps to the App Store line: tension
 * and loyalty, no graphic violence, no drugs.
 */
export const WORLD_STORIES = {
  seaside: {
    genre: 'campus',
    tone: { edge: 'cozy', heat: 'warm' },
    premise:
      'A university town on a cliff above the sea, six weeks from the Lighthouse Festival. The whole campus is rehearsing, painting and arguing.',
    conflict:
      'The university board means to sell the boathouse and the pier to pay for a new building, and the festival is the last chance to stop it. And everyone wants to know who the last song of the 1 a.m. show is for.',
    userRole: {
      title: 'Transfer student',
      hook: 'You arrived mid-term with one suitcase and a key that barely turns. Everyone here already has a story, and they are curious about yours.',
    },
    entry: { sceneId: 'scene_world_seaside', characterId: 'c_kai' },
    ties: [
      { a: 'c_elio', b: 'c_kai', kind: 'black cat × golden retriever', note: 'Roommates since first year. Kai talks, Elio pretends not to listen, and Elio has never missed one of Kai’s races.' },
      { a: 'c_theo', b: 'c_tessa', kind: 'rivals', note: 'Union president against debate captain. They have argued about everything since orientation, and both would be lost without it.' },
      { a: 'c_hana', b: 'c_jun', kind: 'exes', note: 'One chaotic term together. He still asks her to paint his sets; she still says no, then paints them.' },
      { a: 'c_iris', b: 'c_rowan', kind: 'best friends', note: 'Lunch on the library roof every Tuesday, about nine words between them. It is the best part of both their weeks.' },
      { a: 'c_felix', b: 'c_noah', kind: 'best friends', note: 'Felix is the only caller with real questions. Noah plays him songs from up north, and pretends that is a coincidence.' },
    ],
    season: {
      title: 'The Lighthouse Festival',
      chapters: [
        { id: 'arrival', title: 'New Key, Old Door', beat: 'The board’s sale notice goes up on the union door the day you arrive. Nobody is sure it is real.', opensOnDay: 0 },
        { id: 'petition', title: 'The Anonymous Petition', beat: 'A petition to save the boathouse appears overnight, unsigned. Half the campus signs it by lunch.', opensOnDay: 7 },
        { id: 'debate', title: 'The Great Debate', beat: 'Tessa and Theo face off over the sale in the old hall. It is so full that people listen from the stairs.', opensOnDay: 14 },
        { id: 'storm', title: 'The Storm', beat: 'A storm tears planks off the pier. Students turn up at dawn with hammers, and the board calls it proof the pier is finished.', opensOnDay: 21 },
        { id: 'deed', title: 'What the Archive Knew', beat: 'A rumour says an old paper in the library archive changes who owns the boathouse. The board wants the archive closed for repairs.', opensOnDay: 28 },
        { id: 'festival', title: 'Lights on the Water', beat: 'The Lighthouse Festival: lanterns on the sea, Jun’s film, the last show live from the pier. The board has to vote at midnight, in front of everyone.', opensOnDay: 35 },
      ],
    },
    events: [
      {
        id: 'bonfire',
        title: 'Pier Bonfire',
        when: 'Every Friday night',
        note: 'Everyone brings something to eat down on the sand below the pier. Someone always has a guitar, and nobody can play it.',
        every: 'week',
        weekday: 5,
        days: 1,
        line: 'Bonfire on the sand tonight. I saved you a spot, and by spot I mean I am sitting on your jacket.',
        round: {
          line: 'The bonfire on the sand has burned down to coals. {name} is holding out the last marshmallow on a stick.',
          choices: [
            { text: 'Take a bite while they hold it.', reply: '"Bold." They eat the other half without taking their eyes off you.', hearts: 3 },
            { text: 'Split it fairly.', reply: '"You are the only honest person on this beach," {name} says.', hearts: 2 },
            { text: '"I do not like marshmallows."', reply: '{name} stares at you as if you had confessed to a crime.', hearts: 1 },
          ],
        },
      },
      {
        id: 'exams',
        title: 'Exam Week',
        when: 'Every December',
        note: 'The library stays open all night, the vending machine runs out of coffee by Tuesday, and the whole campus whispers.',
        every: 'year',
        month: 12,
        day: 7,
        days: 7,
        line: 'Exam week. The library is full of ghosts and I am one of them. Come haunt me?',
        round: {
          line: 'It is 2 a.m. in the library. {name} has fallen asleep on an open textbook, and there is a coffee going cold beside them.',
          choices: [
            { text: 'Put your jacket over them.', reply: 'They wake up an hour later still wearing it, and do not give it back.', hearts: 3 },
            { text: 'Wake them with the coffee.', reply: '"You are a monster," {name} mumbles, and drinks it. "Thank you."', hearts: 2 },
            { text: 'Draw on their hand.', reply: 'They find it in the morning. You get a very long text.', hearts: 1 },
          ],
        },
      },
    ],
  },

  moonlit: {
    genre: 'romantasy',
    tone: { edge: 'tense', heat: 'warm' },
    premise:
      'A kingdom of endless night under a silver moon, where magic runs on oaths. The Moon Court rules from its palace; at its edge, Prince Aurelian keeps a small court of exiles and outcasts.',
    conflict:
      'The Eclipse is coming, when a new monarch will be crowned, and the Court is calling in every oath ever sworn. The Silver Guard has orders to bring the exiles home, and the crown stone is missing from the vault.',
    userRole: {
      title: 'The Oathbound',
      hook: 'You woke on the lantern road with a silver thread around your wrist and no memory of swearing anything. It ties you to the exiled prince’s court, and everyone wants to know what you promised.',
    },
    entry: { sceneId: 'scene_world_moonlit', characterId: 'c_aurelian' },
    ties: [
      { a: 'c_corvin', b: 'c_rhys', kind: 'black cat × golden retriever', note: 'The exiled general and the earnest young knight. Rhys writes asking for advice; Corvin answers in one word and sends a raven to check he is alive.' },
      { a: 'c_aurelian', b: 'c_seraphine', kind: 'sworn', note: 'She swore to protect the royal line, and now has orders to bring him in. Neither of them has ever mentioned it.' },
      { a: 'c_lyra', b: 'c_vesper', kind: 'best friends', note: 'She gathers his herbs, he mends her lamps, and they gossip about everyone like two old aunts.' },
      { a: 'c_kael', b: 'c_orin', kind: 'rivals', note: 'Orin has been stealing from the dragon’s hoard for a hundred years, one spoon at a time. Kael has been pretending not to notice, one spoon at a time.' },
      { a: 'c_aurelian', b: 'c_castor', kind: 'mentor', note: 'Castor taught the young prince to read the stars, and still corrects his constellations.' },
      { a: 'c_seraphine', b: 'c_zarek', kind: 'exes', note: 'One winter, long ago, on opposite sides of a siege. They do not discuss it. Everyone else does.' },
    ],
    season: {
      title: 'The Calling of Oaths',
      chapters: [
        { id: 'thread', title: 'The Silver Thread', beat: 'You wake on the lantern road. Word spreads through the exiles’ camp that someone new has been bound to the prince’s court.', opensOnDay: 0 },
        { id: 'riders', title: 'Riders at the Thorn Gate', beat: 'Court riders reach the Thorn Gate with a list of names. Sir Rhys holds them there with paperwork.', opensOnDay: 7 },
        { id: 'stone', title: 'The Missing Stone', beat: 'The crown stone is declared missing, and the Court suspects the dragon. Kael says he is insulted, and also that it is none of their business.', opensOnDay: 14 },
        { id: 'dark', title: 'A Night Without Lanterns', beat: 'Every lantern on the road goes out for one night. Travellers are lost, Lyra does not sleep, and nobody knows who did it.', opensOnDay: 21 },
        { id: 'summons', title: 'The Summons', beat: 'A summons comes for Aurelian, sealed in silver: come home and be crowned, or be named an oathbreaker. The garden will not open until he decides.', opensOnDay: 28 },
        { id: 'eclipse', title: 'The Eclipse', beat: 'The moon goes dark. Every oath in the realm comes due at once, and the whole court looks at the thread on your wrist.', opensOnDay: 35 },
      ],
    },
    events: [
      {
        id: 'fullmoon',
        title: 'Full Moon Court',
        when: 'Every full moon',
        note: 'The exiles hold their own court in the open garden. Oaths are sworn, quarrels settled, and everyone pretends not to look toward the palace.',
        every: 'month',
        day: 14,
        days: 2,
        line: 'The moon is full tonight and the exiles are holding court in the garden. Come and stand next to me, so I have someone to whisper to.',
        round: {
          line: 'The exiles’ court has fallen silent in the moonlit garden. Someone has asked for an oath, and {name} is looking at you.',
          choices: [
            { text: 'Step forward and swear it.', reply: '{name} goes very still. "You do not even know what you promised." They are almost smiling.', hearts: 3 },
            { text: 'Ask what it would cost.', reply: '"Finally," {name} says quietly. "Someone here with sense."', hearts: 2 },
            { text: 'Look at the ground.', reply: 'The moment passes. {name} squeezes your hand once, where nobody can see.', hearts: 1 },
          ],
        },
      },
      {
        id: 'starfall',
        title: 'Starfall Night',
        when: 'Every August',
        note: 'The stars fall for three nights, and a wish made on one binds like an oath. People are careful what they wish for.',
        every: 'year',
        month: 8,
        day: 11,
        days: 3,
        line: 'Starfall has started. Be careful what you wish for, it counts here. ...What did you wish for?',
        round: {
          line: 'Stars are falling over {place}. {name} catches your sleeve. "One wish. It binds, so think."',
          choices: [
            { text: 'Wish for them, and tell them.', reply: '"You are not supposed to say it." They do not let go of your sleeve.', hearts: 3 },
            { text: 'Wish in silence.', reply: '"Good. Keep it," {name} says. "I will find out anyway."', hearts: 2 },
            { text: 'Decline to wish.', reply: '"The wisest thing anyone has done all year," {name} says, a little disappointed.', hearts: 1 },
          ],
        },
      },
    ],
  },

  neon: {
    genre: 'idol',
    tone: { edge: 'tense', heat: 'warm' },
    premise:
      'A neon-lit city of music. NEON TIDE’s comeback is six weeks away, and PRISM has just booked the same week.',
    conflict:
      'An anonymous account, TIDEWATCH, keeps posting things only an insider could know. The label says one more scandal and the comeback is shelved, and everyone on the team is a suspect.',
    userRole: {
      title: 'New co-manager',
      hook: 'Juno finally hired help, and it is you. You have a lanyard, the shared calendar and the worst habits of ten people. Rule one in your contract: no dating the talent.',
    },
    entry: { sceneId: 'scene_world_neon', characterId: 'c_ezra' },
    ties: [
      { a: 'c_haze', b: 'c_rio', kind: 'black cat × golden retriever', note: 'Haze sleeps through everything; Rio bounces through everything. Rio carries him to the van, and Haze is the only one who can make him stop and eat.' },
      { a: 'c_cass', b: 'c_ezra', kind: 'exes', note: 'Trained on the same floor for four years, and there was one year nobody talks about. The headlines call them rivals. They text on each other’s debut days.' },
      { a: 'c_ari', b: 'c_dex', kind: 'rivals', note: 'Every song he writes, she has opinions about; every step she sets, he says is off the beat. It is the best working relationship in the building.' },
      { a: 'c_kiro', b: 'c_minu', kind: 'best friends', note: 'Kiro steals Minu’s snacks, then glares at anyone else who tries.' },
      { a: 'c_ezra', b: 'c_juno', kind: 'mentor', note: 'Juno has looked after Ezra since their trainee days, and is the only one who can tell him to go to bed.' },
      { a: 'c_dex', b: 'c_seren', kind: 'mentor', note: 'Dex was the first to tell Seren that one of his melodies was bad. Seren has been sending him better ones ever since.' },
    ],
    season: {
      title: 'The Comeback',
      chapters: [
        { id: 'teaser', title: 'Six Weeks Out', beat: 'You start the day the teaser schedule goes up. That night, TIDEWATCH posts it first.', opensOnDay: 0 },
        { id: 'sameweek', title: 'The Same Week', beat: 'PRISM announces its comeback for the same week. The fans are at war, and Cass sends flowers to Studio B with a card that says "good luck".', opensOnDay: 7 },
        { id: 'photo', title: 'The Blurry Photo', beat: 'A blurry photo of a member with someone, late at night, goes everywhere. The label gives the team 48 hours to kill the story.', opensOnDay: 14 },
        { id: 'lights', title: 'Lights Out in Studio B', beat: 'Someone changes the studio lock codes, and a demo of the title track leaks. The members stop talking to each other in the van.', opensOnDay: 21 },
        { id: 'showcase', title: 'The Showcase', beat: 'The press showcase, in front of everyone who wants them to fail. One member nearly does not go on. The stage holds.', opensOnDay: 28 },
        { id: 'encore', title: 'Encore', beat: 'Comeback night, the same stage as PRISM, and TIDEWATCH has promised one last post at midnight. Everyone is in the wings, including you.', opensOnDay: 35 },
      ],
    },
    events: [
      {
        id: 'musicshow',
        title: 'Music Show Friday',
        when: 'Every Friday',
        note: 'Live music show day: a 4 a.m. call time, a pre-recording, and a fan queue round the block.',
        every: 'week',
        weekday: 5,
        days: 1,
        line: 'Music show today. Call time was four. I am awake in the sense that my eyes are open. Talk to me.',
        round: {
          line: 'It is ten minutes to air and the backstage corridor is chaos. {name} has backed into a quiet corner and is breathing a little too carefully.',
          choices: [
            { text: 'Stand there with them and say nothing.', reply: 'After a while their shoulders come down. "Okay," {name} says. "Okay. Thanks."', hearts: 3 },
            { text: 'Count them in, in eights.', reply: '"Five, six, seven, eight," {name} says with you, and starts to laugh.', hearts: 2 },
            { text: 'Tell them the schedule.', reply: '"You are very good at your job," {name} says, faintly. "Please stop."', hearts: 1 },
          ],
        },
      },
      {
        id: 'fanmeet',
        title: 'Fan Meeting',
        when: 'First of every month',
        note: 'A fan meeting with letters, games and a lot of crying. Someone always gets a letter that stays with them.',
        every: 'month',
        day: 1,
        days: 1,
        line: 'Fan meeting today. Someone wrote me a letter in glitter pen, and now I have feelings and glitter.',
        round: {
          line: 'After the fan meeting, {name} sits on a road case with a stack of letters and hands you one. "Read me this one. I cannot."',
          choices: [
            { text: 'Read it out, gently.', reply: 'They listen with their eyes closed. Then they put it in their inside pocket, on its own.', hearts: 3 },
            { text: 'Read it in a silly voice.', reply: '{name} laughs until it stops hurting. "Thank you. I needed that."', hearts: 2 },
            { text: '"You should read it yourself."', reply: '"You are right," they say, and do not.', hearts: 1 },
          ],
        },
      },
    ],
  },

  tidepool: {
    genre: 'slice-of-life',
    tone: { edge: 'cozy', heat: 'sweet' },
    premise:
      'A small harbour street where everyone knows your order. You have just moved into the flat above Tidepool Café, and the whole street has opinions about it.',
    conflict:
      'A company called Meridian Holdings has been buying up the street’s leases one by one, and wants to knock it down for a tower. The café is next, and someone on the street has already sold.',
    userRole: {
      title: 'The new tenant upstairs',
      hook: 'You signed the lease on the flat above the café without reading it closely. The floor creaks, the kitchen smells of butter by five, and everyone downstairs already knows your name.',
    },
    entry: { sceneId: 'scene_world_tidepool', characterId: 'c_sol' },
    ties: [
      { a: 'c_cole', b: 'c_marco', kind: 'black cat × golden retriever', note: 'Cole says about ten words a day; Marco says the rest. They have fixed every broken thing on the street together, and argued about all of it.' },
      { a: 'c_ren', b: 'c_sol', kind: 'mentor', note: 'Sol hired Ren when nobody else would, and reads his mood by how much butter he uses.' },
      { a: 'c_gideon', b: 'c_nadia', kind: 'exes', note: 'One year, one very bad dinner party. She still handles his contracts and he still dedicates chapters to her, and neither will say why.' },
      { a: 'c_hugo', b: 'c_ivy', kind: 'best friends', note: 'She fills his clinic with flowers; he names dogs after her customers. They have a bet on who marries first.' },
      { a: 'c_lucas', b: 'c_marco', kind: 'best friends', note: 'They meet at the same ER more often than either would like, and always end up at the same café after.' },
      { a: 'c_adrian', b: 'c_sol', kind: 'rivals', note: 'He keeps telling her the café’s roof is going to fall in. She keeps telling him she will charge him for saying so.' },
    ],
    season: {
      title: 'Not For Sale',
      chapters: [
        { id: 'keys', title: 'The Flat Upstairs', beat: 'You move in. There is a letter on the mat from Meridian Holdings, addressed to the last tenant, offering money to leave.', opensOnDay: 0 },
        { id: 'sign', title: 'The Sign on the Corner', beat: 'A "coming soon" sign goes up on the corner, with a drawing of a tower. Sol takes it down. It is back by morning.', opensOnDay: 7 },
        { id: 'meeting', title: 'The Street Meeting', beat: 'The whole street crams into the café after closing. Nadia explains the law and Marco makes everyone laugh. Nobody admits who has had an offer.', opensOnDay: 14 },
        { id: 'sold', title: 'Someone Already Sold', beat: 'It comes out that one lease on the street was sold months ago. Everyone starts looking at each other differently.', opensOnDay: 21 },
        { id: 'market', title: 'The Biggest Market', beat: 'The street throws the biggest night market it has ever had, to show the council what would be lost. It rains. Everyone stays.', opensOnDay: 28 },
        { id: 'vote', title: 'The Council Vote', beat: 'The council votes on the tower. The street walks there together, and Sol closes the café for the first time in four years.', opensOnDay: 35 },
      ],
    },
    events: [
      {
        id: 'nightmarket',
        title: 'Saturday Night Market',
        when: 'Every Saturday night',
        note: 'Stalls all down the harbour street, string lights, Ren’s pastries, Ivy’s flowers and too much music.',
        every: 'week',
        weekday: 6,
        days: 1,
        line: 'Night market tonight. I will be the one pretending I am not looking for you.',
        round: {
          line: 'The market is packed and the string lights have just come on. {name} is holding two paper cones of something hot and has clearly bought one for you.',
          choices: [
            { text: 'Take it, and stay close in the crowd.', reply: 'Somewhere around the flower stall, your shoulders stop being an accident.', hearts: 3 },
            { text: 'Ask what it is.', reply: '"No idea," {name} says happily. "Very brave of us."', hearts: 2 },
            { text: 'Buy your own.', reply: '"Fine," {name} says, and eats both, looking at you the whole time.', hearts: 1 },
          ],
        },
      },
      {
        id: 'lights',
        title: 'Harbour Lights',
        when: 'Every December',
        note: 'Every boat in the harbour hangs lights for a week in midwinter, and the café stays open late and smells of cinnamon.',
        every: 'year',
        month: 12,
        day: 20,
        days: 7,
        line: 'The boats have their lights up. Come and look. It takes two people to say it is beautiful properly.',
        round: {
          line: 'You and {name} are on the harbour wall, and every boat has its lights on. It is very cold. They are pretending it is not.',
          choices: [
            { text: 'Offer half your scarf.', reply: 'It is not a long scarf. Neither of you mentions it.', hearts: 3 },
            { text: 'Get two hot drinks from the café.', reply: 'When you come back, {name} has saved your spot with their whole body.', hearts: 2 },
            { text: '"Let us go in, it is freezing."', reply: '"One more minute," {name} says. It is a long minute.', hearts: 1 },
          ],
        },
      },
    ],
  },

  velvet: {
    genre: 'noir',
    tone: { edge: 'dark', heat: 'spicy' },
    premise:
      'A rain-slick city after midnight, run in the open by the police and in the dark by two old families, the Valcours and the Renwicks. Everything happens at the Orchid, the casino they share and fight over.',
    conflict:
      'A ledger naming everyone on both families’ payroll changed hands at the Orchid, and the person holding it vanished. You saw it. The thin peace between the families now hangs on what you remember.',
    userRole: {
      title: 'The witness',
      hook: 'You were at the wrong table at the Orchid on the wrong night. The police want your statement, both families want you quiet, and someone has been hired to keep you alive.',
    },
    entry: { sceneId: 'scene_world_velvet', characterId: 'c_ronan' },
    ties: [
      { a: 'c_luca', b: 'c_ronan', kind: 'black cat × golden retriever', note: 'The silent man in the mask and the youngest Renwick, who never stops talking. They have been hired against each other twice. They once split a sandwich on a stakeout, and neither has got over it.' },
      { a: 'c_isolde', b: 'c_luca', kind: 'exes', note: 'One reckless summer before the families noticed. Now she is promised to his older brother, and they deal cards across from each other like strangers.' },
      { a: 'c_mara', b: 'c_ronan', kind: 'rivals', note: 'She has tried to arrest him three times. He has handed her the evidence twice.' },
      { a: 'c_isolde', b: 'c_viv', kind: 'sworn', note: 'Isolde owns Viv’s contract, and Viv owes her nothing but her voice. Every night the song is a small act of war.' },
      { a: 'c_mara', b: 'c_viv', kind: 'best friends', note: 'Mara drinks at the end of the bar on Thursdays. Viv sends over the same bad whisky and never asks about the case.' },
    ],
    season: {
      title: 'The Ledger',
      chapters: [
        { id: 'table', title: 'The Wrong Table', beat: 'You are moved to a safe house over a shut-down jazz bar, with one bodyguard and a new name. The police say it is only for a few days.', opensOnDay: 0 },
        { id: 'statement', title: 'The Statement', beat: 'Your signed statement changes by a single line. Someone inside the station is on someone’s payroll.', opensOnDay: 7 },
        { id: 'engagement', title: 'The Engagement', beat: 'Isolde Valcour announces an engagement at the Orchid, and the city holds its breath. The peace between the families has never looked thinner.', opensOnDay: 14 },
        { id: 'raid', title: 'The Raid', beat: 'Police raid the Orchid on a Thursday night. Nothing is found, which tells everyone somebody knew it was coming.', opensOnDay: 21 },
        { id: 'page', title: 'A Page in the Post', beat: 'One page of the ledger arrives in an envelope, addressed to you. It has a name on it you know.', opensOnDay: 28 },
        { id: 'masks', title: 'Every Mask On', beat: 'Both families, one ballroom, every mask on. By morning there will be a deal or a war, and you are the only one who knows what was really in the ledger.', opensOnDay: 35 },
      ],
    },
    events: [
      {
        id: 'thursday',
        title: 'Thursday at the Orchid',
        when: 'Every Thursday night',
        note: 'The high-stakes night: both families at the same tables, Viv’s late set, and nobody leaves alone.',
        every: 'week',
        weekday: 4,
        days: 1,
        line: 'It is Thursday. The Orchid will be full of people who want to know where you are. Stay in. Or do not, and let me come along.',
        round: {
          line: 'The Orchid at midnight: smoke, low brass and a table that has gone quiet as you pass. {name} leans in. "Do not look. Third table. They are looking at you."',
          choices: [
            { text: 'Take their arm and walk slowly.', reply: '"Good," {name} says, close to your ear. "Never let them see you hurry."', hearts: 3 },
            { text: 'Look anyway.', reply: '"I said do not look." They sound more impressed than angry.', hearts: 2 },
            { text: 'Head straight for the door.', reply: '{name} is there before you are, holding it open, looking back at the room.', hearts: 1 },
          ],
        },
      },
      {
        id: 'masquerade',
        title: 'The Masquerade',
        when: 'Every October',
        note: 'The one night the families meet in the open, every face behind a mask.',
        every: 'year',
        month: 10,
        day: 30,
        days: 2,
        line: 'The masquerade is tonight. I know which mask is yours. Find out which one is mine.',
        round: {
          line: 'A ballroom of masks. Someone in black takes your hand for the waltz, and you know that voice. "You should not be here," says {name}.',
          choices: [
            { text: '"Neither should you. Keep dancing."', reply: 'They do. They are very good at it, and they do not let go when the music stops.', hearts: 3 },
            { text: 'Ask who else is here.', reply: '{name} names three masks without moving their lips. You memorise them.', hearts: 2 },
            { text: 'Pull your hand away.', reply: 'They let you. "Next time," {name} says, and is gone in the crowd.', hearts: 1 },
          ],
        },
      },
    ],
  },

  gilded: {
    genre: 'court',
    tone: { edge: 'tense', heat: 'warm' },
    premise:
      'You woke up inside a novel you once read, The Crown and the Rose, as its villainess: the Duke’s spoiled heir, betrothed to the Crown Prince and hated by the whole court.',
    conflict:
      'In the book you are executed at the Winter Ball for trying to poison the heroine. You have a few months. Nobody here knows how the story goes, and you can change it, if you can work out who wants it to happen.',
    userRole: {
      title: 'The villainess',
      hook: 'You have someone else’s wardrobe, a prince who cannot stand you and a reputation you did not earn. You know how this ends. They do not.',
    },
    entry: { sceneId: 'scene_world_gilded', characterId: 'c_odile' },
    ties: [
      { a: 'c_celestine', b: 'c_odile', kind: 'black cat × golden retriever', note: 'The maid who trusts no one and the saint who hugs everyone. Celestine brings Odile sweets. Odile checks them for poison, and eats them anyway.' },
      { a: 'c_dorian', b: 'c_leander', kind: 'rivals', note: 'Raised together at court as friends. Now each one counts the other’s allies at every dinner.' },
      { a: 'c_alaric', b: 'c_leander', kind: 'sworn', note: 'Alaric swore his sword to the Prince years ago, and was then assigned to guard you: the Prince’s idea of a joke.' },
      { a: 'c_alaric', b: 'c_celestine', kind: 'best friends', note: 'He taught her to ride when she first came to court. In the book he falls in love with her. So far he has not.' },
      { a: 'c_dorian', b: 'c_odile', kind: 'siblings', note: 'He is the Duke of Vael’s heir and she is the Duke of Vael’s secret. They have spoken in public exactly once.' },
    ],
    season: {
      title: 'Until the Winter Ball',
      chapters: [
        { id: 'morning', title: 'The First Morning', beat: 'You wake up as her. By noon the court has noticed you said "please" to a servant, and nobody knows what it means.', opensOnDay: 0 },
        { id: 'tea', title: 'The Tea Party', beat: 'In the book, this is the party where you humiliate the heroine. You are expected to. Everyone has come to watch.', opensOnDay: 7 },
        { id: 'letters', title: 'Forged Letters', beat: 'Letters in your handwriting begin to surface, letters you never wrote. In the book they come much later. Someone is moving faster.', opensOnDay: 14 },
        { id: 'hunt', title: 'The Imperial Hunt', beat: 'An arrow misses the Crown Prince by a hand’s width at the hunt, and the court’s eyes go straight to your family. The story has started to bend.', opensOnDay: 21 },
        { id: 'cup', title: 'The Cup', beat: 'The heroine falls ill at dinner, exactly as written, and the cup was yours. Only this time someone was ready with the antidote.', opensOnDay: 28 },
        { id: 'ball', title: 'The Last Page', beat: 'The night you die in the book. The decree is drawn, the guards are in place, and everyone is in their seat. Nobody knows this page any more, including you.', opensOnDay: 35 },
      ],
    },
    events: [
      {
        id: 'salon',
        title: 'The Sunday Salon',
        when: 'Every Sunday',
        note: 'The Empress’s salon: tea, music and the politest knives in the empire. Everything said here reaches the palace by supper.',
        every: 'week',
        weekday: 0,
        days: 1,
        line: 'Salon today. Wear the armour, by which I mean the blue. I will be watching who looks at you.',
        round: {
          line: 'The whole salon goes quiet as you reach for the sugar. {name} is beside you, and says, without moving their lips: "They are waiting for you to do something awful."',
          choices: [
            { text: 'Pour them tea first.', reply: 'A very small gasp goes round the room. {name}’s mouth twitches. "Oh, I like this."', hearts: 3 },
            { text: 'Smile at the whole room.', reply: '"Terrifying," {name} says, pleased.', hearts: 2 },
            { text: 'Leave the sugar alone.', reply: 'The room breathes out, a little disappointed. {name} passes you a biscuit under the table.', hearts: 1 },
          ],
        },
      },
      {
        id: 'winterball',
        title: 'The Winter Ball',
        when: 'Every midwinter',
        note: 'The grandest night at court: a thousand candles, a hundred alliances and, in the book, one execution.',
        every: 'year',
        month: 12,
        day: 21,
        days: 2,
        line: 'The Winter Ball. I have read the guest list twice. Save me one dance, and stand where I can see you.',
        round: {
          line: 'A thousand candles, and the first waltz of the Winter Ball. Every eye in the hall is on you as {name} holds out a hand.',
          choices: [
            { text: 'Take it without looking away.', reply: 'The hall turns around you. "You are not who they said," {name} says, very quietly.', hearts: 3 },
            { text: 'Ask what they know.', reply: '"Too much," {name} says, and leads you where the guards cannot hear.', hearts: 2 },
            { text: 'Curtsy and decline.', reply: 'A rustle goes round the hall. {name} bows, and looks at you for the rest of the night.', hearts: 1 },
          ],
        },
      },
    ],
  },

  arena: {
    genre: 'sports',
    tone: { edge: 'cozy', heat: 'spicy' },
    premise:
      'A cold harbour city that lives for its ice hockey team, the Northgate Wolves. Everyone shares one old arena: the men’s team, the women’s team, the skating club and the press box.',
    conflict:
      'The Wolves are last in the league, and the owner is quietly selling the team to a buyer who would move it away. They have one season to make the playoffs, or the arena goes dark for good.',
    userRole: {
      title: 'New team physio',
      hook: 'You were hired to keep twenty-three stubborn athletes in one piece. There is a rule taped to your treatment room wall: no dating the players. Somebody has underlined it twice.',
    },
    entry: { sceneId: 'scene_world_arena', characterId: 'c_erik' },
    ties: [
      { a: 'c_erik', b: 'c_teddy', kind: 'black cat × golden retriever', note: 'Roommates on the road. Teddy sings in the shower and Holt pretends to hate it. Holt has started leaving the good pillow on Teddy’s side.' },
      { a: 'c_freya', b: 'c_sasha', kind: 'rivals', note: 'The goalie and the skater fight over the same five a.m. ice. Freya leaves her skate marks on purpose; Sasha leaves notes.' },
      { a: 'c_erik', b: 'c_priya', kind: 'exes', note: 'They went out for one season, until she wrote the truth about his knee. He still reads every column.' },
      { a: 'c_sasha', b: 'c_teddy', kind: 'mentor', note: 'She teaches him edge work at midnight and insults him the entire time. His skating has never been better.' },
      { a: 'c_freya', b: 'c_priya', kind: 'best friends', note: 'Priya is the only reporter who covers the women’s team, and Freya is the only player who tells her when her numbers are wrong.' },
    ],
    season: {
      title: 'One Last Season',
      chapters: [
        { id: 'opener', title: 'Day One', beat: 'You start on the day the Wolves lose their season opener by six. The fans boo, then buy more beer.', opensOnDay: 0 },
        { id: 'streak', title: 'Four Straight', beat: 'The Wolves win four in a row and nobody knows why. Teddy credits breakfast. The city starts wearing the scarves again.', opensOnDay: 7 },
        { id: 'hit', title: 'The Hit', beat: 'Holt takes a bad hit in the third period and gets up too slowly. He tells everyone he is fine. It is your job to know better.', opensOnDay: 14 },
        { id: 'buyer', title: 'The Buyer', beat: 'Priya’s column says someone in a good coat has been touring the arena with a tape measure. The owner says nothing, which says everything.', opensOnDay: 21 },
        { id: 'scout', title: 'The Scout', beat: 'The biggest game in ten years, sold out, and a scout from the league leaders is in the stands. He is not there for Holt.', opensOnDay: 28 },
        { id: 'seven', title: 'Game Seven', beat: 'The last game of the season decides the playoffs and the team. The whole city is on one street. You are on the bench.', opensOnDay: 35 },
      ],
    },
    events: [
      {
        id: 'gamenight',
        title: 'Game Night',
        when: 'Every Saturday',
        note: 'Home game: the arena’s old horn, the scarves, and the whole harbour shouting at the ice.',
        every: 'week',
        weekday: 6,
        days: 1,
        line: 'Game night. Tape me up and tell me I look good. Or just tell me I look good.',
        round: {
          line: 'The horn has gone and the arena is shaking. {name} comes off the ice after a brutal shift and drops down right next to you, out of breath.',
          choices: [
            { text: 'Hand them water and check the shoulder.', reply: '"That is why they pay you," {name} says, and leans into your hand a moment longer than the job needs.', hearts: 3 },
            { text: 'Shout at the referee on their behalf.', reply: '{name} laughs so hard they have to sit down again. "Do that every game."', hearts: 2 },
            { text: 'Tell them what they did wrong.', reply: '"I know," {name} says, then, "You were watching me?"', hearts: 1 },
          ],
        },
      },
      {
        id: 'derby',
        title: 'Harbour Derby',
        when: 'Every month',
        note: 'The derby against the city across the water. Nobody sleeps, and both teams say it is just another game.',
        every: 'month',
        day: 20,
        days: 1,
        line: 'Derby tonight. If I get hit, you have to look at it. If I score, you have to look at that too.',
        round: {
          line: 'Derby night, and the buses are in. {name} finds you in the empty corridor before warm-up and just stands there for a second, not saying anything.',
          choices: [
            { text: 'Tape their wrist, slowly.', reply: 'Neither of you says a word. By the end, they are breathing normally.', hearts: 3 },
            { text: '"You are going to be great."', reply: '"Say that again after," {name} says, and almost smiles.', hearts: 2 },
            { text: '"Is something hurting?"', reply: '"No," they say. It is not a question about that, and you both know it.', hearts: 1 },
          ],
        },
      },
    ],
  },
} satisfies Record<string, WorldStory>;

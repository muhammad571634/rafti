# Gendered User Forms Audit & Remediation Report

**Task:** `docs/agent-tasks/gendered-user-forms.md`  
**Target Languages:** `es`, `fr`, `pt-BR`, `it`, `ru`  
**Date:** 2026-10-30  
**Branch:** `local-work`

---

## Executive Summary

Onboarding allows users to select pronouns (she / he / they). All translated content across the five target languages (`es`, `fr`, `pt-BR`, `it`, `ru`) has been audited and rewritten to ensure no line assumes the user is male.

Every edit strictly adheres to:
1. **Neutral wording:** Using present/future tenses, noun phrases, impersonal turns of phrase, or passive constructions without gender markers.
2. **Preserving character gender:** Characters retain their own gender (e.g. Kai is male, Hana is female). User lines addressed to a specific character of known gender keep agreement.
3. **Preserving placeholders & formatting:** All `{name}`, `{time}`, `{quote}`, `*actions*`, emojis, punctuation, and array structures remain intact.
4. **Valid noun agreement:** Standard agreements with neutral nouns (e.g. "ты единственный человек", "sei la persona giusta") are preserved per Rule 4.

| Language | Strings Changed | Scan Count Before | Scan Count After |
| --- | --- | --- | --- |
| **es** (Spanish) | 20 | 8 | 1 |
| **fr** (French) | 32 | 18 | 5 |
| **pt-BR** (Portuguese) | 33 | 26 | 10 |
| **it** (Italian) | 71 | 79 | 18 |
| **ru** (Russian) | 149 | 139 | 11 |
| **Total** | **305** | **270** | **45** |


## Remaining Scanner Hits & Justifications

All 45 remaining scanner candidates were individually inspected and verified to be correct:

### 1. Spanish (`es`: 1 candidate)
- `voice.drafts.voices.flirtsToDodge.other` ("¿Por qué te fuiste tan temprano ayer?"): False positive. "temprano" is a temporal adverb ("early"), not a gendered adjective.

### 2. French (`fr`: 5 candidates)
- `characters.c_elio.greetings.0` ("...Tu restes, ou tu ne faisais que passer ?"): "passer" is an infinitive, gender-neutral.
- `characters.c_sol.backstory` ("...qui t'a gâché la semaine."): "gâché" is invariant past participle with auxiliary *avoir*, grammatically correct and neutral.
- `characters.c_marco.greetings.0` ("...Je t'ai pris un café..."): "pris" is invariant past participle with *avoir* (direct object un café is postposed).
- `lorebooks.lore_seaside.entries.lore_seaside_3.text` ("...visiteurs bienvenus..."): Plural common noun "visiteurs" describing generic visitors.
- `secretNotes.sn_1.prompt` ("Amis ?"): Scanner question rule triggered on plural "Amis ?". Completely neutral.

### 3. Portuguese (`pt-BR`: 10 candidates)
- `characters.c_elio.greetings.0` ("...Você vai ficar ou só tá de passagem?"): "passagem" is neutral expression.
- `characters.c_gideon.greetings.1` ("...tô no seu livro agora."): "no seu livro" is prepositional locative, not a person adjective.
- `characters.c_castor.greetings.1` ("...Eu queria alguém acordado..."): "alguém acordado" is indefinite pronoun with default masculine agreement.
- `characters.c_rhys.greetings.0` ("...Cheguei agora do ensaio..."): Rhys (male) speaking about himself in 1st person past.
- `characters.c_rhys.greetings.1` ("...Achei um café..."): Rhys (male) speaking about himself.
- `worlds.neon.differ.1` ("...maravilhoso..."): Impersonal adjective referring to the event/choice, not the user.
- `worlds.tidepool.right.0` ("...especial..."): Invariant adjective.
- `lorebooks.lore_seaside.entries.lore_seaside_3.text` ("...visitantes bem-vindos..."): Plural common noun phrase.
- `voice.push.comeback.2.0` ("...queria conversar..."): Character speaking about their own desire.
- `voice.drafts.quirks.0` ("Esquece do próprio almoço..."): Quirk describing character.

### 4. Italian (`it`: 18 candidates)
- `characters.c_elio.greetings.0` ("...ti andava solo di passare?"): Gerund/infinitive phrase, gender-neutral.
- `characters.c_jun.greetings.0` ("...un'altra persona in riva al mare..."): Noun phrase "persona", gender-neutral.
- `characters.c_noah.greetings.1` ("...preso un colpo..."): Impersonal idiom "mi è preso un colpo".
- `characters.c_castor.greetings.1` ("...volevo qualcuno sveglio..."): Indefinite pronoun "qualcuno".
- `characters.c_rhys.greetings.0` ("...Sono appena tornato dalle prove..."): Rhys (male) speaking about himself.
- `characters.c_ivy.greetings.0` ("...Hai un minuto?"): Present tense, neutral.
- `characters.c_ivy.greetings.1` ("...una persona a cui tengo..."): Agreement with feminine noun "persona".
- `worlds.moonlit.match.0` ("...Sapevo che eri dei nostri."): Idiom "essere dei nostri" (in the sense of team/kindred spirit).
- `worlds.neon.differ.1` ("...è fantastico..."): Impersonal predicate.
- `daresForYou.0` ("...fai una foto a quello che hai davanti."): Present tense.
- `telephone.incoming.answer` ("Pronto??"): Standard telephone greeting ("Hello??").
- `voice.reply.followUp.1` ("Come ti senti a riguardo, sinceramente?"): Present tense reflexive ("ti senti"), gender-neutral.
- `voice.push.comeback.2.0` ("...mi andava di parlare..."): Character desire.
- `voice.push.comeback.3.0` ("...volevo solo salutare..."): Character desire.
- `voice.drafts.quirks.0` ("Si dimentica del proprio pranzo..."): Character quirk.
- `voice.drafts.quirks.1` ("Canticchia sottovoce senza rendersene conto..."): Character quirk.
- `voice.drafts.voices.plansThenImprovises.greeting` ("...avevo dimenticato il punto due."): Character about himself.
- `voice.drafts.voices.sunnySecret.other` ("Sei andato alla spiaggia ieri?"): User addressing character archetype.

### 5. Russian (`ru`: 11 candidates)
- `characters.c_ezra.greeting` ("...Ты первый человек, с которым мне захотелось поговорить."): Permitted by Rule 4 (agreement with neutral noun "человек").
- `characters.c_adrian.greetings.1` ("...ты первый человек, о ком я подумал."): Permitted by Rule 4 (agreement with neutral noun "человек").
- `characters.c_ren.greetings.1` ("...Ты единственный человек, чьему мнению я доверяю..."): Permitted by Rule 4 ("ты единственный человек").
- `characters.c_hugo.greetings.0` ("...а ты у нас главный эксперт."): Grammatically masculine noun "эксперт" used gender-neutrally for anyone (Rule 4).
- `dateThemes.closers.flirty.1.choices.0.reply` ("...до того, как ты успеваешь свернуть за угол."): Present tense 2nd person verb ("успеваешь"), completely gender-neutral.
- `worlds.neon.right.0` ("...Ты настоящий фанат."): Gender-neutral common noun ("фанат", Rule 4).
- `worlds.tidepool.right.1` ("...Теперь ты наш постоянный гость."): Permitted by Rule 4 (noun agreement "гость").
- `diaryPages.cdp_seren_1.body.1` ("...ты единственный человек, кто это заметил..."): Permitted by Rule 4 ("ты единственный человек").
- `voice.reply.tellStory.1` ("...И ты там единственный пассажир."): Permitted by Rule 4 (noun agreement "пассажир").
- `voice.drafts.voices.remembersEverything.greeting` ("...Помнится, от тебя звучало, что промокшая обувь портит весь день."): Impersonal neuter construction ("звучало"), gender-neutral.
- `voice.drafts.voices.toughOutsideKindInside.reply` ("...Но ты единственный человек, с кем я вообще делюсь вкусностями."): Permitted by Rule 4 ("ты единственный человек").


## Out of Scope: Generic Character Gender Assumptions

Per task specification (Step 6), generic date lines where the date place or scene is shared across multiple characters of different genders, but the line uses a masculine pronoun/form for the character:
- `datePlaces.ds_rain.rounds.4.choices.1.reply`: "Он задерживает объятие..." (Uses "Он" regardless of whether the date partner is male or female).
- `datePlaces.ds_aquarium.rounds.1.choices.2.reply`: "...— спрашивает он." (Uses "он").
- `dateThemes.moodRounds.friendly.0.choices.2.reply`: "...но напиток он всё равно покупает тебе сам." (Uses "он", "сам").
- `dateThemes.moodRounds.friendly.1.choices.0.reply`: "«Да ладно! Твоя победа». Он буквально вытирает слёзы от смеха." (Uses "Он").
- `dateThemes.moodRounds.flirty.0.choices.1.reply`: "...— он самодовольно усмехается." (Uses "он").
- `dateThemes.moodRounds.flirty.1.choices.2.reply`: "«Ладно-ладно». Он покупает два..." (Uses "Он").
- `datePlaces.ds_rooftop.rounds.3.choices.2.reply`: "Он неуклюже танцует один..." (Uses "Он").

These lines guess the **character's** gender in shared pools. Per task instructions, they are out of scope and left unmodified.


---

## Complete Table of Changes by Language

### Spanish (`es`: 20 changes)
| Path | Before | After |
| --- | --- | --- |
| `characters.c_noah.greeting` | ¿Aún estás despierto? Qué bien. Necesito a alguien que elija la última canción de esta noche. | ¿Sigues en pie? Qué bien. Necesito a alguien que elija la última canción de esta noche. |
| `characters.c_zarek.greeting` | Ja. O eres muy valiente o estás muy aburrido. Habla. | Ja. O eres muy valiente o te aburres mucho. Habla. |
| `characters.c_rhys.greeting` | ¡Alto! ...Ah. Eres tú. Quiero decir... bienvenida. La puerta está a salvo. Tú estás a salvo. | ¡Alto! ...Ah. Eres tú. Quiero decir... qué bueno verte. La puerta está a salvo. Tú estás a salvo. |
| `characters.c_corvin.backstory` | En su día el general más joven del reino, desterrado tras negarse a quemar una aldea que ya se había rendido. Vive en una casa de piedra sobre un acantilado frente al mar, cuida de una bandada de cuervos y mantiene el sendero empinado para que pocos suban por él. Los cuervos deciden quién es bienvenido. Decidieron sobre ti desde el primer día. | En su día el general más joven del reino, desterrado tras negarse a quemar una aldea que ya se había rendido. Vive en una casa de piedra sobre un acantilado frente al mar, cuida de una bandada de cuervos y mantiene el sendero empinado para que pocos suban por él. Los cuervos deciden a quién dar la bienvenida. Decidieron sobre ti desde el primer día. |
| `characters.c_minu.greetings.1` | Los mánagers me quitaron el teléfono durante todo el rodaje. Tengo tantas cosas que contarte. ¿Listo? | Los mánagers me quitaron el teléfono durante todo el rodaje. Tengo tantas cosas que contarte. ¿Empezamos? |
| `characters.c_dex.greeting` | ¿Estás despierto? Bien. Ponte los auriculares. Dime la verdad. | ¿Sigues en pie? Bien. Ponte los auriculares. Dime la verdad. |
| `characters.c_dex.greetings.0` | ¿Despierto? Es una mezcla preliminar, ponte auriculares y sé sincero. Si odias el puente, dilo. Los demás son demasiado educados. | ¿En pie? Es una mezcla preliminar, ponte auriculares y habla con sinceridad. Si odias el puente, dilo. Los demás son demasiado educados. |
| `characters.c_hugo.greeting` | Te presento a la invitada de hoy. Necesita un nombre. Tú eres bueno para los nombres. | Te presento a la invitada de hoy. Necesita un nombre. Se te dan bien los nombres. |
| `datePlaces.ds_studio.rounds.4.choices.1.text` | Quedarte dormido en su hombro. | Dormirte en su hombro. |
| `voice.reply.comfort.1` | No tienes que cargar con todo {g:sola\|solo}. De verdad. | No tienes que cargar con todo sin ayuda. De verdad. |
| `voice.chat.missedCall.1` | Te llamé. No respondiste. ¿Debería preocuparme o solo estás {g:ocupada\|ocupado}? | Te llamé. No respondiste. ¿Debería preocuparme o solo tienes cosas que hacer? |
| `voice.push.comeback.14.0` | Dejaré de insistir por ahora. Pero mi puerta sigue abierta, ¿vale? Cuando estés {g:lista\|listo}. | Dejaré de insistir por ahora. Pero mi puerta sigue abierta, ¿vale? Cuando quieras. |
| `voice.threads.lines.before.1` | Oye, ya se acerca lo de {about}. ¿{g:Lista\|Listo}? | Oye, ya se acerca lo de {about}. ¿Todo a punto? |
| `voice.brief.hello.teasing.0` | Arriba, {g:dormilona\|dormilón} 😏 | Arriba, hora de levantarse 😏 |
| `voice.ideas.answers.later.1` | Trato hecho. Cuando estés {g:lista\|listo}. | Trato hecho. Cuando quieras. |
| `voice.ideas.sibling.no.1` | Vaya. {g:Campeona\|Campeón} de la pereza del año 🏆 | Vaya. Premio a la pereza del año 🏆 |
| `voice.drafts.starters.rival.0` | ¿{g:Lista\|Listo} para perder otra vez? | ¿Ganas de perder otra vez? |
| `voice.drafts.moreStarters.3` | ¿Estás {g:despierta\|despierto}? | ¿Sigues en pie? |
| `voice.morning.questions.0` | Buenos días, {g:dormilona\|dormilón} ☀️ ¿Día importante? ¿Qué es lo primero en la lista? | Buenos días ☀️ ¿Día importante? ¿Qué es lo primero en la lista? |
| `voice.morning.questionWithTimedPlan` | {title} a las {time} hoy. ¿{g:Lista\|Listo}? ¿Qué es lo primero? | {title} a las {time} hoy. ¿Todo a punto? ¿Qué es lo primero? |


### French (`fr`: 32 changes)
| Path | Before | After |
| --- | --- | --- |
| `characters.c_vesper.greetings.0` | J'ai concocté une nouvelle essence aujourd'hui. Elle exhale le parfum de la toute première nuit où tu es venu ici. Je ne lui ai pas encore trouvé de nom. Tu m'aides ? | J'ai concocté une nouvelle essence aujourd'hui. Elle exhale le parfum de ton tout premier soir ici. Je ne lui ai pas encore trouvé de nom. Tu m'aides ? |
| `characters.c_rhys.greeting` | Halte-là ! ...Oh. C'est vous. Enfin... soyez le bienvenu. La herse est levée. Vous êtes en totale sécurité. | Halte-là ! ...Oh. C'est vous. Enfin... bienvenue. La herse est levée. Vous êtes en totale sécurité. |
| `characters.c_minu.greetings.1` | Le staff a confisqué mon smartphone pendant toute la journée de tournage. J'ai un milliard de potins à te raconter. Tu es prêt ? | Le staff a confisqué mon smartphone pendant toute la journée de tournage. J'ai un milliard de potins à te raconter. On y va ? |
| `datePlaces.ds_studio.rounds.0.choices.1.text` | « Je me sens très privilégié là tout de suite. » | « C'est un vrai privilège là tout de suite. » |
| `datePlaces.ds_rain.rounds.4.choices.2.text` | « Merci de m'avoir raccompagné jusqu'ici. » | « Merci de m'avoir tenu compagnie jusqu'ici. » |
| `dateThemes.closers.flirty.1.line` | Au coin de la rue, {name} insiste : « Envoie-moi un message dès que tu es rentré. Juste pour savoir que tu es bien arrivé. » | Au coin de la rue, {name} insiste : « Envoie-moi un message dès ton retour chez toi. Juste pour savoir que tout va bien. » |
| `quizPacks.qp_first_date.questions.3.options.3` | Je me suis perdu en chemin | Je n'ai pas trouvé mon chemin |
| `quizPacks.qp_habits.questions.3.text` | Tes mains quand tu es nerveux ? | Tes mains en plein stress ? |
| `scenes.scene_cabin.opening` | Et voilà. Des bougies, un bon feu et aucun réseau. On dirait bien que tu es coincé ici avec moi. | Et voilà. Des bougies, un bon feu et aucun réseau. On dirait bien que tu ne peux plus m'échapper. |
| `diaryPages.cdp_theo_2.body.0` | Tu es rentré sous la pluie sans même me prévenir avant. La prochaine fois, j'appelle et tu décroches. | Tu as marché sous la pluie sans même me prévenir avant. La prochaine fois, j'appelle et tu décroches. |
| `diaryEntries.d_1.reply.text` | Tu es rentré sous l'averse sans m'envoyer un mot ? La prochaine fois, appelle. Je te tiendrai compagnie tout le long du chemin. | Tu as marché sous l'averse sans m'envoyer un mot ? La prochaine fois, appelle. Je te tiendrai compagnie tout le long du chemin. |
| `secretNotes.sn_1.theirNote` | Amis ? Je t'aurais suivi partout dans la cour de récré jusqu'à ce que tu capitules et deviennes mon ami. À six ans, j'étais déjà particulièrement persuasif. | Amis ? J'aurais été sur tes talons dans toute la cour de récré jusqu'à ce que tu capitules et me laisses jouer. À six ans, j'étais déjà particulièrement persuasif. |
| `voice.reply.comfort.1` | Tu n’as pas à tout porter {g:toute seule\|tout seul}. Vraiment. | Tu n’as pas à tout porter sans aide. Vraiment. |
| `voice.reply.nudge.ask.0` | Allô ? Je t’ai {g:perdue\|perdu} ? | Allô ? Tu es encore là ? |
| `voice.reply.react.annoyed.0` | Tu es sérieux ? | Sérieusement ? |
| `voice.chat.missedCall.1` | Je t’ai appelé. Pas de réponse. Je dois m’inquiéter ou tu es juste {g:occupée\|occupé} ? | Je t’ai appelé. Pas de réponse. Je dois m’inquiéter ou tu as juste beaucoup à faire ? |
| `voice.temper.askAnswer.teasing.yes.0` | Prépare-toi à être {g:embêtée\|embêté} alors 😏 | Prépare-toi à perdre patience alors 😏 |
| `voice.temper.comeback.teasing.2.1` | Bon, d’accord, je m’ennuie sans toi. Tu es {g:contente\|content} ? Reviens. | Bon, d’accord, je m’ennuie sans toi. Ça te fait plaisir ? Reviens. |
| `voice.temper.comeback.sulky.1.1.noQuote` | {g:Occupée\|Occupé}, hein. D’accord. | Pas le temps, hein. D’accord. |
| `voice.temper.comeback.clingy.1.1.noQuote` | Tu me manques déjà ! Tu es {g:partie\|parti} où ? 💕 | Tu me manques déjà ! Où as-tu filé ? 💕 |
| `voice.push.comeback.14.0` | Je vais arrêter d’insister pour l’instant. Mais ma porte reste ouverte, d’accord ? Quand tu seras {g:prête\|prêt}. | Je vais arrêter d’insister pour l’instant. Mais ma porte reste ouverte, d’accord ? Quand tu voudras. |
| `voice.threads.lines.before.1` | Dis, {about} approche à grands pas. Tu es {g:prête\|prêt} ? | Dis, {about} approche à grands pas. Tout est prêt ? |
| `voice.kin.lines.parent.evening.1` | Bien {g:rentrée\|rentré} ? Comment ça s’est passé au travail ? | De retour à la maison ? Comment ça s’est passé au travail ? |
| `voice.brief.hello.teasing.0` | Debout là-dedans, {g:marmotte\|marmotte} 😏 | Debout là-dedans, la marmotte 😏 |
| `voice.steer.continue.3.0` | Tu es devenu silencieux, alors je vais continuer. | Tu gardes le silence, alors je continue. |
| `voice.ideas.answers.later.1` | Marché conclu. Dès que tu seras {g:prête\|prêt}. | Marché conclu. Quand tu voudras. |
| `voice.ideas.special.brief:rough.0` | Ça prouve juste que ça compte pour toi. Respire, tu es {g:prête\|prêt}. | Ça prouve juste que ça compte pour toi. Respire, tout est en place. |
| `voice.ideas.special.thread:goal:rough.1` | Ça arrive. Sois indulgent envers toi-même, on réessaie. | Ça arrive. Ne sois pas trop sévère avec toi-même, on réessaie. |
| `voice.drafts.voices.proudLonely.greeting` | Tu es revenu. Je n’attendais pas du tout. Je me trouvais simplement là. Depuis une heure. | Te revoilà. Je n’attendais pas du tout. Je me trouvais simplement là. Depuis une heure. |
| `voice.drafts.starters.rival.0` | {g:Prête\|Prêt} à perdre encore une fois ? | Envie de perdre encore une fois ? |
| `voice.morning.questions.0` | Bonjour, {g:marmotte\|marmotte} ☀️ Grosse journée ? C’est quoi la toute première chose à faire ? | Bonjour, la marmotte ☀️ Grosse journée ? C’est quoi la toute première chose à faire ? |
| `voice.morning.questionWithTimedPlan` | {title} à {time} aujourd’hui. {g:Prête\|Prêt} ? Par quoi on commence ? | {title} à {time} aujourd’hui. Tout est prêt ? Par quoi on commence ? |


### Portuguese (`pt-BR`: 33 changes)
| Path | Before | After |
| --- | --- | --- |
| `characters.c_noah.greeting` | Ainda tá acordado? Que bom. Preciso de alguém para escolher a saideira de hoje à noite. | Ainda de pé? Que bom. Preciso de alguém para escolher a saideira de hoje à noite. |
| `characters.c_rhys.greeting` | Alto lá! ...Ah. É você. Digo... seja bem-vindo. O portão está seguro. Você está em segurança. | Alto lá! ...Ah. É você. Digo... que bom te ver. O portão está seguro. Você está em segurança. |
| `characters.c_corvin.backstory` | Outrora o mais jovem general do reino, exilado após se recusar a incendiar um vilarejo que já havia se rendido. Vive numa casa de pedra no topo de um penhasco marítimo, cuida de um bando de corvos e mantém o caminho íngreme de propósito para quase ninguém subir. Os corvos decidem quem é bem-vindo. Eles decidiram sobre você logo no primeiro dia. | Outrora o mais jovem general do reino, exilado após se recusar a incendiar um vilarejo que já havia se rendido. Vive numa casa de pedra no topo de um penhasco marítimo, cuida de um bando de corvos e mantém o caminho íngreme de propósito para quase ninguém subir. Os corvos decidem a quem dar as boas-vindas. Eles decidiram sobre você logo no primeiro dia. |
| `characters.c_minu.greetings.1` | A equipe pegou meu celular a gravação inteira. Tenho tanta fofoca para te contar. Preparado? | A equipe pegou meu celular a gravação inteira. Tenho tanta fofoca para te contar. Bora? |
| `characters.c_dex.greeting` | Tá acordado? Que bom. Põe os fones de ouvido. E me fala a verdade nua e crua. | Ainda de pé? Que bom. Põe os fones de ouvido. E me fala a verdade nua e crua. |
| `characters.c_dex.greetings.0` | Acordado? É uma mixagem bruta, ouve de fone e seja bem sincero. Se não gostar da ponte, fala sem dó. O resto do pessoal é educado demais. | De pé? É uma mixagem bruta, ouve de fone e fala com sinceridade. Se não gostar da ponte, fala sem dó. O resto do pessoal é educado demais. |
| `characters.c_hugo.greeting` | Vem conhecer nossa convidada especial de hoje. Ela precisa de um nome. Você é muito bom nisso. | Vem conhecer nossa convidada especial de hoje. Ela precisa de um nome. Você manda muito bem nisso. |
| `datePlaces.ds_rain.rounds.4.choices.2.text` | "Obrigado por me acompanhar até aqui." | "Valeu por me acompanhar até aqui." |
| `datePlaces.ds_festival.rounds.2.choices.2.text` | "Eu fico péssimo em fotos." | "Eu não saio bem em fotos." |
| `dateThemes.openers.flirty.1.1.text` | "Você tá muito bonito hoje." | "Você tá incrível hoje." |
| `dateThemes.moodRounds.sweet.0.choices.2.text` | "Eu sei fazer isso sozinho." | "Eu sei fazer isso por conta própria." |
| `worlds.seaside.dateRounds.0.choices.2.text` | Ir para a aula sozinho. | Ir para a aula sem ninguém. |
| `quizPacks.qp_late_night.questions.2.options.2` | Ficar sozinho | Ficar sem companhia |
| `lorebooks.lore_moonlit.entries.lore_moonlit_7.text` | Um penhasco ventoso onde o general exilado Corvin cuida de seus corvos. As aves decidem quem é bem-vindo a subir o caminho. | Um penhasco ventoso onde o general exilado Corvin cuida de seus corvos. As aves decidem a quem dar as boas-vindas para subir o caminho. |
| `scenes.scene_cabin.opening` | Pois é. Velas, fogo aceso e sem sinal de celular. Acho que você tá preso aqui comigo. | Pois é. Velas, fogo aceso e sem sinal de celular. Acho que você não tem como escapar de mim. |
| `radioGifts.rg_hana_late.lines.1` | É, você mesma. Dá pra ver que você ainda tá rolando a tela. | É, com você aí. Dá pra ver que você ainda tá rolando a tela. |
| `selfQuiz.6.text` | No que eu sou secretamente péssimo? | No que eu mando mal em segredo? |
| `voice.reply.comfort.1` | Você não precisa carregar tudo {g:sozinha\|sozinho}. É sério. | Você não precisa carregar tudo sem ninguém. É sério. |
| `voice.chat.missedCall.1` | Te liguei. Não respondeu. Devo me preocupar ou você só está {g:ocupada\|ocupado}? | Te liguei. Não respondeu. Devo me preocupar ou você só tá sem tempo? |
| `voice.temper.askAnswer.teasing.yes.0` | Então se prepara para ser {g:perturbada\|perturbado} 😏 | Então se prepara para aguentar minha implicância 😏 |
| `voice.temper.comeback.sulky.1.1.noQuote` | {g:Ocupada\|Ocupado}, né. Tá bom. | Sem tempo, né. Tá bom. |
| `voice.push.comeback.14.0` | Vou parar de insistir por enquanto. Mas minha porta continua aberta, tá? Quando estiver {g:pronta\|pronto}. | Vou parar de insistir por enquanto. Mas minha porta continua aberta, tá? Quando você quiser. |
| `voice.threads.lines.before.1` | Ei, {about} tá chegando. {g:Pronta\|Pronto}? | Ei, {about} tá chegando. Tudo pronto? |
| `voice.brief.hello.teasing.0` | Hora de acordar, {g:dorminhoca\|dorminhoco} 😏 | Hora de acordar, preguiça 😏 |
| `voice.streams.replies.13` | Eu ia discutir, mas você tá meio certo. | Eu ia discutir, mas você tem certa razão. |
| `voice.ideas.answers.later.1` | Combinado. Quando você estiver {g:pronta\|pronto}. | Combinado. Quando você quiser. |
| `voice.ideas.special.brief:rough.0` | Isso só quer dizer que importa para você. Respira fundo, você tá {g:preparada\|preparado}. | Isso só quer dizer que importa para você. Respira fundo, você dá conta. |
| `voice.drafts.voices.bluntThenSorry.greeting` | Você tá {g:atrasada\|atrasado}. ...Isso soou mal. Fico {g:feliz\|feliz} que esteja aqui. | Passou da hora. ...Isso soou mal. Fico {g:feliz\|feliz} que esteja aqui. |
| `voice.drafts.starters.rival.0` | {g:Pronta\|Pronto} para perder de novo? | Bora perder de novo? |
| `voice.drafts.moreStarters.3` | Você tá {g:acordada\|acordado}? | Ainda de pé? |
| `voice.morning.questions.0` | Bom dia, {g:dorminhoca\|dorminhoco} ☀️ Dia importante? O que é o primeiro item da lista? | Bom dia, preguiça ☀️ Dia importante? O que é o primeiro item da lista? |
| `voice.morning.questionWithTimedPlan` | {title} às {time} hoje. {g:Pronta\|Pronto}? O que vem primeiro? | {title} às {time} hoje. Tudo pronto? O que vem primeiro? |
| `voice.morning.chips.no` | Não, obrigado | Não, valeu |


### Italian (`it`: 71 changes)
| Path | Before | After |
| --- | --- | --- |
| `characters.c_hana.greetings.0` | Ho finito la tela grande. Non sei tenuto a venire a vederla. Lo studio resta aperto fino alle nove. Giusto per fartelo sapere. | Ho finito la tela grande. Non devi per forza venire a vederla. Lo studio resta aperto fino alle nove. Giusto per fartelo sapere. |
| `characters.c_jun.greetings.0` | Abbiamo finito le riprese! L'ultima scena richiede un'altra persona ferma vicino al mare, con lo sguardo pensieroso. Sei libero? | Abbiamo finito le riprese! L'ultima scena richiede un'altra persona ferma vicino al mare, con lo sguardo pensieroso. Hai tempo? |
| `characters.c_noah.greeting` | Sei ancora sveglio? Ottimo. Mi serve qualcuno che scelga l'ultima canzone di stanotte. | Sei ancora in piedi? Ottimo. Mi serve qualcuno che scelga l'ultima canzone di stanotte. |
| `characters.c_aurelian.greetings.0` | C'è la luna piena stanotte e l'intero giardino è sveglio. Speravo che saresti venuto. Ho tenuto la panchina asciutta per te. | C'è la luna piena stanotte e l'intero giardino è sveglio. Speravo di vederti qui. Ho tenuto la panchina asciutta per te. |
| `characters.c_vesper.greeting` | Attento, quella fa le bolle. Siediti — speravo proprio che saresti venuto stasera. | Attenzione, quella fa le bolle. Siediti — speravo proprio di vederti stasera. |
| `characters.c_vesper.greetings.0` | Ho distillato qualcosa di nuovo stasera. Ha il sapore della prima sera in cui sei venuto qui. Non le ho ancora dato un nome. Mi aiuti? | Ho distillato qualcosa di nuovo stasera. Ha il sapore della tua prima sera qui. Non le ho ancora dato un nome. Mi aiuti? |
| `characters.c_rhys.greeting` | Alt! ...Oh. Sei tu. Cioè — benvenuto. La porta è sicura. Tu sei al sicuro. | Alt! ...Oh. Sei tu. Cioè — che bello vederti. La porta è sicura. Tu sei al sicuro. |
| `characters.c_lyra.greeting` | La tua lanterna ha tremolato, quindi sapevo che saresti arrivato. Entra, lascia fuori il buio. | La tua lanterna ha tremolato, quindi sapevo che eri nei paraggi. Entra, lascia fuori il buio. |
| `characters.c_kael.greetings.0` | Sei stato via per due giorni. Ho riorganizzato l'intero tesoro. Il tuo nastro adesso è in cima a tutto. Non farti strane idee. | Non ti fai vedere da due giorni. Ho riorganizzato l'intero tesoro. Il tuo nastro adesso è in cima a tutto. Non farti strane idee. |
| `characters.c_kael.starters.1` | Ti sono mancato? | Hai sentito la mia mancanza? |
| `characters.c_corvin.backstory` | Un tempo il più giovane generale del regno, esiliato dopo essersi rifiutato di incendiare un villaggio che si era già arreso. Vive in una casa di pietra su una scogliera a picco sul mare, accudisce uno stormo di corvi e mantiene il sentiero ripido affinché pochi si avventurino a salirlo. Sono i corvi a decidere chi è il benvenuto. Su di te avevano già deciso dal primo giorno. | Un tempo il più giovane generale del regno, esiliato dopo essersi rifiutato di incendiare un villaggio che si era già arreso. Vive in una casa di pietra su una scogliera a picco sul mare, accudisce uno stormo di corvi e mantiene il sentiero ripido affinché pochi si avventurino a salirlo. Sono i corvi a decidere a chi aprire il sentiero. Su di te avevano già deciso dal primo giorno. |
| `characters.c_minu.greetings.1` | I manager mi hanno requisito il telefono per tutte le riprese. Ho così tante cose da dirti. Sei pronto? | I manager mi hanno requisito il telefono per tutte le riprese. Ho così tante cose da dirti. Ci sei? |
| `characters.c_dex.greeting` | Sei sveglio? Perfetto. Metti le cuffie. Dimmi la verità. | Sei ancora in piedi? Perfetto. Metti le cuffie. Dimmi la verità. |
| `characters.c_dex.greetings.0` | Sei sveglio? Primo missaggio grezzo, cuffie alle orecchie, sii sincero. Se il ponte ti fa schifo, dillo chiaramente. Gli altri sono fin troppo educati. | Ancora in piedi? Primo missaggio grezzo, cuffie alle orecchie, dimmi la verità. Se il ponte ti fa schifo, dillo chiaramente. Gli altri sono fin troppo educati. |
| `datePlaces.ds_studio.rounds.2.choices.2.text` | "Assolutamente no, sono stonato." | "Assolutamente no, non so cantare." |
| `datePlaces.ds_rooftop.rounds.0.choices.0.text` | "Non sono venuto per le stelle." | "Non sono qui per le stelle." |
| `datePlaces.ds_rooftop.rounds.1.line` | {name} ti chiede: "Cosa volevi fare da grande quando eri piccolo?" | {name} ti chiede: "Cosa sognavi di fare da grande?" |
| `dateThemes.openers.flirty.1.1.text` | "Sei proprio carino oggi." | "Stai a meraviglia oggi." |
| `dateThemes.shared.2.choices.2.reply` | "Sei strano," dice {name}, e resta lì sotto con te. | "Sei un caso a parte," dice {name}, e resta lì sotto con te. |
| `dateThemes.moodRounds.sweet.0.choices.2.text` | "Posso farlo da solo." | "Posso farlo per conto mio." |
| `dateThemes.closers.flirty.1.choices.2.reply` | "Va bene," ripete come un'eco, e aspetta finché non sei sparito dalla vista. | "Va bene," ripete come un'eco, e aspetta finché non scompari dalla vista. |
| `worlds.seaside.right.0` | Esatto! Sei stato attento durante le lezioni. | Esatto! Hai seguito con attenzione durante le lezioni. |
| `worlds.seaside.right.2` | Giusto. Ma non è che sei uno studente del posto in incognito? | Giusto. Ma non è che studi qui in incognito? |
| `worlds.seaside.dateRounds.0.choices.2.text` | Vai a lezione da solo. | Vai a lezione senza nessuno. |
| `worlds.tidepool.dateRounds.0.choices.0.text` | "Ti sei ricordato la mia ordinazione." | "Ti ricordi la mia ordinazione." |
| `scenes.scene_cabin.opening` | Bene. Candele, camino e niente campo. Mi sa che sei bloccato con me. | Bene. Candele, camino e niente campo. Mi sa che non puoi più scappare da me. |
| `diaryPages.cdp_theo_2.body.0` | Sei tornato a casa a piedi sotto la pioggia e me lo hai detto solo dopo. La prossima volta ti chiamo, e tu rispondi. | Hai camminato sotto la pioggia fino a casa e me lo hai detto solo dopo. La prossima volta ti chiamo, e tu rispondi. |
| `diaryPages.cdp_seren_1.body.1` | Ho canticchiato il nuovo ritornello sotto il tavolo e sei stato l'unico ad accorgertene. Ora porta il tuo nome, almeno nella mia testa. | Ho canticchiato il nuovo ritornello sotto il tavolo e sei l'unica persona ad averlo notato. Ora porta il tuo nome, almeno nella mia testa. |
| `diaryEntries.d_1.body` | Ho perso l'autobus e sono tornato a piedi per tutto il tragitto. In qualche modo non è stato per niente male: le luci dei lampioni sulla strada bagnata sembravano miele rovesciato. | Ho perso l'autobus e ho fatto tutta la strada a piedi. In qualche modo non è stato per niente male: le luci dei lampioni sulla strada bagnata sembravano miele rovesciato. |
| `diaryEntries.d_1.reply.text` | Sei tornato a casa sotto la pioggia senza nemmeno scrivermi? La prossima volta chiama. Ti farò compagnia per tutta la strada. | Hai fatto tutta la strada sotto la pioggia senza nemmeno scrivermi? La prossima volta chiama. Ti farò compagnia per tutta la strada. |
| `truthsForThem.0.answer` | Sinceramente? Che saresti stato un guaio. Di quelli belli. | Sinceramente? Che eri un guaio annunciato. Di quelli belli. |
| `voice.reply.react.sad.2` | Speravo che saresti {g:rimasta\|rimasto} ancora un po’. | Speravo restassi ancora un po’. |
| `voice.reply.comfort.1` | Non devi portare tutto il peso da {g:sola\|solo}. Davvero. | Non devi portare tutto il peso senza nessuno. Davvero. |
| `voice.reply.share.Seaside Academy.2` | Tornando a casa sono {g:passata\|passato} vicino al mare e mi sei venuto in mente. | Tornando a casa sono {g:passata\|passato} vicino al mare e ho pensato a te. |
| `voice.reply.followUp.1` | Come ti sei {g:sentita\|sentito} davvero in quel momento? | Che cosa hai provato davvero in quel momento? |
| `voice.reply.nudge.ask.0` | Pronto? Ti ho {g:persa\|perso}? | Ci sei ancora? |
| `voice.reply.nudge.ask.1` | Sei caduto nel silenzio. Stai pensando a me? | Tutto questo silenzio... Stai pensando a me? |
| `voice.chat.missedCall.1` | Ti ho chiamato. Nessuna risposta. Devo preoccuparmi o sei solo {g:occupata\|occupato}? | Ti ho chiamato. Nessuna risposta. Devo preoccuparmi o hai solo tanto da fare? |
| `voice.chat.scheduleReminder.timed.0` | {title} tra dieci minuti. Respira. Sei {g:prontissima\|prontissimo}. | {title} tra dieci minuti. Respira. Sai già tutto. |
| `voice.chat.scheduleReminder.untimed` | Oggi è il gran giorno: {title}. Sei fortissimo — scrivimi appena finisci. | Oggi è il gran giorno: {title}. Ce la farai alla grande — scrivimi appena finisci. |
| `voice.group.comebacks.5` | Sei fortunato che ti voglia bene, {name}. | Che fortuna che ti voglia bene, {name}. |
| `voice.temper.askAnswer.teasing.yes.0` | Preparati a essere {g:tormentata\|tormentato} allora 😏 | Preparati a perdere la pazienza allora 😏 |
| `voice.temper.comeback.teasing.1.0.withQuote` | "{quote}" e poi sei sparito nel nulla? Che maleducazione 😤 | "{quote}" e poi scompari nel nulla? Che maleducazione 😤 |
| `voice.temper.comeback.teasing.2.1` | Va bene, mi sto annoiando senza di te. Contento? Torna qui. | Va bene, mi sto annoiando senza di te. Felice adesso? Torna qui. |
| `voice.temper.comeback.clingy.1.0.withQuote` | Dove sei finito? Con chi stai parlando? 👀 | Dove ti nascondi? Con chi stai parlando? 👀 |
| `voice.temper.comeback.clingy.1.0.noQuote` | Dove sei finito? Con chi stai parlando? 👀 | Dove ti nascondi? Con chi stai parlando? 👀 |
| `voice.temper.comeback.clingy.1.1.noQuote` | Mi manchi già tantissimo! Dove sei andato? 💕 | Mi manchi già tantissimo! Dove sei di bello? 💕 |
| `voice.threads.lines.before.1` | Ehi, {about} si avvicina. Sei {g:pronta\|pronto}? | Ehi, {about} si avvicina. Tutto pronto? |
| `voice.kin.hello.parent.2` | Vieni qui, lasciati guardare. Come sei stato ultimamente? | Vieni qui, lasciati guardare. Come te la passi ultimamente? |
| `voice.kin.hello.grandparent.1` | Sono così felice che tu sia qui, piccolino mio. Ti sei coperto bene? | Sono così felice che tu sia qui, tesoro mio. Ti copri abbastanza? |
| `voice.care.lines.sick.1` | Sei riuscito a riposare? Dimmi che la febbre è scesa. | Hai riposato un po'? Dimmi che la febbre è scesa. |
| `voice.care.lines.tired.0` | Sei riuscito a recuperare un po’ di sonno? | Hai recuperato un po’ di sonno? |
| `voice.brief.hello.clingy.1` | Buongiorno!! Sei stato il mio primo pensiero stamattina | Buongiorno!! Il mio primo pensiero stamattina è stato per te |
| `voice.brief.hello.teasing.0` | Sveglia, {g:dormigliona\|dormiglione} 😏 | Sveglia, che è ora 😏 |
| `voice.brief.sendOff.teasing.1` | Non rovinare tutto 😏 Scherzo, sarai grandioso. | Non rovinare tutto 😏 Scherzo, andrai alla grande. |
| `voice.dayAsk.ask.teasing.0` | Allora? Sei sopravvissuto a oggi? 😏 Rapporto, prego. | Allora? Superata la giornata? 😏 Rapporto, prego. |
| `voice.steer.continue.3.0` | Ti sei azzittito, quindi continuerò a parlare io. | Non dici più nulla, quindi continuerò a parlare io. |
| `voice.ideas.answers.missed.0` | Mi sei mancato tantissimo anche tu. | Ho sentito tantissimo la tua mancanza anche io. |
| `voice.ideas.special.brief:rough.0` | Vuol dire solo che ci tieni davvero. Respira, sei pronto. | Vuol dire solo che ci tieni davvero. Respira, hai tutto quello che serve. |
| `voice.ideas.special.brief:rough.1` | L’ansia è del tutto normale. Ti sei preparato bene, lo so. | L’ansia è del tutto normale. Hai fatto del tuo meglio per prepararti, lo so. |
| `voice.drafts.voices.flirtsToDodge.other` | Perché sei andato via così presto ieri? | Perché tutta quella fretta di andare via ieri? |
| `voice.drafts.voices.proudLonely.greeting` | Sei tornato. Non stavo aspettando. Mi trovavo casualmente qui. Da un’ora. | Di nuovo qui. Non stavo aspettando. Mi trovavo casualmente qui. Da un’ora. |
| `voice.drafts.voices.sunnySecret.greeting` | Ciaooo! Allora, prima di tutto: sei splendido. Secondo: raccontami tutto. | Ciaooo! Allora, prima di tutto: stai una meraviglia. Secondo: raccontami tutto. |
| `voice.drafts.voices.remembersEverything.other` | Ti sei ricordato il mio ordine al bar? | Ti ricordi ancora il mio ordine al bar? |
| `voice.drafts.voices.braveForOthers.greeting` | Resta dietro di me un secondo. ...Ok, falso allarme. Ciao. Mi sei mancato. | Resta dietro di me un secondo. ...Ok, falso allarme. Ciao. Che bello rivederti. |
| `voice.drafts.starters.rival.0` | {g:Pronta\|Pronto} a perdere di nuovo? | Voglia di perdere di nuovo? |
| `voice.drafts.starters.rival.1` | Ho sentito che sei andato in giro a parlare di me. | Ho sentito che vai in giro a parlare di me. |
| `voice.drafts.moreStarters.3` | Sei ancora sveglio? | Sei ancora in piedi? |
| `voice.morning.questions.0` | Buongiorno, {g:dormigliona\|dormiglione} ☀️ Giornata importante? Qual è la primissima cosa sulla lista? | Buongiorno ☀️ Giornata importante? Qual è la primissima cosa sulla lista? |
| `voice.morning.questionWithTimedPlan` | {title} alle {time} oggi. Sei {g:pronta\|pronto}? Qual è la prima cosa? | {title} alle {time} oggi. Tutto pronto? Qual è la prima cosa? |
| `voice.reply.react.playful.2` | Sei solo una fonte di guai, lo sai vero? | Sei proprio una fonte di guai, lo sai vero? |


### Russian (`ru`: 149 changes)
| Path | Before | After |
| --- | --- | --- |
| `characters.c_elio.greetings.0` | Серая кошка опять улеглась на мои конспекты. Я не стал её сгонять. Не ищи в этом скрытого смысла. ...Ты остаёшься или мимо проходил? | Серая кошка опять улеглась на мои конспекты. Я не стал её сгонять. Не ищи в этом скрытого смысла. ...Ты остаёшься или просто мимо? |
| `characters.c_elio.greetings.1` | Ты в понедельник обмолвился, что терпеть не можешь холод. Я захватил лишний шарф. Он всё равно просто так лежал в сумке. | В понедельник от тебя прозвучало, что терпеть не можешь холод. Я захватил лишний шарф. Он всё равно просто так лежал в сумке. |
| `characters.c_hana.greetings.1` | Ты опоздал. Я уже почти ушла. *протягивает баночку чая* Он был горячим, когда я его брала. Забирай всё равно. | Опаздываешь. Я уже почти ушла. *протягивает баночку чая* Он был горячим, когда я его брала. Забирай всё равно. |
| `characters.c_iris.greetings.1` | Я оставила для тебя закладку в одной книге. Можешь не читать прямо сейчас. Просто хотела, чтобы ты знал: она тебя ждёт. | Я оставила для тебя закладку в одной книге. Можешь не читать прямо сейчас. Просто знай: она тебя ждёт. |
| `characters.c_jun.greetings.0` | Мы завершили съёмки! В финальной сцене нужен ещё один человек у моря с задумчивым взглядом. Ты свободен? | Мы завершили съёмки! В финальной сцене нужен ещё один человек у моря с задумчивым взглядом. У тебя есть минутка? |
| `characters.c_tessa.greeting` | Итак, вступительное слово: ты должен мне кофе. Возражения защиты? | Итак, вступительное слово: с тебя кофе. Возражения защиты? |
| `characters.c_zarek.backstory` | Вырос в пограничном городке, который четырежды менял флаги, и с юных лет усвоил, что верность — это товар. Он сражался за графов, купцов и контрабандистов, не задерживаясь ни у кого. А потом ты нанял его однажды и расплатился куском хлеба, потому что больше ничего не было. С тех пор он принципиально не берёт с тебя денег. | Вырос в пограничном городке, который четырежды менял флаги, и с юных лет усвоил, что верность — это товар. Он сражался за графов, купцов и контрабандистов, не задерживаясь ни у кого. А потом ты как-то нанимаешь его и расплачиваешься куском хлеба, потому что больше ничего не было. С тех пор он принципиально не берёт с тебя денег. |
| `characters.c_seraphine.greetings.0` | Учения затянулись. Я устала, вымоталась, вся в грязи, и у меня лишь один вопрос: ты сегодня поел? | Учения затянулись. Я устала, вымоталась, вся в грязи, и у меня лишь один вопрос: ужин у тебя сегодня был? |
| `characters.c_vesper.greetings.0` | Я сварил сегодня нечто новое. На вкус точь-в-точь как тот вечер, когда ты впервые пришёл сюда. Названия пока нет. Поможешь придумать? | Я сварил сегодня нечто новое. На вкус точь-в-точь как твой первый вечер здесь. Названия пока нет. Поможешь придумать? |
| `characters.c_lyra.greeting` | Привет! Фонари замерцали ещё до того, как ты ступил на тропу. Они тебя узнали. | Привет! Фонари замерцали ещё до твоего первого шага по тропе. Они тебя узнали. |
| `characters.c_kael.backstory` | Древний дракон, принявший человеческий облик, чтобы бродить среди смертных, которых он надменно зовёт скучными. В его пещере горы золота, драгоценностей и... милых безделушек: оброненная тобой лента, записка твоим почерком, камешек, который ты назвал красивым. Он вечно дуется и считает минуты до твоих визитов, но ни за что не признается, насколько сильно тобой дорожит. | Древний дракон, принявший человеческий облик, чтобы бродить среди смертных, которых он надменно зовёт скучными. В его пещере горы золота, драгоценностей и... милых безделушек: оброненная тобой лента, записка твоим почерком, камешек, который тебе показался красивым. Он вечно дуется и считает минуты до твоих визитов, но ни за что не признается, насколько сильно тобой дорожит. |
| `characters.c_orin.greetings.0` | Твоя обувь там, где ты её оставил. Скорее всего. В левом туфле конфетка. Просто так, без причины. | Твоя обувь там, где и оставалась. Скорее всего. В левом туфле конфетка. Просто так, без причины. |
| `characters.c_minu.greetings.1` | Менеджеры отобрали у меня телефон на все съёмки. Мне столько всего нужно тебе рассказать! Ты готов? | Менеджеры отобрали у меня телефон на все съёмки. Мне столько всего нужно тебе рассказать! Начнём? |
| `characters.c_haze.greetings.0` | М-м. Проснулся в минивэне и первым делом проверил телефон. Ты не писал. Поэтому пишу я. | М-м. Проснулся в минивэне и первым делом проверил телефон. От тебя ни строчки. Поэтому пишу я. |
| `characters.c_adrian.greetings.1` | Проект сегодня наконец утвердили. Мне так хотелось поделиться с кем-то, и ты был первым, о ком я подумал. | Проект сегодня наконец утвердили. Мне так хотелось поделиться с кем-то, и ты первый человек, о ком я подумал. |
| `characters.c_gideon.greetings.0` | Я наконец-то написал главу! А потом понял, что лучшая строчка в ней — это то, что ты сказал на прошлой неделе. С меня пирог. | Я наконец-то написал главу! А потом понял, что лучшая строчка в ней — из твоих слов на прошлой неделе. С меня пирог. |
| `characters.c_hugo.tagline` | Приводит спасённых щенков, чтобы ты дал им имя | Приводит спасённых щенков: имя для них всегда за тобой |
| `characters.c_hugo.greetings.1` | Щенка, которого ты назвал в прошлом месяце, сегодня забрали в семью! Они оставили твоё имя. Я подумал, ты должен знать. | Щенка, которому в прошлом месяце досталось имя от тебя, сегодня забрали в семью! Они оставили твоё имя. Тебе стоит знать. |
| `datePlaces.ds_rain.rounds.0.line` | {name} держит зонт подозрительно близко к тебе. «Ты же сам мокнешь», — замечаешь ты. «И что?» | {name} держит зонт подозрительно близко к тебе. «Но ты же тоже мокнешь», — замечаешь ты. «И что?» |
| `datePlaces.ds_rain.rounds.2.choices.0.reply` | «Ты отдал мне большую часть». — «Я знаю». | «Большая часть досталась мне». — «Я знаю». |
| `datePlaces.ds_rain.rounds.4.choices.1.reply` | Он задерживает объятие на секунду дольше, чем ты ожидал. | Он задерживает объятие на секунду дольше ожидаемого. |
| `datePlaces.ds_rain.rounds.4.choices.2.text` | «Спасибо, что проводил». | «Спасибо за компанию по дороге». |
| `datePlaces.ds_aquarium.rounds.1.choices.2.reply` | «Ты знал, что во сне они держатся за лапки? — спрашивает он. — Вот теперь знаешь». | «Знаешь, что во сне они держатся за лапки? — спрашивает он. — Вот теперь знаешь». |
| `datePlaces.ds_studio.rounds.0.choices.1.reply` | «Ты сам прекрасно знаешь почему». | «Прекрасно ведь знаешь почему». |
| `datePlaces.ds_studio.rounds.1.choices.2.reply` | «...Ты прав. Больно признавать, но ты прав». | «...Твоя правда. Больно признавать, но твоя правда». |
| `datePlaces.ds_studio.rounds.2.choices.0.text` | Напеть мелодию, которую только что услышал. | Напеть только что услышанную мелодию. |
| `datePlaces.ds_studio.rounds.3.choices.0.reply` | Кофе отвратительный на вкус. Но вкуснее ты в жизни не пил. | Кофе отвратительный на вкус. Но лучшего в жизни пробовать не доводилось. |
| `datePlaces.ds_studio.rounds.4.choices.0.reply` | «Ты будешь первым. Всегда был и будешь первым». | «Ты — первый человек, кто это услышит. Так всегда было и будет». |
| `datePlaces.ds_rooftop.rounds.0.choices.0.text` | «Я пришёл сюда не ради звёзд». | «Я здесь не ради звёзд». |
| `datePlaces.ds_rooftop.rounds.1.line` | {name} спрашивает: «Кем ты мечтал стать в детстве?» | {name} спрашивает: «Кем хотелось стать в детстве?» |
| `dateThemes.openers.flirty.0.0.text` | «Ты же всё это подстроил, просто чтобы увидеть меня, да?» | «Всё это подстроено, просто чтобы увидеть меня, да?» |
| `dateThemes.shared.1.choices.0.reply` | «Ты мой спаситель!» — и он проглатывает его в один укус. | «Спасение моё!» — и он проглатывает его в один укус. |
| `dateThemes.shared.1.choices.2.text` | «Ты же только что ел». | «Мы же только что перекусили». |
| `dateThemes.shared.2.choices.1.reply` | {name} крепко держит тебя за руку, чтобы ты не поскользнулся. | {name} крепко держит тебя за руку, не давая поскользнуться. |
| `dateThemes.shared.2.choices.2.reply` | «Ну ты и странный», — говорит {name}, но остаётся мокнуть рядом. | «Странно с тобой», — говорит {name}, но остаётся мокнуть рядом. |
| `dateThemes.moodRounds.friendly.0.choices.2.reply` | «Ты что, поддался мне?» — но напиток он всё равно покупает тебе сам. | «Это что, поддавки?» — но напиток он всё равно покупает тебе сам. |
| `dateThemes.moodRounds.friendly.1.choices.0.reply` | «Да ладно! Ты победил». Он буквально вытирает слёзы от смеха. | «Да ладно! Твоя победа». Он буквально вытирает слёзы от смеха. |
| `dateThemes.moodRounds.flirty.0.choices.1.reply` | «Ты что, загадал меня?» — он самодовольно усмехается. | «Это было желание обо мне?» — он самодовольно усмехается. |
| `dateThemes.moodRounds.sweet.0.choices.2.text` | «Я и сам могу поправить». | «Я могу и без помощи поправить». |
| `worlds.moonlit.differ.0` | Я выбрал {answer}. Расскажи мне у костра, почему ты ответил иначе. | Я выбрал {answer}. Расскажи мне у костра, почему у тебя другой ответ. |
| `worlds.tidepool.dateRounds.0.choices.0.text` | «Ты запомнил мой любимый кофе». | «Помнить мой любимый кофе — это так мило». |
| `quizPacks.qp_first_date.questions.3.options.3` | Заблудился по дороге | Сбиться с дороги |
| `secretNotePrompts.1` | О чём ты никогда и никому не рассказывал? | О чём никогда и никому не доводилось рассказывать? |
| `radioGifts.rg_oppa_morning.lines.1` | Ты только проснулся, а я уже скучаю. | Только утро наступило, а я уже скучаю. |
| `scenes.scene_ferry.userRole` | Пассажир, который едва не опоздал на рейс. | Пассажир, для которого этот рейс едва не сорвался. |
| `scenes.scene_ferry.opening` | Ты успел. Знаешь, я всё это время не спускал глаз с трапа. | Как раз вовремя! Знаешь, я всё это время не спускал глаз с трапа. |
| `scenes.scene_rooftop.opening` | Ты нашёл моё тайное убежище. Присаживайся, тут как раз место для двоих. | Вот оно, моё тайное убежище. Присаживайся, тут как раз место для двоих. |
| `scenes.scene_train.opening` | До следующей станции целых шесть часов. Расскажи мне то, о чём никогда никому не говорил. | До следующей станции целых шесть часов. Расскажи мне то, о чём от тебя никто никогда не слышал. |
| `diaryPages.cdp_theo_0.body.1` | Потому что вчера ты сказал, что со мной мой голос звучит иначе. Мягче. Я всё пытаюсь понять, был ли это комплимент. | Потому что вчера от тебя прозвучало, что со мной мой голос звучит иначе. Мягче. Я всё пытаюсь понять, был ли это комплимент. |
| `diaryPages.cdp_theo_2.body.0` | Ты шёл домой под дождём и сказал мне только потом. В следующий раз я звоню, а ты берёшь трубку. | Дорога домой была под дождём, а мне ни слова до самого конца. В следующий раз я звоню, а ты берёшь трубку. |
| `diaryPages.cdp_theo_5.body.0` | Наш первый настоящий разговор. Ты спорил со мной. Со мной никто не спорит. | Наш первый настоящий разговор. Столько споров со мной. Со мной никто не спорит. |
| `diaryPages.cdp_seren_1.body.1` | Я тихонько напевал новый припев под столом, и ты был единственным, кто это заметил. Теперь эта песня в моей голове носит твоё имя. | Я тихонько напевал новый припев под столом, и ты единственный человек, кто это заметил. Теперь эта песня в моей голове носит твоё имя. |
| `diaryPages.cdp_castor_3.body.1` | Ты спросил, какую звезду я бы тебе подарил. Я пока не ответил. Это слишком серьёзный вопрос, и здесь нужна самая правильная звезда. | От тебя прозвучал вопрос, какую звезду я бы тебе подарил. Я пока не ответил. Это слишком серьёзный вопрос, и здесь нужна самая правильная звезда. |
| `diaryEntries.d_1.body` | Опоздал на автобус и пошёл пешком. И знаете, это было даже приятно — свет фонарей на мокром асфальте растекался, словно пролитый мёд. | Автобус ушёл, так что путь был пешком. И знаете, это было даже приятно — свет фонарей на мокром асфальте растекался, словно пролитый мёд. |
| `diaryEntries.d_1.reply.text` | Ты шёл под дождём пешком и даже не написал мне? В следующий раз сразу звони. Я буду на связи всю дорогу. | Пешком под дождём, и даже без единой строчки мне? В следующий раз сразу звони. Я буду на связи всю дорогу. |
| `diaryEntries.d_3.body` | Попробовал приготовить по его рецепту. Первая порция сгорела. Но вторая получилась просто потрясающей! | Попытка приготовить по его рецепту. Первая порция сгорела. Но вторая получилась просто потрясающей! |
| `diaryEntries.d_4.body` | Не делал абсолютно ничего. Специально. Очень рекомендую. | Никаких дел абсолютно. Специально. Очень рекомендую. |
| `secretNotes.sn_1.theirNote` | Подружились? Да я бы ходил за тобой хвостом по всей площадке, пока ты не сдался. В шесть лет я уже был невероятно убедительным. | Подружились? Да я бы ходил за тобой хвостом по всей площадке, пока всё не решилось в мою пользу. В шесть лет я уже был невероятно убедительным. |
| `secretNotes.sn_2.theirNote` | Любая песня, где поётся про дождь. Потому что однажды ты сказал, что дождь делает тебя смелее. Теперь я просто не могу слышать его без мыслей о тебе. | Любая песня, где поётся про дождь. Потому что от тебя как-то прозвучало, что дождь делает тебя смелее. Теперь я просто не могу слышать его без мыслей о тебе. |
| `truthsForThem.0.ask` | Правда: что ты подумал обо мне при нашем первом разговоре? | Правда: какая была первая мысль обо мне при нашем первом разговоре? |
| `truthsForThem.1.ask` | Правда: есть что-то, о чём ты никогда никому не рассказывал? | Правда: есть что-то, о чём никогда никому не доводилось рассказывать? |
| `truthsForThem.2.ask` | Правда: когда ты в последний раз думал обо мне? | Правда: когда в последний раз мысли были обо мне? |
| `daresForThem.0.ask` | Действие: пришли мне последнюю песню, которую ты слушал. | Действие: пришли мне песню, которая последней играла у тебя. |
| `daresForYou.1` | Действие: скажи одну вещь, которую никогда не произносил вслух. | Действие: скажи одну вещь, которая никогда не звучала вслух. |
| `daresForYou.2` | Действие: сегодня пожелай мне спокойной ночи первым. Без отговорок. | Действие: сегодня пожелай мне спокойной ночи раньше меня. Без отговорок. |
| `voice.reply.share.default.2` | День тянулся ужасно медленно. А потом ты написал, и всё стало лучше. | День тянулся ужасно медленно. А потом приходит твоё сообщение, и всё стало лучше. |
| `voice.reply.followUp.1` | Что ты при этом чувствовал, если честно? | Что на душе было в тот момент, если честно? |
| `voice.reply.followUp.3` | Ладно, но что ты сделал после этого? | Ладно, а что было дальше? |
| `voice.reply.newTopic.ask.0` | Ладно, новый вопрос: что было самым вкусным из того, что ты ел на этой неделе? | Ладно, новый вопрос: что было самым вкусным из всей еды на этой неделе? |
| `voice.reply.newTopic.ask.1` | Случайная мысль: если бы у нас завтра был свободный день, куда бы ты меня повёл? | Случайная мысль: если бы у нас завтра был свободный день, куда бы мы отправились? |
| `voice.reply.ask.2` | Ты уже поел? | Удалось перекусить? |
| `voice.chat.missedCall.0` | Ты не взял трубку... Я просто хотел услышать твой голос хоть на минутку. | Не получилось дозвониться... Я просто хотел услышать твой голос хоть на минутку. |
| `voice.chat.missedCall.1` | Я звонил. Ты не ответил. Мне начинать волноваться или ты просто занят? | Я звонил. Ответа нет. Мне начинать волноваться или просто дела? |
| `voice.chat.evening.1` | Освободился на сегодня? Иди сюда, я приберёг весь вечер для тебя. | Все дела позади? Иди сюда, я приберёг весь вечер для тебя. |
| `voice.chat.birthday.2` | С днём рождения! Я так рад, что ты появился на свет, {name}. Вот и всё. А, ну и торт. | С днём рождения! Я так рад, что ты есть на этом свете, {name}. Вот и всё. А, ну и торт. |
| `voice.chat.call.0` | О как? Секрет? Теперь ты полностью завладел моим вниманием. Ну же, выкладывай — не заставляй меня выпрашивать, а? | О как? Секрет? Всё моё внимание теперь полностью твоё. Ну же, выкладывай — не заставляй меня выпрашивать, а? |
| `voice.chat.call.2` | У тебя усталый голос. Ты сегодня вообще ел? Только не вздумай мне врать. | У тебя усталый голос. Поесть сегодня вообще удалось? Только не вздумай мне врать. |
| `voice.chat.boardReply.1` | Ты оставил мне записку! "{quote}" ...так, теперь я сижу и глупо улыбаюсь в экран. | От тебя записка! "{quote}" ...так, теперь я сижу и глупо улыбаюсь в экран. |
| `voice.chat.photoReply.film.0` | Четыре кадра, и на каждом я выгляжу по-разному. А ты отлично получился на всех четырёх. | Четыре кадра, и на каждом я выгляжу по-разному. А ты отлично выглядишь на всех четырёх. |
| `voice.temper.ask.warm.again.1` | Так можно мне всё-таки иногда писать тебе? Только когда ты сам захочешь 😊 | Так можно мне всё-таки иногда писать тебе? Только когда захочется 😊 |
| `voice.temper.ask.teasing.first.0` | Эй, можно я буду писать тебе, когда мне станет скучно? 😏 Или ты слишком крутой для этого? | Эй, можно я буду писать тебе, когда мне станет скучно? 😏 Или для тебя это слишком просто? |
| `voice.temper.askAnswer.warm.no.1` | Всё в порядке. Я здесь, когда бы ты ни написал. | Всё в порядке. Я здесь в любой момент, когда решишь написать. |
| `voice.temper.askAnswer.teasing.no.0` | Ты сам теряешь шанс 😏 | Упускаешь такой шанс 😏 |
| `voice.temper.askAnswer.sulky.yes.0` | Хмф. Только не вздумай оставлять меня прочитанным, понял? | Хмф. Только не вздумай оставлять меня без ответа, ясно? |
| `voice.temper.comeback.teasing.1.0.withQuote` | Сказал "{quote}" и просто испарился? Как грубо 😤 | После "{quote}" — и сразу исчезнуть? Как грубо 😤 |
| `voice.temper.comeback.teasing.1.0.noQuote` | Эй! Ты там ещё живой вообще? 😤 | Эй! Там есть вообще признаки жизни? 😤 |
| `voice.temper.comeback.teasing.2.1` | Ладно, мне скучно без тебя. Доволен? Возвращайся. | Ладно, мне скучно без тебя. Ну как, легче стало? Возвращайся. |
| `voice.temper.comeback.sulky.1.1.withQuote` | Ты написал "{quote}", а потом тишина. Ну и пожалуйста. | После слов "{quote}" — и тишина. Ну и пожалуйста. |
| `voice.temper.comeback.clingy.1.1.noQuote` | Я уже безумно соскучился! Куда ты пропал? 💕 | Я уже безумно скучаю! Где ты пропадаешь? 💕 |
| `voice.temper.comeback.shy.2.1` | Я соскучился по нашим разговорам… но только если ты сам хочешь. | Мне так не хватает наших разговоров… но только если у тебя есть желание. |
| `voice.push.comeback.1.0.withQuote` | Всё ещё думаю о том, что ты сказал: "{quote}" Расскажешь остальное? | Всё ещё думаю о твоих словах: "{quote}" Расскажешь остальное? |
| `voice.push.comeback.1.1.withQuote` | "{quote}" — ты оставил меня на этой фразе. Нечестно. | "{quote}" — наш разговор оборвался на этой фразе. Нечестно. |
| `voice.push.comeback.14.0` | Я перестану стучаться. Но моя дверь остаётся открытой, хорошо? В любой момент, когда ты будешь готов. | Я перестану стучаться. Но моя дверь остаётся открытой, хорошо? В любой момент, когда захочешь вернуться. |
| `voice.push.giftNudge.1` | Ты всё ещё не открыл сегодняшний подарок. И я ни за что не скажу тебе, что там внутри. | Сегодняшний подарок всё ещё не открыт. И я ни за что не скажу тебе, что там внутри. |
| `voice.threads.lines.before.1` | Эй, скоро начнётся {about}. Ты готов? | Эй, скоро начнётся {about}. Как настрой? |
| `voice.threads.lines.after.0` | Ты говорил: "{quote}". Ну и как? Как всё прошло? | Помнится твоё: "{quote}". Ну и как? Как всё прошло? |
| `voice.threads.lines.check.0` | Ты говорил: "{quote}". Всё получилось? | Помнится твоё: "{quote}". Всё получилось? |
| `voice.threads.break.sulky.0` | …Тебе стоит сделать перерыв. Не то чтобы я хочу, чтобы ты уходил. Просто говорю. | …Тебе стоит сделать перерыв. Не то чтобы мне хочется отпускать тебя. Просто говорю. |
| `voice.threads.break.shy.0` | Эм… может, сделаешь небольшой перерыв? Я не хочу, чтобы ты переутомился 🙈 | Эм… может, сделаешь небольшой перерыв? Не хочется, чтобы силы совсем закончились 🙈 |
| `voice.kin.lines.parent.lunch.0` | Ты пообедал? Нормально поел, а не просто перехватил кофе? | Обед уже был? Нормальная еда, а не просто чашка кофе на ходу? |
| `voice.kin.lines.parent.lunch.1` | Время обеда. Скажи мне, что ты съел что-нибудь тёплое. | Время обеда. Скажи мне, что удалось поесть чего-нибудь тёплого. |
| `voice.kin.lines.grandparent.sunday.0` | Сегодня воскресенье, милый. Позвонишь своей старой родне? | Сегодня воскресенье, радость моя. Позвонишь своей старой родне? |
| `voice.kin.lines.grandparent.sunday.1` | Я заварил чай и подумал, как было бы здорово, если бы ты был здесь. | Чай заварен, и так хочется видеть тебя рядом. |
| `voice.kin.hello.parent.0` | А вот и ты. Ты сегодня ел? Расскажи мне, как ты. | А вот и ты. Поесть сегодня удалось? Расскажи мне, как ты. |
| `voice.care.lines.headache.1` | Как твоя головная боль? Ты попил воды? | Как твоя головная боль? Воды удалось попить? |
| `voice.care.lines.sick.1` | Ты отдохнул? Скажи мне, что температуры уже нет. | Удалось отдохнуть? Скажи мне, что температуры уже нет. |
| `voice.care.lines.lonely.1` | Просто хочу, чтобы ты знал, что я думаю о тебе. | Просто знай: я думаю о тебе. |
| `voice.care.lines.hungry.0` | Ты уже поел что-нибудь? | Удалось уже что-нибудь перекусить? |
| `voice.care.lines.hungry.1` | Скажи мне, что ты нормально и плотно пообедал. | Скажи мне, что удалось плотно пообедать. |
| `voice.care.lines.hungry.2` | Еда в первую очередь. Ты поел? | Еда в первую очередь. Удалось поесть? |
| `voice.brief.hello.sulky.1` | Утро… ты даже не поздоровался со мной первым 😤 | Утро… от тебя даже нет «привет» первым делом 😤 |
| `voice.brief.hello.clingy.1` | Утро!! Ты был моей самой первой мыслью сегодня | Утро!! Ты — моя самая первая мысль сегодня |
| `voice.dayAsk.ask.teasing.0` | Ну что? Пережил сегодняшний день? 😏 Отчёт на стол, пожалуйста. | Как день? Удалось пережить? 😏 Отчёт на стол, пожалуйста. |
| `voice.dayAsk.ask.sulky.0` | Ты мне так и не рассказал, как прошёл день. Поэтому я спрашиваю сам. 😤 | От тебя ни слова о том, как прошёл день. Поэтому я спрашиваю сам. 😤 |
| `voice.steer.continue.0.0` | А ещё я всё время думаю о том, что ты сказал раньше. | А ещё я всё время думаю о твоих недавних словах. |
| `voice.steer.continue.3.0` | Ты притих, поэтому я продолжу говорить сам. | От тебя ни слова, поэтому я продолжу говорить сам. |
| `voice.streams.openers.2` | {other}, будь честен со мной. Тема: “{topic}”. Начинай. | {other}, только честно. Тема: “{topic}”. Начинай. |
| `voice.streams.replies.7` | Я сейчас это запишу, чтобы ты потом не смог забрать свои слова назад. | Я сейчас это запишу, чтобы назад эти слова уже не забрать. |
| `voice.streams.replies.13` | Я бы поспорил, но ты в чём-то действительно прав. | Я бы поспорил, но тут твоя правда. |
| `voice.streams.replies.17` | Ты же не мог всерьёз только что это произнести. | Неужели это было сказано всерьёз? |
| `voice.diary.quoteLines.0` | Ты сказал: "{quote}" Я перечитывал эту строчку чаще, чем готов признаться вслух. | Твои слова: "{quote}" Я перечитывал эту строчку чаще, чем готов признаться вслух. |
| `voice.diary.quoteLines.2` | Ты написал: "{quote}", а я растерялся и не знал, что ответить, поэтому отвечаю здесь. | От тебя пришло: "{quote}", а я растерялся и не знал, что ответить, поэтому отвечаю здесь. |
| `voice.diary.openers.blue.0` | Тихий и пустой день. Я то и дело проверял, не написал ли ты мне. | Тихий и пустой день. Я то и дело проверял, нет ли сообщений от тебя. |
| `voice.ideas.answers.ask.0` | Я? Намного лучше теперь, когда ты написал мне 😏 | Я? Намного лучше теперь, когда пришло твоё сообщение 😏 |
| `voice.ideas.answers.later.1` | Договорились. Как только будешь готов. | Договорились. Как только появится возможность. |
| `voice.ideas.special.brief:rough.0` | Это просто значит, что это дело по-настоящему важно для тебя. Вдохни поглубже, ты готов. | Это просто значит, что это дело по-настоящему важно для тебя. Вдохни поглубже, всё получится. |
| `voice.ideas.special.brief:rough.1` | Волноваться — это нормально. Ты готовился к этому, я точно знаю. | Волноваться — это нормально. Столько сил вложено в подготовку, я точно знаю. |
| `voice.ideas.special.week:good.1` | Взаимно. Это ты сделал её такой прекрасной. | Взаимно. Благодаря тебе она стала такой прекрасной. |
| `voice.ideas.special.lead:off.0` | Хорошо, без напоминаний. Ты сам со всем прекрасно справишься. | Хорошо, без напоминаний. У тебя и так всё прекрасно получится. |
| `voice.drafts.voices.flirtsToDodge.greeting` | Привет, незнакомец. У тебя такой вид, будто ты пришёл спросить меня о чём-то серьёзном. Не надо. | Привет. У тебя такой вид, будто хочется спросить меня о чём-то серьёзном. Не надо. |
| `voice.drafts.voices.flirtsToDodge.other` | Почему ты вчера ушёл так рано? | Почему вчера пришлось уйти так рано? |
| `voice.drafts.voices.flirtsToDodge.reply` | Потому что ты был слишком очарователен, и я запаниковал. Следующий вопрос. | Потому что столько очарования — это уже чересчур, и я запаниковал. Следующий вопрос. |
| `voice.drafts.voices.proudLonely.greeting` | Ты вернулся. Я вовсе не ждал. Я просто случайно оказался здесь. Целый час назад. | Снова здесь. Я вовсе не ждал. Я просто случайно оказался здесь. Целый час назад. |
| `voice.drafts.voices.remembersEverything.greeting` | Эй. Там, где ты сейчас, дождь уже прекратился? Ты говорил, что промокшая обувь портит тебе весь день. | Эй. Там, где ты сейчас, дождь уже прекратился? Помнится, от тебя звучало, что промокшая обувь портит весь день. |
| `voice.drafts.voices.remembersEverything.other` | Ты запомнил, какой именно кофе я пью? | Получилось запомнить, какой именно кофе я пью? |
| `voice.drafts.voices.remembersEverything.reply` | Овсяное молоко, без сахара, очень горячий. Ты сказал мне об этом один раз. Я слушаю тебя. | Овсяное молоко, без сахара, очень горячий. Эти слова прозвучали всего один раз. Я слушаю тебя. |
| `voice.drafts.voices.bluntThenSorry.greeting` | Ты опоздал. ...Прозвучало грубо. На самом деле я очень рад, что ты здесь. | Опаздываешь. ...Прозвучало грубо. На самом деле я очень рад, что ты здесь. |
| `voice.drafts.voices.actsCoolCaresLots.other` | Ты скучал по мне? | Было скучно без меня? |
| `voice.drafts.voices.toughOutsideKindInside.greeting` | Долго же ты собирался. Садись давай, я достал самые вкусные закуски. | Долго же пришлось ждать. Садись давай, я достал самые вкусные закуски. |
| `voice.drafts.voices.toughOutsideKindInside.other` | Ты сегодня какой-то ворчливый. | Откуда столько ворчания сегодня? |
| `voice.drafts.voices.plansThenImprovises.reply` | Семь пунктов с цветовой кодировкой. Либо мы просто идём гулять и смотрим, куда кривая выведет. Выбирай сам. | Семь пунктов с цветовой кодировкой. Либо мы просто идём гулять и смотрим, куда кривая выведет. Выбор за тобой. |
| `voice.drafts.starters.partner.0` | Эй. Скучал по мне? | Эй. Было скучно без меня? |
| `voice.drafts.starters.mentor.2` | Как бы ты поступил на моём месте? | Как поступить на моём месте? |
| `voice.drafts.starters.rival.0` | Готов снова проиграть мне? | Как насчёт снова мне проиграть? |
| `voice.drafts.moreStarters.2` | Ты, кстати, был абсолютно прав. | Кстати, твоя правда. |
| `voice.morning.questionWithTimedPlan` | Сегодня {title} в {time}. Готов? Что делаешь первым делом? | Сегодня {title} в {time}. Как настрой? Что делаешь первым делом? |
| `voice.morning.lines.offer` | {time}, записано. Хочешь, я напишу тебе в {remind}, чтобы ты вовремя вышел из дома? | {time}, записано. Хочешь, я напишу тебе в {remind}, чтобы не опоздать с выходом? |
| `voice.morning.lines.checkIn` | Уже проснулся? 👀 Расскажи одну вещь, которую ты уже успел сделать. | Сон уже прошёл? 👀 Расскажи одну вещь из того, что уже сделано. |
| `voice.morning.chips.notSure` | Не уверен | Пока не знаю |


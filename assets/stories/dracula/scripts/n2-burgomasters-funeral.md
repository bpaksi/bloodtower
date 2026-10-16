# n2-burgomasters-funeral

- **Scene ID:** n2-burgomasters-funeral
- **Night:** 2 (after the procession), second set piece
- **Kingdom slot / building:** Night-2 kingdom (K2, Blade or Holy Symbol by seed) / its Sanctuary, where Anton Morosz was carried to lie among his mother's people
- **Setting:** A wake by candlelight. Anton's coffin on trestles, the village on benches, and a second coffin: Dorka Halasz, Lenka's dearest friend, who ran up the hill road after her the night she was taken and was found white at dawn.
- **Mood:** Grief, then the Lucy horror: something loved, made hungry.
- **Cast:** Narrator, Sister Agnes Hallow, Wren Kessel, Emeric Lutz, Dorka Halasz, Tomas Varga
- **Targets:** untagged moments, lines and cues play on `storyboard` (Mac screen and speakers; tower cues fire from the Mac). Moments tagged `ipad:<hunter>` play only on that hunter's iPad, never on the Story board. Variant moments (`scene.moment~variant`) replace the base moment of the same number when their condition holds.

## Moments

**n2-burgomasters-funeral.01** [clip]
[music: plainchant, few voices] [sfx: candles, a woman weeping]
> **Narrator:** Vellmoor buries its burgomaster without a priest and without his daughter. Hanne reads the words, badly, from Oskar's book. Beside Anton lies Dorka Halasz, nineteen, in her wedding dress, because her mother said she'd waited long enough to wear it.

**n2-burgomasters-funeral.02** [still]
> **Agnes:** She ran after Lenka, up the hill, in the dark. Alone.
> **Wren:** Braver than the rest of this valley. Lid's not nailed.

**n2-burgomasters-funeral.03** [still]
[sfx: a fly, buzzing; then several]
> **Emeric:** It's a wake. You don't nail it at a — oh. Oh, you nail it at a wake *here*.

## Private investigation round (engine rule E17; plays after `.03`, before `.lid-choice`)

Each hunter picks one action on their own iPad from the pick cards below (there are always more cards than hunters, and each card can be taken by one hunter only). Each finding is a private moment sent only to `ipad:<hunter>` for whoever picked that card; nobody else sees it until it is shared aloud at `.investigate.share`.

**n2-burgomasters-funeral.investigate** [still]
[music: plainchant, fading] [sfx: a single candle guttering] [tower: heartbeat]
> **Narrator:** The mourners keep their vigil. You have one candle's length, no more, before something in this church happens. Use it.

**n2-burgomasters-funeral.investigate.examine-body** [still] — pick card, shown on every hunter's iPad picker (`ipad:agnes`, `ipad:tomas`, `ipad:wren`, `ipad:emeric`); not on the Story board, no voice
Card 1: **Examine Dorka’s body**. Look closely at the girl in the wedding dress.

**n2-burgomasters-funeral.investigate.examine-body.two-bites.private.agnes** [still] `ipad:agnes` — agnes picked examine-body. Proposed advantage: **Ready Stake** (Gamewright to rule; maps to RtDT battle advantages.)
> **Agnes (thought):** Two bites. One old, one made after her heart stopped. Mother Ursula had the same pair, the morning she sat up. He sends the dead to fetch the living.

**n2-burgomasters-funeral.investigate.examine-body.two-bites.private.tomas** [still] `ipad:tomas` — tomas picked examine-body. Proposed advantage: **Ready Stake** (Gamewright to rule; maps to RtDT battle advantages.)
> **Tomas (thought):** Two wounds, lass. One she took alive. The other's cold work, done after. Like a sentry posted on a corpse. He's sending her somewhere.

**n2-burgomasters-funeral.investigate.examine-body.two-bites.private.wren** [still] `ipad:wren` — wren picked examine-body. Proposed advantage: **Ready Stake** (Gamewright to rule; maps to RtDT battle advantages.)
> **Wren (thought):** Two bites. Second one's after death; no bruising. Mother taught me to read a body before you box it. This one's been sent.

**n2-burgomasters-funeral.investigate.examine-body.two-bites.private.emeric** [still] `ipad:emeric` — emeric picked examine-body. Proposed advantage: **Ready Stake** (Gamewright to rule; maps to RtDT battle advantages.)
> **Emeric (thought):** Two punctures, the second post-mortem. Gerhardt's treatise, chapter nine: "the sending." She isn't a victim. She's a messenger. Keep a stake ready.

**n2-burgomasters-funeral.investigate.question-mother** [still] — pick card, shown on every hunter's iPad picker (`ipad:agnes`, `ipad:tomas`, `ipad:wren`, `ipad:emeric`); not on the Story board, no voice
Card 2: **Question Dorka’s mother**. Sit with the mother. Ask about last night.

**n2-burgomasters-funeral.investigate.question-mother.singing.private.agnes** [still] `ipad:agnes` — agnes picked question-mother. Story flag `mother-warned`. Proposed: the mother bars the window, so one fewer foe joins the fight (Gamewright to rule; maps to RtDT battle advantages.)
> **Agnes (thought):** Her mother heard Dorka singing under the window last night. She opened it to let her daughter in. I told her what I should have told my sisters: bar it. She has.

**n2-burgomasters-funeral.investigate.question-mother.singing.private.tomas** [still] `ipad:tomas` — tomas picked question-mother. Story flag `mother-warned`. Proposed: the mother bars the window, so one fewer foe joins the fight (Gamewright to rule; maps to RtDT battle advantages.)
> **Tomas (thought):** The mother heard her girl singing under the window, and left it open for her. I'd have done the same for Marta. I told her to bar it anyway. She did.

**n2-burgomasters-funeral.investigate.question-mother.singing.private.wren** [still] `ipad:wren` — wren picked question-mother. Story flag `mother-warned`. Proposed: the mother bars the window, so one fewer foe joins the fight (Gamewright to rule; maps to RtDT battle advantages.)
> **Wren (thought):** Mother heard Dorka singing under the window last night. Left it open. My mother would've nailed it shut. I told her to. She's barring it now.

**n2-burgomasters-funeral.investigate.question-mother.singing.private.emeric** [still] `ipad:emeric` — emeric picked question-mother. Story flag `mother-warned`. Proposed: the mother bars the window, so one fewer foe joins the fight (Gamewright to rule; maps to RtDT battle advantages.)
> **Emeric (thought):** She heard her daughter singing outside the window, a wedding song, and she left the window open. Folklore, page forty: they sing to be let in. I asked her to bar it. She's doing it.

**n2-burgomasters-funeral.investigate.anton-coat** [still] — pick card, shown on every hunter's iPad picker (`ipad:agnes`, `ipad:tomas`, `ipad:wren`, `ipad:emeric`); not on the Story board, no voice
Card 3: **Search Anton’s coat**. Go through the dead burgomaster’s pockets.

**n2-burgomasters-funeral.investigate.anton-coat.holy-water.private.agnes** [still] `ipad:agnes` — agnes picked anton-coat. Gain: one holy water, carried by the hunter who picked this. Clue: "the lady's rooms".
> **Agnes (thought):** In Anton's coat, a flask of holy water he never had the chance to use, and a scrap in his ledger hand: "the lady's rooms." He knew where he'd take her.

**n2-burgomasters-funeral.investigate.anton-coat.holy-water.private.tomas** [still] `ipad:tomas` — tomas picked anton-coat. Gain: one holy water, carried by the hunter who picked this. Clue: "the lady's rooms".
> **Tomas (thought):** Coat's heavy on one side: a flask of holy water, stopper sealed. And a note, the burgomaster's hand: "the lady's rooms." Castle talk. I know that wing.

**n2-burgomasters-funeral.investigate.anton-coat.holy-water.private.wren** [still] `ipad:wren` — wren picked anton-coat. Gain: one holy water, carried by the hunter who picked this. Clue: "the lady's rooms".
> **Wren (thought):** Holy water in his coat. Full. Didn't get to use it. Scrap of paper too: "the lady's rooms." Keeping both.

**n2-burgomasters-funeral.investigate.anton-coat.holy-water.private.emeric** [still] `ipad:emeric` — emeric picked anton-coat. Gain: one holy water, carried by the hunter who picked this. Clue: "the lady's rooms".
> **Emeric (thought):** A flask of holy water, unopened, and a scrap: "the lady's rooms." A burgomaster's note, a ledger-keeper's hand. He was trying to work out where she'd be held.

**n2-burgomasters-funeral.investigate.pray-over-coffins** [still] — pick card, shown on every hunter's iPad picker (`ipad:agnes`, `ipad:tomas`, `ipad:wren`, `ipad:emeric`); not on the Story board, no voice
Card 4: **Pray over the coffins**. Kneel between the two coffins and pray.

**n2-burgomasters-funeral.investigate.pray-over-coffins.consecrated.private.agnes** [still] `ipad:agnes` — agnes picked pray-over-coffins. Proposed advantage: **Consecrated Ground** (Gamewright to rule; maps to RtDT battle advantages.)
> **Agnes (thought):** I pray for Anton, and then for her, and then, God help me, for him, the way I did in the chapel. The prayer holds. Every candle leans away from Dorka's coffin.

**n2-burgomasters-funeral.investigate.pray-over-coffins.consecrated.private.tomas** [still] `ipad:tomas` — tomas picked pray-over-coffins. Proposed advantage: **Consecrated Ground** (Gamewright to rule; maps to RtDT battle advantages.)
> **Tomas (thought):** I'm no praying man. I say the guard's words for the dead, the short ones. It holds. The candlelight bends away from the girl's coffin, like it won't touch her.

**n2-burgomasters-funeral.investigate.pray-over-coffins.consecrated.private.wren** [still] `ipad:wren` — wren picked pray-over-coffins. Proposed advantage: **Consecrated Ground** (Gamewright to rule; maps to RtDT battle advantages.)
> **Wren (thought):** Said the words Mother said over every grave-row. They hold. The light leans off Dorka's coffin. This floor's ours now.

**n2-burgomasters-funeral.investigate.pray-over-coffins.consecrated.private.emeric** [still] `ipad:emeric` — emeric picked pray-over-coffins. Proposed advantage: **Consecrated Ground** (Gamewright to rule; maps to RtDT battle advantages.)
> **Emeric (thought):** I don't know the proper words, so I read the burial office from Oskar's book, very fast. The prayer holds. The candle flames lean away from Dorka's coffin. Consecrated. Ground. Noted.

**n2-burgomasters-funeral.investigate.follow-the-mourner** [still] — pick card, shown on every hunter's iPad picker (`ipad:agnes`, `ipad:tomas`, `ipad:wren`, `ipad:emeric`); not on the Story board, no voice
Card 5: **Follow the cloaked mourner (risky)**. A mourner slips out. Go after them alone.

**n2-burgomasters-funeral.investigate.follow-the-mourner.cue** [still] — plays on the Story board once all picks are locked, if anyone picked this card (no voice). [tower: seal-sequence] [sfx: a door slamming in the wind] (screen fallback if no tower: the Story board shows the church door swinging shut and one empty chair)
[sfx: a door closing softly]

**n2-burgomasters-funeral.investigate.follow-the-mourner.the-servant.private.agnes** [still] `ipad:agnes` — agnes picked follow-the-mourner. **Cost (Gamewright), the picker chooses:** take 1 corruption (not offered if agnes is at 2: instant-loss guard), or miss the fight (absent from `.04`–`.07`; the scene's existing `~no-agnes` variants apply). Reward: proposed advantage **Forewarned** (Gamewright to rule; maps to RtDT battle advantages.), plus an early hint toward the lady's rooms.
> **Agnes (thought):** I follow the cloaked mourner into the churchyard. A man in castle grey lays a pressed violet on Anton's grave and says to no one: "She still refuses." I know that bow. The traveler's servant bowed like that at Saint Ysolde.

**n2-burgomasters-funeral.investigate.follow-the-mourner.the-servant.private.tomas** [still] `ipad:tomas` — tomas picked follow-the-mourner. **Cost (Gamewright), the picker chooses:** take 1 corruption (not offered if tomas is at 2: instant-loss guard), or miss the fight (absent from `.04`–`.07`; the scene's existing `~no-tomas` variants apply). Reward: proposed advantage **Forewarned** (Gamewright to rule; maps to RtDT battle advantages.), plus an early hint toward the lady's rooms.
> **Tomas (thought):** I tail the cloak to the churchyard, quiet, the way the guard taught us. Castle servant. He lays a violet on Anton's grave and says: "She still refuses." Then he goes up the hill road, toward the lady's rooms.

**n2-burgomasters-funeral.investigate.follow-the-mourner.the-servant.private.wren** [still] `ipad:wren` — wren picked follow-the-mourner. **Cost (Gamewright), the picker chooses:** take 1 corruption (not offered if wren is at 2: instant-loss guard), or miss the fight (absent from `.04`–`.07`; the scene's existing `~no-wren` variants apply). Reward: proposed advantage **Forewarned** (Gamewright to rule; maps to RtDT battle advantages.), plus an early hint toward the lady's rooms.
> **Wren (thought):** Followed the cloak out. Castle servant. Put a violet on Anton's grave. Said: "She still refuses." Went up toward the east wing. The lady's rooms.

**n2-burgomasters-funeral.investigate.follow-the-mourner.the-servant.private.emeric** [still] `ipad:emeric` — emeric picked follow-the-mourner. **Cost (Gamewright), the picker chooses:** take 1 corruption (not offered if emeric is at 2: instant-loss guard), or miss the fight (absent from `.04`–`.07`; the scene's existing `~no-emeric` variants apply). Reward: proposed advantage **Forewarned** (Gamewright to rule; maps to RtDT battle advantages.), plus an early hint toward the lady's rooms.
> **Emeric (thought):** I followed. I don't know why I followed. A castle servant left a pressed violet on Anton's grave and said, "She still refuses." Then he walked up toward the east wing, where Gerhardt marked "the lady's rooms."

**n2-burgomasters-funeral.investigate.share** [still]
[sfx: the candle burns down to the socket]
> **Narrator:** The candle is out. Share what you found, or keep it. Then look at the second coffin.

**Absent hunters (`~no-<hunter>`):** a hunter who is not at the wake gets no pick and no finding; their findings are simply not sent. The round needs no other variant. A hunter who chose "miss the fight" after following the mourner is absent from `.04`–`.07` only and is back for `.08`.

## Moments (continued)

**n2-burgomasters-funeral.lid-choice** [still] — event moment, plays after `.03` and before `.04`. A choice for the whole party, voted on each iPad (the Story board only shows the result): **Nail the lid** (spend one stake) or **Keep the stake and watch**. Effect on the fight is Gamewright's call (proposed: nailing weakens Dorka; watching keeps the stake but she rises at full strength). Either way she rises and the "lady's rooms" line still plays.
[sfx: a fly, then silence] [tower: heartbeat]
> **Narrator:** The flies have gone quiet. Every candle leans toward the second coffin. There is time, just, to put a stake through a girl in her wedding dress in front of her mother. Or there is time to wait and be sure.

**n2-burgomasters-funeral.lid-choice~nailed** [still] — the party nailed the lid
> **Wren:** Sorry, Dorka.
> **Narrator:** The hammer is very loud in the little church. The stake goes in crooked. Her mother does not scream; she just stops breathing for a while.

**n2-burgomasters-funeral.lid-choice~watched** [still] — the party kept the stake and watched
> **Agnes:** We wait. If she's only a dead girl, she deserves to be buried whole.
> **Narrator:** Nobody in the church looks away from the coffin, so nobody sees the candles go out one by one along the back wall.

**n2-burgomasters-funeral.04** [clip]
[tower: dim-all] [tower: heartbeat] [sfx: wood creaks]
> **Narrator:** The candles bow all at once. Dorka Halasz sits up in her wedding dress, and it is the sweetest smile anyone in the room has ever seen.

**n2-burgomasters-funeral.05** [clip]
> **Dorka:** Come to me. Leave these others and come to me. My arms are hungry for you. *(adapted from Stoker, Lucy: "Come to me, Arthur…")* Lenka's waiting. She'll be so glad.
> **Agnes:** Lenka is waiting for *us*, child. Not for you.

**n2-burgomasters-funeral.06** [clip]
[sfx: mourners screaming, benches overturning] [music: low drums] Fight (spawn shape, per mechanics).
> **Tomas:** Everyone out! Behind me!
> **Dorka:** He's so kind. She's in the lady's rooms, in a white dress. She won't stop saying no. He's so patient with her.

**n2-burgomasters-funeral.07** [still] (after)
> **Narrator:** When it is done, Dorka is only a girl in a wedding dress again, with garlic in her mouth and a peace on her face she did not have a minute ago.
> **Wren:** "She won't stop saying no." Good girl.

**n2-burgomasters-funeral.mourner-returns.agnes** [still] — event moment (fellowship test 2): plays after `.07`, before `.08`, only if agnes followed the mourner and chose to miss the fight. Gamewright's regroup rule: she shares the finding, and everyone present gets +1 to the next fight.
> **Agnes:** I followed the cloak. A castle servant, laying a violet on Anton's grave. He said, "She still refuses," and went up to the east wing. The lady's rooms.
**n2-burgomasters-funeral.mourner-returns.tomas** [still] — as above, for tomas
> **Tomas:** Followed him to the grave. Castle livery. Left a violet for Anton and said, "She still refuses." Then up the hill to the east wing. The lady's rooms.
**n2-burgomasters-funeral.mourner-returns.wren** [still] — as above, for wren
> **Wren:** Castle servant. Violet on Anton's grave. Said "She still refuses." Went up to the east wing. Lady's rooms. That's where she is.
**n2-burgomasters-funeral.mourner-returns.emeric** [still] — as above, for emeric
> **Emeric:** I'm back, I'm sorry, I followed him. A castle servant. He left a violet on Anton's grave and said, "She still refuses." East wing. The lady's rooms.

**n2-burgomasters-funeral.08** [still]
> **Agnes:** Hold on to that, all of you. Every night she refuses him is a night she's still ours.

**n2-burgomasters-funeral.09.private.agnes** [still] `ipad:agnes`
> **Agnes (thought):** Mother Ursula sat up like that, on the fourth night. You didn't have a stake then. You do now.
**n2-burgomasters-funeral.09.private.tomas** [still] `ipad:tomas`
> **Tomas (thought):** Dorka served at the castle last winter. Marta knew her. Marta has a wedding dress too, in the chest at the foot of her bed.
**n2-burgomasters-funeral.09.private.wren** [still] `ipad:wren`
> **Wren (thought):** New bolt: D-O-R-K-A. Your mother laid out every bride in this valley for thirty years. She'd have nailed that lid.
**n2-burgomasters-funeral.09.private.emeric** [still] `ipad:emeric`
> **Emeric (thought):** Two bites, the second made after death. Gerhardt's treatise called it "the sending." He sends the dead to fetch the living.

## Outcome
Night 2's second set piece is done; with the site, the kingdom's key. Night 3 begins in the other fortune kingdom.

**n2-burgomasters-funeral.10** [still] [prop: pressed-flower]
> **Narrator:** They bury Anton Morosz at dawn, properly. On the lid, someone has left a pressed violet. No one saw who.

**n2-burgomasters-funeral.end.private.wren** [still] `ipad:wren` — personal ending line (R3-9)
> **Wren (thought):** Two graves filled by noon. Father's spade did the work. Mother was taken for hiding one girl. I'll fetch the other one home.
**n2-burgomasters-funeral.end.private.tomas** [still] `ipad:tomas` — personal ending line (R3-9)
> **Tomas (thought):** Twenty years I stood that wall. Tonight she walked back behind it on her own feet, to pour his wine. I'm not burying her too. I'll carry her out again, fingers or no.
**n2-burgomasters-funeral.end.private.agnes** [still] `ipad:agnes` — personal ending line (R3-9)
> **Agnes (thought):** He let me live because I prayed for him. I prayed over two coffins today instead. Lord, let that be the last mercy he ever gets from me.
**n2-burgomasters-funeral.end.private.emeric** [still] `ipad:emeric` — personal ending line (R3-9)
> **Emeric (thought):** Gerhardt's cipher is still in my coat, and Anton is in the ground. I need the Tome's first line to read it. I'm afraid of what it'll say.

## Variants
**n2-burgomasters-funeral.lid-choice~nailed~no-wren** [still] — nailed, Wren not in play
> **Tomas:** Forgive me, girl.
> **Narrator:** The hammer is very loud in the little church. The stake goes in crooked. Her mother does not scream; she just stops breathing for a while.
**n2-burgomasters-funeral.lid-choice~watched~no-agnes** [still] — watched, Agnes not in play
> **Tomas:** We wait. If she's only a dead girl, she gets buried whole.
> **Narrator:** Nobody in the church looks away from the coffin, so nobody sees the candles go out one by one along the back wall.
**n2-burgomasters-funeral.07~fight-lost** [still] — the fight was lost (outcome per mechanics)
> **Narrator:** Dorka is gone through the window, laughing, up the hill road.
> **Wren:** She'll tell him we're coming.
**n2-burgomasters-funeral.07~fight-lost~no-wren** [still] — the fight was lost, Wren not in play (narrator only; R3-12)
> **Narrator:** Dorka is gone through the window, laughing, up the hill road, toward the one who sent her. By the time anyone reaches the castle, he will know who is coming.
**n2-burgomasters-funeral.04~holy-symbol** [clip] — Holy Symbol held (same cues)
> **Narrator:** The candles bow. Dorka sits up in her wedding dress, and the saint's lamp flares, and she shields her eyes and smiles anyway.
**n2-burgomasters-funeral.05~no-agnes** [clip] — Agnes not in play
> **Dorka:** Come to me. My arms are hungry for you. *(adapted from Stoker)* Lenka's waiting.
> **Tomas:** She's waiting for us, girl.
**n2-burgomasters-funeral.08~no-agnes** [still] — Agnes not in play
> **Tomas:** Every night she says no, she's still ours.
**n2-burgomasters-funeral.06~no-tomas** [clip] — Tomas not in play (same cues)
> **Wren:** Out! Everyone out!
> **Dorka:** He's so kind. She's in the lady's rooms, in a white dress. She won't stop saying no.
**n2-burgomasters-funeral.02~no-wren** [still] — Wren not in play
> **Agnes:** She ran after Lenka, up the hill, in the dark. Alone. And her lid is not nailed.
**n2-burgomasters-funeral.07~no-wren** [still] — Wren not in play
> **Narrator:** When it is done, Dorka is only a girl in a wedding dress again, with a peace on her face she did not have a minute ago.
**n2-burgomasters-funeral.03~no-emeric** [still] — Emeric not in play
> **Narrator:** Nobody in Vellmoor has nailed a lid at a wake before tonight.

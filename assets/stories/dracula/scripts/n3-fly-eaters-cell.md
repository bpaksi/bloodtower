# n3-fly-eaters-cell

- **Scene ID:** n3-fly-eaters-cell
- **Night:** 3, second set piece
- **Kingdom slot / building:** Night-3 kingdom (K3, Blade or Holy Symbol by seed) / its Citadel lockhouse, where the lord keeps the mad
- **Setting:** A whitewashed cell freckled with dead flies. Jakob Brenner, once the castle's bookkeeper, sits cross-legged in the centre, catching flies from the air and eating them with neat little bites.
- **Mood:** Comic dread, then a bargain with something worse than a madman.
- **Cast:** Narrator, Jakob Brenner, Emeric Lutz, Tomas Varga, Wren Kessel, Sister Agnes Hallow
- **Targets:** untagged moments, lines and cues play on `storyboard` (the Story board: Mac screen and speakers, display only; tower cues fire from the Mac; all taps and votes are on the iPads). Moments tagged `ipad:<hunter>` play only on that hunter's iPad, never on the Story board. Variant moments (`scene.moment~variant`) replace the base moment of the same number when their condition holds.

## Moments

**n3-fly-eaters-cell.01** [clip]
[sfx: buzzing flies, giggle] [music: a single plucked string, repeated]
> **Narrator:** Jakob Brenner kept the castle's books for twenty years. Then one spring he walked down the hill and asked the lord to lock him up, for safety. Whose safety, he would not say.

**n3-fly-eaters-cell.02** [still]
> **Jakob:** Visitors! "The blood is the life," gentlemen. *(Stoker, Renfield)* Flies are only a little life. One must start small.
> **Emeric:** Is that from scripture?
> **Jakob:** It's from the ledger, boy. Debit, credit.

**n3-fly-eaters-cell.03** [still]
> **Tomas:** Brenner. You paid the guard on Fridays. You knew where the girls went.
> **Jakob:** I knew what they *cost*, Sergeant Varga. That's a different column.

**n3-fly-eaters-cell.04** [still]
[tower: heartbeat] [sfx: the heartbeat under the buzzing]
> **Jakob:** You want the burgomaster's girl. The Master's lady. He's had her room aired. Four hundred years it's been aired. I know the plan. Plans cost.
> **Wren:** Name the price.

**n3-fly-eaters-cell.05** [still] — the price
> **Jakob:** *(cupped hand held out)* Something that matters. A drop of one of you on my tongue, or a thing you carry that he fears. Debit, credit.

**n3-fly-eaters-cell.06** [still] — the plan (plays once paid)
> **Jakob:** He sleeps in his own earth, carried down in boxes. Burn the boxes and he has nowhere to lie but the one. On the last night he takes her up to the high room and asks her to open the window herself. That's the rule. She has to open it. She never has.

**n3-fly-eaters-cell.07** [still]
> **Emeric:** How many boxes?
> **Jakob:** I wrote the shipping orders. Fifty years of earth. *(giggles)* You won't find them all. I didn't.

**n3-fly-eaters-cell.08** [clip]
[sfx: flies stop at once] [tower: low]
> **Jakob:** *(suddenly very calm)* "I don't want to talk to you: you don't count now; the Master is at hand." *(Stoker, Renfield)*
> **Agnes:** Then we're done here. Wren, the door.

**n3-fly-eaters-cell.09.private.agnes** [still] `ipad:agnes`
> **Jakob (whisper):** You prayed for him, Sister. He keeps a page about it. A whole page. Your name in his hand.
**n3-fly-eaters-cell.09.private.tomas** [still] `ipad:tomas`
> **Jakob (whisper):** Your Marta has the key to the little gate. On the last night she'll leave it open for you, or for him. She hasn't decided. Ask her nicely.
**n3-fly-eaters-cell.09.private.wren** [still] `ipad:wren`
> **Jakob (whisper):** Kessel. I paid your mother's wages. Bride's wages are better, did you know? I rounded them up.
**n3-fly-eaters-cell.09.private.emeric** [still] `ipad:emeric` [prop: ludmila-tome]
> **Jakob (whisper):** Your Gerhardt bought a parish register from me. Births and foundlings. He paid in silver and wept the whole time. Ask the book why.

## Outcome / choice
Moment 05, the party chooses the price (vote on each iPad):
1. **Blood:** one chosen hunter takes 1 corruption. A hunter already at 2 corruptions cannot be chosen (the option is greyed out for them). → .05~paid-blood, then 06, 07.
2. **A story item:** the party gives up one of: holy water, the host, or a stake (nothing else). → .05~paid-item, then 06, 07. Earth-box sites are marked for night 4.
3. **Refuse:** → .06~refused only; night-4 box sites are unmarked.
Blood also marks the box sites.

**n3-fly-eaters-cell.10** [still]
> **Narrator:** Behind you, the cell fills with flies again, and Jakob is singing a counting song under his breath.

## Variants
**n3-fly-eaters-cell.05~paid-blood** [still] — blood paid
> **Jakob:** *(licking his lips)* Oh, he does like you. I can taste it. Debit.
**n3-fly-eaters-cell.05~paid-item** [still] — an item paid
> **Jakob:** *(cradling it, hissing at it)* He'll hate that I have this. Lovely. Debit.
**n3-fly-eaters-cell.06~refused** [still] — price refused
> **Jakob:** He sleeps in boxes. That's all you get for nothing. Credit nothing, debit nothing.
**n3-fly-eaters-cell.06~obj3** [still] — Count objective 3 (after the base .06) [prop: sergiu-blade]
> **Jakob:** And he wants the brother's sword in the river before she ever sees it.
**n3-fly-eaters-cell.03~no-tomas** [still] — Tomas not in play
> **Agnes:** You kept the castle's books. You knew where the girls went.
> **Jakob:** I knew what they *cost*, Sister. That's a different column.
**n3-fly-eaters-cell.04~no-wren** [still] — Wren not in play (same cues)
> **Jakob:** You want the burgomaster's girl. He's had her room aired four hundred years. Plans cost.
> **Tomas:** Name the price.
**n3-fly-eaters-cell.08~no-wren** [clip] — Wren not in play (same cues)
> **Jakob:** "I don't want to talk to you: you don't count now; the Master is at hand." *(Stoker, Renfield)*
> **Agnes:** Then we're done here.
**n3-fly-eaters-cell.08~no-agnes** [clip] — Agnes not in play (same cues)
> **Jakob:** "I don't want to talk to you: you don't count now; the Master is at hand." *(Stoker, Renfield)*
> **Tomas:** Door. We're done.
**n3-fly-eaters-cell.07~no-emeric** [still] — Emeric not in play
> **Wren:** How many boxes?
> **Jakob:** Fifty years of earth. You won't find them all. I didn't.
**n3-fly-eaters-cell.02~no-emeric** [still] — Emeric not in play
> **Jakob:** Visitors! "The blood is the life." *(Stoker, Renfield)* Flies are only a little life. One must start small.

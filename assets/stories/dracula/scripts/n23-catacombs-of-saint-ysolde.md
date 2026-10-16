# n23-catacombs-of-saint-ysolde

- **Scene ID:** n23-catacombs-of-saint-ysolde (plays on night 2 or night 3, whichever kingdom the fortune gave the Holy Symbol)
- **Night:** 2 or 3, key set piece of the Holy Symbol site (set piece 8, catacombs)
- **Kingdom slot / building:** K2 or K3 / the fortune's Holy Symbol building, and the crypts beneath it
- **Setting:** A stair into bone-lined passages that move when no one looks. At the bottom, the Lantern of Saint Ysolde: a small silver lamp whose flame burns without oil, in a niche shaped exactly like Agnes's reliquary.
- **Mood:** Claustrophobic, paranoid, then a relief that does not last.
- **Cast:** Narrator, Wren Kessel, Tomas Varga, Sister Agnes Hallow, Emeric Lutz
- **Targets:** untagged moments, lines and cues play on `dashboard` (Mac screen and speakers; tower cues fire from the Mac). Moments tagged `ipad:<hunter>` play only on that hunter's iPad, never on the dashboard. Variant moments (`scene.moment~variant`) replace the base moment of the same number when their condition holds.
- **Lookalike:** at most one at a time. The app picks one present hunter (or none, by mechanics). That hunter's iPad plays `.04.private.<hunter>` then `.04.private.<hunter>~lookalike` and one secret card (`.secret-card.<goal>.private.<hunter>`, on that iPad only); the others play only `.04.private.<hunter>`. A lookalike is unmasked by holy water or a Sanctuary rest, which ends it.

## Moments

**n23-catacombs-of-saint-ysolde.01** [clip] — one variant by building
[music: low pulse] [sfx: dripping, stone grinding] [tower: flicker] [tower: heartbeat-half]
**n23-catacombs-of-saint-ysolde.01~village** [clip]
> **Narrator:** The well-rope goes down into the plague dead, and further. Behind you, the wall closes like a mouth.
**n23-catacombs-of-saint-ysolde.01~sanctuary** [clip]
> **Narrator:** Behind the altar, a stair Father Oskar had bricked up goes down further than the hill is tall. Behind you, the wall closes like a mouth.
**n23-catacombs-of-saint-ysolde.01~bazaar** [clip]
> **Narrator:** The reliquary-seller's cellar has a cellar, and that one has a stair. Behind you, the wall closes like a mouth.
**n23-catacombs-of-saint-ysolde.01~citadel** [clip]
> **Narrator:** The lord's chapel floor lifts on a ring, onto a stair that goes down too far. Behind you, the wall closes like a mouth.

**n23-catacombs-of-saint-ysolde.02** [still]
> **Wren:** Passage split. Left smells of lamp oil. Right smells of nothing. Nothing's worse.
> **Tomas:** Then we split too, lass, and we meet at the saint.

**n23-catacombs-of-saint-ysolde.03** [clip]
[sfx: footsteps that do not match the count of feet]
> **Narrator:** The party splits. On the map, the passages redraw themselves behind you.

**n23-catacombs-of-saint-ysolde.04.private.agnes** [still] `ipad:agnes`
> **Narrator (private):** The passage narrows. You hear plainchant ahead, slightly off key. Your own voice. You are not humming.

**n23-catacombs-of-saint-ysolde.04.private.agnes~lookalike** [still] `ipad:agnes` — only if agnes is tonight's lookalike
> **Narrator (private):** You are not Agnes. You remember the chapel from outside, through the window. Read the card that follows. Do not let them see you read it.

**n23-catacombs-of-saint-ysolde.04.private.tomas** [still] `ipad:tomas`
> **Narrator (private):** The bones in this wall wear castle livery. One skull has the guard's tooth-notch, the one you all filed for luck.

**n23-catacombs-of-saint-ysolde.04.private.tomas~lookalike** [still] `ipad:tomas` — only if tomas is tonight's lookalike
> **Narrator (private):** You are not Tomas. You have all ten fingers, and you keep your left hand in your cloak. Read the card that follows. Do not let them see you read it.

**n23-catacombs-of-saint-ysolde.04.private.wren** [still] `ipad:wren`
> **Narrator (private):** Fresh earth on these steps. Someone carried a coffin down here and back up this week.

**n23-catacombs-of-saint-ysolde.04.private.wren~lookalike** [still] `ipad:wren` — only if wren is tonight's lookalike
> **Narrator (private):** You are not Wren. You do not like the smell of cloves. Read the card that follows. Do not let them see you read it.

**n23-catacombs-of-saint-ysolde.04.private.emeric** [still] `ipad:emeric`
> **Narrator (private):** Chalk marks on the walls in Gerhardt's hand: arrows, then the word "BACK."

**n23-catacombs-of-saint-ysolde.04.private.emeric~lookalike** [still] `ipad:emeric` — only if emeric is tonight's lookalike
> **Narrator (private):** You are not Emeric. Your spectacles are plain glass. Read the card that follows. Do not let them see you read it.

**n23-catacombs-of-saint-ysolde.secret-card.decoy-crypt.private.agnes** [still] `ipad:agnes` — only if agnes is the lookalike and was dealt this goal; text card, no voice; never on the dashboard
Card: "Lead them to a decoy crypt. You win if the party spends one visit there."

**n23-catacombs-of-saint-ysolde.secret-card.decoy-crypt.private.tomas** [still] `ipad:tomas` — only if tomas is the lookalike and was dealt this goal; text card, no voice; never on the dashboard
Card: "Lead them to a decoy crypt. You win if the party spends one visit there."

**n23-catacombs-of-saint-ysolde.secret-card.decoy-crypt.private.wren** [still] `ipad:wren` — only if wren is the lookalike and was dealt this goal; text card, no voice; never on the dashboard
Card: "Lead them to a decoy crypt. You win if the party spends one visit there."

**n23-catacombs-of-saint-ysolde.secret-card.decoy-crypt.private.emeric** [still] `ipad:emeric` — only if emeric is the lookalike and was dealt this goal; text card, no voice; never on the dashboard
Card: "Lead them to a decoy crypt. You win if the party spends one visit there."

**n23-catacombs-of-saint-ysolde.secret-card.lose-consumable.private.agnes** [still] `ipad:agnes` — only if agnes is the lookalike and was dealt this goal; text card, no voice; never on the dashboard
Card: "Lose one of the party's consumables (holy water, garlic, a silver bolt). You win if it is gone before dawn."

**n23-catacombs-of-saint-ysolde.secret-card.lose-consumable.private.tomas** [still] `ipad:tomas` — only if tomas is the lookalike and was dealt this goal; text card, no voice; never on the dashboard
Card: "Lose one of the party's consumables (holy water, garlic, a silver bolt). You win if it is gone before dawn."

**n23-catacombs-of-saint-ysolde.secret-card.lose-consumable.private.wren** [still] `ipad:wren` — only if wren is the lookalike and was dealt this goal; text card, no voice; never on the dashboard
Card: "Lose one of the party's consumables (holy water, garlic, a silver bolt). You win if it is gone before dawn."

**n23-catacombs-of-saint-ysolde.secret-card.lose-consumable.private.emeric** [still] `ipad:emeric` — only if emeric is the lookalike and was dealt this goal; text card, no voice; never on the dashboard
Card: "Lose one of the party's consumables (holy water, garlic, a silver bolt). You win if it is gone before dawn."

**n23-catacombs-of-saint-ysolde.rejoin.agnes** [still] — event moment (fellowship test 2): plays when the groups meet at the niche, once per rejoining hunter, before `.05`. Gamewright's regroup rule applies: each rejoining hunter shares their `.04` finding, and everyone present gets +1 to the next fight. A lookalike's rejoin line plays the same; it heard what the real hunter would have heard.
> **Agnes:** There was plainchant in my passage, in my own voice. Something down here has learned how we sound. Trust faces before voices tonight.
**n23-catacombs-of-saint-ysolde.rejoin.tomas** [still] — as above
> **Tomas:** Guard bones in my wall, lass, with the notch in the teeth we filed for luck. Any of us who doesn't know that notch isn't one of us.
**n23-catacombs-of-saint-ysolde.rejoin.wren** [still] — as above
> **Wren:** Fresh earth on my steps. A coffin went down and back up this week. Whatever it carried is at the castle now.
**n23-catacombs-of-saint-ysolde.rejoin.emeric** [still] — as above
> **Emeric:** Gerhardt's chalk, all the way down. Arrows, then "BACK." He reached the saint and turned round. Follow his arrows out, not the walls.

**n23-catacombs-of-saint-ysolde.rejoin-combined** [still] — plays after the rejoin lines if both Tomas and Wren rejoined (fellowship test 1); otherwise skipped
Journal: "He is moving the old guard's dead up to the castle for the last night."
> **Tomas:** Guard bones with the notch, and a coffin carried up this week.
> **Wren:** Then he's moving his old garrison up the hill. For the last night.

**n23-catacombs-of-saint-ysolde.05** [still] (groups rejoin at the niche)
> **Emeric:** Sister. Your hand is bleeding.
> **Agnes:** My hand is always bleeding near this saint. Give me room.

**n23-catacombs-of-saint-ysolde.06** [clip]
[sfx: bell, bright] [music: single choir chord] [tower: break-seal] (seal plan: key)
> **Narrator:** Agnes sets her empty reliquary into the niche. It fits. The flame inside the lamp leans toward her, the way a dog leans toward its owner.
> **Agnes:** I carried you out of the fire. I lost you on the road. Forgive me.

**n23-catacombs-of-saint-ysolde.07** [clip] — unmasking, only if there is a lookalike and the party uses holy water here
[sfx: canvas-tear shriek] [tower: heartbeat-fast] then [tower: heartbeat]
> **Narrator:** Holy water hisses on one of you like fat in a pan.
> **Tomas:** *(axe up)* Show me your left hand. Now.

**n23-catacombs-of-saint-ysolde.08** [still] — after an unmasking
> **Narrator:** The thing wearing a friend's face smiles with too many teeth and comes apart into grave-dirt. Further back in the dark, the real one is calling your names.
> **Wren:** Found them. Tied up, alive. Furious.

## Outcome
The Holy Symbol is held (key 1 or 2). If a lookalike was not unmasked here, it stays (one at most) until holy water or a Sanctuary rest unmasks it; its secret goal is scored in stats only. Then the procession and the night's second set piece.

**n23-catacombs-of-saint-ysolde.09** [still]
> **Narrator:** You climb into the air. It is the first time any of you has been glad of the mist.

## Variants
**n23-catacombs-of-saint-ysolde.09~lookalike-hidden** [still] — a lookalike is still among them
> **Narrator:** You climb into the air. Everyone has a shadow. You count them twice.
**n23-catacombs-of-saint-ysolde.07~lookalike-is-tomas** [clip] — the lookalike is Tomas (same cues)
> **Narrator:** Holy water hisses on one of you like fat in a pan.
> **Wren:** Hand. Left one. Now.
**n23-catacombs-of-saint-ysolde.06~no-agnes** [clip] — Agnes not in play (same cues); Emeric (or Wren) places the reliquary found in Oskar's vestry
> **Narrator:** The reliquary from Oskar's vestry fits the niche. The flame leans toward it, as if it knows a hand that is not here.
**n23-catacombs-of-saint-ysolde.05~no-agnes** [still] — Agnes not in play
> **Emeric:** The niche. It's the shape of the reliquary from Oskar's vestry. Exactly the shape.
**n23-catacombs-of-saint-ysolde.05~no-emeric** [still] — Emeric not in play
> **Wren:** Sister. Hand's bleeding.
> **Agnes:** It always does near this saint. Give me room.
**n23-catacombs-of-saint-ysolde.06~night3** [clip] — night 3, Blade already held (same cues) [prop: sergiu-blade]
> **Narrator:** Agnes sets her reliquary into the niche. The flame leans toward her. Wrapped on its carrier's back, the brother's sword hums, answering.
**n23-catacombs-of-saint-ysolde.02~no-tomas** [still] — Tomas not in play
> **Wren:** Passage split. Left smells of lamp oil. Right smells of nothing. We split. Meet at the saint.
**n23-catacombs-of-saint-ysolde.02~no-wren** [still] — Wren not in play
> **Tomas:** Passage splits. We split too, and we meet at the saint.

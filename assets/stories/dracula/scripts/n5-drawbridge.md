# n5-drawbridge

- **Scene ID:** n5-drawbridge
- **Night:** 5, set piece 6 (needs all three keys)
- **Kingdom slot / building:** The tower (castle) / the drawbridge and the little gate
- **Setting:** A chasm with no bottom, a drawbridge raised, and a little side gate the guard used for deliveries. Wolves on the road behind. The castle breathing above.
- **Mood:** Resolve; the last walk up the hill.
- **Cast:** Narrator, The Count, Tomas Varga, Wren Kessel, Marta Varga
- **Targets:** untagged moments, lines and cues play on `dashboard` (Mac screen and speakers; tower cues fire from the Mac). Moments tagged `ipad:<hunter>` play only on that hunter's iPad, never on the dashboard. Variant moments (`scene.moment~variant`) replace the base moment of the same number when their condition holds.

## Moments

**n5-drawbridge.01** [clip] [prop: sergiu-blade]
[music: brass swell, low] [sfx: wind over the chasm, wolves behind] [tower: heartbeat]
> **Narrator:** Five nights. Three keys. A brother's sword. The road to the castle is the only road left in Vellmoor; the mist has eaten every other one.

**n5-drawbridge.02** [clip]
[tower: seal-sequence] [sfx: chains, creak, splash far below]
> **Narrator:** The keys turn, one after another, in locks no one can see. The drawbridge comes down, slow as a held breath.
> **The Count (from the battlements):** "Welcome to my house! Enter freely and of your own will!" *(Stoker)*

**n5-drawbridge.03** [still]
> **Tomas:** He's said the words; the front door's his, and he'll watch every step. The little gate's twenty yards left, the long way round. It squeaks.
> **Wren:** Long way costs time. Front way costs surprise.

**n5-drawbridge.04** [still]
[sfx: a bolt drawn on the far side]
> **Narrator:** The little gate opens a hand's width. A girl in a castle maid's apron stands behind it with a lamp turned low.
> **Marta:** Uncle Tomas. You came back over the wall.

**n5-drawbridge.05** [still]
> **Tomas:** I did, love. I'm sorry it took me so long. Where is she, the burgomaster's girl?
> **Marta:** The high room, at the top of the stair behind the gallery. In a white dress. She hasn't said yes. Not once. I'll open the gate if you ask. It's the slow way, but he never watches it.

**n5-drawbridge.06.private.agnes** [still] `ipad:agnes`
> **Agnes (thought):** You know these stones. In the convent chapel you dreamt of a stair like this one, the night before the traveler came.
**n5-drawbridge.06.private.tomas** [still] `ipad:tomas`
> **Tomas (thought):** Her hands are warm when she gives you the lamp. Warm. There's still time, if he dies tonight.
**n5-drawbridge.06.private.wren** [still] `ipad:wren`
> **Wren (thought):** Through the gate, faint: a woman humming the song your mother sang over the grave-rows. Your blank bolt is in your hand. You don't remember drawing it.
**n5-drawbridge.06.private.emeric** [still] `ipad:emeric`
> **Emeric (thought):** Gerhardt sketched this gate. In the margin: "The servant's way. He never watches it. He is too proud." He was right about something.

## Outcome / choice
Vote on each iPad, a real tradeoff:
1. **The little gate** (Marta's way): quieter (the Count's attention does not rise) but it costs 1 extra visit. → .07~gate
2. **The drawbridge** (by invitation): fast (no extra visit) but it raises the Count's attention. → .07~drawbridge

**n5-drawbridge.07~gate** [still]
> **Narrator:** You go the long way, the way the servant girls once left. It takes too long. But nothing on the battlements turns its head.
**n5-drawbridge.07~drawbridge** [still]
[tower: heartbeat-fast] then [tower: heartbeat]
> **Narrator:** You walk in by the front door, as guests, and quickly. Above you, something on the battlements turns its head and follows you in.

## Variants
**n5-drawbridge.01~boxes-left** [clip] [prop: sergiu-blade] — earth boxes left standing (same cues)
> **Narrator:** Five nights. Three keys. A brother's sword. And no smoke rising from the hill: somewhere up there, his earth is still waiting for him.
**n5-drawbridge.02~boxes-left** [clip] — earth boxes left standing (same cues)
> **Narrator:** The keys turn. The drawbridge comes down.
> **The Count (warm, rested):** "Welcome to my house! Enter freely and of your own will!" *(Stoker)*
**n5-drawbridge.03~no-tomas** [still] — Tomas not in play
> **Wren:** He's said the words. Front door's his. There's a servants' gate, left. Slow, though.
**n5-drawbridge.04~no-tomas** [still] — Tomas not in play
> **Narrator:** The little gate opens a hand's width. A girl in a maid's apron stands behind it with a lamp turned low.
> **Marta:** You're the hunters. My uncle said you'd come, before he went away.
**n5-drawbridge.05~no-tomas** [still] — Tomas not in play
> **Wren:** Where's the burgomaster's girl?
> **Marta:** The high room, behind the gallery. She hasn't said yes. I'll open the gate if you ask. It's slow, but he never watches it.
**n5-drawbridge.03~no-wren** [still] — Wren not in play
> **Tomas:** He's said the words; the front door's his. The little gate's the long way round. It squeaks.

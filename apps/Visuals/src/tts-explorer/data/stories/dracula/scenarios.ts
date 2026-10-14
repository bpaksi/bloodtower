import type { Scenario } from "../../../lib/stories/types.ts";

export const scenarios: Scenario[] = [
  {
    id: "lantern-and-bell",
    title: "1. The Lantern & Bell",
    scene:
      "All Hallows' Eve, dusk, a storm rolling in. The only inn in Vellmoor, at the crossroads under the castle: low beams, a roaring fire, garlic braids over every window, a dozen nervous villagers. Four strangers, each summoned by the same black-sealed letter from Father Oskar.",
    cast: ["hanne", "tomas", "agnes", "emeric", "wren"],
    script: [
      {
        speaker: "narrator",
        text: "Vellmoor has buried more of its own this year than in the ten before it. <short pause> The harvest rots in the fields because no one will work past sundown. Tonight is All Hallows' Eve, <short pause> and the castle on the hill is lit for the first time in a generation.",
      },
      {
        speaker: "narrator",
        text: "Four strangers have come to Vellmoor today. <short pause> The village has noticed all of them.",
      },
      { speaker: "hanne", text: "Varga. I'd heard you were dead." },
      { speaker: "tomas", text: "Not for lack of trying, lass." },
      {
        speaker: "agnes",
        text: "You keep a fire burning all night, innkeeper. <short pause> What are you afraid of?",
      },
      {
        speaker: "hanne",
        text: "Same as you, Sister, or you wouldn't have asked.",
      },
      {
        speaker: "emeric",
        text: "I'm looking for Father Oskar? I have a letter. That is, he sent me a letter. That is, I'm expected. <short pause> I think.",
      },
      { speaker: "tomas", text: "So am I, lad.", style: "slow, low, wary" },
      {
        speaker: "agnes",
        text: "It seems Father Oskar has been writing a great many letters.",
      },
      { speaker: "wren", text: "Father Oskar's not coming." },
      { speaker: "emeric", text: "How do you — <short pause> is he ill?" },
      {
        speaker: "wren",
        text: "Grave in the churchyard's been dug from the inside. <short pause> His name's on the stone. He was buried this morning.",
      },
      {
        speaker: "narrator",
        text: "Laid side by side, the four letters show something more. In each margin, a different line, in the priest's faded hand. <long pause> He keeps the faith of the dead. <short pause> He rests where the guard once stood. <short pause> He lies beneath what was dug. <short pause> He sleeps in the name of the first.",
      },
      {
        speaker: "emeric",
        text: "It's a riddle. He split it between us so no single one of us could — <gasp> oh. Oh, that's clever. That's very clever.",
      },
      { speaker: "tomas", text: "It's a riddle that got a priest killed." },
      {
        speaker: "narrator",
        text: "The church bell begins to toll midnight. <short pause> The fire gutters. <long pause> Up on the hill, the castle doors open.",
        style: "hushed, slow, dread",
      },
      {
        speaker: "wren",
        text: "He knows we're here.",
        style: "quiet, cold, focused",
      },
      {
        speaker: "agnes",
        text: "Then he's afraid of something. <short pause> That's the first good news I've heard in ten years.",
      },
      { speaker: "tomas", text: "Hanne, bar the door behind us." },
      {
        speaker: "emeric",
        text: "Behind — behind us? <short pause> We're going OUT?",
        style: "panicked, high, fast",
      },
      {
        speaker: "narrator",
        text: "Six nights until the Count's ritual is complete. <long pause> The hunt begins.",
      },
    ],
  },
  {
    id: "open-grave",
    title: "2. The Open Grave",
    scene:
      "Past midnight in Saint Ilona's churchyard, rain turning to sleet. Father Oskar's grave gapes open, the earth thrown outward. Lantern light on leaning stones; a bell rope creaks in the empty tower. The first clue: he lies beneath what was dug.",
    cast: ["wren", "tomas", "agnes", "emeric", "oskar"],
    script: [
      {
        speaker: "narrator",
        text: "The churchyard gate hangs from one hinge. <short pause> Beyond it, the stones lean together like mourners, and in the middle of them, a grave lies open to the sky.",
      },
      {
        speaker: "wren",
        text: "Dirt's thrown out, not in. <short pause> Nails pulled from the inside. He didn't need help.",
      },
      {
        speaker: "emeric",
        text: "Folk tradition holds that the newly risen return to the place of their first sleep before the third cockcrow — Halbrook, page ninety — so he'd be — <short pause> he'd be nearby.",
      },
      {
        speaker: "tomas",
        text: "Then stop reading it to him, lad, and get behind me.",
      },
      {
        speaker: "agnes",
        text: "Look at the coffin. <short pause> Why would a dead man leave his letters behind?",
      },
      {
        speaker: "narrator",
        text: "Beneath the burst lid, wrapped in oilcloth, lies a bundle of papers, <short pause> and the beginning of a map.",
      },
      {
        speaker: "oskar",
        text: "You came. <short pause> All four of you came.",
        style: "hollow whisper",
      },
      {
        speaker: "narrator",
        text: "He stands at the edge of the lantern light, in the clothes they buried him in. <short pause> His feet are bare and his mouth is red.",
      },
      {
        speaker: "oskar",
        text: "I am sorry. <short pause> He heard me praying. He hears everything prayed in this valley now.",
      },
      {
        speaker: "agnes",
        text: "Then hear this one, Father. <short pause> Eternal rest grant unto him, O Lord.",
        style: "low, steady, prayerful",
      },
      {
        speaker: "oskar",
        text: "<gasp> Don't — <short pause> the blood is the life, Sister. The blood is the life!",
        style: "anguished, hungry, rising",
      },
      { speaker: "wren", text: "Tomas. Now." },
      {
        speaker: "narrator",
        text: "It is quick, and it is not clean. <long pause> When it is done, Wren takes a blank bolt from her bandolier, scratches a name into it, and slides it back.",
      },
      {
        speaker: "emeric",
        text: "The map. <short pause> It's the old parish lines. And a mark at the founder's tomb. <short pause> He sleeps in the name of the first.",
      },
      {
        speaker: "narrator",
        text: "Far off, a wolf answers the bell. <short pause> Then another. <short pause> Then the whole valley.",
      },
    ],
  },
  {
    id: "children-of-the-night",
    title: "3. Children of the Night",
    scene:
      "The third night. The old guard post on the castle road, where Tomas once stood watch. Snow, wolves on every ridge, the castle gate open and lit. The Count comes down to meet them himself, all courtesy, and makes each hunter an offer.",
    cast: ["tomas", "agnes", "wren", "emeric", "count"],
    script: [
      {
        speaker: "narrator",
        text: "The guard post is a ruin now. <short pause> Tomas knows every stone of it. Tonight the castle gate stands open above them, and a tall figure in black is walking down the road, alone, carrying a lamp.",
      },
      {
        speaker: "count",
        text: "Listen to them. <short pause> The children of the night. What music they make!",
      },
      {
        speaker: "count",
        text: "Welcome to my house. <short pause> Enter freely, and of your own will.",
      },
      {
        speaker: "tomas",
        text: "I stood your gate for three years. <short pause> I know which door squeaks.",
      },
      {
        speaker: "count",
        text: "Varga. My faithful hound. <short pause> And how is your niece? Does she still sleep through the day?",
      },
      {
        speaker: "tomas",
        text: "<short pause> Don't you speak of her.",
        style: "shaking, low, furious",
      },
      {
        speaker: "agnes",
        text: "Ten winters, and you haven't changed your face. <short pause> Why did you leave me alive?",
      },
      {
        speaker: "count",
        text: "Because you prayed for me, Sister. Three nights at my bedside. <short pause> No one had prayed for me in four hundred years. I wished to see what such a woman would become.",
      },
      {
        speaker: "wren",
        text: "Where's my mother?",
      },
      {
        speaker: "count",
        text: "Safe. Beautiful. <short pause> She asks for you, little gravedigger. Come up to the castle and I will take you to her.",
      },
      {
        speaker: "emeric",
        text: "D-don't! It's — it's a classic invitation formula, the threshold compact, Gerhardt wrote a whole chapter — <short pause> he can't take you unless you agree!",
      },
      {
        speaker: "count",
        text: "And the apprentice. <short pause> Your master was a clever man. I asked him politely to stop.",
      },
      {
        speaker: "count",
        text: "You think to hunt me in my own valley. <short pause> My revenge is just begun. I spread it over centuries, and time is on my side.",
        style: "cold, slow, certain",
      },
      {
        speaker: "narrator",
        text: "The lamp goes out. <short pause> When Tomas strikes a light again, the road is empty, <short pause> and the snow holds no footprints but their own.",
      },
    ],
  },
  {
    id: "dawn-in-the-tomb",
    title: "4. Dawn in the Founder's Tomb",
    scene:
      "The final night, the hour before sunrise. Beneath the chapel, the founder's tomb: the name of the first. Candles, carved saints with their faces chiselled off, and a single stone coffin. Ilka Kessel guards it. Dawn is the deadline.",
    cast: ["emeric", "wren", "agnes", "tomas", "ilka", "count"],
    script: [
      {
        speaker: "narrator",
        text: "Six nights. Four lines of a dead priest's riddle. <short pause> And at the bottom of a hundred steps, beneath the chapel where the faithful dead are kept, the tomb of the man who founded Vellmoor.",
      },
      {
        speaker: "emeric",
        text: "The name of the first. <short pause> Vellmoor's founder wasn't a Vell at all. The parish rolls give his name as Vlad — <short pause> oh. Oh no.",
      },
      { speaker: "wren", text: "Someone's here." },
      {
        speaker: "ilka",
        text: "Wren. <short pause> My little Wren. You've got dirt on your hands again.",
      },
      {
        speaker: "wren",
        text: "Mama. <long pause> Step away from the coffin.",
        style: "quiet, breaking, steady",
      },
      {
        speaker: "ilka",
        text: "He's kind to me, Wren. <short pause> It doesn't hurt anymore. Lie down here with me and it won't hurt you either.",
      },
      {
        speaker: "agnes",
        text: "Child. <short pause> Whatever you do next, you will carry it. Do you want me to carry it for you?",
        style: "gentle, low",
      },
      {
        speaker: "wren",
        text: "No. <short pause> It's my name to write.",
      },
      {
        speaker: "narrator",
        text: "The blank bolt flies. <long pause> For a moment, Ilka Kessel looks at her daughter with her own eyes, <short pause> and smiles.",
      },
      {
        speaker: "count",
        text: "Enough!",
        style: "thunderous, furious",
      },
      {
        speaker: "count",
        text: "You would destroy me with a priest's riddle and a gravedigger's toy? <short pause> I have walked this valley since your fathers' fathers were children.",
      },
      {
        speaker: "tomas",
        text: "Aye. <short pause> And you'll not walk it one more morning. Lift, lad!",
      },
      {
        speaker: "emeric",
        text: "I'm lifting! <short pause> I'm lifting! Sister — the stake — now, NOW!",
        style: "frantic, shouting",
      },
      {
        speaker: "agnes",
        text: "You asked what I would become. <short pause> This.",
        style: "cold, certain, slow",
      },
      {
        speaker: "narrator",
        text: "Above them, through a crack in the chapel floor, comes the first grey light of All Saints' morning. <long pause> The bells of Vellmoor ring, <short pause> and for the first time in a generation, no one is afraid of them.",
        style: "slow, warm, relieved",
      },
    ],
  },
];

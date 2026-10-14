import type { Character } from "../../../lib/stories/types.ts";

export const narrator: Character = {
  id: "narrator",
  name: "Narrator",
  backstory: "The voice of Vellmoor's long night: unhurried, grave, a storyteller by a dying fire.",
  voice: "Charon",
  voiceReason: "Deep, measured and informative; carries narration without stealing scenes.",
  style: "slow, low, ominous storyteller",
};

export const characters: Character[] = [
  {
    id: "agnes",
    name: "Sister Agnes Hallow",
    backstory:
      "Kept the infirmary at the Convent of Saint Ysolde until a fevered traveler emptied it in four nights. Survived clutching a reliquary that burned a cross into her palm. Has walked the roads for ten years looking for his face. He spared her on purpose, and she does not know why.",
    voice: "Kore",
    voiceReason: "Firm and controlled; suits an austere nun who answers questions with questions.",
    style: "calm, dry, quietly stern",
  },
  {
    id: "tomas",
    name: "Tomas Varga",
    backstory:
      "Twenty years in the castle guard. Stopped asking where the servant girls went, until his niece was summoned; carried her over the wall and lost two fingers doing it. Back home because the village is dying. His niece now sleeps by day and will not eat.",
    voice: "Algenib",
    voiceReason: "Gravelly; an old soldier with a face like a split log.",
    style: "gruff, low, unhurried",
  },
  {
    id: "wren",
    name: "Wren Kessel",
    backstory:
      "The gravedigger's daughter. Noticed graves empty by spring, then buried her own father properly, with a stake. Each silver bolt bears the name of someone she put back in the ground. One bolt is blank: for her mother, who vanished the same week.",
    voice: "Erinome",
    voiceReason: "Clear and clipped; blunt, few words, no warmth wasted.",
    style: "flat, terse, matter-of-fact",
  },
  {
    id: "emeric",
    name: "Emeric Lutz",
    backstory:
      "Apothecary's apprentice, barely twenty. His master Gerhardt died in a locked study, bloodless, while writing a treatise on the Vellmoor affliction. Came to finish the book and prove his master sane. Terrified of everything. The last page of Gerhardt's notes is in cipher.",
    voice: "Fenrir",
    voiceReason: "Excitable and quick; a nervous scholar who talks fast.",
    style: "nervous, fast, breathless",
  },
  {
    id: "hanne",
    name: "Hanne",
    backstory:
      "Keeper of the Lantern & Bell, the only inn at the crossroads. Stout, keeps a cleaver in her apron, and has hung garlic over every window since spring. Has outlived two husbands and does not intend to be turned.",
    voice: "Sulafat",
    voiceReason: "Warm but weathered; a hard-nosed innkeeper with a soft spot.",
    style: "wry, warm, tired",
  },
  {
    id: "oskar",
    name: "Father Oskar",
    backstory:
      "Vellmoor's priest. Found where the Count sleeps and split the secret into four letters. Buried the morning the hunters arrived, and did not stay buried.",
    voice: "Umbriel",
    voiceReason:
      "Easy-going and gentle; unsettling once the man is gone and only the voice remains.",
    style: "hollow, distant, sorrowful",
  },
  {
    id: "count",
    name: "The Count",
    backstory:
      "The castle's master for a generation, older than the valley's oldest grave. Courteous, patient, and hungry. Speaks in the old manner, sometimes in the very words of Stoker's Count Dracula.",
    voice: "Algieba",
    voiceReason: "Smooth and velvety; aristocratic menace without shouting.",
    style: "smooth, courtly, menacing",
  },
  {
    id: "ilka",
    name: "Ilka Kessel",
    backstory:
      "Wren's mother, taken to the castle the week her husband was turned. Now one of the Count's brides, kept in the founder's tomb as its last guardian. Something of her still remembers her daughter.",
    voice: "Achernar",
    voiceReason: "Soft and airy; a lullaby voice that has gone wrong.",
    style: "soft, dreamy, eerie",
  },
];

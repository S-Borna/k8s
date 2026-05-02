export const SING_START_SEC = 60;

export type PrepAction =
  | "throat"
  | "mustache"
  | "nose"
  | "hat"
  | "stretch"
  | "belly"
  | "breath"
  | "focus";

const PREP_TIMELINE: { from: number; action: PrepAction }[] = [
  { from: 0, action: "throat" },
  { from: 8, action: "mustache" },
  { from: 17, action: "nose" },
  { from: 26, action: "hat" },
  { from: 33, action: "stretch" },
  { from: 41, action: "belly" },
  { from: 48, action: "breath" },
  { from: 55, action: "focus" },
];

export function getPrepAction(t: number): PrepAction {
  let result: PrepAction = "throat";
  for (const item of PREP_TIMELINE) {
    if (t >= item.from) result = item.action;
  }
  return result;
}

export type Lyric = { time: number; text: string };

// Tidsmarkers från forced alignment på Bocelli F1 2020-recordingen
export const LYRICS: Lyric[] = [
  { time: 60.0, text: "Fratelli d'Italia," },
  { time: 62.6, text: "l'Italia s'è desta," },
  { time: 65.0, text: "dell'elmo di Scipio" },
  { time: 67.0, text: "s'è cinta la testa." },
  { time: 67.7, text: "Dov'è la Vittoria?" },
  { time: 70.0, text: "Le porga la chioma," },
  { time: 71.7, text: "ché schiava di Roma" },
  { time: 73.5, text: "Iddio la creò." },
  { time: 74.8, text: "Stringiamci a coorte!" },
  { time: 77.0, text: "Siam pronti alla morte." },
  { time: 79.3, text: "Siam pronti alla morte," },
  { time: 81.0, text: "l'Italia chiamò." },
  { time: 83.4, text: "Stringiamci a coorte!" },
  { time: 85.5, text: "Siam pronti alla morte." },
  { time: 87.6, text: "Siam pronti alla morte," },
  { time: 89.5, text: "l'Italia chiamò!" },
];

export function getActiveLyricIndex(t: number): number {
  let active = -1;
  for (let i = 0; i < LYRICS.length; i++) {
    const lyric = LYRICS[i];
    if (lyric && t >= lyric.time) active = i;
    else break;
  }
  return active;
}

export const SING_START_SEC = 24;

export type PrepAction =
  | "throat"
  | "mustache"
  | "hat"
  | "stretch"
  | "breath"
  | "focus";

const PREP_TIMELINE: { from: number; action: PrepAction }[] = [
  { from: 0, action: "throat" },
  { from: 4, action: "mustache" },
  { from: 8, action: "hat" },
  { from: 12, action: "stretch" },
  { from: 16, action: "breath" },
  { from: 21, action: "focus" },
];

export function getPrepAction(t: number): PrepAction {
  let result: PrepAction = "throat";
  for (const item of PREP_TIMELINE) {
    if (t >= item.from) result = item.action;
  }
  return result;
}

export type Lyric = { time: number; text: string };

export const LYRICS: Lyric[] = [
  { time: 24.0, text: "Fratelli d'Italia," },
  { time: 28.5, text: "L'Italia s'è desta," },
  { time: 33.0, text: "dell'elmo di Scipio" },
  { time: 37.0, text: "s'è cinta la testa." },
  { time: 42.0, text: "Dov'è la Vittoria?" },
  { time: 46.5, text: "Le porga la chioma," },
  { time: 51.0, text: "ché schiava di Roma" },
  { time: 55.0, text: "Iddio la creò." },
  { time: 60.0, text: "Stringiamci a coorte!" },
  { time: 65.0, text: "Siam pronti alla morte." },
  { time: 70.0, text: "Siam pronti alla morte," },
  { time: 75.0, text: "l'Italia chiamò." },
  { time: 81.0, text: "Stringiamci a coorte!" },
  { time: 86.0, text: "Siam pronti alla morte." },
  { time: 91.0, text: "Siam pronti alla morte," },
  { time: 96.0, text: "l'Italia chiamò!" },
  { time: 102.0, text: "Sì!" },
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

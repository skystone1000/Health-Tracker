import type { YogaStyle } from "./schema";

/**
 * Descriptive reference data for yoga traditions/styles and Patanjali's eight
 * limbs. Pure content (no engine logic) consumed by the Learn page.
 */

export interface YogaStyleInfo {
  id: YogaStyle;
  name: string;
  summary: string;
  pace: "gentle" | "moderate" | "vigorous";
  usesProps: boolean;
  bestFor: string[];
}

export const YOGA_STYLE_INFO: YogaStyleInfo[] = [
  {
    id: "hatha",
    name: "Hatha",
    summary:
      "The umbrella term for physical yoga — slower, foundational classes mixing asana, pranayama and meditation.",
    pace: "gentle",
    usesProps: false,
    bestFor: ["Beginners", "Learning the fundamentals", "All-round practice"],
  },
  {
    id: "vinyasa",
    name: "Vinyasa / Flow",
    summary:
      "Breath-synchronised flowing sequences that move smoothly from pose to pose; no fixed order, varies by teacher.",
    pace: "moderate",
    usesProps: false,
    bestFor: ["Building heat & stamina", "Variety", "Linking breath to movement"],
  },
  {
    id: "ashtanga",
    name: "Ashtanga (Vinyasa)",
    summary:
      "A fixed, demanding sequence of postures tied to the breath, codified by K. Pattabhi Jois — the same order each time.",
    pace: "vigorous",
    usesProps: false,
    bestFor: ["Discipline & structure", "Experienced practitioners", "Strength"],
  },
  {
    id: "iyengar",
    name: "Iyengar",
    summary:
      "Precision and alignment, holding poses longer with generous use of props (blocks, straps, bolsters).",
    pace: "moderate",
    usesProps: true,
    bestFor: ["Alignment", "Injury-aware practice", "Building strength slowly"],
  },
  {
    id: "kundalini",
    name: "Kundalini",
    summary:
      "Integrates breathwork, sound (mantra) and dynamic movement aimed at energetic and spiritual awakening.",
    pace: "moderate",
    usesProps: false,
    bestFor: ["Breath & energy work", "Meditation", "Spiritual focus"],
  },
  {
    id: "yin",
    name: "Yin",
    summary:
      "Long, passive floor holds (often 3–5 minutes) targeting deep connective tissue and stillness.",
    pace: "gentle",
    usesProps: true,
    bestFor: ["Deep flexibility", "Stillness", "Balancing active practice"],
  },
  {
    id: "restorative",
    name: "Restorative",
    summary:
      "Fully prop-supported gentle poses with no muscular effort, for deep rest and stress relief.",
    pace: "gentle",
    usesProps: true,
    bestFor: ["Stress relief", "Recovery", "Relaxation"],
  },
  {
    id: "power",
    name: "Power",
    summary:
      "A vigorous, fitness-oriented offshoot of Vinyasa emphasising strength and intensity.",
    pace: "vigorous",
    usesProps: false,
    bestFor: ["Fitness & strength", "Cardio-style flow", "Energising practice"],
  },
  {
    id: "sivananda",
    name: "Sivananda",
    summary:
      "A classical Hatha system built around 12 basic postures, breathing, relaxation and meditation.",
    pace: "gentle",
    usesProps: false,
    bestFor: ["Traditional Hatha", "Holistic routine", "Beginners to intermediate"],
  },
];

export interface YogaLimb {
  sanskrit: string;
  english: string;
  description: string;
}

/** Patanjali's eight limbs (Ashtanga) — a philosophy framework, not poses. */
export const EIGHT_LIMBS: YogaLimb[] = [
  { sanskrit: "Yama", english: "Ethical restraints", description: "Five moral disciplines toward others: non-violence, truthfulness, non-stealing, moderation and non-possessiveness." },
  { sanskrit: "Niyama", english: "Observances", description: "Five disciplines toward oneself: purity, contentment, self-discipline, self-study and surrender." },
  { sanskrit: "Asana", english: "Posture", description: "The physical postures — a steady, comfortable seat that prepares the body for meditation." },
  { sanskrit: "Pranayama", english: "Breath control", description: "Regulation of the breath to build and direct prana (life energy)." },
  { sanskrit: "Pratyahara", english: "Withdrawal of the senses", description: "Drawing attention inward, away from external distractions." },
  { sanskrit: "Dharana", english: "Concentration", description: "Focusing the mind on a single point or object." },
  { sanskrit: "Dhyana", english: "Meditation", description: "Sustained, uninterrupted flow of concentration." },
  { sanskrit: "Samadhi", english: "Absorption", description: "Union and blissful absorption — the goal of the eight-limbed path." },
];

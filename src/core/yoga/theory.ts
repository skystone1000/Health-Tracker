/**
 * The "Learn Yoga" knowledge base — yoga theory as structured, cited data so it
 * is consistent and testable (not a wall of hardcoded JSX). Rendered by
 * `features/yoga/YogaLearn.tsx`. The eight-limbs and styles sections are
 * complemented at render time by `EIGHT_LIMBS` / `YOGA_STYLE_INFO` in styles.ts.
 *
 * Educational overview only — traditional concepts (chakras, gunas) are part of
 * yoga philosophy, not medical or religious advice.
 */

export interface TheorySource {
  title: string;
  url?: string;
}

export interface TheoryBullet {
  term: string;
  text: string;
}

export interface TheorySection {
  id: string; // slug
  title: string;
  summary: string;
  body: string[];
  bullets?: TheoryBullet[];
  /** When set, the page also renders a built-in dataset under the prose. */
  render?: "eightLimbs" | "styles";
  sources: TheorySource[];
}

export const YOGA_THEORY: TheorySection[] = [
  {
    id: "what-is-yoga",
    title: "What is yoga?",
    summary: "Union of body, breath and mind.",
    body: [
      "The word ‘yoga’ comes from the Sanskrit root yuj, meaning ‘to yoke’ or ‘to unite’ — the union of the individual self with a greater whole, and practically the integration of body, breath and mind.",
      "Although best known in the West as physical postures (asana), yoga is a complete system of practices spanning movement, breathing, ethics, concentration and meditation. The spiritual aim — a steady, clear mind resting in the self — sits beyond the physical.",
    ],
    sources: [
      { title: "Wikipedia — Asana", url: "https://en.wikipedia.org/wiki/Asana" },
      { title: "Wikipedia — Yoga", url: "https://en.wikipedia.org/wiki/Yoga" },
    ],
  },
  {
    id: "history",
    title: "History & origins",
    summary: "From the Vedas to modern global yoga.",
    body: [
      "Yoga’s roots reach back thousands of years into the Vedas and Upanishads of ancient India. The Bhagavad Gita (c. 2nd century BCE) describes several yogic paths, and Patanjali’s Yoga Sutras systematised the philosophy into the eight-limbed path (Raja yoga).",
      "Medieval Hatha yoga texts such as the Hatha Yoga Pradipika developed the physical practices and the traditional set of 84 asanas. From the early 1900s, teachers like Krishnamacharya and his students (Iyengar, Pattabhi Jois) shaped the postural styles practised around the world today.",
    ],
    sources: [
      { title: "Wikipedia — List of asanas (84 traditional)", url: "https://en.wikipedia.org/wiki/List_of_asanas" },
      { title: "Wikipedia — Ashtanga (eight limbs of yoga)", url: "https://en.wikipedia.org/wiki/Ashtanga_(eight_limbs_of_yoga)" },
    ],
  },
  {
    id: "four-paths",
    title: "The four classical paths",
    summary: "Karma, Bhakti, Raja and Jnana yoga.",
    body: [
      "The Bhagavad Gita and later Vedanta describe four broad paths to self-realisation, each suited to a different temperament — like branches of one tree sharing a common source.",
    ],
    bullets: [
      { term: "Karma yoga", text: "The path of selfless action — performing one’s work without attachment to the reward." },
      { term: "Bhakti yoga", text: "The path of devotion — cultivating love and surrender toward the divine." },
      { term: "Raja yoga", text: "The path of mind control through meditation; it includes Patanjali’s eight limbs (Ashtanga)." },
      { term: "Jnana yoga", text: "The path of knowledge — self-inquiry and discrimination between the real and unreal." },
    ],
    sources: [
      { title: "Fitsri — The four paths of yoga", url: "https://www.fitsri.com/articles/4-paths-of-yoga" },
      { title: "Sivananda — The four paths (Google Arts & Culture)", url: "https://artsandculture.google.com/story/the-four-paths-of-yoga-sivananda-yoga-vedanta-centres-ashrams/QQURiPuOVM2eIw" },
    ],
  },
  {
    id: "eight-limbs",
    title: "Patanjali’s eight limbs (Ashtanga)",
    summary: "The classical eight-step path of Raja yoga.",
    body: [
      "Patanjali’s Yoga Sutras lay out Ashtanga — literally ‘eight limbs’ — a step-by-step path from ethical living to absorption. Note this is the philosophy of Ashtanga; the modern studio ‘Ashtanga’ class is the physical Vinyasa sequence, a different thing.",
      "The last three limbs (dharana, dhyana, samadhi) practised together are called samyama.",
    ],
    render: "eightLimbs",
    sources: [
      { title: "Wikipedia — Ashtanga (eight limbs of yoga)", url: "https://en.wikipedia.org/wiki/Ashtanga_(eight_limbs_of_yoga)" },
      { title: "Sampoorna Yoga — the eight limbs explained", url: "https://www.sampoornayoga.com/the-eight-limbs-of-ashtanga-yoga-explained/" },
    ],
  },
  {
    id: "hatha-practice",
    title: "Hatha & the physical practice",
    summary: "How asana and pranayama relate to the paths.",
    body: [
      "Hatha yoga is the physical branch through which many practitioners pursue Raja yoga. By purifying and steadying the body with asana and the breath with pranayama, the practitioner prepares the nervous system for concentration and meditation.",
      "‘Ha’ and ‘tha’ are often glossed as sun and moon — balancing opposing energies in the body.",
    ],
    sources: [
      { title: "Gaiam — A beginner’s guide to 8 major styles of yoga", url: "https://www.gaiam.com/blogs/discover/a-beginners-guide-to-8-major-styles-of-yoga" },
    ],
  },
  {
    id: "pranayama",
    title: "Pranayama (breath control)",
    summary: "Regulating the breath to build and direct prana.",
    body: [
      "Pranayama is the yogic practice of controlling the breath — one of Patanjali’s eight limbs. Techniques build prana (life energy), calm the nervous system, and sharpen focus.",
      "Common foundational techniques include Nadi Shodhana (alternate-nostril breathing), Kapalabhati (skull-shining breath) and Bhramari (humming breath) — all available in the asana library.",
    ],
    sources: [
      { title: "Wikipedia — Pranayama", url: "https://en.wikipedia.org/wiki/Pranayama" },
      { title: "The Divine Life Society — The Science of Pranayama", url: "https://www.dlshq.org/download/the-science-of-pranayama/" },
    ],
  },
  {
    id: "gunas",
    title: "The three gunas",
    summary: "Nature’s three fundamental qualities.",
    body: [
      "Yoga philosophy describes three gunas — qualities that weave together to form everything in nature. Awareness of them helps a practitioner notice whether they are moving forward, treading water, or losing their way.",
    ],
    bullets: [
      { term: "Sattva", text: "Balance, clarity, harmony — the quality cultivated by yoga." },
      { term: "Rajas", text: "Activity, passion, restlessness — energy and movement." },
      { term: "Tamas", text: "Inertia, heaviness, dullness — rest but also stagnation." },
    ],
    sources: [
      { title: "Yoga Journal — Understanding the gunas", url: "https://www.yogajournal.com/lifestyle/health/yoga-philosophy-101-3-gunas/" },
    ],
  },
  {
    id: "chakras",
    title: "The chakras",
    summary: "The traditional seven energy-centre model.",
    body: [
      "Many yoga traditions describe chakras — energy centres aligned along the spine, each linked to physical, emotional and spiritual aspects of life. This is a traditional energetic model rather than a medical one.",
    ],
    bullets: [
      { term: "Muladhara (Root)", text: "Base of the spine — grounding and stability." },
      { term: "Svadhisthana (Sacral)", text: "Lower abdomen — creativity and emotion." },
      { term: "Manipura (Solar plexus)", text: "Upper abdomen — willpower and confidence." },
      { term: "Anahata (Heart)", text: "Centre of the chest — love and compassion." },
      { term: "Vishuddha (Throat)", text: "Throat — communication and truth." },
      { term: "Ajna (Third eye)", text: "Between the brows — intuition and insight." },
      { term: "Sahasrara (Crown)", text: "Top of the head — awareness and connection." },
    ],
    sources: [
      { title: "Arhanta Yoga — The 7 chakras", url: "https://www.arhantayoga.org/blog/7-chakras-introduction-energy-centers-effect/" },
    ],
  },
  {
    id: "styles",
    title: "Modern styles & how to choose",
    summary: "Hatha, Vinyasa, Ashtanga, Iyengar, Yin and more.",
    body: [
      "Today’s ‘types of yoga’ are mostly practice styles that differ in pace, intensity and prop use. Beginners often start with Hatha or Iyengar for fundamentals; Vinyasa and Power build heat; Yin and Restorative are slow and deep.",
    ],
    render: "styles",
    sources: [
      { title: "Gaiam — A beginner’s guide to 8 major styles of yoga", url: "https://www.gaiam.com/blogs/discover/a-beginners-guide-to-8-major-styles-of-yoga" },
    ],
  },
  {
    id: "glossary",
    title: "Glossary",
    summary: "Common Sanskrit terms used across the app.",
    body: [
      "A quick reference for terms you’ll see throughout the yoga section.",
    ],
    bullets: [
      { term: "Asana", text: "A yoga posture (literally ‘seat’)." },
      { term: "Vinyasa", text: "Linking breath to movement between poses." },
      { term: "Pranayama", text: "Breath-control techniques." },
      { term: "Pratikriyasana", text: "A counter-pose that gently reverses the previous one (viparit)." },
      { term: "Drishti", text: "A focused gaze point used for concentration." },
      { term: "Bandha", text: "An internal ‘lock’ engaging muscles to direct energy." },
      { term: "Mudra", text: "A symbolic hand or body gesture." },
      { term: "Mantra", text: "A sacred sound or phrase repeated in practice." },
      { term: "Savasana", text: "Final relaxation (corpse pose)." },
    ],
    sources: [
      { title: "Wikipedia — Asana", url: "https://en.wikipedia.org/wiki/Asana" },
    ],
  },
];

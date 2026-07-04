export const durations = {
  instant: 100,
  fast: 160,
  base: 220,
  slow: 320,
  crawl: 480,
};

export const springs = {
  press: { damping: 18, stiffness: 320, mass: 0.7 },
  pop: { damping: 14, stiffness: 220, mass: 0.9 },
  sheet: { damping: 22, stiffness: 260, mass: 1 },
};

export const listStagger = {
  perItem: 40,
  max: 8, // items after this animate together
};

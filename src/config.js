export const GRID_SIZE = 5;
export const MAX_FACILITY_COUNTS = {
  fish: 4,
  bed: 4,
  laser: 5,
  tunnel: 4,
};

export const NEED_THRESHOLD = 70;
export const NEED_GAIN_PER_TURN = { hunger: 5, sleepiness: 4 };
export const NEED_GAIN_WANDER_BONUS = 1;

export const FACILITY_SERVICE_TURNS = {
  fish: 2,
  bed: 3,
};

export const GAME_TURNS = 120;
export const LOOP_WINDOW_TURNS = 10;
export const SATISFIED_EMOJI_TURNS = 4; /* show 🐟/💤 for this many turns after satisfaction */
export const CAT_FOOTPRINT_TURNS = 5;
export const CAT_SPAWN_INTERVAL = 8;
export const MAX_CATS = 10;

export const POINTS = {
  satisfyNeed: 10,
  loopBonus: 15,
  satisfiedExitReward: 20,
  badExitPenalty: 12,
};

export const springEase = (t) =>
  1 - Math.exp(-t * 7.4426) * (Math.cos(t * 10.5254) + 0.7071 * Math.sin(t * 10.5254))

export const CONFETTI_VISIBLE_DURATION_MS = 1150
export const HABIT_OUTCOME_CLOSE_DELAY_MS = 500

export type ReviewDirection = "de_to_ru" | "ru_to_de";

export type ReviewRating = "again" | "hard" | "good" | "easy";

export type ReviewStatus = "new" | "learning" | "review";

export type ReviewHistoryEntry = {
  reviewedAt: string;
  rating: ReviewRating;
  intervalDays: number;
  dueAt: string;
};

export type ReviewState = {
  status: ReviewStatus;
  dueAt: string;
  intervalDays: number;
  easeFactor: number;
  streak: number;
  lapses: number;
  lastReviewedAt?: string;
  history: ReviewHistoryEntry[];
};

export type ReviewPairState = Record<ReviewDirection, ReviewState>;

const MINUTES_10 = 10 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

function addMs(iso: string, ms: number) {
  return new Date(new Date(iso).getTime() + ms).toISOString();
}

function addDays(iso: string, days: number) {
  return addMs(iso, days * DAY);
}

function roundDays(value: number) {
  return Math.max(0, Math.round(value));
}

export function createInitialReviewState(now = new Date().toISOString()): ReviewState {
  return {
    status: "new",
    dueAt: now,
    intervalDays: 0,
    easeFactor: 2.5,
    streak: 0,
    lapses: 0,
    history: [],
  };
}

export function createInitialReviewPair(now = new Date().toISOString()): ReviewPairState {
  return {
    de_to_ru: createInitialReviewState(now),
    ru_to_de: createInitialReviewState(now),
  };
}

export function isDue(state: ReviewState, now = new Date().toISOString()) {
  return new Date(state.dueAt).getTime() <= new Date(now).getTime();
}

export function applyReviewRating(
  current: ReviewState,
  rating: ReviewRating,
  now = new Date().toISOString()
): ReviewState {
  let status = current.status;
  let intervalDays = current.intervalDays;
  let easeFactor = current.easeFactor;
  let streak = current.streak;
  let lapses = current.lapses;
  let dueAt = current.dueAt;

  if (rating === "again") {
    status = "learning";
    intervalDays = 0;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
    streak = 0;
    lapses += 1;
    dueAt = addMs(now, MINUTES_10);
  } else if (current.status === "new" || current.status === "learning") {
    status = "review";
    streak += 1;

    if (rating === "hard") {
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      intervalDays = 1;
    } else if (rating === "good") {
      intervalDays = 3;
    } else {
      easeFactor += 0.1;
      intervalDays = 5;
    }

    dueAt = addDays(now, intervalDays);
  } else {
    streak += 1;

    if (rating === "hard") {
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      intervalDays = Math.max(1, roundDays(intervalDays * 1.2));
    } else if (rating === "good") {
      intervalDays = Math.max(2, roundDays(intervalDays * easeFactor));
    } else {
      easeFactor += 0.1;
      intervalDays = Math.max(3, roundDays(intervalDays * easeFactor * 1.35));
    }

    dueAt = addDays(now, intervalDays);
  }

  return {
    ...current,
    status,
    dueAt,
    intervalDays,
    easeFactor,
    streak,
    lapses,
    lastReviewedAt: now,
    history: [
      ...current.history,
      {
        reviewedAt: now,
        rating,
        intervalDays,
        dueAt,
      },
    ].slice(-30),
  };
}

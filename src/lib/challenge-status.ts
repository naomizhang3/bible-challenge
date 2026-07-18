// Server-free constants safe to import from Client Components.
export const CHALLENGE_STATUSES = [
  "draft",
  "active",
  "completed",
  "archived",
] as const;

export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number];

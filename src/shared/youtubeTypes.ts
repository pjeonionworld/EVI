// Shared between main (recommendation logic) and renderer (display) —
// kept minimal since this is a display-only recommendation, not a full
// video/session model.
export interface VideoRecommendation {
  title: string
  channel: string
  videoUrl: string
  // Short human-readable reason this video was picked (e.g. "자주 다시 본 영상"),
  // shown next to the recommendation so it doesn't feel like a black box.
  reason: string
}

// Shared between main, preload and renderer — single source of truth for
// numbers that both the OS window (main) and the sprite animation (renderer)
// need to agree on.

// Normalized sprite sheet layout (see assets/npc/sprite-meta.json, produced
// from the raw sprite sheets in assets/npc/source/). Every state's frames
// share this same cell canvas and foot-baseline row, so switching between
// states never makes the character jump or change size.
export const SPRITE_CELL_WIDTH = 440
export const SPRITE_CELL_HEIGHT = 700
export const SPRITE_ANCHOR_Y = 680

// Per-state frame counts — not assumed to be equal (CLEAN has 6, everything
// else has 4).
export const IDLE_FRAME_COUNT = 4
export const WALK_FRAME_COUNT = 4
export const CLEAN_FRAME_COUNT = 6

// On-screen scale applied to a sprite cell to get the NPC window size.
// Chosen so WINDOW_WIDTH/HEIGHT stay close to the previous sprite set's
// (80x128), so the character doesn't suddenly appear bigger/smaller.
export const SPRITE_SCALE = 0.183

export const WINDOW_WIDTH = Math.round(SPRITE_CELL_WIDTH * SPRITE_SCALE) // 81
export const WINDOW_HEIGHT = Math.round(SPRITE_CELL_HEIGHT * SPRITE_SCALE) // 128

// Vertical gap kept between the bottom of the NPC window and the bottom of
// the display's work area (so it doesn't sit flush against the taskbar).
export const FLOOR_MARGIN = 24

// Autonomous behavior timing (ms / px per second).
export const IDLE_MIN_MS = 3000
export const IDLE_MAX_MS = 8000
// Walk duration is no longer a fixed range — the NPC walks in a straight
// (axis-aligned — see WalkFacing) line toward a randomly chosen point and
// stops on arrival, so how long a walk takes falls out of the distance to
// that point and this speed.
export const WALK_SPEED_PX_PER_SEC = 55
// Used only when EVI is summoned by the call bell — faster than a normal
// autonomous walk, for a "hurrying over" feel. No separate RUN sprite;
// still uses the WALK sheet, just stepping faster.
export const CALL_SPEED_PX_PER_SEC = 110
export const MOVE_TICK_MS = 60

// "마우스 따라다니기" — chases the live cursor position instead of a fixed
// point, so it re-targets every tick rather than planning segments once
// like startWalk/startCall. Slightly faster than a normal wander (feels
// more "actively following"), and stops short of the cursor itself so EVI
// doesn't sit directly under it.
export const FOLLOW_SPEED_PX_PER_SEC = 75
export const FOLLOW_STOP_DISTANCE_PX = 40

export const IDLE_FRAME_INTERVAL_MS = 550
export const WALK_FRAME_INTERVAL_MS = 140
export const CLEAN_FRAME_INTERVAL_MS = 150

// How many times the CLEAN sheet plays end-to-end per autonomous trigger
// (e.g. 6-frame sheet x 2 cycles = 12 frame-plays before returning to IDLE).
export const CLEAN_CYCLES = 2
// Chance (0-1), checked each time the idle timer fires, that EVI plays
// CLEAN instead of wandering off on a walk.
export const CLEAN_CHANCE = 0.2

// How long after a drag ends before autonomous behavior resumes.
export const DRAG_RESUME_DELAY_MS = 2000

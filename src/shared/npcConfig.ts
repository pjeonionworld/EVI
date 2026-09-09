// Shared between main, preload and renderer — single source of truth for
// numbers that both the OS window (main) and the sprite animation (renderer)
// need to agree on.

// Normalized sprite sheet layout (see assets/npc/sprite-meta.json, produced
// from the raw "IDLE SPRITE.png" / "WALK.png" assets).
export const SPRITE_CELL_WIDTH = 400
export const SPRITE_CELL_HEIGHT = 640
export const SPRITE_FRAME_COUNT = 4

// On-screen scale applied to a sprite cell to get the NPC window size.
// (0.24 = previous 0.3 scaled down by 20%, per user request)
export const SPRITE_SCALE = 0.24

export const WINDOW_WIDTH = Math.round(SPRITE_CELL_WIDTH * SPRITE_SCALE) // 96
export const WINDOW_HEIGHT = Math.round(SPRITE_CELL_HEIGHT * SPRITE_SCALE) // 154

// Vertical gap kept between the bottom of the NPC window and the bottom of
// the display's work area (so it doesn't sit flush against the taskbar).
export const FLOOR_MARGIN = 24

// Autonomous behavior timing (ms / px per second).
export const IDLE_MIN_MS = 3000
export const IDLE_MAX_MS = 8000
export const WALK_MIN_MS = 1500
export const WALK_MAX_MS = 3500
export const WALK_SPEED_PX_PER_SEC = 55
export const MOVE_TICK_MS = 60

export const IDLE_FRAME_INTERVAL_MS = 550
export const WALK_FRAME_INTERVAL_MS = 140

// How long after a drag ends before autonomous behavior resumes.
export const DRAG_RESUME_DELAY_MS = 2000

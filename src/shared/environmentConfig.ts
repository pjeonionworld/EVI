// Constants for the "desk scene" — DESK.png, the call bell, the exit
// button, and the talk-menu dialog that appears once EVI is summoned and
// docks behind the desk. Kept separate from npcConfig.ts since these
// describe the environment window, not the NPC window itself.
import { FLOOR_MARGIN, WINDOW_HEIGHT, WINDOW_WIDTH } from './npcConfig'

// ---------------------------------------------------------------------------
// DESK.png (assets/environment/DESK.png) — used directly, never resized or
// cropped on disk. The desk object only occupies part of the 1536x1024
// canvas (the rest is transparent padding), so it's displayed the same way
// sprite frames are: as a CSS background-image, scaled and shifted so only
// the object's own bbox shows, rather than an <img> that would scale the
// whole (mostly-empty) canvas down.
export const DESK_CANVAS_WIDTH = 1536
export const DESK_CANVAS_HEIGHT = 1024
export const DESK_BBOX_X = 514
export const DESK_BBOX_Y = 439
const DESK_NATIVE_WIDTH = 530
const DESK_NATIVE_HEIGHT = 357
// Height of just the desk's own box (floor to tabletop surface) — used
// below to size the desk so that box covers the right fraction of EVI's
// height. The laptop/plant sitting on the tabletop are extra and excluded.
const DESK_NATIVE_TABLETOP_HEIGHT = 308

// Rough chibi proportions: the idle sprite's character fills ~607/640 of
// its cell (see assets/npc/sprite-meta.json).
const NPC_CHARACTER_HEIGHT_RATIO = 607 / 640
// Fraction of EVI's height that should sit behind the desk's own box once
// docked, so the rest (head/shoulders) pokes up above it — a receptionist
// look. Raising this (vs. the old side-standing scale) is also what makes
// the desk read as noticeably bigger.
const NPC_DOCKED_COVER_RATIO = 0.6

const npcCharacterHeightPx = WINDOW_HEIGHT * NPC_CHARACTER_HEIGHT_RATIO
const targetDeskBoxHeightPx = npcCharacterHeightPx * NPC_DOCKED_COVER_RATIO

// Desk display scale, derived so the desk's own box covers NPC_DOCKED_COVER_RATIO
// of EVI's height. Recomputes automatically if SPRITE_SCALE changes.
export const DESK_SCALE = targetDeskBoxHeightPx / DESK_NATIVE_TABLETOP_HEIGHT
export const DESK_DISPLAY_WIDTH = Math.round(DESK_NATIVE_WIDTH * DESK_SCALE)
export const DESK_DISPLAY_HEIGHT = Math.round(DESK_NATIVE_HEIGHT * DESK_SCALE)

// ---------------------------------------------------------------------------
// call-bell.png (normalized 3-frame sheet in assets/environment/, generated
// from the raw "call bell.png" in assets/environment/source/ — that raw
// file is untouched). Cell layout from that normalization pass.
export const BELL_CELL_WIDTH = 500
export const BELL_CELL_HEIGHT = 470
export const BELL_FRAME_COUNT = 3

// Frame 0 (rest state, no motion lines) native height was 362px — used as
// the size reference so the bell reads as small next to the (now bigger) desk.
const BELL_NATIVE_REST_HEIGHT = 362
const TARGET_BELL_REST_HEIGHT_PX = 26

export const BELL_SCALE = TARGET_BELL_REST_HEIGHT_PX / BELL_NATIVE_REST_HEIGHT
export const BELL_DISPLAY_WIDTH = Math.round(BELL_CELL_WIDTH * BELL_SCALE)
export const BELL_DISPLAY_HEIGHT = Math.round(BELL_CELL_HEIGHT * BELL_SCALE)

// ---------------------------------------------------------------------------
// exit.png (normalized single frame in assets/environment/, generated from
// the raw "EXIT.png" in assets/environment/source/ — untouched). Sits
// directly under the call bell, outside the desk graphic.
const EXIT_NATIVE_WIDTH = 1219
const EXIT_NATIVE_HEIGHT = 696
const TARGET_EXIT_HEIGHT_PX = 26

export const EXIT_SCALE = TARGET_EXIT_HEIGHT_PX / EXIT_NATIVE_HEIGHT
export const EXIT_DISPLAY_WIDTH = Math.round(EXIT_NATIVE_WIDTH * EXIT_SCALE)
export const EXIT_DISPLAY_HEIGHT = Math.round(EXIT_NATIVE_HEIGHT * EXIT_SCALE)

// ---------------------------------------------------------------------------
// talk-menu.png (normalized single frame in assets/environment/, generated
// from the raw "TALK MENU.png" in assets/environment/source/ — untouched).
// Used only as the dialog's background art — menu items and conversation
// text are React elements layered on top, never baked into the image. This
// is EVI's main conversation surface (not a small popup menu), so it's
// sized to take up most of the window's width — see getTalkMenuDisplaySize.
const TALK_MENU_NATIVE_WIDTH = 2013
const TALK_MENU_NATIVE_HEIGHT = 633
const TALK_MENU_LEFT_MARGIN = 16
const TALK_MENU_BOTTOM_MARGIN = 10
// Gap kept between the dialog's right edge and the desk/bell/exit unit.
const TALK_MENU_DESK_GAP = 24

// Where menu/conversation content can actually go inside talk-menu.png,
// measured directly from the art (pixel-sampled against the 2013x633
// source) as fractions of the image's own box — not the desk window. The
// art is a text box only in its bottom ~41%; everything above that is
// transparent padding EVI's portrait stands in, and the box's own top-right
// holds the "EVI" nameplate tab. This rectangle is the plain cream interior
// with the borders, portrait and nameplate all excluded, so it scales
// correctly with the dialog no matter how big TALK_MENU_DISPLAY_WIDTH gets.
export const TALK_MENU_CONTENT_LEFT = 0.02
export const TALK_MENU_CONTENT_TOP = 0.648
export const TALK_MENU_CONTENT_WIDTH = 0.72
export const TALK_MENU_CONTENT_HEIGHT = 0.288

// ---------------------------------------------------------------------------
// Desk window layout. The desk graphic, call bell and exit button form one
// compact "reception desk" unit anchored to the window's own bottom-right
// corner (bell above exit, both just to the right of the desk graphic); the
// window itself is anchored to the screen's bottom-right corner, so that
// unit ends up near the screen corner too. The window is wide enough that
// the talk-menu dialog (opened to the unit's left) can be genuinely large.
export const DESK_WINDOW_WIDTH = 1100
export const DESK_WINDOW_HEIGHT = 340

const DESK_UNIT_RIGHT_MARGIN = 24
const DESK_BUTTON_GAP = 10 // between the desk graphic and the bell/exit column
const BUTTON_STACK_GAP = 6 // between the bell and the exit button

const buttonColumnWidth = Math.max(BELL_DISPLAY_WIDTH, EXIT_DISPLAY_WIDTH)

// Left edge of the desk graphic within the desk window.
export function getDeskLeft(): number {
  return DESK_WINDOW_WIDTH - DESK_UNIT_RIGHT_MARGIN - buttonColumnWidth - DESK_BUTTON_GAP - DESK_DISPLAY_WIDTH
}

// Left edge of the bell/exit column, and the horizontal offset of each
// button within it (centered, since bell and exit aren't the same width).
export function getButtonColumnLeft(): number {
  return getDeskLeft() + DESK_DISPLAY_WIDTH + DESK_BUTTON_GAP
}
export function getBellLeftInColumn(): number {
  return Math.round((buttonColumnWidth - BELL_DISPLAY_WIDTH) / 2)
}
export function getExitLeftInColumn(): number {
  return Math.round((buttonColumnWidth - EXIT_DISPLAY_WIDTH) / 2)
}

// Bell/exit are stacked and vertically centered against the desk graphic's
// own height, so the three read as one sign rather than two unrelated UI
// layers.
export function getButtonColumnTop(): number {
  const deskCenterY = DESK_WINDOW_HEIGHT - DESK_DISPLAY_HEIGHT / 2
  const stackHeight = BELL_DISPLAY_HEIGHT + BUTTON_STACK_GAP + EXIT_DISPLAY_HEIGHT
  return Math.round(deskCenterY - stackHeight / 2)
}
export function getExitTop(): number {
  return getButtonColumnTop() + BELL_DISPLAY_HEIGHT + BUTTON_STACK_GAP
}

// Talk-menu display size: as wide as the space between the window's left
// edge and the desk unit allows, scaled to the art's native aspect ratio.
export function getTalkMenuDisplaySize(): { width: number; height: number } {
  const width = getDeskLeft() - TALK_MENU_DESK_GAP - TALK_MENU_LEFT_MARGIN
  const height = Math.round((TALK_MENU_NATIVE_HEIGHT / TALK_MENU_NATIVE_WIDTH) * width)
  return { width, height }
}
export const TALK_MENU_LEFT = TALK_MENU_LEFT_MARGIN
export const TALK_MENU_BOTTOM = TALK_MENU_BOTTOM_MARGIN

// Where the desk window sits on screen: bottom-right corner of the work
// area, using the same floor margin the NPC's own initial spawn uses.
export const DESK_SCREEN_MARGIN_RIGHT = 24
export const DESK_SCREEN_MARGIN_BOTTOM = FLOOR_MARGIN

export function computeDeskWindowPosition(work: { x: number; y: number; width: number; height: number }): {
  x: number
  y: number
} {
  return {
    x: Math.round(work.x + work.width - DESK_WINDOW_WIDTH - DESK_SCREEN_MARGIN_RIGHT),
    y: Math.round(work.y + work.height - DESK_WINDOW_HEIGHT - DESK_SCREEN_MARGIN_BOTTOM)
  }
}

// Where EVI's window should sit once docked, in desk-window-local
// coordinates: centered under the desk graphic, bottom edge flush with the
// desk's own floor line — so the desk graphic, drawn after EVI in
// DeskView, covers EVI's lower body while the head/shoulders poke up above it.
export function getDockedLocalPosition(): { x: number; y: number } {
  return {
    x: Math.round(getDeskLeft() + DESK_DISPLAY_WIDTH / 2 - WINDOW_WIDTH / 2),
    y: DESK_WINDOW_HEIGHT - WINDOW_HEIGHT
  }
}

// CALL_POINT: the docked position translated into screen coordinates — this
// is what the NPC window actually walks to when summoned.
export function computeCallPoint(deskWindowPos: { x: number; y: number }): { x: number; y: number } {
  const local = getDockedLocalPosition()
  return { x: deskWindowPos.x + local.x, y: deskWindowPos.y + local.y }
}

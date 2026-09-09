import { join } from 'path'
import { BrowserWindow, ipcMain, screen } from 'electron'
import { FLOOR_MARGIN, WINDOW_HEIGHT, WINDOW_WIDTH } from '../shared/npcConfig'

let npcWindow: BrowserWindow | null = null

// We track the window's logical position ourselves rather than reading it
// back via BrowserWindow.getBounds() on every tick. On Windows, a
// transparent/layered window's native rect can briefly report stale or
// interpolated values while repositioned rapidly (e.g. every animation
// tick during WALK), which was previously observed to make the reported
// width drift. Being the single source of truth for x/y and always
// re-asserting the full bounds (via setBounds, not setPosition) avoids that.
let currentX = 0
let currentY = 0

function getWorkArea() {
  return screen.getPrimaryDisplay().workArea
}

// BrowserWindow bounds require integers — round here so every caller gets a
// value safe to pass straight through to the native window API.
function clampX(x: number): number {
  const work = getWorkArea()
  const min = work.x
  const max = work.x + work.width - WINDOW_WIDTH
  return Math.round(Math.min(Math.max(x, min), max))
}

function clampY(y: number): number {
  const work = getWorkArea()
  const min = work.y
  const max = work.y + work.height - WINDOW_HEIGHT
  return Math.round(Math.min(Math.max(y, min), max))
}

function applyBounds(): void {
  npcWindow?.setBounds({ x: currentX, y: currentY, width: WINDOW_WIDTH, height: WINDOW_HEIGHT })
}

function initialPosition() {
  const work = getWorkArea()
  const x = Math.round(work.x + work.width / 2 - WINDOW_WIDTH / 2)
  const y = Math.round(work.y + work.height - WINDOW_HEIGHT - FLOOR_MARGIN)
  return { x: clampX(x), y: clampY(y) }
}

export function createNpcWindow(): BrowserWindow {
  const { x, y } = initialPosition()
  currentX = x
  currentY = y

  npcWindow = new BrowserWindow({
    x,
    y,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  npcWindow.setAlwaysOnTop(true, 'floating')
  npcWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (process.env['ELECTRON_RENDERER_URL']) {
    npcWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    npcWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  npcWindow.on('closed', () => {
    npcWindow = null
  })

  return npcWindow
}

export function getNpcWindow(): BrowserWindow | null {
  return npcWindow
}

export function registerNpcWindowIpc(): void {
  ipcMain.handle('npc:getBounds', () => {
    return { x: currentX, y: currentY }
  })

  ipcMain.handle('npc:moveBy', (_event, dx: number) => {
    if (!npcWindow) return { x: currentX, hitLeft: false, hitRight: false }
    const work = getWorkArea()
    currentX = clampX(currentX + dx)
    applyBounds()
    return {
      x: currentX,
      hitLeft: currentX <= work.x,
      hitRight: currentX >= work.x + work.width - WINDOW_WIDTH
    }
  })

  ipcMain.on('npc:setPosition', (_event, pos: { x: number; y: number }) => {
    if (!npcWindow) return
    currentX = clampX(pos.x)
    currentY = clampY(pos.y)
    applyBounds()
  })
}

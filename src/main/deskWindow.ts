import { join } from 'path'
import { BrowserWindow, screen } from 'electron'
import { computeCallPoint, computeDeskWindowPosition, DESK_WINDOW_HEIGHT, DESK_WINDOW_WIDTH } from '../shared/environmentConfig'

let deskWindow: BrowserWindow | null = null

function getWorkArea() {
  return screen.getPrimaryDisplay().workArea
}

export function createDeskWindow(): BrowserWindow {
  const { x, y } = computeDeskWindowPosition(getWorkArea())

  deskWindow = new BrowserWindow({
    x,
    y,
    width: DESK_WINDOW_WIDTH,
    height: DESK_WINDOW_HEIGHT,
    transparent: true,
    frame: false,
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

  if (process.env['ELECTRON_RENDERER_URL']) {
    deskWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#desk`)
  } else {
    deskWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'desk' })
  }

  deskWindow.on('closed', () => {
    deskWindow = null
  })

  return deskWindow
}

export function getDeskWindow(): BrowserWindow | null {
  return deskWindow
}

// The point (screen coords, top-left of the NPC window) EVI should stand
// at when summoned — just left of the desk graphic, never on top of it.
export function getCallPoint(): { x: number; y: number } {
  const deskPos = computeDeskWindowPosition(getWorkArea())
  return computeCallPoint(deskPos)
}

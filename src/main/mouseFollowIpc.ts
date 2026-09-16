import { ipcMain } from 'electron'
import { getNpcWindow } from './npcWindow'

// "마우스 따라다니기" on/off — toggled from the desk menu, consumed by the
// NPC window's own behavior loop (useNpcBehavior). No persistence yet
// (matches the rest of v0.1): resets to off on every app restart.
let mouseFollowEnabled = false

export function registerMouseFollowIpc(): void {
  ipcMain.handle('npc:getMouseFollowEnabled', () => mouseFollowEnabled)

  ipcMain.on('npc:setMouseFollowEnabled', (_event, enabled: boolean) => {
    mouseFollowEnabled = enabled
    getNpcWindow()?.webContents.send('npc:mouseFollowChanged', enabled)
  })
}

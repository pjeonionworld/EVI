import { app, ipcMain } from 'electron'
import { getCallPoint, getDeskWindow } from './deskWindow'
import { getNpcWindow } from './npcWindow'

// Small relay between the desk window (call bell/exit/talk dialog) and the
// NPC window (EVI's own movement state machine) — Main is the only thing
// that talks to both windows, so it's the natural place for this handful of
// one-way pushes.
export function registerCallFlowIpc(): void {
  ipcMain.on('call:ring', () => {
    const npcWindow = getNpcWindow()
    if (!npcWindow) return
    npcWindow.webContents.send('npc:called', getCallPoint())
  })

  // EVI has walked up to the desk and snapped to the call point. From here
  // on she's rendered docked behind the desk inside the desk window itself
  // (see DeskView) — not as the free-floating NPC window, since only a
  // single document can guarantee the desk graphic reliably paints over her
  // lower body. Hiding the NPC window is enough; its position/movement state
  // is untouched and picks up exactly where it left off once shown again.
  ipcMain.on('npc:callArrived', () => {
    getNpcWindow()?.hide()
    getDeskWindow()?.webContents.send('desk:talkState', true)
  })

  // Drag interrupted the walk before EVI arrived — nothing to hide/show yet.
  ipcMain.on('npc:callCancelled', () => {
    getDeskWindow()?.webContents.send('desk:talkState', false)
  })

  // The talk dialog's X button — ends the docked/talk state and lets EVI
  // roam freely again.
  ipcMain.on('desk:closeTalk', () => {
    getNpcWindow()?.showInactive()
    getNpcWindow()?.webContents.send('npc:resume')
    getDeskWindow()?.webContents.send('desk:talkState', false)
  })

  // EXIT button's confirmation — the only path that actually quits the app.
  ipcMain.on('app:quit', () => {
    app.quit()
  })
}

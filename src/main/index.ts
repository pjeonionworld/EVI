import { app } from 'electron'
import { registerCallFlowIpc } from './callFlow'
import { createDeskWindow } from './deskWindow'
import { registerJobPostingIpc } from './jobPostingIpc'
import { registerMouseFollowIpc } from './mouseFollowIpc'
import { createNpcWindow, registerNpcWindowIpc } from './npcWindow'
import { createTray } from './tray'
import { registerYoutubeIpc } from './youtubeIpc'

// Single instance: a background desktop pet has no reason to run twice.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

app.whenReady().then(() => {
  registerNpcWindowIpc()
  registerCallFlowIpc()
  registerYoutubeIpc()
  registerJobPostingIpc()
  registerMouseFollowIpc()
  createNpcWindow()
  createDeskWindow()
  createTray()
})

app.on('window-all-closed', () => {
  // No dock-style "keep running with no window" concept here: the tray
  // menu is the only way to quit, so if the window is gone, quit too.
  app.quit()
})

import { join } from 'path'
import { app, Menu, nativeImage, Tray } from 'electron'

let tray: Tray | null = null

export function createTray(): Tray {
  const iconPath = join(__dirname, '../../assets/npc/tray-icon.png')
  const icon = nativeImage.createFromPath(iconPath)

  tray = new Tray(icon)
  tray.setToolTip('EVI')

  const menu = Menu.buildFromTemplate([
    { label: 'EVI 종료', click: () => app.quit() }
  ])
  tray.setContextMenu(menu)

  return tray
}

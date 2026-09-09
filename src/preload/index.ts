import { contextBridge, ipcRenderer } from 'electron'

export interface EviApi {
  getBounds: () => Promise<{ x: number; y: number }>
  moveBy: (dx: number) => Promise<{ x: number; hitLeft: boolean; hitRight: boolean }>
  setPosition: (x: number, y: number) => void
}

const eviApi: EviApi = {
  getBounds: () => ipcRenderer.invoke('npc:getBounds'),
  moveBy: (dx: number) => ipcRenderer.invoke('npc:moveBy', dx),
  setPosition: (x: number, y: number) => ipcRenderer.send('npc:setPosition', { x, y })
}

contextBridge.exposeInMainWorld('evi', eviApi)

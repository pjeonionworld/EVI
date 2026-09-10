import { contextBridge, ipcRenderer } from 'electron'

export interface Point {
  x: number
  y: number
}

export interface EviApi {
  getBounds: () => Promise<Point>
  getWorkArea: () => Promise<{ x: number; y: number; width: number; height: number }>
  moveBy: (dx: number, dy: number) => Promise<Point>
  setPosition: (x: number, y: number) => void
  // Call-bell flow (see src/main/callFlow.ts)
  ringBell: () => void
  onCalled: (callback: (point: Point) => void) => () => void
  notifyArrived: () => void
  notifyCallCancelled: () => void
  onTalkState: (callback: (talking: boolean) => void) => () => void
  // Talk dialog's X button — ends the call/talk state; the NPC window
  // listens for the resulting resume signal to start roaming again.
  closeTalk: () => void
  onResume: (callback: () => void) => () => void
  // EXIT confirmation's "퇴근시키기" — the only path that quits the app.
  quitApp: () => void
}

const eviApi: EviApi = {
  getBounds: () => ipcRenderer.invoke('npc:getBounds'),
  getWorkArea: () => ipcRenderer.invoke('npc:getWorkArea'),
  moveBy: (dx: number, dy: number) => ipcRenderer.invoke('npc:moveBy', dx, dy),
  setPosition: (x: number, y: number) => ipcRenderer.send('npc:setPosition', { x, y }),

  ringBell: () => ipcRenderer.send('call:ring'),
  onCalled: (callback) => {
    const listener = (_event: unknown, point: Point) => callback(point)
    ipcRenderer.on('npc:called', listener)
    return () => ipcRenderer.removeListener('npc:called', listener)
  },
  notifyArrived: () => ipcRenderer.send('npc:callArrived'),
  notifyCallCancelled: () => ipcRenderer.send('npc:callCancelled'),
  onTalkState: (callback) => {
    const listener = (_event: unknown, talking: boolean) => callback(talking)
    ipcRenderer.on('desk:talkState', listener)
    return () => ipcRenderer.removeListener('desk:talkState', listener)
  },

  closeTalk: () => ipcRenderer.send('desk:closeTalk'),
  onResume: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('npc:resume', listener)
    return () => ipcRenderer.removeListener('npc:resume', listener)
  },
  quitApp: () => ipcRenderer.send('app:quit')
}

contextBridge.exposeInMainWorld('evi', eviApi)

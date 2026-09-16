import { contextBridge, ipcRenderer } from 'electron'
import type { JobPosting } from '../shared/jobTypes'
import type { VideoRecommendation } from '../shared/youtubeTypes'

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
  // "영상 추천" menu item (see src/main/youtubeIpc.ts).
  getVideoRecommendations: () => Promise<VideoRecommendation[]>
  openVideo: (url: string) => void
  // 측정시작/측정끝 — marks a meal-watching session so videos opened while
  // it's active get logged to mealtime-watch-log.xlsx.
  getMealtimeMeasuring: () => Promise<boolean>
  startMealtimeMeasurement: () => void
  stopMealtimeMeasurement: () => void
  // "채용공고" menu item (see src/main/jobPostingIpc.ts).
  getTodayJobPostings: () => Promise<JobPosting[]>
  openJobPosting: (url: string) => void
  // "마우스 따라다니기" 메뉴 토글 (see src/main/mouseFollowIpc.ts). NPC 창이
  // 켜진 동안 매 tick마다 커서 위치를 읽어오는 용도로 getCursorPoint도 사용.
  getCursorPoint: () => Promise<Point>
  getMouseFollowEnabled: () => Promise<boolean>
  setMouseFollowEnabled: (enabled: boolean) => void
  onMouseFollowChanged: (callback: (enabled: boolean) => void) => () => void
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
  quitApp: () => ipcRenderer.send('app:quit'),

  getVideoRecommendations: () => ipcRenderer.invoke('youtube:getRecommendations'),
  openVideo: (url: string) => ipcRenderer.send('youtube:openVideo', url),

  getMealtimeMeasuring: () => ipcRenderer.invoke('youtube:getMealtimeMeasuring'),
  startMealtimeMeasurement: () => ipcRenderer.send('youtube:startMealtimeMeasurement'),
  stopMealtimeMeasurement: () => ipcRenderer.send('youtube:stopMealtimeMeasurement'),

  getTodayJobPostings: () => ipcRenderer.invoke('job:getTodayPostings'),
  openJobPosting: (url: string) => ipcRenderer.send('job:openPosting', url),

  getCursorPoint: () => ipcRenderer.invoke('npc:getCursorPoint'),
  getMouseFollowEnabled: () => ipcRenderer.invoke('npc:getMouseFollowEnabled'),
  setMouseFollowEnabled: (enabled: boolean) => ipcRenderer.send('npc:setMouseFollowEnabled', enabled),
  onMouseFollowChanged: (callback) => {
    const listener = (_event: unknown, enabled: boolean) => callback(enabled)
    ipcRenderer.on('npc:mouseFollowChanged', listener)
    return () => ipcRenderer.removeListener('npc:mouseFollowChanged', listener)
  }
}

contextBridge.exposeInMainWorld('evi', eviApi)

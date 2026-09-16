import { ipcMain, shell } from 'electron'
import { getVideoRecommendations } from './services/youtubeRecommend'
import {
  appendMealtimeSession,
  appendMealtimeWatch,
  getWatchRecords,
  type MealtimeSessionVideo
} from './services/youtubeHistoryStore'

// Whether the user has marked "I'm eating and watching now" via the
// 측정시작/측정끝 buttons (VideoRecommendPanel). In-memory only — no DB yet,
// and a meal session doesn't need to survive an app restart. If the app
// quits mid-session without 측정끝 being pressed, that session is simply
// never written to mealtime-session-log.xlsx.
let mealtimeMeasuring = false
let mealtimeSessionStartedAt: string | null = null
let mealtimeSessionVideos: MealtimeSessionVideo[] = []

function formatTimestamp(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

// The renderer only hands us a URL, but every recommended video already came
// from our own watch history, so its title/channel can be looked up there
// instead of widening the IPC call's payload. Feeds both logs: the scoring
// input (mealtime-watch-log.xlsx) and this session's video buffer, which is
// flushed to mealtime-session-log.xlsx once 측정끝 is pressed.
async function recordMealtimeOpen(videoUrl: string): Promise<void> {
  const records = await getWatchRecords()
  const match = records.find((record) => record.videoUrl === videoUrl)
  mealtimeSessionVideos.push({ title: match?.title ?? '', channel: match?.channel ?? '', videoUrl })
  if (!match) return
  await appendMealtimeWatch({
    title: match.title,
    channel: match.channel,
    channelUrl: match.channelUrl,
    videoUrl,
    watchedAt: formatTimestamp(new Date())
  })
}

export function registerYoutubeIpc(): void {
  ipcMain.handle('youtube:getRecommendations', () => getVideoRecommendations())

  // Recommended URLs come from our own trusted watch-history data, but the
  // renderer call is still untrusted input crossing the IPC boundary — only
  // ever hand shell.openExternal a real youtube.com watch URL.
  ipcMain.on('youtube:openVideo', (_event, url: unknown) => {
    if (typeof url !== 'string' || !url.startsWith('https://www.youtube.com/watch?v=')) return
    shell.openExternal(url)
    if (mealtimeMeasuring) {
      void recordMealtimeOpen(url)
    }
  })

  ipcMain.handle('youtube:getMealtimeMeasuring', () => mealtimeMeasuring)

  ipcMain.on('youtube:startMealtimeMeasurement', () => {
    mealtimeMeasuring = true
    mealtimeSessionStartedAt = formatTimestamp(new Date())
    mealtimeSessionVideos = []
  })

  ipcMain.on('youtube:stopMealtimeMeasurement', () => {
    mealtimeMeasuring = false
    if (!mealtimeSessionStartedAt) return

    const startedAt = mealtimeSessionStartedAt
    const endedAt = formatTimestamp(new Date())
    const videos = mealtimeSessionVideos
    mealtimeSessionStartedAt = null
    mealtimeSessionVideos = []
    void appendMealtimeSession(startedAt, endedAt, videos)
  })
}

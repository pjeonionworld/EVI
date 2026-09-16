import type { VideoRecommendation } from '../../shared/youtubeTypes'
import { getWatchRecords, type WatchRecord } from './youtubeHistoryStore'

interface VideoAggregate {
  videoUrl: string
  title: string
  channel: string
  watchCount: number
  mealtimeCount: number
  lastWatchedAt: string
}

// How many of the highest-scored videos are eligible to be picked from —
// wide enough for variety across repeated clicks, narrow enough to stay
// "stuff EVI knows you actually like" rather than the whole history.
const CANDIDATE_POOL_SIZE = 20

function parseWatchedAt(value: string): Date {
  return new Date(value.replace(' ', 'T'))
}

// Lunch/dinner hour windows (24h, end exclusive) used to decide whether a
// watch record counts as "mealtime" — derived straight from watchedAt's
// hour, not from which sheet the record came from. This means the seed
// history's existing timestamps already count, instead of only the
// (currently empty) mealtime-watch-log.xlsx.
const LUNCH_START_HOUR = 11
const LUNCH_END_HOUR = 14
const DINNER_START_HOUR = 17
const DINNER_END_HOUR = 20

function isMealtimeHour(watchedAt: string): boolean {
  const hour = Number(watchedAt.slice(11, 13))
  if (Number.isNaN(hour)) return false
  return (hour >= LUNCH_START_HOUR && hour < LUNCH_END_HOUR) || (hour >= DINNER_START_HOUR && hour < DINNER_END_HOUR)
}

function aggregateByVideo(records: WatchRecord[]): VideoAggregate[] {
  const map = new Map<string, VideoAggregate>()
  for (const record of records) {
    const existing = map.get(record.videoUrl)
    const mealtimeHit = isMealtimeHour(record.watchedAt) ? 1 : 0
    if (existing) {
      existing.watchCount += 1
      existing.mealtimeCount += mealtimeHit
      // watchedAt is "YYYY-MM-DD HH:mm:ss", so string comparison sorts
      // chronologically without needing to parse every row into a Date.
      if (record.watchedAt > existing.lastWatchedAt) existing.lastWatchedAt = record.watchedAt
    } else {
      map.set(record.videoUrl, {
        videoUrl: record.videoUrl,
        title: record.title,
        channel: record.channel,
        watchCount: 1,
        mealtimeCount: mealtimeHit,
        lastWatchedAt: record.watchedAt
      })
    }
  }
  return [...map.values()]
}

// Deliberately simple and explainable (no ML): recently watched videos rank
// over stale ones, boosted by how often a video has actually been watched
// during lunch/dinner hours — the long-term target being "밥 먹을 때 보기
// 좋은 영상". Rewatch count on its own is intentionally NOT a scoring
// factor (only used for the display "reason" text below) — a video seen
// many times outside mealtime shouldn't outrank one genuinely tied to meals.
function scoreVideo(video: VideoAggregate, now: Date): number {
  const recencyDays = Math.abs(now.getTime() - parseWatchedAt(video.lastWatchedAt).getTime()) / (1000 * 60 * 60 * 24)
  const recencyWeight = 1 / (1 + recencyDays / 30)
  const mealtimeBoost = 1 + Math.min(video.mealtimeCount, 10) * 1.5 // capped so one binge doesn't dominate forever
  return recencyWeight * mealtimeBoost
}

function reasonFor(video: VideoAggregate): string {
  if (video.mealtimeCount > 0) return '식사 시간에 즐겨 본 영상'
  if (video.watchCount >= 2) return `${video.watchCount}회 다시 본 영상`
  return `자주 보는 채널 '${video.channel}'의 영상`
}

// Weighted random pick, one at a time, preferring a channel not already
// represented in `picked` — keeps the 3 suggestions from all being the same
// drama/channel, and falls back to repeats only once every candidate
// channel has been used.
function pickDiverse(scored: { video: VideoAggregate; score: number }[], count: number): VideoAggregate[] {
  const remaining = scored.slice()
  const picked: VideoAggregate[] = []
  const usedChannels = new Set<string>()

  while (picked.length < count && remaining.length > 0) {
    const candidates = remaining.filter((c) => !usedChannels.has(c.video.channel))
    const pool = candidates.length > 0 ? candidates : remaining

    const totalWeight = pool.reduce((sum, c) => sum + c.score, 0)
    let roll = Math.random() * totalWeight
    let chosenIndex = pool.length - 1
    for (let i = 0; i < pool.length; i++) {
      roll -= pool[i].score
      if (roll <= 0) {
        chosenIndex = i
        break
      }
    }
    const chosen = pool[chosenIndex]

    picked.push(chosen.video)
    usedChannels.add(chosen.video.channel)
    remaining.splice(remaining.indexOf(chosen), 1)
  }

  return picked
}

export async function getVideoRecommendations(count = 3): Promise<VideoRecommendation[]> {
  const records = await getWatchRecords()
  if (records.length === 0) return []

  const now = new Date()
  const scored = aggregateByVideo(records)
    .map((video) => ({ video, score: scoreVideo(video, now) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, CANDIDATE_POOL_SIZE)

  return pickDiverse(scored, count).map((video) => ({
    title: video.title,
    channel: video.channel,
    videoUrl: video.videoUrl,
    reason: reasonFor(video)
  }))
}

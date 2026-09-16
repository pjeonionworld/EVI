import { ipcMain, shell } from 'electron'
import { getTodayJobPostings } from './services/jobPostingStore'

// Apply links all come from the same 사람인(Saramin) source the Excel file
// notes in its footer — only allow opening real saramin.co.kr URLs, same
// spirit as youtubeIpc's youtube.com check on the IPC boundary.
function isTrustedApplyUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && (parsed.hostname === 'saramin.co.kr' || parsed.hostname.endsWith('.saramin.co.kr'))
  } catch {
    return false
  }
}

export function registerJobPostingIpc(): void {
  ipcMain.handle('job:getTodayPostings', () => getTodayJobPostings())

  ipcMain.on('job:openPosting', (_event, url: unknown) => {
    if (typeof url === 'string' && isTrustedApplyUrl(url)) {
      shell.openExternal(url)
    }
  })
}

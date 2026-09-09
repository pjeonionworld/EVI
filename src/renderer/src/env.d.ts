/// <reference types="vite/client" />

import type { EviApi } from '../../preload'

declare global {
  interface Window {
    evi: EviApi
  }
}

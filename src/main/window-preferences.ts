export const MIN_WINDOW_OPACITY = 0.55
export const MAX_WINDOW_OPACITY = 1

export interface WindowPreferences {
  opacity: number
  alwaysOnTop: boolean
}

export const DEFAULT_WINDOW_PREFERENCES: WindowPreferences = {
  opacity: 1,
  alwaysOnTop: false
}

export function clampWindowOpacity(value: number): number {
  return Math.min(MAX_WINDOW_OPACITY, Math.max(MIN_WINDOW_OPACITY, value))
}

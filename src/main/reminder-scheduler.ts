export interface ReminderSnapshotItem {
  id: number
  title: string
  content: string
  remindAt: number
  lastNotifiedAt: number | null
}

export interface ReminderFiredPayload {
  id: number
  remindAt: number
  firedAt: number
}

interface ReminderSchedulerOptions {
  onReminderFired: (payload: ReminderFiredPayload, item: ReminderSnapshotItem) => void
}

export class ReminderScheduler {
  private readonly reminders = new Map<number, ReminderSnapshotItem>()
  private timer: ReturnType<typeof setTimeout> | null = null
  private readonly onReminderFired: ReminderSchedulerOptions['onReminderFired']

  constructor(options: ReminderSchedulerOptions) {
    this.onReminderFired = options.onReminderFired
  }

  sync(items: ReminderSnapshotItem[]): void {
    this.reminders.clear()

    for (const item of items) {
      this.reminders.set(item.id, item)
    }

    this.schedule()
  }

  checkNow(): void {
    this.fireDue(Date.now())
  }

  dispose(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private schedule(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    const now = Date.now()
    let nextDueAt: number | null = null

    for (const item of this.reminders.values()) {
      if (!this.isPending(item)) {
        continue
      }

      if (nextDueAt === null || item.remindAt < nextDueAt) {
        nextDueAt = item.remindAt
      }
    }

    if (nextDueAt === null) {
      return
    }

    const delay = Math.max(0, nextDueAt - now)
    this.timer = setTimeout(() => {
      this.fireDue(Date.now())
    }, delay)
  }

  private fireDue(now: number): void {
    for (const item of this.reminders.values()) {
      if (!this.isPending(item) || item.remindAt > now) {
        continue
      }

      const firedAt = Date.now()
      this.onReminderFired(
        {
          id: item.id,
          remindAt: item.remindAt,
          firedAt
        },
        item
      )
      item.lastNotifiedAt = firedAt
    }

    this.schedule()
  }

  private isPending(item: ReminderSnapshotItem): boolean {
    return item.lastNotifiedAt === null || item.lastNotifiedAt < item.remindAt
  }
}

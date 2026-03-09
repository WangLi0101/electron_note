// 主进程保存的提醒快照，来自渲染进程同步。
export interface ReminderSnapshotItem {
  id: number
  title: string
  content: string
  remindAt: number
  lastNotifiedAt: number | null
}

// 主进程触发提醒后广播给渲染进程的事件载荷。
export interface ReminderFiredPayload {
  id: number
  remindAt: number
  firedAt: number
}

interface ReminderSchedulerOptions {
  onReminderFired: (payload: ReminderFiredPayload, item: ReminderSnapshotItem) => void
}

export class ReminderScheduler {
  // 当前参与调度的提醒集合，key 为备忘录 id。
  private readonly reminders = new Map<number, ReminderSnapshotItem>()
  private timer: ReturnType<typeof setTimeout> | null = null
  private readonly onReminderFired: ReminderSchedulerOptions['onReminderFired']

  constructor(options: ReminderSchedulerOptions) {
    this.onReminderFired = options.onReminderFired
  }

  // 全量同步提醒快照（渲染进程每次变更后会推送最新列表）。
  sync(items: ReminderSnapshotItem[]): void {
    this.reminders.clear()

    for (const item of items) {
      this.reminders.set(item.id, item)
    }

    this.schedule()
  }

  // 立刻执行一次到期检查（用于系统睡眠恢复等场景）。
  checkNow(): void {
    this.fireDue(Date.now())
  }

  // 进程退出前释放定时器资源。
  dispose(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  // 只调度“最近一条待触发提醒”，降低无意义轮询。
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

  // 扫描当前快照中所有“已到期且未触发”的提醒并触发回调。
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
      // 在内存快照中标记为已触发，避免同一次调度重复发送。
      item.lastNotifiedAt = firedAt
    }

    // 本轮触发后重新计算下一次最近提醒。
    this.schedule()
  }

  // 去重规则：从未通知过，或上次通知时间早于当前提醒时间，才算待触发。
  private isPending(item: ReminderSnapshotItem): boolean {
    return item.lastNotifiedAt === null || item.lastNotifiedAt < item.remindAt
  }
}

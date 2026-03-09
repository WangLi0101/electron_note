export type MemoStatus = 'todo' | 'done'

export interface MemoEntity {
  id?: number
  title: string
  content: string
  tags: string[]
  status: MemoStatus
  pinned: boolean
  dueAt: number | null
  remindAt: number | null
  lastNotifiedAt: number | null
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

export interface MemoDraft {
  id: number
  title: string
  content: string
  tags: string[]
  status: MemoStatus
  pinned: boolean
  dueAt: number | null
  remindAt: number | null
}

export type MemoViewMode = 'all' | 'todo' | 'done' | 'trash'

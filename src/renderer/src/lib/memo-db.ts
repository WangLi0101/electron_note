import Dexie, { type EntityTable } from 'dexie'

import type { MemoEntity, MemoStatus } from '../types/memo'

export class MemoDatabase extends Dexie {
  memos!: EntityTable<MemoEntity, 'id'>

  constructor() {
    super('memo-notebook-db')

    this.version(1).stores({
      memos: '++id, deletedAt, pinned, status, updatedAt, remindAt, *tags'
    })
  }
}

export const memoDb = new MemoDatabase()

export async function createMemo(): Promise<MemoEntity> {
  const now = Date.now()
  const memo: MemoEntity = {
    title: '',
    content: '',
    tags: [],
    status: 'todo',
    pinned: false,
    dueAt: null,
    remindAt: null,
    lastNotifiedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  }

  const id = await memoDb.memos.add(memo)
  return { ...memo, id }
}

export async function updateMemo(
  id: number,
  payload: Partial<Omit<MemoEntity, 'id' | 'createdAt'>>
): Promise<void> {
  await memoDb.memos.update(id, {
    ...payload,
    updatedAt: Date.now()
  })
}

export async function setMemoStatus(id: number, status: MemoStatus): Promise<void> {
  await updateMemo(id, { status })
}

export async function moveMemoToTrash(id: number): Promise<void> {
  await memoDb.memos.update(id, {
    deletedAt: Date.now(),
    updatedAt: Date.now()
  })
}

export async function restoreMemo(id: number): Promise<void> {
  await memoDb.memos.update(id, {
    deletedAt: null,
    updatedAt: Date.now()
  })
}

export async function destroyMemo(id: number): Promise<void> {
  await memoDb.memos.delete(id)
}

export async function touchMemoReminder(id: number, notifiedAt = Date.now()): Promise<void> {
  await memoDb.memos.update(id, {
    lastNotifiedAt: notifiedAt
  })
}

export function normalizeTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)))
}

import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Bell,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  CircleCheckBig,
  Edit3,
  Pin,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react'

import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Checkbox } from './components/ui/checkbox'
import { Input } from './components/ui/input'
import { ScrollArea } from './components/ui/scroll-area'
import { Textarea } from './components/ui/textarea'
import {
  createMemo,
  memoDb,
  normalizeTags,
  setMemoStatus,
  touchMemoReminder,
  updateMemo
} from './lib/memo-db'
import { cn } from './lib/utils'
import type { MemoEntity } from './types/memo'

interface MemoFormDraft {
  title: string
  content: string
  tagsText: string
  dueAtText: string
  remindAtText: string
  pinned: boolean
}

type EditorMode = 'create' | 'edit'

function getInitialDraft(): MemoFormDraft {
  return {
    title: '',
    content: '',
    tagsText: '',
    dueAtText: '',
    remindAtText: '',
    pinned: false
  }
}

function toDateTimeLocalValue(timestamp: number | null): string {
  if (!timestamp) {
    return ''
  }

  const date = new Date(timestamp)
  const pad = (value: number): string => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromDateTimeLocalValue(value: string): number | null {
  if (!value) {
    return null
  }

  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? null : parsed
}

function formatDateTime(timestamp: number | null): string {
  if (!timestamp) {
    return '未设置'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp)
}

function memoToDraft(memo: MemoEntity): MemoFormDraft {
  return {
    title: memo.title,
    content: memo.content,
    tagsText: memo.tags.join(' '),
    dueAtText: toDateTimeLocalValue(memo.dueAt),
    remindAtText: toDateTimeLocalValue(memo.remindAt),
    pinned: memo.pinned
  }
}

function App(): React.JSX.Element {
  const memos = useLiveQuery(() => memoDb.memos.toArray(), [], [])

  const [searchKeyword, setSearchKeyword] = useState('')
  const [showDoneList, setShowDoneList] = useState(false)
  const [editorMode, setEditorMode] = useState<EditorMode | null>(null)
  const [editingMemoId, setEditingMemoId] = useState<number | null>(null)
  const [formDraft, setFormDraft] = useState<MemoFormDraft>(() => getInitialDraft())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [windowOpacity, setWindowOpacity] = useState(1)
  const [alwaysOnTop, setAlwaysOnTop] = useState(false)

  const reminderItems = useMemo(
    () =>
      memos
        .filter((memo) => memo.deletedAt === null && memo.remindAt !== null)
        .map((memo) => ({
          id: memo.id ?? 0,
          title: memo.title,
          content: memo.content,
          remindAt: memo.remindAt ?? 0,
          lastNotifiedAt: memo.lastNotifiedAt
        }))
        .filter((memo) => memo.id > 0),
    [memos]
  )

  useEffect(() => {
    void window.api.reminder.sync(reminderItems)
  }, [reminderItems])

  useEffect(() => {
    const unsubscribe = window.api.reminder.onFired((payload) => {
      void (async () => {
        const memo = await memoDb.memos.get(payload.id)
        if (!memo || memo.deletedAt !== null || memo.remindAt !== payload.remindAt) {
          return
        }

        if (memo.lastNotifiedAt !== null && memo.lastNotifiedAt >= memo.remindAt) {
          return
        }

        await touchMemoReminder(payload.id, payload.firedAt)
      })()
    })

    return () => {
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    void (async () => {
      const preferences = await window.api.window.getPreferences()
      setWindowOpacity(preferences.opacity)
      setAlwaysOnTop(preferences.alwaysOnTop)
    })()
  }, [])

  const filteredMemos = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    return memos.filter((memo) => {
      if (memo.deletedAt !== null) {
        return false
      }

      if (!keyword) {
        return true
      }

      const searchableText = `${memo.title} ${memo.content} ${memo.tags.join(' ')}`.toLowerCase()
      return searchableText.includes(keyword)
    })
  }, [memos, searchKeyword])

  const todoMemos = useMemo(
    () =>
      filteredMemos
        .filter((memo) => memo.status === 'todo')
        .sort((a, b) => {
          if (a.pinned !== b.pinned) {
            return a.pinned ? -1 : 1
          }
          return b.updatedAt - a.updatedAt
        }),
    [filteredMemos]
  )

  const doneMemos = useMemo(
    () =>
      filteredMemos
        .filter((memo) => memo.status === 'done')
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [filteredMemos]
  )

  const editingMemo = useMemo(() => {
    if (!editingMemoId) {
      return null
    }

    return memos.find((memo) => memo.id === editingMemoId) ?? null
  }, [editingMemoId, memos])

  const isEditorOpen = editorMode !== null
  const canSubmit =
    formDraft.title.trim().length > 0 &&
    !isSubmitting &&
    (editorMode === 'create' || (editorMode === 'edit' && editingMemoId !== null))

  const handleToggleTodoStatus = async (id: number, done: boolean): Promise<void> => {
    await setMemoStatus(id, done ? 'done' : 'todo')
  }

  const handleCloseEditor = (): void => {
    setEditorMode(null)
    setEditingMemoId(null)
    setFormDraft(getInitialDraft())
  }

  const handleOpenCreatePanel = (): void => {
    setFormDraft(getInitialDraft())
    setEditingMemoId(null)
    setEditorMode('create')
  }

  const handleOpenEditPanel = (memo: MemoEntity): void => {
    if (!memo.id) {
      return
    }

    setFormDraft(memoToDraft(memo))
    setEditingMemoId(memo.id)
    setEditorMode('edit')
  }

  const handleSubmit = async (): Promise<void> => {
    if (!canSubmit || !editorMode) {
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        title: formDraft.title.trim(),
        content: formDraft.content.trim(),
        tags: normalizeTags(formDraft.tagsText.split(/[，,\s]+/g)),
        pinned: formDraft.pinned,
        dueAt: fromDateTimeLocalValue(formDraft.dueAtText),
        remindAt: fromDateTimeLocalValue(formDraft.remindAtText)
      }

      if (editorMode === 'create') {
        const createdMemo = await createMemo()
        if (!createdMemo.id) {
          return
        }

        await updateMemo(createdMemo.id, {
          ...payload,
          status: 'todo'
        })
      } else if (editingMemoId) {
        await updateMemo(editingMemoId, payload)
      }

      handleCloseEditor()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpacityChange = (value: number): void => {
    const normalized = Math.min(1, Math.max(0.55, value))
    setWindowOpacity(normalized)
    void (async () => {
      const next = await window.api.window.updatePreferences({ opacity: normalized })
      setWindowOpacity(next.opacity)
    })()
  }

  const handleAlwaysOnTopChange = (checked: boolean): void => {
    setAlwaysOnTop(checked)
    void (async () => {
      const next = await window.api.window.updatePreferences({ alwaysOnTop: checked })
      setAlwaysOnTop(next.alwaysOnTop)
    })()
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e2e8f0_0%,_#f8fafc_45%)] p-4 text-slate-800">
      <div
        className={cn(
          'mx-auto grid h-[calc(100vh-2rem)] max-w-7xl gap-4',
          isEditorOpen ? 'lg:grid-cols-[1fr_420px]' : 'grid-cols-1'
        )}
      >
        <Card className="h-full border-slate-200 bg-white/90">
          <CardHeader className="space-y-4 border-b border-slate-200 pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl">待办备忘录</CardTitle>
                <CardDescription>默认仅展示待办，已办列表独立折叠展示。</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={alwaysOnTop ? 'default' : 'outline'}
                  onClick={() => handleAlwaysOnTopChange(!alwaysOnTop)}
                >
                  <Pin className="size-4" />
                  {alwaysOnTop ? '已置顶' : '窗口置顶'}
                </Button>
                <Button size="sm" onClick={handleOpenCreatePanel}>
                  <Plus className="size-4" />
                  新建
                </Button>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_340px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="搜索待办/已办"
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-600">
                  <SlidersHorizontal className="size-3.5" />
                  窗口透明度
                </div>
                <label className="block text-xs text-slate-600">
                  透明度（最低 55%）
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="range"
                      min={55}
                      max={100}
                      value={Math.round(windowOpacity * 100)}
                      onChange={(event) => handleOpacityChange(Number(event.target.value) / 100)}
                      className="h-2 w-full cursor-pointer"
                    />
                    <span className="w-10 text-right text-xs text-slate-500">
                      {Math.round(windowOpacity * 100)}%
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </CardHeader>

          <CardContent className="h-[calc(100%-190px)] p-4">
            <ScrollArea className="h-full">
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-700">待办事项</h2>
                  <Badge variant="secondary">{todoMemos.length}</Badge>
                </div>
                <div className="space-y-2">
                  {todoMemos.map((memo) => {
                    const title = memo.title.trim() || '无标题待办'
                    return (
                      <div key={memo.id} className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={false}
                            onCheckedChange={(checked) => {
                              if (!memo.id || !checked) {
                                return
                              }

                              void handleToggleTodoStatus(memo.id, true)
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium text-slate-800">{title}</p>
                              {memo.pinned ? <Pin className="size-3.5 text-slate-500" /> : null}
                            </div>
                            {memo.content.trim() ? (
                              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{memo.content}</p>
                            ) : null}
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span>更新：{formatDateTime(memo.updatedAt)}</span>
                              {memo.remindAt ? (
                                <span className="inline-flex items-center gap-1">
                                  <Bell className="size-3" />
                                  {formatDateTime(memo.remindAt)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEditPanel(memo)}>
                            <Edit3 className="size-3.5" />
                            编辑
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  {todoMemos.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                      当前没有待办事项。
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="mt-5 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-slate-700"
                  onClick={() => setShowDoneList((current) => !current)}
                >
                  {showDoneList ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                  已办事项
                  <Badge variant="outline">{doneMemos.length}</Badge>
                </button>

                {showDoneList ? (
                  <div className="space-y-2">
                    {doneMemos.map((memo) => {
                      const title = memo.title.trim() || '无标题事项'
                      return (
                        <div key={memo.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked
                              onCheckedChange={(checked) => {
                                if (!memo.id || checked) {
                                  return
                                }

                                void handleToggleTodoStatus(memo.id, false)
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <CircleCheckBig className="size-3.5 text-emerald-500" />
                                <p className="truncate text-sm text-slate-600 line-through">{title}</p>
                              </div>
                              <p className="mt-2 text-xs text-slate-500">
                                完成于：{formatDateTime(memo.updatedAt)}
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEditPanel(memo)}>
                              <Edit3 className="size-3.5" />
                              编辑
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                    {doneMemos.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                        还没有已办事项。
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            </ScrollArea>
          </CardContent>
        </Card>

        {isEditorOpen ? (
          <Card className="h-full border-slate-200 bg-white/95">
            <CardHeader className="border-b border-slate-200 pb-4">
              <CardTitle className="inline-flex items-center gap-2">
                <Sparkles className="size-4" />
                {editorMode === 'create' ? '新建事项' : '编辑事项'}
              </CardTitle>
              <CardDescription>
                {editorMode === 'create'
                  ? '完成新增后会自动关闭右侧面板。'
                  : '保存修改后会自动关闭右侧面板。'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex h-[calc(100%-92px)] flex-col gap-4 overflow-y-auto p-4">
              <Input
                placeholder="标题（必填）"
                value={formDraft.title}
                onChange={(event) =>
                  setFormDraft((current) => ({ ...current, title: event.target.value }))
                }
              />

              <Textarea
                className="min-h-[180px]"
                placeholder="内容（可选）"
                value={formDraft.content}
                onChange={(event) =>
                  setFormDraft((current) => ({ ...current, content: event.target.value }))
                }
              />

              <Input
                placeholder="标签（用空格或逗号分隔）"
                value={formDraft.tagsText}
                onChange={(event) =>
                  setFormDraft((current) => ({ ...current, tagsText: event.target.value }))
                }
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="size-3.5" />
                    截止时间
                  </span>
                  <Input
                    type="datetime-local"
                    value={formDraft.dueAtText}
                    onChange={(event) =>
                      setFormDraft((current) => ({ ...current, dueAtText: event.target.value }))
                    }
                  />
                </label>
                <label className="space-y-1 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Bell className="size-3.5" />
                    提醒时间
                  </span>
                  <Input
                    type="datetime-local"
                    value={formDraft.remindAtText}
                    onChange={(event) =>
                      setFormDraft((current) => ({ ...current, remindAtText: event.target.value }))
                    }
                  />
                </label>
              </div>

              <label className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                置顶显示
                <Checkbox
                  checked={formDraft.pinned}
                  onCheckedChange={(checked) =>
                    setFormDraft((current) => ({ ...current, pinned: Boolean(checked) }))
                  }
                />
              </label>

              {editorMode === 'edit' && editingMemo ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  当前状态：{editingMemo.status === 'done' ? '已办' : '待办'}
                </div>
              ) : null}

              <div className="mt-auto flex gap-2 border-t border-slate-200 pt-3">
                <Button variant="secondary" className="flex-1" onClick={handleCloseEditor}>
                  取消
                </Button>
                <Button className="flex-1" disabled={!canSubmit} onClick={() => void handleSubmit()}>
                  {isSubmitting
                    ? editorMode === 'create'
                      ? '添加中...'
                      : '保存中...'
                    : editorMode === 'create'
                      ? '添加并关闭'
                      : '保存并关闭'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

export default App

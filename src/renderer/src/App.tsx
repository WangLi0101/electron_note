import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Bell,
  CalendarClock,
  Check,
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
import { Checkbox } from './components/ui/checkbox'
import { Input } from './components/ui/input'
import { ScrollArea } from './components/ui/scroll-area'
import { Textarea } from './components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from './components/ui/dialog'
import {
  createMemo,
  memoDb,
  normalizeTags,
  setMemoStatus,
  touchMemoReminder,
  updateMemo
} from './lib/memo-db'
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
  const [showSettings, setShowSettings] = useState(false)

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
    <div className="min-h-screen bg-[#f2f2f7] text-[#1c1c1e] antialiased dark:bg-black dark:text-[#f5f5f7] selection:bg-black/10 dark:selection:bg-white/20">
      <div className="mx-auto h-screen w-full">
        <div className="flex h-full flex-col">
          <div className="space-y-4 border-b border-black/5 p-6 dark:border-white/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight">待办备忘录</h1>
                <p className="mt-1.5 text-[13px] text-[#8e8e93]">
                  默认仅展示待办，已办列表独立折叠展示。
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={alwaysOnTop ? 'default' : 'outline'}
                  onClick={() => handleAlwaysOnTopChange(!alwaysOnTop)}
                  className="rounded-full"
                >
                  <Pin className="size-3.5" />
                  {alwaysOnTop ? '已置顶' : '窗口置顶'}
                </Button>

                <div className="relative">
                  <Button
                    size="sm"
                    variant={showSettings ? 'secondary' : 'outline'}
                    onClick={() => setShowSettings((s) => !s)}
                    className="rounded-full px-2"
                  >
                    <SlidersHorizontal className="size-3.5" />
                  </Button>

                  {showSettings ? (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                      <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-[16px] border border-black/5 bg-white/95 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#1c1c1e]/95">
                        <div className="mb-2 flex items-center justify-between text-[13px] font-medium text-[#8e8e93]">
                          <span>效果与透明度</span>
                          <span className="text-[#1c1c1e] dark:text-white">
                            {Math.round(windowOpacity * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={55}
                          max={100}
                          value={Math.round(windowOpacity * 100)}
                          onChange={(event) =>
                            handleOpacityChange(Number(event.target.value) / 100)
                          }
                          className="mt-1 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-black/10 dark:bg-white/20 outline-none accent-[#1c1c1e] dark:accent-white"
                        />
                        <p className="mt-2.5 text-[11px] text-[#8e8e93]">
                          降低透明度使窗口透视背景，最低为 55%。
                        </p>
                      </div>
                    </>
                  ) : null}
                </div>

                <Button size="sm" onClick={handleOpenCreatePanel} className="rounded-full">
                  <Plus className="size-3.5" />
                  新建
                </Button>
              </div>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8e8e93]" />
              <Input
                className="pl-9 h-10 rounded-[12px] bg-black/5 border-transparent shadow-none focus-visible:bg-white dark:bg-white/10 dark:focus-visible:bg-[#1c1c1e] transition-colors"
                placeholder="搜索待办/已办"
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden px-6 pb-6">
            <ScrollArea className="h-full pr-4">
              <section className="mt-2">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[13px] font-medium text-[#8e8e93]">待办事项</h2>
                  <Badge
                    variant="secondary"
                    className="rounded-full px-2 py-0 text-[11px] font-medium bg-black/5 text-[#1c1c1e] dark:bg-white/10 dark:text-white border-transparent"
                  >
                    {todoMemos.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {todoMemos.map((memo) => {
                    const title = memo.title.trim() || '无标题待办'
                    return (
                      <div
                        key={memo.id}
                        className="group rounded-[16px] border border-black/10 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] dark:border-white/10 dark:bg-[#1c1c1e] dark:shadow-none dark:hover:bg-white/5"
                      >
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
                              <p className="truncate text-[15px] font-medium text-[#1c1c1e] dark:text-white">
                                {title}
                              </p>
                              {memo.pinned ? <Pin className="size-3.5 text-[#8e8e93]" /> : null}
                            </div>
                            {memo.content.trim() ? (
                              <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-[#8e8e93]">
                                {memo.content}
                              </p>
                            ) : null}
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-medium text-[#8e8e93]">
                              <span>更新：{formatDateTime(memo.updatedAt)}</span>
                              {memo.remindAt ? (
                                <span className="inline-flex items-center gap-1 rounded bg-black/5 px-1.5 py-0.5 dark:bg-white/10">
                                  <Bell className="size-3" />
                                  {formatDateTime(memo.remindAt)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 transition-opacity group-hover:opacity-100 rounded-full"
                            onClick={() => handleOpenEditPanel(memo)}
                          >
                            <Edit3 className="size-3.5" />
                            编辑
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  {todoMemos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-black/10 bg-black/5 p-8 text-sm text-[#8e8e93] dark:border-white/10 dark:bg-white/5">
                      <div className="mb-2 rounded-full bg-black/5 p-3 dark:bg-white/10">
                        <Check className="size-5" />
                      </div>
                      当前没有待办事项
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="mt-8 border-t border-black/5 pt-6 dark:border-white/10">
                <button
                  type="button"
                  className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#8e8e93] transition-colors hover:text-[#1c1c1e] dark:hover:text-white"
                  onClick={() => setShowDoneList((current) => !current)}
                >
                  {showDoneList ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                  已办事项
                  <Badge
                    variant="outline"
                    className="ml-1 rounded-full px-2 py-0 text-[11px] font-medium border-black/10 dark:border-white/20 text-[#8e8e93]"
                  >
                    {doneMemos.length}
                  </Badge>
                </button>

                {showDoneList ? (
                  <div className="space-y-3 opacity-60 transition-opacity hover:opacity-100">
                    {doneMemos.map((memo) => {
                      const title = memo.title.trim() || '无标题事项'
                      return (
                        <div
                          key={memo.id}
                          className="group rounded-[16px] border border-black/5 bg-white/60 p-4 transition-colors hover:bg-white/90 dark:border-white/10 dark:bg-[#1c1c1e]/60 dark:hover:bg-[#1c1c1e]/90"
                        >
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
                                <CircleCheckBig className="size-4 text-[#8e8e93]" />
                                <p className="truncate text-[15px] text-[#8e8e93] line-through decoration-1">
                                  {title}
                                </p>
                              </div>
                              <p className="mt-2 text-[11px] font-medium text-[#8e8e93]">
                                完成于：{formatDateTime(memo.updatedAt)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 transition-opacity group-hover:opacity-100 rounded-full"
                              onClick={() => handleOpenEditPanel(memo)}
                            >
                              <Edit3 className="size-3.5" />
                              编辑
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                    {doneMemos.length === 0 ? (
                      <div className="rounded-[16px] border border-dashed border-black/10 bg-transparent p-6 text-center text-[13px] text-[#8e8e93] dark:border-white/10">
                        还没有已办事项。
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            </ScrollArea>
          </div>
        </div>

        <Dialog
          open={isEditorOpen}
          onOpenChange={(open) => {
            if (!open) handleCloseEditor()
          }}
        >
          <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden flex flex-col gap-0 border-black/5 dark:border-white/10 dark:bg-[#1c1c1e]/90 bg-white/90 backdrop-blur-2xl">
            <DialogHeader className="border-b border-black/5 dark:border-white/10 p-6 pb-5">
              <DialogTitle className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
                <Sparkles className="size-4 text-[#8e8e93]" />
                {editorMode === 'create' ? '新建事项' : '编辑事项'}
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] text-[#8e8e93]">
                {editorMode === 'create'
                  ? '完成新增后会自动关闭操作面板。'
                  : '保存修改后会自动关闭操作面板。'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto px-6 py-5">
              <Input
                placeholder="标题（必填）"
                value={formDraft.title}
                onChange={(event) =>
                  setFormDraft((current) => ({ ...current, title: event.target.value }))
                }
              />

              <Textarea
                className="min-h-[140px]"
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
                <label className="space-y-1.5 text-[12px] font-medium text-[#8e8e93]">
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
                <label className="space-y-1.5 text-[12px] font-medium text-[#8e8e93]">
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

              <label className="flex items-center justify-between rounded-[12px] border border-black/5 bg-white px-4 py-3 text-[13px] font-medium text-[#1c1c1e] shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors dark:border-white/10 dark:bg-white/2 dark:text-white">
                置顶显示
                <Checkbox
                  checked={formDraft.pinned}
                  onCheckedChange={(checked) =>
                    setFormDraft((current) => ({ ...current, pinned: Boolean(checked) }))
                  }
                />
              </label>

              {editorMode === 'edit' && editingMemo ? (
                <div className="rounded-[12px] border border-black/5 bg-black/2 px-4 py-3 text-[12px] font-medium text-[#8e8e93] dark:border-white/10 dark:bg-white/2">
                  当前状态：{editingMemo.status === 'done' ? '已办' : '待办'}
                </div>
              ) : null}
            </div>

            <div className="mt-auto flex gap-3 border-t border-black/5 p-6 pt-5 dark:border-white/10 bg-black/2 dark:bg-white/5">
              <Button
                variant="secondary"
                className="flex-1 rounded-full text-[13px]"
                onClick={handleCloseEditor}
              >
                取消
              </Button>
              <Button
                className="flex-1 rounded-full text-[13px]"
                disabled={!canSubmit}
                onClick={() => void handleSubmit()}
              >
                {isSubmitting
                  ? editorMode === 'create'
                    ? '添加中...'
                    : '保存中...'
                  : editorMode === 'create'
                    ? '添加'
                    : '保存'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default App

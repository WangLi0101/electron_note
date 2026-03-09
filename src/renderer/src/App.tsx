import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Bell,
  CalendarClock,
  CircleCheckBig,
  Moon,
  Plus,
  Search,
  SunMedium,
  Trash2
} from 'lucide-react'

import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Checkbox } from './components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from './components/ui/dialog'
import { Input } from './components/ui/input'
import { ScrollArea } from './components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './components/ui/select'
import { Textarea } from './components/ui/textarea'
import {
  createMemo,
  destroyMemo,
  memoDb,
  moveMemoToTrash,
  normalizeTags,
  restoreMemo,
  touchMemoReminder,
  updateMemo
} from './lib/memo-db'
import type { MemoDraft, MemoEntity, MemoViewMode } from './types/memo'

const viewModeOptions: Array<{ label: string; value: MemoViewMode }> = [
  { label: '全部', value: 'all' },
  { label: '待办', value: 'todo' },
  { label: '已完成', value: 'done' },
  { label: '回收站', value: 'trash' }
]

type ThemeMode = 'light' | 'dark'

const THEME_STORAGE_KEY = 'memo-theme'

function resolveInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
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

function memoToDraft(memo: MemoEntity): MemoDraft {
  return {
    id: memo.id ?? 0,
    title: memo.title,
    content: memo.content,
    tags: memo.tags,
    status: memo.status,
    pinned: memo.pinned,
    dueAt: memo.dueAt,
    remindAt: memo.remindAt
  }
}

interface MemoEditorProps {
  memo: MemoEntity
  onRequestTrash: (id: number) => void
  onRequestDestroy: (id: number) => void
  onRestore: (id: number) => Promise<void>
}

function MemoEditor({
  memo,
  onRequestTrash,
  onRequestDestroy,
  onRestore
}: MemoEditorProps): React.JSX.Element {
  const [draft, setDraft] = useState<MemoDraft>(() => memoToDraft(memo))
  const [isDirty, setIsDirty] = useState(false)
  const [tagInput, setTagInput] = useState('')

  const memoId = memo.id ?? 0
  const isTrashMemo = Boolean(memo.deletedAt)

  useEffect(() => {
    if (!isDirty || memoId === 0) {
      return
    }

    let active = true
    const timer = window.setTimeout(() => {
      void (async () => {
        await updateMemo(memoId, {
          title: draft.title,
          content: draft.content,
          tags: normalizeTags(draft.tags),
          status: draft.status,
          pinned: draft.pinned,
          dueAt: draft.dueAt,
          remindAt: draft.remindAt
        })

        if (active) {
          setIsDirty(false)
        }
      })()
    }, 500)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [draft, isDirty, memoId])

  const updateDraft = (patch: Partial<MemoDraft>): void => {
    setDraft((current) => ({ ...current, ...patch }))
    setIsDirty(true)
  }

  const handleAddTag = (): void => {
    const nextTag = tagInput.trim()
    if (!nextTag || draft.tags.includes(nextTag)) {
      setTagInput('')
      return
    }

    updateDraft({ tags: [...draft.tags, nextTag] })
    setTagInput('')
  }

  const handleRemoveTag = (tag: string): void => {
    updateDraft({ tags: draft.tags.filter((item) => item !== tag) })
  }

  return (
    <Card className="flex flex-col h-full border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl shadow-lg rounded-2xl transition-all duration-500 animate-in fade-in zoom-in-95">
      <CardHeader className="space-y-4 border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge
            variant={isTrashMemo ? 'outline' : 'default'}
            className="transition-all bg-zinc-500 hover:bg-zinc-600 dark:bg-zinc-600 dark:hover:bg-zinc-700 text-white shadow-sm"
          >
            {isTrashMemo ? '回收站' : '编辑中'}
          </Badge>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium transition-opacity">
            {isDirty ? '自动保存中...' : '已保存于云端'}
          </span>
        </div>
        <Input
          className="text-lg md:text-xl font-bold bg-transparent border-transparent px-2 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus-visible:bg-white/50 dark:focus-visible:bg-slate-900/50 focus-visible:ring-1 focus-visible:ring-zinc-300 dark:focus-visible:ring-zinc-700 transition-all rounded-lg"
          value={draft.title}
          placeholder="起一个响亮的标题..."
          disabled={isTrashMemo}
          onChange={(event) => updateDraft({ title: event.target.value })}
        />

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {draft.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                #{tag}
                {!isTrashMemo ? (
                  <button
                    type="button"
                    className="cursor-pointer text-slate-300 hover:text-slate-100"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    ×
                  </button>
                ) : null}
              </Badge>
            ))}
          </div>
          {!isTrashMemo ? (
            <div className="flex gap-2 items-center">
              <Input
                className="h-8 text-xs bg-white/40 dark:bg-slate-800/40 rounded-full border-slate-200 dark:border-slate-700 focus-visible:ring-zinc-400"
                placeholder="添加标签后回车..."
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleAddTag()
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 rounded-full text-xs"
                onClick={handleAddTag}
              >
                添加
              </Button>
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 gap-4 overflow-y-auto pt-4 md:p-6 min-h-0">
        <Textarea
          className="min-h-[280px] flex-1 resize-none bg-transparent border-transparent text-sm md:text-base leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-600 focus-visible:bg-white/40 dark:focus-visible:bg-slate-900/40 focus-visible:ring-1 focus-visible:ring-zinc-300 dark:focus-visible:ring-zinc-700 transition-colors p-2 md:p-4 rounded-xl"
          value={draft.content}
          placeholder="在这里记录你的绝妙想法..."
          disabled={isTrashMemo}
          onChange={(event) => updateDraft({ content: event.target.value })}
        />

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 mt-auto shrink-0">
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              状态
            </p>
            <Select
              value={draft.status}
              disabled={isTrashMemo}
              onValueChange={(value) => updateDraft({ status: value as MemoDraft['status'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">待办</SelectItem>
                <SelectItem value="done">已完成</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              置顶
            </p>
            <label className="flex h-10 items-center justify-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 px-3 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors shadow-sm">
              <Checkbox
                checked={draft.pinned}
                disabled={isTrashMemo}
                onCheckedChange={(checked) => updateDraft({ pinned: Boolean(checked) })}
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                在列表顶部显示
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <CalendarClock className="size-3.5" />
              截止时间
            </p>
            <Input
              type="datetime-local"
              value={toDateTimeLocalValue(draft.dueAt)}
              disabled={isTrashMemo}
              onChange={(event) =>
                updateDraft({ dueAt: fromDateTimeLocalValue(event.target.value) })
              }
            />
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <Bell className="size-3.5" />
              提醒时间
            </p>
            <Input
              type="datetime-local"
              value={toDateTimeLocalValue(draft.remindAt)}
              disabled={isTrashMemo}
              onChange={(event) =>
                updateDraft({ remindAt: fromDateTimeLocalValue(event.target.value) })
              }
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-slate-200 dark:border-slate-800 pt-4 shrink-0">
          {isTrashMemo ? (
            <>
              <Button variant="secondary" onClick={() => void onRestore(memoId)}>
                恢复
              </Button>
              <Button variant="destructive" onClick={() => onRequestDestroy(memoId)}>
                彻底删除
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onRequestTrash(memoId)}>
              <Trash2 className="size-4" />
              移到回收站
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function App(): React.JSX.Element {
  const memos = useLiveQuery(() => memoDb.memos.toArray(), [], [])

  const [theme, setTheme] = useState<ThemeMode>(() => resolveInitialTheme())
  const [viewMode, setViewMode] = useState<MemoViewMode>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedMemoId, setSelectedMemoId] = useState<number | null>(null)
  const [deleteRequest, setDeleteRequest] = useState<{
    id: number
    mode: 'trash' | 'destroy'
  } | null>(null)

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
    const root = document.documentElement
    const isDarkTheme = theme === 'dark'

    root.classList.toggle('dark', isDarkTheme)
    root.style.colorScheme = isDarkTheme ? 'dark' : 'light'
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    // 渲染进程把当前提醒列表推送给主进程，让主进程进行精确定时调度。
    void window.api.reminder.sync(reminderItems)
  }, [reminderItems])

  useEffect(() => {
    // 接收主进程广播的触发事件，并落库 lastNotifiedAt 做去重。
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

  const filteredMemos = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    return memos
      .filter((memo) => {
        if (viewMode === 'trash') {
          if (memo.deletedAt === null) {
            return false
          }
        } else {
          if (memo.deletedAt !== null) {
            return false
          }

          if (viewMode === 'todo' && memo.status !== 'todo') {
            return false
          }

          if (viewMode === 'done' && memo.status !== 'done') {
            return false
          }
        }

        if (!keyword) {
          return true
        }

        const searchableText = `${memo.title} ${memo.content} ${memo.tags.join(' ')}`.toLowerCase()
        return searchableText.includes(keyword)
      })
      .sort((a, b) => {
        if (viewMode === 'trash') {
          return (b.deletedAt ?? 0) - (a.deletedAt ?? 0)
        }

        if (a.pinned !== b.pinned) {
          return a.pinned ? -1 : 1
        }

        return b.updatedAt - a.updatedAt
      })
  }, [memos, searchKeyword, viewMode])

  const selectedMemo = useMemo(() => {
    if (filteredMemos.length === 0) {
      return null
    }

    if (selectedMemoId) {
      const matchedMemo = filteredMemos.find((memo) => memo.id === selectedMemoId)
      if (matchedMemo) {
        return matchedMemo
      }
    }

    return filteredMemos[0]
  }, [filteredMemos, selectedMemoId])

  const handleCreateMemo = async (): Promise<void> => {
    const createdMemo = await createMemo()
    setViewMode('all')
    setSearchKeyword('')
    setSelectedMemoId(createdMemo.id ?? null)
  }

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteRequest) {
      return
    }

    if (deleteRequest.mode === 'trash') {
      await moveMemoToTrash(deleteRequest.id)
    } else {
      await destroyMemo(deleteRequest.id)
    }

    setDeleteRequest(null)
  }

  const handleRestoreMemo = async (id: number): Promise<void> => {
    await restoreMemo(id)
    setViewMode('all')
    setSelectedMemoId(id)
  }

  const handleToggleTheme = (): void => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }

  return (
    <div
      className={`relative isolate h-screen w-full overflow-hidden font-sans text-slate-800 transition-colors duration-500 bg-[#f8fafc] dark:bg-[#0c0c0e] ${theme === 'dark' ? 'dark' : ''}`}
    >
      <div className="pointer-events-none absolute left-1/3 top-0 z-0 h-80 w-80 -translate-x-1/2 rounded-full bg-zinc-400/20 blur-3xl dark:bg-zinc-500/15" />
      <div className="pointer-events-none absolute bottom-0 right-0 z-0 h-96 w-96 translate-x-1/3 rounded-full bg-slate-300/20 blur-3xl dark:bg-slate-500/10" />

      <div className="relative z-10 h-full w-full">
        <div className="grid h-full md:grid-cols-[320px_1fr]">
          <aside className="flex h-full flex-col border-b border-slate-200/50 dark:border-slate-800/50 p-5 md:border-b-0 md:border-r lg:p-6">
            <CardHeader className="space-y-3 p-0 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-xl bg-gradient-to-r from-zinc-500 to-slate-500 bg-clip-text text-transparent dark:from-zinc-400 dark:to-slate-400 font-bold tracking-tight pb-1">
                    备忘录
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                    本地优先 · 随时记录
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="切换主题"
                    onClick={handleToggleTheme}
                    className="rounded-full border border-slate-200/80 bg-white/70 backdrop-blur hover:bg-slate-100 dark:border-slate-700/80 dark:bg-slate-900/70 dark:hover:bg-slate-800/90"
                  >
                    {theme === 'dark' ? (
                      <SunMedium className="size-4" />
                    ) : (
                      <Moon className="size-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleCreateMemo()}
                    className="rounded-full shadow-md bg-zinc-600 hover:bg-zinc-700 dark:bg-zinc-500 dark:hover:bg-zinc-600 text-white transition-transform hover:scale-105 active:scale-95"
                  >
                    <Plus className="size-4" />
                    新建
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition-colors" />
                <Input
                  className="pl-9 rounded-full bg-white/50 border-slate-200/60 focus:bg-white dark:bg-slate-900/50 dark:border-slate-700/50 dark:focus:bg-slate-900 transition-all shadow-sm"
                  placeholder="搜索标题、内容、标签..."
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                />
              </div>
              <Select
                value={viewMode}
                onValueChange={(value) => setViewMode(value as MemoViewMode)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="筛选视图" />
                </SelectTrigger>
                <SelectContent>
                  {viewModeOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>

            <ScrollArea className="-mx-2 min-h-0 flex-1">
              <div className="space-y-2 px-2 pb-2">
                {filteredMemos.map((memo) => {
                  const isActive = memo.id === selectedMemo?.id
                  const title = memo.title.trim() || '无标题备忘录'
                  const summary = memo.content.trim().slice(0, 70) || '暂无内容'

                  return (
                    <button
                      key={memo.id}
                      type="button"
                      onClick={() => setSelectedMemoId(memo.id ?? null)}
                      className={`w-full rounded-2xl border p-3 text-left transition-all duration-300 ease-in-out hover:shadow-md ${
                        isActive
                          ? 'border-zinc-400/50 bg-zinc-50/80 dark:border-zinc-500/50 dark:bg-zinc-500/10 shadow-sm scale-[1.02]'
                          : 'border-slate-200/50 bg-white/40 hover:border-zinc-300/50 hover:bg-white/80 dark:border-slate-800/50 dark:bg-slate-900/30 dark:hover:border-slate-700 dark:hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`truncate text-sm font-semibold transition-colors ${isActive ? 'text-zinc-900 dark:text-zinc-200' : 'text-slate-700 dark:text-slate-200'}`}
                        >
                          {title}
                        </p>
                        {memo.pinned && viewMode !== 'trash' ? (
                          <Badge
                            variant="secondary"
                            className="bg-zinc-100 text-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300 shadow-sm"
                          >
                            置顶
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {summary}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>{formatDateTime(memo.updatedAt)}</span>
                        {memo.status === 'done' ? (
                          <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
                            <CircleCheckBig className="size-3" />
                            已完成
                          </span>
                        ) : null}
                      </div>
                    </button>
                  )
                })}
              </div>

              {filteredMemos.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300/80 dark:border-slate-700/80 bg-white/20 dark:bg-slate-800/20 p-8 text-center text-sm text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2 mt-4 transition-all">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-1">
                    <Search className="size-5 opacity-50" />
                  </div>
                  当前筛选下没有内容
                </div>
              ) : null}
            </ScrollArea>
          </aside>

          <main className="h-full overflow-hidden p-5 lg:p-6">
            {!selectedMemo ? (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300/80 dark:border-slate-700/50 bg-white/30 dark:bg-slate-900/20 text-center animate-in fade-in duration-700 zoom-in-95">
                <div className="bg-zinc-100 dark:bg-zinc-900/30 p-4 rounded-full mb-4 shadow-inner">
                  <Plus className="size-8 text-zinc-500 dark:text-zinc-400 opacity-80" />
                </div>
                <p className="text-xl font-bold bg-gradient-to-r from-slate-700 to-slate-500 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                  探索你的想法
                </p>
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 max-w-[200px]">
                  点击左侧列表查看或在左上角创建新备忘录。
                </p>
                <Button
                  className="mt-8 rounded-full px-6 shadow-md hover:shadow-lg transition-all dark:bg-zinc-600 dark:text-white dark:hover:bg-zinc-700"
                  onClick={() => void handleCreateMemo()}
                >
                  <Plus className="size-4 mr-1" />
                  开始记录
                </Button>
              </div>
            ) : (
              <MemoEditor
                key={selectedMemo.id}
                memo={selectedMemo}
                onRestore={handleRestoreMemo}
                onRequestTrash={(id) => setDeleteRequest({ id, mode: 'trash' })}
                onRequestDestroy={(id) => setDeleteRequest({ id, mode: 'destroy' })}
              />
            )}
          </main>
        </div>
      </div>

      <Dialog
        open={deleteRequest !== null}
        onOpenChange={(open) => setDeleteRequest(open ? deleteRequest : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deleteRequest?.mode === 'destroy' ? '确认彻底删除？' : '确认移到回收站？'}
            </DialogTitle>
            <DialogDescription>
              {deleteRequest?.mode === 'destroy'
                ? '该操作不可恢复，数据会从本地 IndexedDB 永久删除。'
                : '你可以在回收站中恢复该备忘录。'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteRequest(null)}>
              取消
            </Button>
            <Button
              variant={deleteRequest?.mode === 'destroy' ? 'destructive' : 'outline'}
              onClick={() => void handleDeleteConfirm()}
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App

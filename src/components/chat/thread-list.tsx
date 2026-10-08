"use client"

import { MapPinned, Plus, RotateCcw, Trash2 } from "lucide-react"

import type { ChatThread } from "@/lib/api"
import { cn } from "@/lib/utils"

type Props = {
  threads: ChatThread[]
  /** "error": lần tải gần nhất thất bại (khác với chưa có chuyến nào). */
  status: "loading" | "ready" | "error"
  onReload: () => void
  titles: Record<string, string>
  activeId: string | null
  onSelect: (threadId: string) => void
  onCreate: () => void
  onDelete: (threadId: string) => void
}

export function ThreadList({
  threads,
  status,
  onReload,
  titles,
  activeId,
  onSelect,
  onCreate,
  onDelete,
}: Props) {
  const groups = groupByDay(threads)

  return (
    <div className="flex h-full flex-col gap-4 px-3 pb-3">
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-lg shadow-black/20 transition-[filter,transform] outline-none hover:brightness-105 focus-visible:ring-[3px] focus-visible:ring-white/40 active:scale-[0.98]"
      >
        <Plus className="size-4" />
        Chuyến đi mới
      </button>

      <nav
        aria-label="Các chuyến đi"
        className="-mx-1 flex min-h-0 flex-1 [scrollbar-color:rgb(255_255_255/0.2)_transparent] flex-col gap-5 overflow-y-auto px-1"
      >
        {threads.length === 0 && status === "loading" && (
          <div className="grid gap-2 px-1 pt-1" aria-label="Đang tải">
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid gap-1.5 rounded-lg px-2.5 py-2">
                <span className="h-3.5 w-4/5 animate-pulse rounded bg-white/15" />
                <span className="h-3 w-1/4 animate-pulse rounded bg-white/10" />
              </div>
            ))}
          </div>
        )}

        {status === "error" && (
          <div
            role="alert"
            className="mx-1 grid gap-2 rounded-xl bg-white/8 px-3 py-2.5 text-[13px] ring-1 ring-white/15"
          >
            <span className="font-semibold text-white/90">
              Không tải được danh sách chuyến
            </span>
            <button
              type="button"
              onClick={onReload}
              className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-[13px] font-semibold text-sea-deep outline-none hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <RotateCcw className="size-3.5" />
              Thử lại
            </button>
          </div>
        )}

        {threads.length === 0 && status === "ready" && (
          <div className="mt-6 grid justify-items-center gap-2 px-4 text-center text-sm text-white/60">
            <MapPinned className="size-6 text-white/40" />
            Chưa có chuyến nào. Hỏi trợ lý một câu để bắt đầu.
          </div>
        )}

        {groups.map((group) => (
          <section key={group.label} className="grid gap-1">
            <h3 className="px-3 text-[11px] font-semibold tracking-[0.12em] text-white/45 uppercase">
              {group.label}
            </h3>
            {group.items.map((thread) => {
              const isActive = thread.thread_id === activeId
              const title = titles[thread.thread_id]
              return (
                <div
                  key={thread.thread_id}
                  className={cn(
                    "group relative flex items-center rounded-lg transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-white/40",
                    isActive ? "bg-white/12" : "hover:bg-white/6"
                  )}
                >
                  {isActive && (
                    <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-sea" />
                  )}
                  <button
                    type="button"
                    onClick={() => onSelect(thread.thread_id)}
                    aria-current={isActive ? "page" : undefined}
                    className="grid min-w-0 flex-1 gap-0.5 rounded-lg py-2 pr-1 pl-3.5 text-left outline-none"
                  >
                    <span
                      className={cn(
                        "truncate text-sm",
                        isActive ? "font-semibold text-white" : "text-white/85"
                      )}
                    >
                      {title ?? "Chuyến đi"}
                    </span>
                    <span className="text-[11px] text-white/45 tabular-nums">
                      {formatTime(thread.last_active_at)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(thread.thread_id)}
                    title="Xoá chuyến này"
                    className="mr-1.5 grid size-7 shrink-0 place-items-center rounded-md text-white/50 opacity-0 transition-opacity outline-none group-hover:opacity-100 hover:bg-white/10 hover:text-white focus-visible:opacity-100 max-md:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">Xoá chuyến này</span>
                  </button>
                </div>
              )
            })}
          </section>
        ))}
      </nav>
    </div>
  )
}

const DAY_MS = 24 * 60 * 60 * 1000

function groupByDay(threads: ChatThread[]) {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const today = startOfToday.getTime()

  const buckets = [
    { label: "Hôm nay", from: today },
    { label: "Hôm qua", from: today - DAY_MS },
    { label: "7 ngày qua", from: today - 7 * DAY_MS },
    { label: "Trước đó", from: -Infinity },
  ].map((b) => ({ ...b, items: [] as ChatThread[] }))

  for (const thread of threads) {
    const time = new Date(thread.last_active_at).getTime() || 0
    const bucket =
      buckets.find((b) => time >= b.from) ?? buckets[buckets.length - 1]
    bucket.items.push(thread)
  }
  return buckets.filter((b) => b.items.length > 0)
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const sameDay = date.toDateString() === new Date().toDateString()
  return sameDay
    ? date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
}

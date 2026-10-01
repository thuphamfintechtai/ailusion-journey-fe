"use client"

import { MessageSquare, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { ChatThread } from "@/lib/api"
import { cn } from "@/lib/utils"

type Props = {
  threads: ChatThread[]
  activeId: string | null
  onSelect: (threadId: string) => void
  onCreate: () => void
  onDelete: (threadId: string) => void
}

export function ThreadList({
  threads,
  activeId,
  onSelect,
  onCreate,
  onDelete,
}: Props) {
  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <Button
        onClick={onCreate}
        variant="outline"
        className="w-full justify-start gap-2"
      >
        <Plus className="size-4" />
        Hội thoại mới
      </Button>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {threads.length === 0 && (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            Chưa có hội thoại nào.
          </p>
        )}

        {threads.map((thread) => (
          <div
            key={thread.thread_id}
            className={cn(
              "group flex items-center gap-1 rounded-md",
              thread.thread_id === activeId ? "bg-accent" : "hover:bg-accent/50"
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(thread.thread_id)}
              className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm"
            >
              <MessageSquare className="size-4 shrink-0 opacity-60" />
              <span className="truncate">
                {formatTime(thread.last_active_at)}
              </span>
            </button>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              onClick={() => onDelete(thread.thread_id)}
              title="Xoá hội thoại"
            >
              <Trash2 className="size-3.5" />
              <span className="sr-only">Xoá hội thoại</span>
            </Button>
          </div>
        ))}
      </nav>
    </div>
  )
}

/** Backend chưa trả tiêu đề hội thoại, nên tạm hiển thị theo thời điểm dùng gần nhất. */
function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "Hội thoại"

  const today = new Date()
  const sameDay = date.toDateString() === today.toDateString()
  return sameDay
    ? date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
}

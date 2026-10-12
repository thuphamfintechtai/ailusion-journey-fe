"use client"

import * as React from "react"
import { ArrowUp, ClipboardList, Square } from "lucide-react"

import type { TripInfo, TripState } from "@/lib/api"
import type { TripForm } from "@/lib/itinerary"
import { cn } from "@/lib/utils"

import { TripFormSheet } from "@/components/itinerary/trip-form-sheet"

type Props = {
  onSend: (message: string) => void
  onStop: () => void
  busy: boolean
  /** Hội thoại đang mở, để form làm lại từ đầu khi đổi chuyến. */
  threadId: string | null
  /** Điền sẵn form từ cuộc trò chuyện; xem `TripFormSheet`. */
  tripPrefill: { key: string; load: () => Promise<TripState> } | null
  /** Form "Điền thông tin chuyến đi" đang mở. Trang chat giữ, để tự mở khi trợ lý báo. */
  formOpen: boolean
  onFormOpenChange: (open: boolean) => void
  /** Người dùng bấm "Lập lộ trình" trong form. */
  onPlan: (form: TripForm, info: TripInfo) => void
}

const MAX_HEIGHT_PX = 200

export function MessageInput({
  onSend,
  onStop,
  busy,
  threadId,
  tripPrefill,
  formOpen,
  onFormOpenChange,
  onPlan,
}: Props) {
  const [value, setValue] = React.useState("")
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Ô nhập cao dần theo nội dung, tới một mức thì tự cuộn.
  React.useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`
  }, [value])

  function submit() {
    const message = value.trim()
    if (!message || busy) return
    onSend(message)
    setValue("")
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter gửi, Shift+Enter xuống dòng. Bỏ qua khi đang gõ tiếng Việt bằng bộ gõ.
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div className="px-3 pt-2 pb-3 sm:px-6 sm:pb-5">
      <div
        className={cn(
          "mx-auto w-full max-w-3xl rounded-3xl border bg-card p-2 shadow-[0_12px_40px_-12px_rgb(10_79_85/0.35)] transition-[border-color,box-shadow]",
          "focus-within:border-sea/60 focus-within:ring-4 focus-within:ring-sea/10"
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Bạn muốn đi đâu, mấy ngày, đi cùng ai?"
          style={{ maxHeight: MAX_HEIGHT_PX }}
          className="block min-h-12 w-full resize-none bg-transparent px-4 pt-3 pb-1 text-base outline-none placeholder:text-muted-foreground/80 md:text-[15px]"
          aria-label="Nội dung tin nhắn"
        />
        <div className="flex items-center justify-between gap-2 pr-1 pl-1.5">
          <button
            type="button"
            onClick={() => onFormOpenChange(true)}
            disabled={busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 text-[13px] font-semibold text-foreground transition-colors outline-none hover:border-primary/40 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-50"
          >
            <ClipboardList className="size-4 text-primary" />
            <span className="max-[380px]:sr-only">
              Điền thông tin chuyến đi
            </span>
          </button>

          <p className="ml-auto hidden text-xs text-muted-foreground lg:block">
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans text-[10px]">
              Enter
            </kbd>{" "}
            gửi ·{" "}
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans text-[10px]">
              Shift + Enter
            </kbd>{" "}
            xuống dòng
          </p>
          {busy ? (
            <button
              type="button"
              onClick={onStop}
              title="Dừng"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background transition-opacity outline-none hover:opacity-90 focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
              <Square className="size-3 fill-current" />
              Dừng
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!value.trim()}
              title="Gửi (Enter)"
              className="grid size-10 place-items-center rounded-full bg-brand text-white shadow-md shadow-primary/30 transition-[transform,opacity] outline-none hover:scale-105 focus-visible:ring-[3px] focus-visible:ring-primary/40 disabled:scale-100 disabled:bg-muted disabled:bg-none disabled:text-muted-foreground disabled:shadow-none"
            >
              <ArrowUp className="size-5" />
              <span className="sr-only">Gửi</span>
            </button>
          )}
        </div>
      </div>

      <TripFormSheet
        key={threadId ?? "new"}
        prefill={tripPrefill}
        open={formOpen}
        onOpenChange={onFormOpenChange}
        onPlan={onPlan}
      />
    </div>
  )
}

"use client"

import * as React from "react"
import { ArrowUp, Square } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type Props = {
  onSend: (message: string) => void
  onStop: () => void
  busy: boolean
}

const MAX_HEIGHT_PX = 200

export function MessageInput({ onSend, onStop, busy }: Props) {
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
    <div className="border-t bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-end gap-2 p-4">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Đi Đà Lạt 3 ngày, 2 người lớn 1 bé, ngân sách 15tr…"
          className="max-h-[200px] min-h-10 resize-none"
          aria-label="Nội dung tin nhắn"
        />
        {busy ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={onStop}
            title="Dừng"
          >
            <Square className="size-4" />
            <span className="sr-only">Dừng</span>
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            onClick={submit}
            disabled={!value.trim()}
            title="Gửi (Enter)"
          >
            <ArrowUp className="size-4" />
            <span className="sr-only">Gửi</span>
          </Button>
        )}
      </div>
    </div>
  )
}

"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export type DisplayMessage = {
  role: "human" | "ai"
  content: string
  /** Đang nhận stream — hiện con trỏ nhấp nháy ở cuối. */
  pending?: boolean
}

export function MessageList({ messages }: { messages: DisplayMessage[] }) {
  const bottomRef = React.useRef<HTMLDivElement>(null)

  // Tự cuộn xuống khi có nội dung mới (kể cả từng mẩu stream).
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages])

  if (messages.length === 0) return <EmptyState />

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
      {messages.map((message, index) => (
        <Bubble key={index} message={message} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

function Bubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === "human"
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground"
        )}
      >
        {message.content}
        {message.pending && (
          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-foreground align-middle" />
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="text-lg font-medium">Lên kế hoạch cho chuyến đi</p>
      <p className="max-w-md text-sm text-muted-foreground">
        Cho biết điểm đến, số ngày, số người và ngân sách — trợ lý sẽ gợi ý lịch
        trình.
      </p>
    </div>
  )
}

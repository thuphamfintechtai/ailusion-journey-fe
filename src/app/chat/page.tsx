"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

import { MessageInput } from "@/components/chat/message-input"
import {
  MessageList,
  type DisplayMessage,
} from "@/components/chat/message-list"
import { ThreadList } from "@/components/chat/thread-list"
import { Button } from "@/components/ui/button"
import { chat, streamChat, type ChatThread } from "@/lib/api"
import { useAuth } from "@/lib/auth"

export default function ChatPage() {
  const { user, token, loading, logout } = useAuth()
  const router = useRouter()

  const [threads, setThreads] = React.useState<ChatThread[]>([])
  const [threadId, setThreadId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<DisplayMessage[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  // Huỷ stream đang chạy khi bấm Dừng hoặc chuyển hội thoại.
  const abortRef = React.useRef<AbortController | null>(null)

  React.useEffect(() => {
    if (!loading && !token) router.replace("/login")
  }, [loading, token, router])

  const refreshThreads = React.useCallback(async () => {
    if (!token) return
    try {
      const page = await chat.threads(token)
      setThreads(page.items)
    } catch {
      // Danh sách hội thoại hỏng không nên chặn việc chat.
    }
  }, [token])

  // Nạp danh sách hội thoại lần đầu. Token nằm ở localStorage nên chỉ lấy được ở client.
  React.useEffect(() => {
    if (!token) return
    let cancelled = false

    async function load(accessToken: string) {
      try {
        const page = await chat.threads(accessToken)
        if (!cancelled) setThreads(page.items)
      } catch {
        // như trên: không chặn việc chat
      }
    }

    void load(token)
    return () => {
      cancelled = true
    }
  }, [token])

  // Dọn stream khi rời trang.
  React.useEffect(() => () => abortRef.current?.abort(), [])

  async function openThread(id: string) {
    if (!token) return
    abortRef.current?.abort()
    setBusy(false)
    setError(null)
    setThreadId(id)
    try {
      const history = await chat.history(token, id)
      setMessages(
        history.messages
          .filter((m) => m.role === "human" || m.role === "ai")
          .map((m) => ({ role: m.role as "human" | "ai", content: m.content }))
      )
    } catch (err) {
      setMessages([])
      setError(err instanceof Error ? err.message : "Không tải được hội thoại")
    }
  }

  function newThread() {
    abortRef.current?.abort()
    setBusy(false)
    setError(null)
    setThreadId(null)
    setMessages([])
  }

  async function removeThread(id: string) {
    if (!token) return
    try {
      await chat.remove(token, id)
      if (id === threadId) newThread()
      await refreshThreads()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xoá được hội thoại")
    }
  }

  async function send(message: string) {
    if (!token) return

    const controller = new AbortController()
    abortRef.current = controller
    setError(null)
    setBusy(true)
    // Hiện ngay tin của người dùng + bong bóng rỗng để nhận stream.
    setMessages((prev) => [
      ...prev,
      { role: "human", content: message },
      { role: "ai", content: "", pending: true },
    ])

    let activeThread = threadId
    try {
      for await (const event of streamChat(
        token,
        message,
        threadId,
        controller.signal
      )) {
        if (event.type === "start") {
          activeThread = event.thread_id
          setThreadId(event.thread_id)
        } else if (event.type === "delta") {
          appendToLast(setMessages, event.text)
        } else if (event.type === "error") {
          setError(event.message)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gửi được tin nhắn")
    } finally {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, pending: false } : m
        )
      )
      setBusy(false)
      abortRef.current = null
      if (activeThread) void refreshThreads()
    }
  }

  if (loading || !token) {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground" />
    )
  }

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-64 shrink-0 border-r md:flex md:flex-col">
        <ThreadList
          threads={threads}
          activeId={threadId}
          onSelect={(id) => void openThread(id)}
          onCreate={newThread}
          onDelete={(id) => void removeThread(id)}
        />
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">Trợ lý du lịch</p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="md:hidden"
              onClick={newThread}
            >
              Mới
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void logout()}
              title="Đăng xuất"
            >
              <LogOut className="size-4" />
              <span className="sr-only">Đăng xuất</span>
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <MessageList messages={messages} />
        </div>

        {error && (
          <p
            role="alert"
            className="mx-auto w-full max-w-3xl bg-destructive/10 px-4 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <MessageInput
          onSend={(message) => void send(message)}
          onStop={() => abortRef.current?.abort()}
          busy={busy}
        />
      </main>
    </div>
  )
}

/** Nối một mẩu stream vào cuối tin nhắn đang nhận. */
function appendToLast(
  setMessages: React.Dispatch<React.SetStateAction<DisplayMessage[]>>,
  text: string
) {
  setMessages((prev) =>
    prev.map((m, i) =>
      i === prev.length - 1 ? { ...m, content: m.content + text } : m
    )
  )
}

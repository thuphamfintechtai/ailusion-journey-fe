"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, LogOut, Menu, Plus, X } from "lucide-react"

import { MessageInput } from "@/components/chat/message-input"
import {
  MessageList,
  type DisplayMessage,
} from "@/components/chat/message-list"
import { Brand } from "@/components/brand"
import { ThreadList } from "@/components/chat/thread-list"
import { Button } from "@/components/ui/button"
import { chat, streamChat, type ChatThread } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { peekPendingPrompt, takePendingPrompt } from "@/lib/pending-prompt"
import {
  forgetThreadTitle,
  getThreadTitles,
  saveThreadTitle,
} from "@/lib/thread-titles"
import { cn } from "@/lib/utils"

export default function ChatPage() {
  const { user, token, loading, logout, authorized } = useAuth()
  const router = useRouter()

  const [threads, setThreads] = React.useState<ChatThread[]>([])
  // Trạng thái tải danh sách: phân biệt "chưa có chuyến" với "tải không được".
  const [threadsStatus, setThreadsStatus] = React.useState<
    "loading" | "ready" | "error"
  >("loading")
  const [threadId, setThreadId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<DisplayMessage[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  // Đọc từ localStorage sau khi mount (server không có), cập nhật khi có hội thoại mới.
  const [titles, setTitles] = React.useState<Record<string, string>>({})

  // Huỷ stream đang chạy khi bấm Dừng hoặc chuyển hội thoại.
  const abortRef = React.useRef<AbortController | null>(null)
  // Hội thoại được mở gần nhất; bấm liền hai cái thì kết quả về sau của cái cũ bị bỏ.
  const openingRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!loading && !token) router.replace("/login")
  }, [loading, token, router])

  const refreshThreads = React.useCallback(async () => {
    if (!token) return
    try {
      const page = await authorized((t) => chat.threads(t))
      setThreads(page.items)
      setThreadsStatus("ready")
    } catch {
      // Danh sách hỏng không chặn việc chat; thanh bên hiện nút thử lại.
      setThreadsStatus("error")
    }
  }, [token, authorized])

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage chỉ đọc được ở client
    setTitles(getThreadTitles())
  }, [])

  // Nạp danh sách hội thoại lần đầu. Token nằm ở localStorage nên chỉ lấy được ở client.
  React.useEffect(() => {
    if (!token) return
    let cancelled = false

    async function load() {
      try {
        const page = await authorized((t) => chat.threads(t))
        if (cancelled) return
        setThreads(page.items)
        setThreadsStatus("ready")
      } catch {
        // như trên: không chặn việc chat
        if (!cancelled) setThreadsStatus("error")
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [token, authorized])

  // Câu hỏi soạn ở trang chủ: gửi luôn khi vào màn chat. Hẹn sang tick sau và chỉ lấy ra
  // khi thực sự gửi, để lần chạy effect thử của StrictMode không gửi hai lần hay huỷ mất.
  const sendPendingPrompt = React.useEffectEvent(() => {
    const prompt = takePendingPrompt()
    if (prompt) void send(prompt)
  })
  React.useEffect(() => {
    if (!token || !peekPendingPrompt()) return
    const timer = window.setTimeout(sendPendingPrompt, 0)
    return () => window.clearTimeout(timer)
  }, [token])

  // Esc đóng ngăn hội thoại trên mobile.
  React.useEffect(() => {
    if (!sidebarOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [sidebarOpen])

  // Dọn stream khi rời trang.
  React.useEffect(() => () => abortRef.current?.abort(), [])

  async function openThread(id: string) {
    if (!token) return
    abortRef.current?.abort()
    abortRef.current = null
    setBusy(false)
    setError(null)
    setThreadId(id)
    setSidebarOpen(false)
    openingRef.current = id
    try {
      const history = await authorized((t) => chat.history(t, id))
      if (openingRef.current !== id) return
      const loaded = history.messages
        .filter((m) => m.role === "human" || m.role === "ai")
        .map((m) => ({ role: m.role as "human" | "ai", content: m.content }))
      setMessages(loaded)
      // Hội thoại tạo trước khi có tiêu đề (hoặc ở máy khác): lấy câu hỏi đầu tiên làm tiêu đề.
      const first = loaded.find((m) => m.role === "human")
      if (first) {
        saveThreadTitle(id, first.content)
        setTitles(getThreadTitles())
      }
    } catch (err) {
      if (openingRef.current !== id) return
      setMessages([])
      setError(err instanceof Error ? err.message : "Không tải được hội thoại")
    }
  }

  function newThread() {
    abortRef.current?.abort()
    abortRef.current = null
    openingRef.current = null
    setSidebarOpen(false)
    setBusy(false)
    setError(null)
    setThreadId(null)
    setMessages([])
  }

  async function removeThread(id: string) {
    if (!token) return
    if (!window.confirm("Xoá hội thoại này? Không thể hoàn tác.")) return
    try {
      await authorized((t) => chat.remove(t, id))
      forgetThreadTitle(id)
      if (id === threadId) newThread()
      await refreshThreads()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xoá được hội thoại")
    }
  }

  /** `echo: false` khi gửi lại một câu đã có sẵn trên màn hình (nút "Hỏi lại"). */
  async function send(message: string, { echo = true } = {}) {
    if (!token) return

    const controller = new AbortController()
    abortRef.current = controller
    setError(null)
    setBusy(true)
    // Hiện ngay tin của người dùng + bong bóng rỗng để nhận stream.
    setMessages((prev) => [
      ...prev,
      ...(echo ? [{ role: "human" as const, content: message }] : []),
      { role: "ai", content: "", pending: true },
    ])

    let activeThread = threadId
    // Lỗi xảy ra trong lượt này; nếu chưa có chữ nào thì hiện thành thẻ lỗi trong hội thoại.
    let failure: string | null = null
    try {
      // Lỗi 401 chỉ lộ ra khi đọc sự kiện đầu tiên, nên mở stream và lấy sự kiện đầu
      // bên trong `authorized` để token hết hạn thì được đổi và mở lại.
      const stream = await authorized(async (accessToken) => {
        const events = streamChat(
          accessToken,
          message,
          threadId,
          controller.signal
        )
        return { events, first: await events.next() }
      })
      for (
        let step = stream.first;
        !step.done;
        step = await stream.events.next()
      ) {
        const event = step.value
        if (event.type === "start") {
          if (!activeThread) {
            saveThreadTitle(event.thread_id, message)
            setTitles(getThreadTitles())
          }
          activeThread = event.thread_id
          setThreadId(event.thread_id)
        } else if (event.type === "delta") {
          appendToLast(setMessages, event.text)
        } else if (event.type === "error") {
          failure = event.message
        }
      }
    } catch (err) {
      // Bấm Dừng giữa chừng làm reader.read() ném AbortError — không phải lỗi thật.
      if (!controller.signal.aborted)
        failure =
          err instanceof Error ? err.message : "Không gửi được tin nhắn."
    } finally {
      // Đã chuyển sang hội thoại khác thì màn hình không còn là của stream này nữa.
      if (abortRef.current === controller) {
        abortRef.current = null
        setBusy(false)
        const aborted = controller.signal.aborted
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last?.role === "ai" && !last.content) {
            // Bấm Dừng trước khi có chữ: bỏ bong bóng rỗng.
            if (aborted) return prev.slice(0, -1)
            // Stream kết thúc mà không có chữ nào (lỗi, hoặc kết nối đứt im lặng): báo
            // ngay trong hội thoại, kèm nút thử lại đúng câu hỏi này.
            return [
              ...prev.slice(0, -1),
              {
                role: "ai",
                content: "",
                error: {
                  message:
                    failure ??
                    "Kết nối bị ngắt trước khi có câu trả lời. Hãy thử lại.",
                  prompt: message,
                },
              },
            ]
          }
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, pending: false } : m
          )
        })
        // Đã có một phần câu trả lời rồi mới lỗi: giữ phần đó, báo lỗi ở dưới.
        if (failure && !aborted) setError(failure)
      }
      if (activeThread) void refreshThreads()
    }
  }

  /** Thử lại một câu hỏi: dọn thẻ lỗi ở cuối rồi gửi lại, không lặp lại tin của người dùng. */
  function retry(prompt: string) {
    setMessages((prev) =>
      prev[prev.length - 1]?.error ? prev.slice(0, -1) : prev
    )
    void send(prompt, { echo: false })
  }

  if (loading || !token) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <Loader2
          className="size-6 animate-spin text-muted-foreground"
          aria-label="Đang tải"
        />
      </main>
    )
  }

  const firstQuestion = messages.find((m) => m.role === "human")?.content
  const currentTitle =
    (threadId && titles[threadId]) || firstQuestion || "Chuyến đi mới"
  const turnCount = messages.filter((m) => m.role === "human").length

  return (
    <div className="flex h-dvh min-h-0 flex-1 bg-background">
      {/* Mobile: danh sách chuyến đi trượt ra từ trái. */}
      {sidebarOpen && (
        <div
          aria-hidden
          className="fixed inset-0 z-40 animate-in bg-black/50 backdrop-blur-[2px] fade-in md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col bg-sea-deep text-white transition-transform duration-200 md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 pt-5 pb-5">
          <Brand tone="light" />
          <button
            type="button"
            className="grid size-8 place-items-center rounded-md text-white/70 hover:bg-white/10 hover:text-white md:hidden"
            onClick={() => setSidebarOpen(false)}
            title="Đóng"
          >
            <X className="size-4" />
            <span className="sr-only">Đóng danh sách</span>
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <ThreadList
            threads={threads}
            status={threadsStatus}
            onReload={() => {
              setThreadsStatus("loading")
              void refreshThreads()
            }}
            titles={titles}
            activeId={threadId}
            onSelect={(id) => void openThread(id)}
            onCreate={newThread}
            onDelete={(id) => void removeThread(id)}
          />
        </div>
        <UserCard
          name={user?.full_name}
          email={user?.email}
          onLogout={() => void logout()}
        />
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-gradient-to-b from-accent/50 via-background to-muted/40">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border/60 bg-background/70 px-3 backdrop-blur-md sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
            title="Các chuyến đi"
          >
            <Menu />
            <span className="sr-only">Mở danh sách chuyến đi</span>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[15px] font-bold">
              {currentTitle}
            </p>
            <p
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
              aria-live="polite"
            >
              {busy ? (
                <>
                  <span className="flex gap-0.5" aria-hidden>
                    {[0, 120, 240].map((d) => (
                      <span
                        key={d}
                        className="size-1 animate-bounce rounded-full bg-primary"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
                  </span>
                  <span className="text-primary">
                    Trợ lý đang soạn câu trả lời…
                  </span>
                </>
              ) : turnCount > 0 ? (
                `${turnCount} câu hỏi · Ailusion trợ lý du lịch`
              ) : (
                "Hỏi gì cũng được về chuyến đi của bạn"
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={newThread}
            disabled={messages.length === 0}
          >
            <Plus />
            <span className="max-sm:sr-only">Chuyến mới</span>
          </Button>
        </header>

        <div data-scroll-container className="min-h-0 flex-1 overflow-y-auto">
          <MessageList
            messages={messages}
            userName={user?.full_name}
            busy={busy}
            onSuggest={(prompt) => void send(prompt)}
            onRetry={retry}
          />
        </div>

        {error && (
          <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
            <p
              role="alert"
              className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
            >
              {error}
            </p>
          </div>
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

function UserCard({
  name,
  email,
  onLogout,
}: {
  name?: string | null
  email?: string
  onLogout: () => void
}) {
  const label = name?.trim() || email || ""
  const initials =
    label
      .split(/\s+/)
      .slice(-2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("") || "?"
  return (
    <div className="m-3 flex items-center gap-3 rounded-xl bg-white/8 p-3">
      <div
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white"
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        {name && <p className="truncate text-sm font-semibold">{name}</p>}
        <p className="truncate text-xs text-white/60">{email}</p>
      </div>
      <button
        type="button"
        onClick={onLogout}
        title="Đăng xuất"
        className="grid size-8 place-items-center rounded-md text-white/60 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <LogOut className="size-4" />
        <span className="sr-only">Đăng xuất</span>
      </button>
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

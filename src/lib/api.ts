/**
 * Client cho backend (repo ailusion-journey-be).
 *
 * Trình duyệt gọi thẳng BE — BE đã mở CORS cho http://localhost:3000. Token lưu ở
 * localStorage (xem `auth.tsx`) và gắn vào header Authorization ở đây.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
const API = `${BASE_URL}/api/v1`

export type TokenPair = {
  access_token: string
  refresh_token: string
  token_type: "bearer"
  expires_in: number
}

export type User = {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  is_superuser: boolean
}

export type ChatReply = { thread_id: string; reply: string }
export type ChatMessage = { role: string; content: string }
export type ChatHistory = { thread_id: string; messages: ChatMessage[] }
export type ChatThread = { thread_id: string; last_active_at: string }
export type Page<T> = {
  items: T[]
  total: number
  limit: number
  offset: number
}

/** Lỗi có mã từ backend: `{"detail": ..., "code": ...}`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  token?: string | null
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, token } = options

  let response: Response
  try {
    response = await fetch(`${API}${path}`, {
      method,
      headers: buildHeaders(token, body !== undefined),
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    // fetch chỉ ném khi không nối được tới server (chưa chạy, sai cổng, CORS chặn).
    throw new ApiError(
      0,
      "Không kết nối được tới máy chủ. Backend đã chạy chưa?"
    )
  }

  if (!response.ok) throw await toApiError(response)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function buildHeaders(
  token: string | null | undefined,
  hasBody: boolean
): HeadersInit {
  const headers: Record<string, string> = {}
  if (hasBody) headers["Content-Type"] = "application/json"
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function toApiError(response: Response): Promise<ApiError> {
  let detail = `Lỗi ${response.status}`
  let code: string | undefined

  try {
    const body = await response.json()
    code = body.code
    // 422 của FastAPI: detail là mảng lỗi validate, không phải chuỗi.
    if (typeof body.detail === "string") detail = body.detail
    else if (Array.isArray(body.detail))
      detail = body.detail.map(validationMessage).join("; ")
  } catch {
    // body không phải JSON -> giữ thông báo mặc định
  }
  return new ApiError(response.status, detail, code)
}

function validationMessage(item: { loc?: unknown[]; msg?: string }): string {
  const field = Array.isArray(item.loc)
    ? item.loc[item.loc.length - 1]
    : undefined
  return field
    ? `${String(field)}: ${item.msg}`
    : (item.msg ?? "dữ liệu không hợp lệ")
}

// ---------------------------------------------------------------- auth
export const auth = {
  register: (email: string, password: string, fullName?: string) =>
    request<User>("/auth/register", {
      method: "POST",
      body: { email, password, full_name: fullName || null },
    }),

  login: (email: string, password: string) =>
    request<TokenPair>("/auth/login", {
      method: "POST",
      body: { email, password },
    }),

  /** Đổi refresh token lấy cặp token mới; refresh token cũ bị thu hồi (rotation). */
  refresh: (refreshToken: string) =>
    request<TokenPair>("/auth/refresh", {
      method: "POST",
      body: { refresh_token: refreshToken },
    }),

  logout: (refreshToken: string) =>
    request<void>("/auth/logout", {
      method: "POST",
      body: { refresh_token: refreshToken },
    }),

  me: (token: string) => request<User>("/users/me", { token }),

  /** Luôn trả 202 dù email có tồn tại hay không, để không lộ ai đã đăng ký. */
  forgotPassword: (email: string) =>
    request<{ detail: string }>("/auth/forgot-password", {
      method: "POST",
      body: { email },
    }),

  /** Token lấy từ link trong email. Sai, hết hạn hoặc đã dùng: 400 `invalid_reset_token`. */
  resetPassword: (token: string, newPassword: string) =>
    request<void>("/auth/reset-password", {
      method: "POST",
      body: { token, new_password: newPassword },
    }),
}

export const INVALID_RESET_TOKEN = "invalid_reset_token"

// ---------------------------------------------------------------- chat
export const chat = {
  send: (token: string, message: string, threadId?: string | null) =>
    request<ChatReply>("/chat", {
      method: "POST",
      token,
      body: { message, thread_id: threadId ?? null },
    }),

  threads: (token: string) =>
    request<Page<ChatThread>>("/chat/threads?limit=50", { token }),

  history: (token: string, threadId: string) =>
    request<ChatHistory>(`/chat/threads/${threadId}`, { token }),

  remove: (token: string, threadId: string) =>
    request<void>(`/chat/threads/${threadId}`, { method: "DELETE", token }),

  /** Mở stream SSE. Người gọi tự đọc body (xem `streamChat`). */
  stream: (
    token: string,
    message: string,
    threadId: string | null,
    signal: AbortSignal
  ) =>
    fetch(`${API}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message, thread_id: threadId }),
      signal,
    }),
}

/** Sự kiện backend đẩy về trong lúc trả lời. */
export type ChatEvent =
  | { type: "start"; thread_id: string }
  | { type: "delta"; text: string }
  | { type: "done"; thread_id: string }
  | { type: "error"; message: string }

/**
 * Đọc stream SSE và sinh ra từng sự kiện.
 *
 * Không dùng `EventSource` được vì nó chỉ gửi GET, không đặt được header
 * Authorization — nên phải tự tách khung `data: ...` từ body của fetch.
 */
export async function* streamChat(
  token: string,
  message: string,
  threadId: string | null,
  signal: AbortSignal
): AsyncGenerator<ChatEvent> {
  let response: Response
  try {
    response = await chat.stream(token, message, threadId, signal)
  } catch {
    // Người dùng bấm Dừng thì không phải lỗi.
    if (signal.aborted) return
    throw new ApiError(
      0,
      "Không kết nối được tới máy chủ. Backend đã chạy chưa?"
    )
  }

  if (!response.ok) throw await toApiError(response)
  if (!response.body) throw new ApiError(0, "Máy chủ không trả về nội dung")

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += value

      // Mỗi sự kiện SSE kết thúc bằng một dòng trống.
      let boundary = buffer.indexOf("\n\n")
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        const event = parseFrame(frame)
        if (event) yield event
        boundary = buffer.indexOf("\n\n")
      }
    }
  } finally {
    reader.cancel().catch(() => {})
  }
}

function parseFrame(frame: string): ChatEvent | null {
  const line = frame.split("\n").find((l) => l.startsWith("data:"))
  if (!line) return null
  try {
    return JSON.parse(line.slice(5).trim()) as ChatEvent
  } catch {
    return null
  }
}

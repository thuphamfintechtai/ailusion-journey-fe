/**
 * Client cho backend (repo ailusion-journey-be).
 *
 * Trình duyệt gọi thẳng BE — BE đã mở CORS cho http://localhost:3000. Token lưu ở
 * localStorage (xem `auth.tsx`) và gắn vào header Authorization ở đây.
 */

import type { ItineraryResult, TripForm } from "@/lib/itinerary"

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
export type ChatMessage = {
  role: string
  content: string
  /** Lộ trình lập trong cuộc trò chuyện, lưu nguyên để mở lại vẫn hiện đầy đủ. */
  plan?: { form: TripForm; result: ItineraryResult } | null
}
export type ChatHistory = { thread_id: string; messages: ChatMessage[] }
export type ChatThread = {
  thread_id: string
  /** Câu hỏi đầu tiên (rút gọn), người dùng đổi tên được. */
  title: string
  created_at: string
  last_active_at: string
}
/**
 * Thông tin chuyến đi đã nhắc trong cuộc trò chuyện, để điền sẵn form ở trang chat.
 * `null` hoặc `[]` = chưa nói tới. Giá trị lựa chọn trùng với id của form.
 */
export type TripInfo = {
  persona: string | null
  destination: string | null
  start_date: string | null
  days: number | null
  adults: number | null
  children: number | null
  seniors: number | null
  /** Đi cùng ai (solo | couple | friends | colleagues | family), dùng thẳng cho form lập lộ trình. */
  group_type: string | null
  /** Tổng cả đoàn, triệu đồng. */
  budget_million: number | null
  budget_hard: boolean | null
  access: string[]
  interests: string[]
  transport: string | null
  pace: string | null
}
/**
 * Form chuyến đi của một hội thoại, trợ lý tự điền dần khi người dùng kể. `missing` là các
 * mục bắt buộc còn trống; `open_form` bật đúng lượt form vừa đủ và người dùng muốn lập
 * lộ trình — giao diện mở form cho họ xác nhận.
 */
export type TripState = {
  info: TripInfo
  missing: { field: string; label: string }[]
  wants_plan: boolean
  open_form: boolean
}
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
      "Không kết nối được tới máy chủ. Kiểm tra mạng rồi bấm Thử lại nhé."
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

  /** `query`: tìm trong tiêu đề và nội dung tin nhắn. */
  threads: (token: string, query?: string) =>
    request<Page<ChatThread>>(
      `/chat/threads?limit=50${query?.trim() ? `&q=${encodeURIComponent(query.trim())}` : ""}`,
      { token }
    ),

  rename: (token: string, threadId: string, title: string) =>
    request<ChatThread>(`/chat/threads/${threadId}`, {
      method: "PATCH",
      token,
      body: { title },
    }),

  history: (token: string, threadId: string) =>
    request<ChatHistory>(`/chat/threads/${threadId}`, { token }),

  /** Form chuyến đi trợ lý đã điền từ cuộc trò chuyện, kèm các mục bắt buộc còn thiếu. */
  tripInfo: (token: string, threadId: string) =>
    request<TripState>(`/chat/threads/${threadId}/trip-info`, { token }),

  /**
   * Bấm "Lập lộ trình" trong form của trang chat: lưu bản form đã xác nhận, lập lộ trình
   * (theo dõi tiến độ bằng `streamPlanEvents` với `planThreadId`), rồi lộ trình dạng chữ
   * được lưu vào cuộc trò chuyện. Mất 20–60 giây. Chưa có hội thoại (`threadId` null) thì BE
   * tạo hội thoại mới, mã trả về ở `thread_id`.
   */
  plan: (
    token: string,
    threadId: string | null,
    form: TripForm,
    planThreadId: string,
    trip: TripInfo
  ) =>
    request<ChatPlanReply>(
      threadId ? `/chat/threads/${threadId}/plan` : "/chat/plan",
      {
        method: "POST",
        token,
        body: { form, plan_thread_id: planThreadId, trip },
      }
    ),

  /** Người dùng xác nhận form (bấm Lập lộ trình): các lượt chat sau dùng đúng bản này. */
  confirmTrip: (token: string, threadId: string, info: TripInfo) =>
    request<TripState>(`/chat/threads/${threadId}/trip-info`, {
      method: "PUT",
      token,
      body: info,
    }),

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

/** Lộ trình lập trong cuộc trò chuyện, kèm hai tin nhắn đã lưu vào hội thoại. */
export type ChatPlanReply = {
  /** Hội thoại chứa lộ trình — mới tạo nếu lập lộ trình từ khung chat trống. */
  thread_id: string
  /** `status` "need_info" = còn câu hỏi, chưa có gì được lưu vào hội thoại. */
  plan: ItineraryResult
  /** Form đã xác nhận, viết thành tin nhắn của người dùng. */
  request_text: string
  /** Lộ trình dạng markdown, tin nhắn của trợ lý. */
  reply: string
}

/** Sự kiện backend đẩy về trong lúc trả lời. */
export type ChatEvent =
  | { type: "start"; thread_id: string }
  | { type: "delta"; text: string }
  | ({ type: "trip" } & TripState)
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
      "Không kết nối được tới máy chủ. Kiểm tra mạng rồi bấm Thử lại nhé."
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

// ---------------------------------------------------------------- plan
/** Một bước của pipeline lập lộ trình, đẩy qua `GET /plan/{id}/events`. */
export type PlanEvent = {
  id: string
  /** Giây kể từ epoch, dạng chuỗi ("1791433249.123"). */
  ts?: string
  node: string
  kind: string
  text: string
  data: Record<string, unknown>
}

export const plan = {
  /** Lập lộ trình từ form (chỉ gửi ô đã điền). Mất 20–60 giây; tiến độ: `streamPlanEvents`. */
  create: (token: string, form: TripForm, threadId: string) =>
    request<ItineraryResult>("/plan", {
      method: "POST",
      token,
      body: { ...form, thread_id: threadId },
    }),

  events: (token: string, threadId: string, signal: AbortSignal) =>
    fetch(`${API}/plan/${threadId}/events`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    }),
}

// ---------------------------------------------------------------- places
/** Chi tiết một địa điểm (Google / SerpApi). Mọi trường có thể thiếu. */
export type PlaceReview = {
  rating?: number | null
  date?: string | null
  text?: string | null
  images?: string[] | null
}

export type PlaceDetail = {
  place_id?: string
  name?: string | null
  category?: string | null
  address?: string | null
  phone?: string | null
  website?: string | null
  maps_url?: string | null
  lat?: number | null
  lng?: number | null
  rating?: number | null
  reviews_count?: number | null
  price?: string | number | null
  /** `{thứ: giờ}` hoặc danh sách dòng, tuỳ nguồn. */
  hours?: unknown
  description?: string | null
  /** Tiện ích / đặc điểm; nguồn có thể trả mảng hoặc object nhóm. */
  attributes?: unknown
  images?: string[] | null
  reviews?: PlaceReview[] | null
}

export const places = {
  /** `reviewPhotos`: lấy kèm ảnh trong đánh giá (gọi thêm Google, chậm hơn). */
  get: (
    token: string,
    placeId: string,
    destination?: string | null,
    { reviewPhotos = false }: { reviewPhotos?: boolean } = {}
  ) => {
    const query = new URLSearchParams()
    if (destination) query.set("destination", destination)
    if (reviewPhotos) query.set("review_photos", "true")
    const qs = query.toString()
    return request<PlaceDetail>(
      `/places/${encodeURIComponent(placeId)}${qs ? `?${qs}` : ""}`,
      { token }
    )
  },
}

/** Mã lộ trình do trình duyệt tạo, để mở stream tiến độ ngay khi vừa gửi form. */
export function newPlanThreadId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return `plan-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`
}

/**
 * Đọc stream tiến độ của một lần lập lộ trình.
 *
 * Backend trả 404 cho tới khi `POST /plan` với mã này bắt đầu chạy, nên thử lại vài lần.
 * Stream tự đóng sau sự kiện kết thúc lượt (node "turn", kind "done" | "error").
 */
export async function* streamPlanEvents(
  token: string,
  threadId: string,
  signal: AbortSignal
): AsyncGenerator<PlanEvent> {
  let response: Response | null = null
  for (let attempt = 0; attempt < 10 && !signal.aborted; attempt++) {
    try {
      response = await plan.events(token, threadId, signal)
    } catch {
      return // mất kết nối hoặc đã huỷ: tiến độ chỉ là phần phụ, không báo lỗi
    }
    if (response.status !== 404) break
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  if (!response?.ok || !response.body) return

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ""
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += value
      let boundary = buffer.indexOf("\n\n")
      while (boundary !== -1) {
        const event = parsePlanFrame(buffer.slice(0, boundary))
        buffer = buffer.slice(boundary + 2)
        if (event) yield event
        boundary = buffer.indexOf("\n\n")
      }
    }
  } catch {
    // huỷ giữa chừng
  } finally {
    reader.cancel().catch(() => {})
  }
}

function parsePlanFrame(frame: string): PlanEvent | null {
  let id = ""
  let data = ""
  for (const line of frame.split("\n")) {
    if (line.startsWith("id:")) id = line.slice(3).trim()
    else if (line.startsWith("data:")) data += line.slice(5).trim()
  }
  if (!data) return null
  try {
    const event = JSON.parse(data) as Omit<PlanEvent, "id">
    return { ...event, id }
  } catch {
    return null
  }
}

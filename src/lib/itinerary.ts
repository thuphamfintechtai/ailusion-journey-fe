/**
 * Form và kết quả của pipeline lập lộ trình (LLM service `ailusion.itinerary`, bước 1–17).
 * Tên trường đúng tên biến trên trang thiết kế "Pipeline lập lộ trình".
 */

export type Purpose =
  "relax" | "food" | "culture" | "fun" | "adventure" | "shopping"
export type GroupType = "solo" | "couple" | "friends" | "colleagues" | "family"
export type Priority = "saving" | "comfort" | "leisure" | "short_time"
export type SpendStyle = "normal" | "unlimited" | "luxury_within_budget"
export type BudgetUnit = "group_trip" | "person_trip" | "person_day"
export type TravelMode = "motorbike" | "car" | "bus" | "taxi"
export type Walking = "M1" | "M2" | "M3" | "M4" | "M5"

export type BusySlot = {
  day: number
  busy_start: string
  busy_end: string | null
  one_person?: boolean
}

/** Bước 1 — form gửi đi. Ô để trống thì không gửi, để bước 2 đọc lời nhắn hoặc bước 4 hỏi. */
export type TripForm = {
  destination: string
  start_date: string
  end_date: string
  group_size: number
  budget?: number | null
  budget_unit?: BudgetUnit
  stay_booked?: string | null
  prepaid_tickets?: number
  travel_mode?: TravelMode | null
  message?: string
  group_type?: GroupType | null
  kids_under_6?: number
  kids_6_12?: number
  seniors_65?: number
  wheelchair_users?: number
  required_needs?: string[]
  arrival_time?: string | null
  departure_time?: string | null
  checkin_close_time?: string | null
  wake_time?: string | null
  night_return_time?: string | null
  busy_slots?: BusySlot[]
  night_out?: boolean
  purposes?: Purpose[]
  interests?: string
  walking_level?: Walking | null
  priority?: Priority | null
  spend_style?: SpendStyle
}

export type ItineraryItem = {
  type: "start" | "visit" | "meal" | "back"
  start: string
  end: string
  name: string
  place_id: string | null
  category: string | null
  lat: number | null
  lng: number | null
  price: number | null
  price_by: string | null
  travel_min: number
  wait_min: number
  rating: number | null
  rating_floor: number | null
  reviews: number
  stay_by: string | null
  matches_purpose: boolean | null
}

export type ItineraryDay = {
  day: number
  date: string
  weekday: string
  plan_id: string
  status: "ok" | "risky" | "warn" | "fail"
  issues: string[]
  unchecked: string[]
  beaten_by: string | null
  metrics: Record<string, number | null>
  items: ItineraryItem[]
  weather: string | null
  maps_url: string | null
}

export type ItineraryOption = {
  id: string
  name: string
  better_at: string[]
  explanation: string
  total_cost: number | null
  /** Chỗ trong phương án đang dùng giá ước (chưa có giá thật). */
  estimated_prices?: string[]
  days: ItineraryDay[]
}

export type ItineraryQuestion = {
  id: string
  text: string
  choices: { label: string; set: Partial<TripForm> }[]
}

export type ItineraryResult = {
  thread_id: string
  status: "ok" | "need_info"
  destination: string
  start_date: string
  days: number
  questions: ItineraryQuestion[]
  profile: {
    group: string
    group_name: string
    rule: string
    purposes: string[]
    needs_care: boolean
    required_needs: string[]
    nice_to_have_needs: string[]
    daily_budget: number | null
    trip_budget: number | null
    days: {
      day: number
      day_start: string
      day_end: string
      free_minutes: number
      blocked_slots: string[]
      meal_only_slots: string[]
    }[]
  } | null
  stay: {
    name: string
    price_per_night: number | null
    total: number | null
    rating: number | null
    lat: number | null
    lng: number | null
    booked: boolean
  } | null
  options: ItineraryOption[]
  chosen: string | null
  why: string
  warnings: { id: string; decision: string }[]
  ask_user: {
    over: number
    spend_style: SpendStyle
    cheaper_first: boolean
    cheaper_days: string[]
  } | null
  guesses: string[]
  understood: { field: string; value: string; quote: string }[]
  notes: string[]
  festivals: string[]
  stats: {
    llm_calls: number
    tool_calls: number
    tool_errors: number
    tokens_in: number
    tokens_out: number
    cost_usd: number | null
    seconds: number
  }
}

/**
 * Kết quả đúng dạng pipeline hiện tại. Hội thoại lập trước khi đổi pipeline lưu lộ trình theo
 * dạng cũ (`options` là object theo phương án "canbang"…, không có `status`): không dựng khung
 * kết quả từ đó được, chỉ hiện bản chữ đã lưu cùng tin nhắn.
 */
export function isItineraryResult(value: unknown): value is ItineraryResult {
  const r = value as Partial<ItineraryResult> | null
  return (
    !!r &&
    typeof r.status === "string" &&
    Array.isArray(r.options) &&
    Array.isArray(r.questions)
  )
}

// ---------------------------------------------------------------- nhãn

export const PURPOSES: { id: Purpose; label: string }[] = [
  { id: "relax", label: "Nghỉ dưỡng" },
  { id: "food", label: "Ẩm thực" },
  { id: "culture", label: "Khám phá, văn hoá" },
  { id: "fun", label: "Vui chơi, sự kiện" },
  { id: "adventure", label: "Phiêu lưu" },
  { id: "shopping", label: "Mua sắm" },
]

export const GROUP_TYPES: { id: GroupType; label: string }[] = [
  { id: "solo", label: "Một mình" },
  { id: "couple", label: "Cặp đôi" },
  { id: "friends", label: "Bạn bè" },
  { id: "colleagues", label: "Đồng nghiệp" },
  { id: "family", label: "Gia đình" },
]

export const PRIORITIES: { id: Priority; label: string; note: string }[] = [
  { id: "saving", label: "Tiết kiệm", note: "Tiền thấp trước" },
  { id: "comfort", label: "Đỡ mệt", note: "Ít ngồi xe, ít chỗ" },
  { id: "leisure", label: "Thong thả", note: "Ít chỗ, đúng ý, chất lượng" },
  {
    id: "short_time",
    label: "Ít thời gian",
    note: "Chỗ nổi tiếng, ít ngồi xe",
  },
]

export const SPEND_STYLES: { id: SpendStyle; label: string }[] = [
  { id: "normal", label: "Bình thường" },
  { id: "luxury_within_budget", label: "Sang, không vượt ngân sách" },
  { id: "unlimited", label: "Không giới hạn" },
]

export const BUDGET_UNITS: { id: BudgetUnit; label: string }[] = [
  { id: "group_trip", label: "Cả đoàn, cả chuyến" },
  { id: "person_trip", label: "Mỗi người, cả chuyến" },
  { id: "person_day", label: "Mỗi người, mỗi ngày" },
]

export const WALKING: { id: Walking; label: string }[] = [
  { id: "M1", label: "Dạo 1–2 tiếng" },
  { id: "M2", label: "3 tiếng, có dốc" },
  { id: "M3", label: "4–5 tiếng leo dốc" },
  { id: "M4", label: "Cả ngày" },
  { id: "M5", label: "Nhiều ngày" },
]

export const TRAVEL_MODES: { id: TravelMode; label: string }[] = [
  { id: "taxi", label: "Grab, taxi" },
  { id: "motorbike", label: "Xe máy" },
  { id: "car", label: "Ô tô tự lái" },
  { id: "bus", label: "Xe buýt, đi bộ" },
]

/** Mã nhu cầu đúng mã của MCP (`_nhu_cau.NHU_CAU`). */
export const NEEDS: { id: string; label: string }[] = [
  { id: "vegetarian", label: "Có món chay" },
  { id: "vegan", label: "Thuần chay" },
  { id: "wheelchair", label: "Lối xe lăn" },
  { id: "high_chair", label: "Ghế cao cho bé" },
  { id: "car_parking", label: "Chỗ đỗ ô tô" },
  { id: "kids", label: "Hợp trẻ em" },
]

export const ARRIVAL_BUCKETS = [
  { id: "morning", label: "Sáng" },
  { id: "afternoon", label: "Chiều" },
  { id: "evening", label: "Tối" },
]

export function money(v: number | null | undefined): string {
  return v == null
    ? "chưa có giá"
    : `${Math.round(v).toLocaleString("vi-VN")} đ`
}

export function trieu(v: number | null | undefined): string {
  if (v == null) return "—"
  return `${(v / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`
}

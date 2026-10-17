/**
 * Form và kết quả của pipeline lập lộ trình (LLM service `ailusion.itinerary`, bước 1–17).
 * Tên trường đúng tên biến trên trang thiết kế "Pipeline lập lộ trình".
 */

export type Purpose =
  "relax" | "food" | "culture" | "fun" | "adventure" | "shopping"
export type GroupType = "solo" | "couple" | "friends" | "colleagues" | "family"
export type Priority =
  "saving" | "comfort" | "leisure" | "short_time" | "many_places"
export type SpendStyle = "normal" | "unlimited" | "luxury_within_budget"
export type BudgetUnit = "group_trip" | "person_trip" | "person_day"
/** Nghỉ trưa ở đâu (ngày bắt đầu sớm, kéo tới chiều tối). */
export type Nap = "auto" | "stay" | "cafe" | "hotel" | "none"
export type TravelMode = "motorbike" | "car" | "bus" | "taxi"
export type Walking = "M1" | "M2" | "M3" | "M4" | "M5"

/** Giờ muốn tới chỗ user chọn: "HH:MM" hoặc một buổi. */
export type MustTime = "morning" | "afternoon" | "evening" | (string & {})

/** Địa điểm user chỉ định: lộ trình phải có, đúng ngày / giờ nếu có. */
export type MustVisit = {
  name: string
  day: number | null
  time: MustTime | null
}

export const MUST_BUCKETS: { id: MustTime; label: string }[] = [
  { id: "morning", label: "Buổi sáng" },
  { id: "afternoon", label: "Buổi chiều" },
  { id: "evening", label: "Buổi tối" },
]

/** "lúc 19:00" | "buổi tối" */
export function mustTimeText(time: MustTime | null | undefined): string | null {
  if (!time) return null
  const bucket = MUST_BUCKETS.find((b) => b.id === time)
  return bucket ? bucket.label.toLowerCase() : `lúc ${time}`
}

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
  /** Mức dưới khi user chọn khoảng ngân sách ở câu hỏi lại ("3–6 triệu", "trên 10 triệu"):
   * ngân sách là khoảng budget_min–budget (budget trống = không trần). */
  budget_min?: number | null
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
  nap?: Nap
  purposes?: Purpose[]
  interests?: string
  walking_level?: Walking | null
  must_visits?: MustVisit[]
  /** Nhu cầu bắt buộc gõ tự do (VD "không ăn cay"); máy đổi ra mã lọc được, phần còn lại làm lưu ý. */
  needs_note?: string
  priority?: Priority | null
  spend_style?: SpendStyle
}

export type ItineraryItem = {
  /** "busy": lịch bận user nhập, bước chạy thử tự chèn vào lịch ngày (giờ user nhập).
   *  "depart": ngày cuối bận xong sau giờ phải rời chỗ ở — đi thẳng từ chỗ bận ra bến (thay "back"). */
  type: "start" | "visit" | "meal" | "rest" | "busy" | "back" | "depart"
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
  /** Ảnh địa điểm (Google / SerpApi). Lộ trình lưu từ bản cũ không có. */
  image?: string | null
  /** 1–2 câu giới thiệu địa điểm. */
  summary?: string | null
  /** Tối đa 3 lý do chọn điểm này. */
  why?: string[]
  /** User tự chọn chỗ này trong form ("Địa điểm muốn đi"). */
  must?: boolean
  /** Thứ user nhắc mà chỗ này đáp ứng (VD "bún bò"): hiện nhãn "Theo yêu cầu". */
  wanted?: string | null
  must_time?: MustTime | null
  /** Chặng từ điểm trước tới điểm này: phương tiện, quãng đường, tiền (VND, cả đoàn). */
  travel_mode?: TravelMode | null
  travel_km?: number | null
  travel_cost?: number | null
  /** Khoảng tiền ước (VND, cả đoàn); thiếu thì dùng `travel_cost` / `price`. */
  travel_cost_min?: number | null
  travel_cost_max?: number | null
  price_min?: number | null
  price_max?: number | null
  /** Cùng chặng này nếu đi bằng phương tiện khác (phút). Lộ trình cũ không có. */
  travel_alt?: TravelAlt[] | null
  /** Giá mỗi người (khoảng Google ghi / giá ước); `price_pp_max` null = "Từ …". */
  price_pp_min?: number | null
  price_pp_max?: number | null
  /** Giải thích giá; chợ / mua sắm: không ước tiền mua sắm. */
  price_note?: string | null
}

/** Phương tiện để so thời gian đi; không có xe buýt / phương tiện công cộng. */
export type AltMode = "motorbike" | "car" | "taxi" | "walk"
export type TravelAlt = { mode: AltMode; minutes: number }

export type WeatherIcon = "sun" | "cloud" | "rain" | "storm" | "fog"

/** Thời tiết một buổi trong ngày. */
export type DaySession = {
  part: "morning" | "afternoon" | "evening"
  label: string
  condition: string
  rain_chance: number | null
  icon: WeatherIcon
}

/** Tiền theo khoản (VND, cả đoàn). */
export type CostSplit = {
  stay: number
  tickets: number
  food: number
  transport: number
  /** Thuê xe tự lái (xe máy / ô tô), số giữa. */
  rental?: number
  total: number
}

/** Khoản phát sinh có thể gặp (gửi xe, tip, phụ thu…), ước theo khoảng. */
export type ExtraItem = {
  label: string
  min: number
  max: number
  reason: string
}

/** Tổng ước theo khoảng "từ–đến" kèm phát sinh; lộ trình lưu từ bản cũ không có. */
export type CostRange = {
  extras?: number
  total_min?: number
  total_max?: number
  extra_items?: ExtraItem[]
}

export type DayCost = CostSplit &
  CostRange & {
    rental_min?: number
    rental_max?: number
    /** VD "Thuê 2 xe máy × 1 ngày (100.000–150.000 đ/xe/ngày); có xe riêng thì bỏ khoản này". */
    rental_note?: string | null
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
  /** Đường xe chạy thật cả ngày (polyline mã hoá kiểu Google, nối tiếp nhau); trống = nối thẳng. */
  route_paths?: string[]
  route_precision?: number
  /** Một dòng về phạm vi địa lý của ngày. */
  area_note?: string | null
  /** Bữa không xếp / tuỳ chọn và lý do (VD bắt đầu 10:00 nên bữa sáng tuỳ chọn). */
  meal_notes?: string[]
  /** Đoàn có trẻ em: chỗ trong ngày cần lưu ý vì có trẻ và nên làm gì. */
  kid_notes?: string[]
  /** Ngày âm lịch, VD "10/9". */
  lunar?: string | null
  holiday?: string | null
  crowd?: "low" | "medium" | "high" | null
  crowd_note?: string | null
  temp_min?: number | null
  temp_max?: number | null
  sessions?: DaySession[]
  /** Chi phí của riêng ngày này. */
  cost?: DayCost
  /** Tổng phút ngồi xe cả ngày nếu đi bằng phương tiện khác. */
  ride_alt?: TravelAlt[] | null
}

export type ItineraryOption = {
  id: string
  name: string
  better_at: string[]
  explanation: string
  total_cost: number | null
  /** Chỗ trong phương án đang dùng giá ước (chưa có giá thật). */
  estimated_prices?: string[]
  /** Chi phí cả chuyến theo khoản, so với ngân sách. */
  cost_breakdown?: DayCost & {
    budget: number | null
    per_person: number
    per_person_min?: number
    per_person_max?: number
    /** Phát sinh chiếm bao nhiêu phần chi phí, VD 0.1 – 0.2. */
    extras_pct_min?: number
    extras_pct_max?: number
    /** Vì sao cần để dành phát sinh: thuế, mưa làm giá xe tăng, hư xe, gửi xe, ăn vặt... */
    extras_notes?: string[]
    estimated: boolean
    /** Tiền gọi xe cả chuyến nếu đi bằng từng hãng, rẻ trước (bảng giá các hãng). */
    transport_options?: TransportOption[]
  }
  days: ItineraryDay[]
}

export type TransportOption = {
  brand: string
  service: string
  kind: "car" | "bike"
  /** Số xe mỗi chặng (xe máy: mỗi khách một xe). */
  vehicles: number
  total: number
}

export type PackingGroup = "Giấy tờ" | "Quần áo" | "Sức khỏe" | "Thiết bị"

export type PackingItem = { group: PackingGroup; item: string; reason: string }

export type ItineraryQuestion = {
  id: string
  text: string
  choices: { label: string; set: Partial<TripForm> }[]
}

export type ItineraryResult = {
  thread_id: string
  /** Run gốc trên LangSmith của lượt này (để mở thẳng trace khi debug). */
  trace_run_id?: string | null
  status: "ok" | "need_info"
  destination: string
  start_date: string
  days: number
  /** Số người đi (lộ trình cũ không có). */
  group_size?: number
  /** VD "2 người · 1 xe máy (2 người/xe)". */
  travel_party?: string | null
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
  /** Ngân sách so với mặt bằng giá của điểm đến; không có khi ngân sách đủ mức đã chọn. */
  budget_level?: BudgetLevel | null
  guesses: string[]
  understood: { field: string; value: string; quote: string }[]
  notes: string[]
  festivals: string[]
  /** Gợi ý hành lý theo thời tiết, lịch trình, thành phần đoàn. */
  packing?: PackingItem[]
  stats: {
    llm_calls: number
    tool_calls: number
    tool_errors: number
    tokens_in: number
    tokens_out: number
    cost_usd: number | null
    seconds: number
  }
  /** Nhật ký từng bước của lượt chạy, lưu cùng kết quả: mở lại vẫn xem được "Quá trình xử lý". */
  trace?: {
    id: string
    ts?: string
    node: string
    kind: string
    text: string
    data: Record<string, unknown>
  }[]
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
  // Không có "Tiết kiệm": đã có ô ngân sách, muốn tiết kiệm thì giảm ngân sách (lộ trình bám
  // ngân sách ±5%).
  { id: "comfort", label: "Đỡ mệt", note: "Ít ngồi xe, ít chỗ" },
  { id: "leisure", label: "Thong thả", note: "Ít chỗ, đúng ý, chất lượng" },
  {
    id: "short_time",
    label: "Ít thời gian",
    note: "Chỗ nổi tiếng, ít ngồi xe",
  },
  {
    id: "many_places",
    label: "Đi nhiều chỗ",
    note: "Nhiều điểm nhất, ít ngồi xe",
  },
]

/**
 * Một mức chi của điểm đến: phòng + ăn cả đoàn cả chuyến theo tứ phân vị giá của cả điểm đến
 * (tiết kiệm = trung vị nửa rẻ, thường gặp = trung vị, sang = trung vị nửa đắt).
 */
export type BudgetLevelRow = {
  key: "saving" | "normal" | "luxury"
  label: string
  basis: string
  stay_night: number
  meal: number
  total: number
}

/**
 * Mỗi mức chi so ngân sách với một mức riêng: "Bình thường" với Thường gặp, "Sang, không vượt
 * ngân sách" với Sang (`target`); dưới cả Tiết kiệm thì `severity` "warn" (`kind` "low"), dưới
 * mức đem so là "below". Ngân sách trên cả mức Sang mà lịch vẫn tiêu dưới khoảng ngân sách là
 * "surplus" (chỗ rẻ, ngân sách cao). "Không giới hạn" không so ngân sách (`target` null), chỉ
 * báo tổng ước. `budget_text`: ngân sách quy về cả đoàn cả chuyến kèm phép tính.
 */
export type BudgetLevel = {
  kind?: "low" | "below" | "surplus" | "unlimited"
  severity: "warn" | "info"
  title: string
  text: string
  style: SpendStyle
  target: "normal" | "luxury" | null
  budget: number | null
  budget_text?: string | null
  levels: BudgetLevelRow[]
  scope: string
}

export const SPEND_STYLES: { id: SpendStyle; label: string }[] = [
  { id: "normal", label: "Bình thường" },
  { id: "luxury_within_budget", label: "Sang, không vượt ngân sách" },
  { id: "unlimited", label: "Không giới hạn" },
]

export const NAP_OPTIONS: { id: Nap; label: string }[] = [
  { id: "auto", label: "Tự chọn" },
  { id: "stay", label: "Về chỗ ở" },
  { id: "cafe", label: "Quán cà phê gần đó" },
  { id: "hotel", label: "Khách sạn gần đó" },
  { id: "none", label: "Không nghỉ trưa" },
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

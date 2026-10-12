import type { PlanEvent } from "@/lib/api"

export type Phase = "intake" | "search" | "schedule" | "decide" | "deliver"

/** circle = agent LLM, diamond = bước điều phối / chia việc, square = code xử lý dữ liệu. */
export type Marker = "circle" | "diamond" | "square"

type NodeMeta = {
  label: string
  phase: Phase
  marker: Marker
  /** Nguồn bước này dùng (theo code LLM service), để hiện khi nhật ký cũ không có tool_call. */
  sources?: string[]
  /** Bước tự nó là cảnh báo (VD dừng để hỏi lại). */
  warn?: string
}

/** Các node của pipeline lập lộ trình (LLM service, itinerary/pipeline.py). */
export const NODES: Record<string, NodeMeta> = {
  nhan_form: { label: "Nhận form", phase: "intake", marker: "square" },
  doc_loi_nhan: { label: "Đọc lời nhắn", phase: "intake", marker: "circle" },
  phan_nhom: {
    label: "Phân nhóm khách, tính giờ rảnh",
    phase: "intake",
    marker: "diamond",
    sources: ["geocode_vn", "find_stays", "browse_places"],
  },
  hoi_lai: {
    label: "Hỏi lại thông tin còn thiếu",
    phase: "intake",
    marker: "diamond",
    warn: "thiếu dữ kiện",
  },
  tim_kiem: {
    label: "Tìm chỗ chơi, quán ăn, chỗ ở",
    phase: "search",
    marker: "square",
    sources: [
      "browse_places",
      "find_stays",
      "weather_forecast",
      "find_festivals",
      "disaster_alerts",
    ],
  },
  loc: {
    label: "Lọc chỗ không đi được",
    phase: "search",
    marker: "square",
    sources: ["check_opening_hours", "check_place_needs"],
  },
  xac_minh: {
    label: "Experience + Budget xác minh",
    phase: "search",
    marker: "circle",
  },
  cham: {
    label: "Chấm điểm, chọn chỗ ở",
    phase: "schedule",
    marker: "square",
    sources: ["get_place_details", "geocode_vn", "distance_matrix"],
  },
  chot_danh_sach: {
    label: "Chia chỗ cho từng ngày",
    phase: "schedule",
    marker: "diamond",
  },
  xep_lich: { label: "Planner xếp lịch", phase: "schedule", marker: "circle" },
  kiem_lich: {
    label: "Chạy thử lịch, đặt giờ ăn",
    phase: "schedule",
    marker: "square",
  },
  xep_hang: {
    label: "Xếp hạng lịch từng ngày",
    phase: "decide",
    marker: "square",
  },
  ghep: {
    label: "Ghép phương án, kiểm ngân sách",
    phase: "decide",
    marker: "diamond",
  },
  quyet_dinh: {
    label: "Decision chốt phương án",
    phase: "decide",
    marker: "circle",
  },
  tra_ket_qua: {
    label: "Trả kết quả",
    phase: "deliver",
    marker: "square",
    sources: ["get_place_photos"],
  },
}

export const PHASES: Record<Phase, string> = {
  intake: "Nhận thông tin",
  search: "Tìm và xác minh",
  schedule: "Xếp lịch",
  decide: "Chốt phương án",
  deliver: "Trả kết quả",
}

/** Hai agent chạy song song ở bước xác minh (node "xac_minh:experience", "xac_minh:budget"). */
const ROLES: Record<string, { name: string; sources: string[] }> = {
  experience: { name: "Experience", sources: ["get_place_reviews"] },
  budget: { name: "Budget", sources: ["web_search", "fetch_page"] },
}

const LLM = "LLM"

const TOOL_LABELS: Record<string, string> = {
  browse_places: "Google Maps",
  find_places_by_needs: "Google Maps",
  search_places: "Google Maps",
  get_place_details: "Google Maps",
  find_nearby: "Google Maps",
  get_place_reviews: "Đánh giá",
  get_place_photos: "Ảnh",
  distance_matrix: "Khoảng cách & thời gian",
  get_route: "Khoảng cách & thời gian",
  plan_day_route: "Khoảng cách & thời gian",
  check_opening_hours: "Giờ mở cửa",
  check_place_needs: "Tiện ích",
  geocode_vn: "Địa chỉ",
  find_stays: "Chỗ ở",
  search_hotels: "Chỗ ở",
  search_flights: "Vé máy bay",
  disaster_alerts: "Cảnh báo thiên tai",
  fetch_page: "Đọc trang web",
  vn_calendar: "Lịch Việt Nam",
  find_festivals: "Sự kiện",
  search_events: "Sự kiện",
  web_search: "Tìm kiếm web",
}

/** Tên tool MCP -> nguồn dễ hiểu; tool lạ đoán theo tên, không đoán được thì giữ nguyên. */
export function toolLabel(tool: string): string {
  if (TOOL_LABELS[tool]) return TOOL_LABELS[tool]
  if (/weather/.test(tool)) return "Thời tiết"
  if (/lunar|holiday|calendar/.test(tool)) return "Lịch Việt Nam"
  if (/festival|event/.test(tool)) return "Sự kiện"
  if (/search|news/.test(tool)) return "Tìm kiếm web"
  if (/photo/.test(tool)) return "Ảnh"
  return tool
}

export type Chip = { label: string; failed: boolean }

/** Gom tool đã gọi thành chip, mỗi nguồn 1 chip; có lượt lỗi thì chip cảnh báo. */
class Sources {
  private chips = new Map<string, Chip>()
  called = 0

  add(label: string, failed = false) {
    const chip = this.chips.get(label) ?? { label, failed: false }
    chip.failed ||= failed
    this.chips.set(label, chip)
  }

  list(fallback: string[], llm: boolean): Chip[] {
    // Nhật ký cũ không có tool_call: hiện nguồn theo thiết kế của bước
    if (this.called === 0) for (const t of fallback) this.add(toolLabel(t))
    const chips = [...this.chips.values()]
    return llm ? [{ label: LLM, failed: false }, ...chips] : chips
  }
}

export type Lane = {
  role: string
  name: string
  text: string
  failed: boolean
  chips: Chip[]
}

export type Step = {
  key: string
  node: string
  round: number
  start: number
  end: number
  text: string
  /** Nhãn cảnh báo cạnh tiêu đề ("lỗi", "thiếu dữ kiện"…), rỗng nếu không có. */
  warn: string
  chips: Chip[]
  lanes: Lane[]
}

type Draft = Omit<Step, "chips" | "lanes" | "warn"> & {
  error: boolean
  replan: boolean
  toolFailed: boolean
  sources: Sources
  lanes: Map<string, { text: string; sources: Sources; failed: boolean }>
}

const TOOL_KINDS = new Set(["tool_call", "tool_result"])

function failedResult(e: PlanEvent) {
  return (
    e.kind === "tool_result" && (e.text.endsWith("lỗi") || e.data?.ok === false)
  )
}

export function buildTrace(events: PlanEvent[]) {
  const drafts: Draft[] = []
  let toolCalls = 0
  let turnError = false

  for (const e of events) {
    if (e.node === "turn") {
      if (e.kind === "error") turnError = true
      continue
    }
    const [base, role = ""] = e.node.split(":")
    const ts = Number(e.ts ?? 0)
    // Node quay lại sau một node khác (VD Planner sửa lịch) là một lượt mới
    let step = drafts.at(-1)
    if (step?.node !== base) {
      step = {
        key: `${base}-${drafts.length}`,
        node: base,
        round: drafts.filter((d) => d.node === base).length + 1,
        start: ts,
        end: ts,
        text: "",
        error: false,
        replan: false,
        toolFailed: false,
        sources: new Sources(),
        lanes: new Map(),
      }
      drafts.push(step)
    }
    step.end = Math.max(step.end, ts)

    const lane = role
      ? (step.lanes.get(role) ?? {
          text: "",
          sources: new Sources(),
          failed: false,
        })
      : null
    if (lane) step.lanes.set(role, lane)
    const target = lane?.sources ?? step.sources

    const tool = typeof e.data?.tool === "string" ? e.data.tool : ""
    if (e.kind === "tool_call") {
      toolCalls += 1
      target.called += 1
      if (tool) target.add(toolLabel(tool))
    } else if (e.kind === "tool_result") {
      const failed = failedResult(e)
      if (tool) target.add(toolLabel(tool), failed)
      if (failed) {
        step.toolFailed = true
        if (lane) lane.failed = true
      }
    }
    if (e.kind === "replan") step.replan = true
    if (e.text.startsWith("LLM lỗi")) {
      step.error = true
      if (lane) lane.failed = true
    }
    // Chữ của tool_call/tool_result chỉ dùng khi bước chưa có câu nào khác
    if (e.text && (!TOOL_KINDS.has(e.kind) || !(lane?.text ?? step.text))) {
      if (lane) lane.text = e.text
      else step.text = e.text
    }
  }

  if (turnError && drafts.length) drafts[drafts.length - 1].error = true

  const steps: Step[] = drafts.map((d) => {
    const meta = NODES[d.node]
    const lanes: Lane[] = [...d.lanes].map(([role, l]) => ({
      role,
      name: ROLES[role]?.name ?? role,
      text: l.text,
      failed: l.failed,
      chips: l.sources.list(ROLES[role]?.sources ?? [], Boolean(ROLES[role])),
    }))
    return {
      key: d.key,
      node: d.node,
      round: d.round,
      start: d.start,
      end: d.end,
      text:
        d.text ||
        (lanes.length > 1
          ? "Các agent chạy song song, chỉ nhận kết quả có bằng chứng"
          : ""),
      warn: d.error
        ? "lỗi"
        : d.replan
          ? "phải xếp lại"
          : d.toolFailed
            ? "thiếu dữ kiện"
            : (meta?.warn ?? ""),
      chips: d.sources.list(meta?.sources ?? [], meta?.marker === "circle"),
      lanes,
    }
  })
  return { steps, toolCalls }
}

export function duration(seconds: number): string {
  if (seconds < 1) return `${Math.max(1, Math.round(seconds * 1000))} ms`
  return `${seconds.toFixed(1).replace(".", ",")} giây`
}

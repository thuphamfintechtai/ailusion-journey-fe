"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import type { PlanEvent } from "@/lib/api"
import { cn } from "@/lib/utils"

type Phase = "intake" | "search" | "schedule" | "decide"

/** Tên hiển thị các node của pipeline lập lộ trình (LLM service, itinerary/pipeline.py).
 * 🧠 = bước có agent LLM; còn lại là code. */
const NODES: Record<string, { label: string; phase: Phase }> = {
  nhan_form: { label: "Nhận form", phase: "intake" },
  doc_loi_nhan: { label: "🧠 Đọc lời nhắn", phase: "intake" },
  phan_nhom: { label: "Phân nhóm khách, tính giờ rảnh", phase: "intake" },
  hoi_lai: { label: "Hỏi lại thông tin còn thiếu", phase: "intake" },
  tim_kiem: { label: "Tìm chỗ chơi, quán ăn, chỗ ở", phase: "search" },
  loc: { label: "Lọc chỗ không đi được", phase: "search" },
  xac_minh: { label: "🧠 Experience + Budget xác minh", phase: "search" },
  cham: { label: "Chấm điểm, chọn chỗ ở", phase: "schedule" },
  chot_danh_sach: { label: "Chia chỗ cho từng ngày", phase: "schedule" },
  xep_lich: { label: "🧠 Planner xếp lịch", phase: "schedule" },
  kiem_lich: { label: "Chạy thử lịch, đặt giờ ăn", phase: "schedule" },
  xep_hang: { label: "Xếp hạng lịch từng ngày", phase: "decide" },
  ghep: { label: "Ghép phương án, kiểm ngân sách", phase: "decide" },
  quyet_dinh: { label: "🧠 Decision chốt phương án", phase: "decide" },
  tra_ket_qua: { label: "Trả kết quả", phase: "decide" },
}

const PHASES: Record<Phase, string> = {
  intake: "Nhận thông tin",
  search: "Tìm và xác minh",
  schedule: "Xếp lịch",
  decide: "Chốt phương án",
}

/** Hai agent chạy song song ở bước xác minh (node "xac_minh:experience", "xac_minh:budget"). */
const ROLES: Record<string, string> = {
  experience: "🍜 Experience",
  budget: "💰 Budget",
}

const TOOL_NAMES: Record<string, string> = {
  browse_places: "Google Maps",
  search_hotels: "Giá phòng",
  weather_forecast: "Dự báo thời tiết",
  find_festivals: "Lễ hội",
  vn_calendar: "Lịch Việt Nam",
  geocode_vn: "Địa chỉ",
  get_route: "Tuyến đường",
  search_flights: "Vé máy bay",
  find_nearby: "Quanh đây",
  check_opening_hours: "Giờ mở cửa",
  score_options: "Chấm điểm",
  plan_day_route: "Tối ưu tuyến",
}

type Step = {
  node: string
  start: number
  end: number
  text: string
  failed: boolean
}

/** Một agent trong bước đề xuất / phản biện: dùng tool nào, nói gì. */
type Lane = {
  role: string
  name: string
  tools: string[]
  done: number
  failed: number
  text: string
}

function buildTrace(events: PlanEvent[]) {
  const steps: Step[] = []
  const lanes = new Map<string, Map<string, Lane>>() // node -> role -> lane
  for (const e of events) {
    if (e.node === "turn") continue
    const [base, role = ""] = e.node.split(":")
    const ts = Number(e.ts ?? 0)
    let step = steps.find((s) => s.node === base)
    if (!step) {
      step = { node: base, start: ts, end: ts, text: "", failed: false }
      steps.push(step)
    }
    step.end = Math.max(step.end, ts)

    if (base === "xac_minh" && ROLES[role]) {
      const byRole = lanes.get(base) ?? new Map<string, Lane>()
      const lane = byRole.get(role) ?? {
        role,
        name: ROLES[role],
        tools: [],
        done: 0,
        failed: 0,
        text: "",
      }
      const tool = String(e.data?.tool ?? "")
      if (e.kind === "tool_call" && tool && !lane.tools.includes(tool))
        lane.tools.push(tool)
      if (e.kind === "tool_result") {
        if (e.text.endsWith("lỗi")) lane.failed += 1
        else lane.done += 1
      }
      if (e.kind === "plan" || e.kind === "finding") lane.text = e.text
      byRole.set(role, lane)
      lanes.set(base, byRole)
      step.text = "Hai agent chạy song song, chỉ nhận kết quả có bằng chứng"
    } else if (e.text) {
      step.text = e.text
      if (e.text.startsWith("LLM lỗi")) step.failed = true
    }
  }
  const lanesOf = (node: string) => [...(lanes.get(node)?.values() ?? [])]
  return { steps, lanesOf }
}

function duration(seconds: number): string {
  if (seconds < 1) return `${Math.max(1, Math.round(seconds * 1000))} ms`
  return `${seconds.toFixed(1).replace(".", ",")} giây`
}

export function PlanTrace({
  events,
  running,
  collapsible = false,
}: {
  events: PlanEvent[]
  running: boolean
  collapsible?: boolean
}) {
  const [open, setOpen] = React.useState(!collapsible)
  const [now, setNow] = React.useState(() => Date.now() / 1000)
  const { steps, lanesOf } = React.useMemo(() => buildTrace(events), [events])

  React.useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNow(Date.now() / 1000), 250)
    return () => clearInterval(timer)
  }, [running])

  const first = steps[0]?.start
  const last = steps.at(-1)?.end
  const elapsed = first ? (running ? now : (last ?? first)) - first : 0
  const title = running ? "Các agent đang lập kế hoạch" : "Quá trình xử lý"

  return (
    <div className="rounded-xl border border-trip-line bg-trip-sheet">
      <button
        type="button"
        disabled={!collapsible}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
      >
        <span className="relative flex size-2.5">
          {running && (
            <span className="absolute inset-0 animate-ping rounded-full bg-trip-jade/60" />
          )}
          <span className="relative size-2.5 rounded-full bg-trip-jade" />
        </span>
        <span className="min-w-0 flex-1 text-[14.5px] text-trip-ink-2">
          <b className="text-trip-ink">{title}</b>{" "}
          {!running && `${steps.length} bước`}
        </span>
        <span className="font-num text-base font-semibold text-trip-ink">
          {duration(elapsed)}
        </span>
        {collapsible && (
          <ChevronDown
            className={cn(
              "size-4 text-trip-ink-3 transition-transform",
              open && "rotate-180"
            )}
          />
        )}
      </button>

      {open && (
        <ol className="relative mx-4 mb-4 border-l-2 border-trip-line pl-5">
          {steps.length === 0 && (
            <li className="py-2 text-sm text-trip-ink-3">
              Đang khởi động pipeline…
            </li>
          )}
          {steps.map((step, i) => {
            const meta = NODES[step.node] ?? {
              label: step.node,
              phase: "decide" as Phase, // node mới chưa có nhãn: hiện tên gốc
            }
            const busy = running && i === steps.length - 1
            const next = steps[i + 1]?.start ?? (running ? now : step.end)
            const graphStart =
              i === 0 || NODES[steps[i - 1].node]?.phase !== meta.phase
            const lanes = lanesOf(step.node)
            return (
              <React.Fragment key={step.node}>
                {graphStart && (
                  <li className="-ml-5 pt-3 pb-1 pl-5 text-[12.5px] font-semibold text-trip-ink-3">
                    {PHASES[meta.phase]}
                  </li>
                )}
                <li className="relative py-2">
                  <span
                    className={cn(
                      "absolute top-[13px] -left-[27px] size-3 rounded-full border-2",
                      busy
                        ? "animate-pulse border-trip-ink bg-trip-sheet"
                        : step.failed
                          ? "border-trip-warn-dot bg-trip-warn-dot"
                          : "border-trip-jade bg-trip-jade"
                    )}
                  />
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[14.5px] font-bold text-trip-ink">
                      {meta.label}
                    </p>
                    <span className="shrink-0 font-num text-sm text-trip-ink-3">
                      {busy ? "đang xử lý" : duration(next - step.start)}
                    </span>
                  </div>
                  {step.text && (
                    <p className="text-[13.5px] text-trip-ink-2">{step.text}</p>
                  )}
                  {lanes.length > 0 && (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {lanes.map((lane) => (
                        <div
                          key={lane.role}
                          className="grid content-start gap-1.5 rounded-[10px] border border-trip-line bg-trip-paper p-2.5"
                        >
                          <p className="flex items-center gap-1.5 text-[13px] font-bold text-trip-ink">
                            <span
                              className={cn(
                                "size-2 rounded-full",
                                lane.failed
                                  ? "bg-trip-warn-dot"
                                  : lane.text
                                    ? "bg-trip-jade"
                                    : "animate-pulse bg-trip-ink-3"
                              )}
                            />
                            {lane.name}
                          </p>
                          {lane.tools.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {lane.tools.map((t) => (
                                <span
                                  key={t}
                                  className="rounded-md border border-trip-line bg-trip-sheet px-1.5 py-0.5 text-[11.5px] text-trip-ink-2"
                                >
                                  {TOOL_NAMES[t] ?? t}
                                </span>
                              ))}
                            </div>
                          )}
                          {lane.text && (
                            <p className="text-[12.5px] leading-snug text-trip-ink-2">
                              {lane.text}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              </React.Fragment>
            )
          })}
        </ol>
      )}
    </div>
  )
}

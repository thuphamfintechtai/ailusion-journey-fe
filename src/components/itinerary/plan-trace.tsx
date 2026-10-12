"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import type { PlanEvent } from "@/lib/api"
import { cn } from "@/lib/utils"

type Phase = "context" | "agents" | "discussion" | "decide"

/** Tên hiển thị các node của pipeline POST /plan (coordinator + 3 agent, LLM service). */
const NODES: Record<string, { label: string; phase: Phase }> = {
  boi_canh: { label: "Bối cảnh chuyến đi", phase: "context" },
  chien_luoc: { label: "Lập chiến lược theo nhóm", phase: "context" },
  agent: { label: "Ba agent đề xuất song song", phase: "agents" },
  tong_hop: { label: "Gộp dữ liệu của ba agent", phase: "discussion" },
  thao_luan: { label: "🧠 Coordinator gộp đề xuất", phase: "discussion" },
  xep_nhap: { label: "Xếp giờ thật cho bản nháp", phase: "discussion" },
  phan_bien: { label: "Các agent phản biện bản nháp", phase: "discussion" },
  chot: { label: "🧠 Coordinator chốt", phase: "discussion" },
  xep_lich: { label: "Xếp ba phương án theo bản chốt", phase: "decide" },
  kiem_tra: { label: "Kiểm tra ngân sách, giờ giấc", phase: "decide" },
  rui_ro_chon: { label: "Mô phỏng rủi ro, chọn phương án", phase: "decide" },
  giai_thich: { label: "Viết lời giải thích", phase: "decide" },
}

const PHASES: Record<Phase, string> = {
  context: "Trip context",
  agents: "Agent làm việc",
  discussion: "Thảo luận",
  decide: "Final itinerary",
}

/** Ba agent, theo `role` trong tên node (agent:planner, phan_bien:budget...). */
const ROLES: Record<string, string> = {
  planner: "🗺️ Planner",
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
  let toolCalls = 0
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
    if (e.kind === "tool_call") toolCalls += 1

    if ((base === "agent" || base === "phan_bien") && ROLES[role]) {
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
      step.text =
        base === "agent"
          ? "Mỗi agent dùng bộ công cụ riêng rồi đưa ra đề xuất"
          : "Mỗi agent soát bản nháp theo góc của mình"
    } else if (e.text) {
      step.text = e.text
      if (e.text.startsWith("LLM lỗi")) step.failed = true
    }
  }
  const lanesOf = (node: string) => [...(lanes.get(node)?.values() ?? [])]
  return { steps, lanesOf, toolCalls }
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
  const { steps, lanesOf, toolCalls } = React.useMemo(
    () => buildTrace(events),
    [events]
  )

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
          {!running &&
            `coordinator và 3 agent, ${steps.length} bước, ${toolCalls} lượt gọi công cụ`}
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
              phase: "decide" as Phase,
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
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
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

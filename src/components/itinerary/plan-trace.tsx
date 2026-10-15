"use client"

import * as React from "react"
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CalendarRange,
  GitFork,
  ChevronDown,
  CircleDot,
  CircleHelp,
  ClipboardList,
  Filter,
  Layers,
  ListOrdered,
  MessageSquareText,
  Search,
  Send,
  ShieldCheck,
  Star,
  Timer,
  Users,
  type LucideIcon,
} from "lucide-react"

import type { PlanEvent } from "@/lib/api"
import { cn } from "@/lib/utils"

import {
  buildTrace,
  duration,
  NODES,
  PHASES,
  type Chip,
  type Marker,
  type Phase,
} from "./plan-trace-model"

const MAX_CHIPS = 5

function Chips({ chips }: { chips: Chip[] }) {
  if (chips.length === 0) return null
  const rest = chips.length - MAX_CHIPS
  return (
    <div className="flex flex-wrap gap-1">
      {chips.slice(0, MAX_CHIPS).map((c) => (
        <span
          key={c.label}
          className={cn(
            "rounded-md border px-1.5 py-0.5 text-[11.5px] leading-tight",
            c.failed
              ? "border-trip-warn-dot/50 bg-trip-warn-bg text-trip-warn"
              : "border-trip-line text-trip-ink-2"
          )}
        >
          {c.label}
        </span>
      ))}
      {rest > 0 && (
        <span
          title={chips
            .slice(MAX_CHIPS)
            .map((c) => c.label)
            .join(", ")}
          className="rounded-md border border-trip-line px-1.5 py-0.5 text-[11.5px] leading-tight text-trip-ink-3"
        >
          +{rest}
        </span>
      )}
    </div>
  )
}

/** Biểu tượng theo việc của từng bước (node mới chưa có thì dùng chấm tròn). */
const STEP_ICONS: Record<string, LucideIcon> = {
  nhan_form: ClipboardList,
  doc_loi_nhan: MessageSquareText,
  phan_nhom: Users,
  hoi_lai: CircleHelp,
  tim_kiem: Search,
  loc: Filter,
  xac_minh: ShieldCheck,
  cham: Star,
  chot_danh_sach: CalendarRange,
  xep_lich: CalendarClock,
  kiem_lich: Timer,
  xep_hang: ListOrdered,
  lap_phuong_an: GitFork,
  ghep: Layers,
  quyet_dinh: BadgeCheck,
  tra_ket_qua: Send,
}

/** Màu theo giai đoạn: nền nhạt + chữ đậm cùng tông, cho bước đã xong. */
const PHASE_TONE: Record<Phase, string> = {
  intake: "bg-trip-sky-bg text-trip-sky ring-trip-sky/25",
  search: "bg-trip-lotus-bg text-trip-lotus ring-trip-lotus/25",
  schedule: "bg-trip-warn-bg text-trip-warn ring-trip-warn-dot/30",
  decide: "bg-trip-jade-bg text-trip-jade ring-trip-jade/25",
  deliver: "bg-accent text-primary ring-primary/25",
}

/**
 * Ký hiệu bước trên đường dọc: biểu tượng theo việc, màu theo giai đoạn. Đang chạy: nền
 * gradient của web, vòng sáng lan ra; lỗi / thiếu dữ kiện: biểu tượng cảnh báo. Agent LLM ô
 * tròn, bước code / điều phối ô bo góc.
 */
function StepMarker({
  node,
  marker,
  phase,
  busy,
  failed,
}: {
  node: string
  marker: Marker
  phase: Phase
  busy: boolean
  failed: boolean
}) {
  const Icon = failed ? AlertTriangle : (STEP_ICONS[node] ?? CircleDot)
  const shape = marker === "circle" ? "rounded-full" : "rounded-[10px]"
  return (
    <span
      aria-hidden
      className="absolute top-0 -left-[45px] grid size-8 place-items-center"
    >
      {busy && (
        <span
          className={cn(
            "absolute inset-0 animate-ping bg-primary/35 motion-reduce:animate-none",
            shape
          )}
        />
      )}
      <span
        className={cn(
          "relative grid size-8 place-items-center shadow-[0_2px_6px_-2px_rgb(18_23_53/0.25)] ring-1 transition-colors duration-300 ring-inset",
          shape,
          busy
            ? "bg-brand text-white ring-white/30"
            : failed
              ? "bg-trip-warn-bg text-trip-warn ring-trip-warn-dot/40"
              : PHASE_TONE[phase]
        )}
      >
        <Icon className="size-4" strokeWidth={2.2} />
      </span>
    </span>
  )
}

function Badge({ children, warn }: { children: string; warn?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-px text-[11px] font-semibold",
        warn
          ? "bg-trip-warn-bg text-trip-warn"
          : "bg-trip-sheet-2 text-trip-ink-3"
      )}
    >
      {children}
    </span>
  )
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
  const { steps, toolCalls } = React.useMemo(() => buildTrace(events), [events])

  React.useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNow(Date.now() / 1000), 250)
    return () => clearInterval(timer)
  }, [running])

  const first = steps[0]?.start
  const last = steps.at(-1)?.end
  const elapsed = first ? (running ? now : (last ?? first)) - first : 0

  return (
    <div className="rounded-xl border border-trip-line bg-trip-sheet">
      <button
        type="button"
        disabled={!collapsible}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
      >
        <span className="relative flex size-2.5 shrink-0">
          {running && (
            <span className="absolute inset-0 animate-ping rounded-full bg-trip-jade/60" />
          )}
          <span className="relative size-2.5 rounded-full bg-trip-jade" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[14.5px]">
          <b className="text-trip-ink">Quá trình xử lý</b>{" "}
          <span className="text-[13px] text-trip-ink-3">
            {running
              ? "các agent đang làm việc…"
              : "nghiên cứu rồi ra quyết định"}
          </span>
        </span>
        {elapsed > 0 && (
          <span className="shrink-0 font-num text-sm text-trip-ink-3">
            {duration(elapsed)}
          </span>
        )}
        {collapsible && (
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-trip-ink-3 transition-transform",
              open && "rotate-180"
            )}
          />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4">
          <ol className="relative ml-4 border-l-2 border-trip-line pl-7">
            {steps.length === 0 && (
              <li className="py-2 text-sm text-trip-ink-3">
                Đang khởi động pipeline…
              </li>
            )}
            {steps.map((step, i) => {
              const meta = NODES[step.node] ?? {
                label: step.node, // node mới chưa có nhãn: hiện tên gốc
                phase: "decide" as Phase,
                marker: "square" as Marker,
              }
              const busy = running && i === steps.length - 1
              const next = steps[i + 1]?.start ?? (running ? now : step.end)
              const phaseStart =
                i === 0 ||
                (NODES[steps[i - 1].node]?.phase ?? "decide") !== meta.phase
              return (
                <React.Fragment key={step.key}>
                  {phaseStart && (
                    <li className="pt-3 pb-1 text-[11.5px] font-semibold tracking-wide text-trip-ink-3 uppercase first:pt-1">
                      {PHASES[meta.phase]}
                    </li>
                  )}
                  <li className="relative grid animate-in gap-1 py-2 duration-300 fade-in slide-in-from-left-1 motion-reduce:animate-none">
                    <StepMarker
                      node={step.node}
                      marker={meta.marker}
                      phase={meta.phase}
                      busy={busy}
                      failed={Boolean(step.warn) && !busy}
                    />
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-[14.5px] font-bold text-trip-ink">
                        {meta.label}
                        {step.round > 1 && (
                          <Badge>{`lượt ${step.round}`}</Badge>
                        )}
                        {step.warn && <Badge warn>{step.warn}</Badge>}
                      </p>
                      <span className="shrink-0 font-num text-[13px] text-trip-ink-3">
                        {busy ? "đang xử lý" : duration(next - step.start)}
                      </span>
                    </div>
                    {step.text && (
                      <p className="text-[13.5px] leading-snug text-trip-ink-2">
                        {step.text}
                      </p>
                    )}
                    {step.lanes.length > 0 ? (
                      <div className="mt-1 grid gap-2 sm:grid-cols-2">
                        {step.lanes.map((lane) => (
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
                                    : busy
                                      ? "animate-pulse bg-trip-jade"
                                      : "bg-trip-jade"
                                )}
                              />
                              {lane.name}
                            </p>
                            {lane.text && (
                              <p className="text-[12.5px] leading-snug text-trip-ink-2">
                                {lane.text}
                              </p>
                            )}
                            <Chips chips={lane.chips} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Chips chips={step.chips} />
                    )}
                  </li>
                </React.Fragment>
              )
            })}
          </ol>
          {steps.length > 0 && (
            <p className="mt-2 text-[12.5px] text-trip-ink-3">
              {steps.length} bước
              {toolCalls > 0 && `, ${toolCalls} lượt gọi công cụ`}.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

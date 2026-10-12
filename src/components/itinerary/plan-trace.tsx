"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

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

function StepMarker({
  marker,
  busy,
  failed,
}: {
  marker: Marker
  busy: boolean
  failed: boolean
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute top-[7px] -left-[27px] size-3 border-2",
        marker === "circle" && "rounded-full",
        marker === "diamond" && "scale-90 rotate-45",
        marker === "square" && "rounded-[2px]",
        busy
          ? "animate-pulse border-trip-jade bg-trip-sheet"
          : failed
            ? "border-trip-warn-dot bg-trip-warn-dot"
            : "border-trip-jade bg-trip-jade"
      )}
    />
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
          <ol className="relative ml-1.5 border-l-2 border-trip-line pl-5">
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
                  <li className="relative grid gap-1 py-2">
                    <StepMarker
                      marker={meta.marker}
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

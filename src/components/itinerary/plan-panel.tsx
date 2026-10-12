"use client"

/** Khung chi tiết phương án đang chọn: 5 tab Lịch trình, Bản đồ, Chi phí, Thời tiết, Hành lý. */

import * as React from "react"
import {
  Backpack,
  CalendarDays,
  Cloud,
  Map as MapIcon,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import {
  trieu,
  type ItineraryOption,
  type ItineraryResult,
} from "@/lib/itinerary"
import { cn } from "@/lib/utils"

import { CostTab } from "./plan-cost"
import { MapTab } from "./plan-map"
import { PackingTab } from "./plan-packing"
import { ScheduleTab } from "./plan-schedule"
import { TripContext, trieuRange } from "./plan-shared"
import { WeatherTab } from "./plan-weather"

type Tab = "schedule" | "map" | "cost" | "weather" | "packing"

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "schedule", label: "Lịch trình", icon: CalendarDays },
  { id: "map", label: "Bản đồ", icon: MapIcon },
  { id: "cost", label: "Chi phí", icon: Wallet },
  { id: "weather", label: "Thời tiết", icon: Cloud },
  { id: "packing", label: "Hành lý", icon: Backpack },
]

export function PlanPanel({
  result,
  option,
}: {
  result: ItineraryResult
  option: ItineraryOption
}) {
  const id = React.useId()
  const trip = React.useMemo(
    () => ({ groupSize: result.group_size, party: result.travel_party }),
    [result.group_size, result.travel_party]
  )
  const packingKey = `ailusion:packing:${result.thread_id}:${option.id}`
  const [tab, setTab] = React.useState<Tab>("schedule")
  const [dayIndex, setDayIndex] = React.useState(0)
  const tabRefs = React.useRef<Partial<Record<Tab, HTMLButtonElement | null>>>(
    {}
  )
  // Đổi phương án thì quay về ngày đầu.
  const [prevOption, setPrevOption] = React.useState(option.id)
  if (prevOption !== option.id) {
    setPrevOption(option.id)
    setDayIndex(0)
  }

  // Phím mũi tên / Home / End chuyển tab, theo mẫu tablist của WAI-ARIA.
  const onKey = (e: React.KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab)
    const next =
      e.key === "ArrowRight"
        ? (i + 1) % TABS.length
        : e.key === "ArrowLeft"
          ? (i - 1 + TABS.length) % TABS.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? TABS.length - 1
              : null
    if (next == null) return
    e.preventDefault()
    setTab(TABS[next].id)
    tabRefs.current[TABS[next].id]?.focus()
  }

  return (
    <TripContext.Provider value={trip}>
      <section className="@container grid gap-3 rounded-2xl border border-trip-line bg-trip-sheet p-2 sm:p-3">
        <div className="flex items-center gap-3 rounded-xl bg-trip-sheet-2 p-1">
          <div
            role="tablist"
            aria-label="Chi tiết phương án"
            onKeyDown={onKey}
            className="flex min-w-0 flex-1 [scrollbar-width:none] gap-1 overflow-x-auto"
          >
            {TABS.map((t) => {
              const on = t.id === tab
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[t.id] = el
                  }}
                  type="button"
                  role="tab"
                  id={`${id}-tab-${t.id}`}
                  aria-selected={on}
                  aria-controls={`${id}-panel-${t.id}`}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-[9px] px-3 text-[13.5px] font-semibold transition-colors",
                    on
                      ? "bg-trip-sheet text-trip-ink shadow-sm"
                      : "text-trip-ink-3 hover:text-trip-ink"
                  )}
                >
                  <Icon className="size-4" />
                  {t.label}
                </button>
              )
            })}
          </div>
          <span className="hidden shrink-0 pr-2 text-[13px] text-trip-ink-3 @lg:inline">
            {option.name},{" "}
            {option.cost_breakdown?.total_min != null
              ? trieuRange(
                  option.cost_breakdown.total_min,
                  option.cost_breakdown.total_max
                )
              : trieu(option.cost_breakdown?.total ?? option.total_cost)}
          </span>
        </div>

        <div
          role="tabpanel"
          id={`${id}-panel-${tab}`}
          aria-labelledby={`${id}-tab-${tab}`}
          tabIndex={0}
          className="px-1 pb-1 outline-none sm:px-1.5"
        >
          {tab === "schedule" && (
            <ScheduleTab
              days={option.days}
              dayIndex={dayIndex}
              onDay={setDayIndex}
              destination={result.destination}
            />
          )}
          {tab === "map" && (
            <MapTab
              days={option.days}
              dayIndex={dayIndex}
              onDay={setDayIndex}
              stay={result.stay}
              destination={result.destination}
            />
          )}
          {tab === "cost" && <CostTab option={option} stay={result.stay} />}
          {tab === "weather" && <WeatherTab days={option.days} />}
          {tab === "packing" && (
            <PackingTab
              key={packingKey}
              items={result.packing}
              storageKey={packingKey}
            />
          )}
        </div>
      </section>
    </TripContext.Provider>
  )
}

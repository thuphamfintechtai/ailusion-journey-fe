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
import { moneyRange, TripContext, trieuRange } from "./plan-shared"
import type { SkipCut } from "./plan-skip"
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
  cut,
  onSkip,
  onKeepAll,
}: {
  result: ItineraryResult
  option: ItineraryOption
  /** Chỗ người dùng đã bấm "Xoá" ở phương án này và tiền đã bớt (plan-skip.ts). */
  cut?: SkipCut
  onSkip?: (key: string) => void
  onKeepAll?: () => void
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
      {/* Cột lưới minmax(0,1fr): thanh tab / hàng ngày dài (không xuống dòng) cuộn ngang bên
          trong thẻ, không kéo cả khung rộng quá thẻ khi khung chat hẹp. */}
      <section className="@container grid grid-cols-[minmax(0,1fr)] gap-3 rounded-2xl border border-trip-line bg-trip-sheet p-2 sm:p-3">
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

        {/* Chỗ đã xoá ở tab Lịch trình: tổng đã bớt, và giữ lại tất cả một lần. */}
        {cut && cut.count > 0 && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl bg-trip-sheet-2 px-3 py-1.5 text-[13.5px] text-trip-ink-2"
          >
            <span className="grid min-w-0 gap-0.5">
              <span>
                Đã xoá <b className="text-trip-ink">{cut.count} chỗ</b>
                {cut.high > 0 && (
                  <>
                    {" "}
                    · bớt{" "}
                    <b className="font-num text-trip-ink">
                      {moneyRange(cut.low, cut.high)}
                    </b>{" "}
                    khỏi chi phí
                  </>
                )}
              </span>
              <span className="text-[12px] text-trip-ink-3">
                Giờ, đường đi và phát sinh vẫn theo lịch gốc.
              </span>
            </span>
            {onKeepAll && (
              <button
                type="button"
                onClick={onKeepAll}
                className="min-h-9 rounded-lg px-2 font-semibold text-trip-sky outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-trip-sky/30"
              >
                Giữ lại tất cả
              </button>
            )}
          </div>
        )}

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
              onSkip={onSkip}
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

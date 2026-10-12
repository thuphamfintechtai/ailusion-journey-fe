"use client"

/** Tab "Hành lý": gợi ý đồ mang theo theo nhóm, tick đã chuẩn bị (lưu trên máy, theo từng lộ trình). */

import * as React from "react"
import { Check, Luggage } from "lucide-react"

import type { PackingGroup, PackingItem } from "@/lib/itinerary"
import { cn } from "@/lib/utils"

import { TabIntro } from "./plan-shared"

const GROUPS: PackingGroup[] = ["Giấy tờ", "Quần áo", "Sức khỏe", "Thiết bị"]

const keyOf = (p: PackingItem) => `${p.group}|${p.item}`

function load(key: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "[]")
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []
  } catch {
    return []
  }
}

export function PackingTab({
  items,
  storageKey,
}: {
  items: PackingItem[] | undefined
  storageKey: string
}) {
  // Tab chỉ dựng sau khi người dùng bấm, nên đọc thẳng localStorage lúc khởi tạo được.
  // Nơi dùng đặt `key={storageKey}` để đổi phương án thì đọc lại.
  const [checked, setChecked] = React.useState(() => new Set(load(storageKey)))

  const toggle = (k: string) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]))
      } catch {
        // Trình duyệt chặn lưu: vẫn tick được trong phiên này.
      }
      return next
    })

  if (!items?.length)
    return (
      <div className="grid justify-items-center gap-2 py-8 text-center text-[13.5px] text-trip-ink-3">
        <Luggage className="size-6" />
        Lộ trình này chưa có gợi ý hành lý.
      </div>
    )

  const done = items.filter((p) => checked.has(keyOf(p))).length
  const groups = [
    ...GROUPS,
    ...new Set(items.map((p) => p.group).filter((g) => !GROUPS.includes(g))),
  ]
  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <TabIntro>
          Gợi ý theo thời tiết, lịch trình và thành phần đoàn. Đã chuẩn bị{" "}
          <b className="font-num text-trip-ink">
            {done}/{items.length}
          </b>
          .
        </TabIntro>
        <div
          className="h-1 overflow-hidden rounded-full bg-trip-sheet-2"
          role="progressbar"
          aria-label="Đã chuẩn bị"
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-valuenow={done}
        >
          <div
            className="h-full rounded-full bg-trip-jade transition-[width]"
            style={{ width: `${(done / items.length) * 100}%` }}
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {groups.map((g) => {
          const list = items.filter((p) => p.group === g)
          if (list.length === 0) return null
          return (
            <section
              key={g}
              className="rounded-xl border border-trip-line bg-trip-paper px-3 py-2"
            >
              <h4 className="py-1 text-[13.5px] font-bold">{g}</h4>
              <ul className="divide-y divide-trip-line">
                {list.map((p) => {
                  const k = keyOf(p)
                  const on = checked.has(k)
                  return (
                    <li key={k}>
                      <label className="flex cursor-pointer items-start gap-2.5 py-2">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggle(k)}
                          className="peer sr-only"
                        />
                        <span
                          aria-hidden
                          className={cn(
                            "mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[5px] border peer-focus-visible:ring-2 peer-focus-visible:ring-trip-sky",
                            on
                              ? "border-trip-jade bg-trip-jade text-white"
                              : "border-trip-line-2 bg-trip-sheet"
                          )}
                        >
                          {on && <Check className="size-3.5" />}
                        </span>
                        <span className="grid min-w-0 gap-0.5">
                          <span
                            className={cn(
                              "text-[14px] font-semibold",
                              on && "text-trip-ink-3 line-through"
                            )}
                          >
                            {p.item}
                          </span>
                          <span className="text-[12.5px] leading-snug text-trip-ink-3">
                            {p.reason}
                          </span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

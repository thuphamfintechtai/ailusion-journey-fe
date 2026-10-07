"use client"

import * as React from "react"
import {
  BedDouble,
  CalendarDays,
  Coffee,
  Hotel,
  MapPin,
  Moon,
  Route,
  Search,
  Soup,
  UtensilsCrossed,
  Users,
  Wallet,
} from "lucide-react"

import { DESTINATIONS } from "@/lib/destinations"
import { cn } from "@/lib/utils"

import { usePlanTrip } from "./use-plan-trip"

type Tab = "itinerary" | "hotel" | "food"
type Values = Record<string, string>

type FieldDef = {
  name: string
  label: string
  icon: React.ElementType
} & (
  { kind: "date" } | { kind: "select"; options: string[]; defaultValue: string }
)

type TabDef = {
  id: Tab
  label: string
  icon: React.ElementType
  /** Các ô sau ô "Điểm đến". */
  fields: FieldDef[]
  /** Cột cho màn rộng: điểm đến + các ô + nút. Viết đủ để Tailwind quét được. */
  columns: string
  submit: string
  prompt: (destination: string, v: Values) => string
}

const range = (from: number, to: number, unit = "") =>
  Array.from({ length: to - from + 1 }, (_, i) => `${from + i}${unit}`)

const TABS: TabDef[] = [
  {
    id: "itinerary",
    label: "Lịch trình",
    icon: Route,
    columns: "lg:grid-cols-[1.5fr_1.2fr_0.9fr_0.9fr_0.9fr_1.2fr_auto]",
    submit: "Lên lịch trình",
    fields: [
      { name: "date", label: "Ngày đi", icon: CalendarDays, kind: "date" },
      {
        name: "days",
        label: "Số ngày",
        icon: Moon,
        kind: "select",
        options: range(1, 7, " ngày"),
        defaultValue: "3 ngày",
      },
      {
        name: "adults",
        label: "Người lớn",
        icon: Users,
        kind: "select",
        options: range(1, 10),
        defaultValue: "2",
      },
      {
        name: "children",
        label: "Trẻ em",
        icon: Users,
        kind: "select",
        options: range(0, 4),
        defaultValue: "0",
      },
      {
        name: "budget",
        label: "Ngân sách/người",
        icon: Wallet,
        kind: "select",
        options: [
          "Dưới 3 triệu",
          "3–6 triệu",
          "6–10 triệu",
          "Trên 10 triệu",
          "Chưa rõ",
        ],
        defaultValue: "3–6 triệu",
      },
    ],
    prompt: (dest, v) => {
      const kids = v.children !== "0" ? `, ${v.children} trẻ em` : ""
      const budget =
        v.budget === "Chưa rõ"
          ? ""
          : `, ngân sách ${v.budget.toLowerCase()} mỗi người`
      return `Lên lịch trình ${dest} ${v.days} cho ${v.adults} người lớn${kids}, ${when(v.date)}${budget}.`
    },
  },
  {
    id: "hotel",
    label: "Khách sạn",
    icon: Hotel,
    columns: "lg:grid-cols-[1.25fr_1.15fr_0.85fr_1fr_1.35fr_1.1fr_auto]",
    submit: "Tìm chỗ ở",
    fields: [
      { name: "date", label: "Nhận phòng", icon: CalendarDays, kind: "date" },
      {
        name: "nights",
        label: "Số đêm",
        icon: Moon,
        kind: "select",
        options: range(1, 7, " đêm"),
        defaultValue: "2 đêm",
      },
      {
        name: "guests",
        label: "Số khách",
        icon: Users,
        kind: "select",
        options: [
          "1 người",
          "2 người",
          "2 lớn + 1 bé",
          "2 lớn + 2 bé",
          "Nhóm 4–6",
          "Nhóm trên 6",
        ],
        defaultValue: "2 người",
      },
      {
        name: "kind",
        label: "Loại chỗ ở",
        icon: BedDouble,
        kind: "select",
        options: [
          "Khách sạn 3★",
          "Khách sạn 4–5★",
          "Homestay",
          "Resort",
          "Du thuyền ngủ đêm",
        ],
        defaultValue: "Khách sạn 3★",
      },
      {
        name: "price",
        label: "Giá mỗi đêm",
        icon: Wallet,
        kind: "select",
        options: ["Dưới 800k", "800k – 1,5tr", "1,5 – 3tr", "Trên 3tr"],
        defaultValue: "800k – 1,5tr",
      },
    ],
    prompt: (dest, v) =>
      `Gợi ý ${v.kind.replace("★", " sao").toLowerCase()} ở ${dest} cho ${v.guests.toLowerCase()}, ${v.nights} ${when(v.date)}, giá khoảng ${v.price.toLowerCase()} mỗi đêm. Nên ở khu nào và vì sao?`,
  },
  {
    id: "food",
    label: "Ăn uống",
    icon: UtensilsCrossed,
    columns: "lg:grid-cols-[1.3fr_1fr_0.8fr_1.45fr_1.2fr_auto]",
    submit: "Gợi ý quán",
    fields: [
      {
        name: "meal",
        label: "Bữa",
        icon: Coffee,
        kind: "select",
        options: [
          "Cả ngày",
          "Bữa sáng",
          "Bữa trưa",
          "Bữa tối",
          "Ăn vặt, cà phê",
        ],
        defaultValue: "Cả ngày",
      },
      {
        name: "people",
        label: "Số người",
        icon: Users,
        kind: "select",
        options: range(1, 10),
        defaultValue: "2",
      },
      {
        name: "cuisine",
        label: "Muốn ăn",
        icon: Soup,
        kind: "select",
        options: [
          "Đặc sản địa phương",
          "Hải sản",
          "Quán vỉa hè",
          "Món chay",
          "Nhà hàng view đẹp",
        ],
        defaultValue: "Đặc sản địa phương",
      },
      {
        name: "price",
        label: "Giá mỗi người",
        icon: Wallet,
        kind: "select",
        options: ["Dưới 100k", "100 – 250k", "250 – 500k", "Trên 500k"],
        defaultValue: "100 – 250k",
      },
    ],
    prompt: (dest, v) => {
      const meal =
        v.meal === "Cả ngày" ? "cho cả ngày" : `cho ${v.meal.toLowerCase()}`
      return `Gợi ý quán ${v.cuisine.toLowerCase()} ở ${dest} ${meal}, ${v.people} người, khoảng ${v.price.toLowerCase()} mỗi người. Ghi rõ món nên gọi và khu vực.`
    },
  },
]

function when(date: string): string {
  return date
    ? `từ ngày ${new Date(date).toLocaleDateString("vi-VN")}`
    : "chưa chốt ngày"
}

/** Khung "tìm kiếm" như các trang đặt tour, nhưng kết quả là một câu hỏi gửi cho trợ lý. */
export function TripPlanner({
  defaultDestination,
}: {
  /** Tên điểm đến của slide đang hiện, dùng khi người dùng chưa tự chọn. */
  defaultDestination: string
}) {
  const planTrip = usePlanTrip()
  const [tabId, setTabId] = React.useState<Tab>("itinerary")
  const [destination, setDestination] = React.useState("")
  const tab = TABS.find((t) => t.id === tabId) ?? TABS[0]

  const destinationValue =
    destination ||
    DESTINATIONS.find((d) =>
      defaultDestination.includes(d.name.replace("Vịnh ", ""))
    )?.name ||
    DESTINATIONS[0].name

  // Hôm nay theo giờ máy, dạng yyyy-mm-dd cho thuộc tính `min` của ô ngày.
  const today = React.useMemo(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 10)
  }, [])

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const values: Values = {}
    for (const field of tab.fields)
      values[field.name] = String(form.get(field.name) ?? "")
    planTrip(tab.prompt(destinationValue, values))
  }

  return (
    <div>
      <div role="tablist" aria-label="Bạn cần gì" className="flex">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`planner-tab-${id}`}
            aria-selected={tabId === id}
            aria-controls="planner-panel"
            onClick={() => setTabId(id)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 px-2 py-3 text-[13px] font-semibold whitespace-nowrap transition-colors outline-none first:rounded-tl-lg last:rounded-tr-lg focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset sm:flex-none sm:gap-2 sm:px-6 sm:text-sm",
              tabId === id
                ? "bg-card text-primary"
                : "bg-sea-deep/80 text-white backdrop-blur hover:bg-sea-deep"
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {/* key: đổi tab thì các ô về giá trị mặc định của tab đó. */}
      <form
        key={tab.id}
        id="planner-panel"
        role="tabpanel"
        aria-labelledby={`planner-tab-${tab.id}`}
        onSubmit={onSubmit}
        className={cn(
          "grid animate-in gap-4 rounded-lg rounded-tl-none border-b-4 border-sea bg-card p-5 shadow-[0_20px_50px_-20px_rgb(10_79_85/0.45)] duration-300 fade-in sm:grid-cols-2 sm:p-6 lg:items-end",
          tab.columns
        )}
      >
        <PlannerField icon={MapPin} label="Điểm đến" htmlFor="destination">
          <select
            id="destination"
            value={destinationValue}
            onChange={(e) => setDestination(e.target.value)}
            className={FIELD}
          >
            {DESTINATIONS.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </PlannerField>

        {tab.fields.map((field) => (
          <PlannerField
            key={field.name}
            icon={field.icon}
            label={field.label}
            htmlFor={`planner-${field.name}`}
          >
            {field.kind === "date" ? (
              <input
                id={`planner-${field.name}`}
                name={field.name}
                type="date"
                min={today}
                className={FIELD}
              />
            ) : (
              <select
                id={`planner-${field.name}`}
                name={field.name}
                defaultValue={field.defaultValue}
                className={FIELD}
              >
                {field.options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            )}
          </PlannerField>
        ))}

        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 text-sm font-bold tracking-wide whitespace-nowrap text-white uppercase shadow-sm transition-colors outline-none hover:brightness-110 focus-visible:ring-[3px] focus-visible:ring-primary/40 sm:col-span-2 lg:col-span-1"
        >
          <Search className="size-4" />
          {tab.submit}
        </button>
      </form>
    </div>
  )
}

const FIELD =
  "h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"

function PlannerField({
  icon: Icon,
  label,
  htmlFor,
  children,
}: {
  icon: React.ElementType
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <label
        htmlFor={htmlFor}
        className="inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap text-muted-foreground"
      >
        <Icon className="size-3.5 text-primary" />
        {label}
      </label>
      {children}
    </div>
  )
}

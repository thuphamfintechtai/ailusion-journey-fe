/**
 * Các chỗ mâu thuẫn trong form chuyến đi (và giữa form với điều đã nói trong chat), để hỏi
 * lại người dùng trước khi lập lộ trình thay vì để máy tự đoán.
 *
 * Mỗi mâu thuẫn có vài cách xử lý: `apply` sửa form, `keep` giữ nguyên (người dùng xác nhận
 * là đúng ý). `id` gồm cả giá trị đang mâu thuẫn, nên đổi giá trị thì hỏi lại.
 */

import type { TripInfo } from "@/lib/api"
import type { TripForm } from "@/lib/itinerary"

export type ConflictOption = {
  label: string
  apply?: (f: TripForm) => TripForm
  keep?: true
}

export type Conflict = {
  id: string
  text: string
  options: ConflictOption[]
}

/** Bỏ dấu, chữ thường: so điểm đến không phân biệt cách gõ. */
export function plain(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

/** Nơi các điểm chơi cách xa nhau, đồi dốc, xe buýt nội vùng ít: đi bộ / xe buýt không ổn. */
const SPREAD_OUT = [
  "da lat",
  "phu quoc",
  "sa pa",
  "sapa",
  "ha long",
  "ha giang",
  "moc chau",
  "mai chau",
  "con dao",
  "cat ba",
  "ninh binh",
  "tam dao",
  "mui ne",
  "phan thiet",
  "quy nhon",
  "phu yen",
  "ly son",
  "cao bang",
  "buon ma thuot",
  "pleiku",
  "kon tum",
]

function kidsOf(f: TripForm): number {
  return (f.kids_under_6 ?? 0) + (f.kids_6_12 ?? 0)
}

/** Số người tối thiểu theo các ô đã khai: trẻ em cần ít nhất một người lớn đi kèm. */
function minPeople(f: TripForm): number {
  const kids = kidsOf(f)
  const seniors = f.seniors_65 ?? 0
  return Math.max(
    kids + seniors + (kids > 0 && seniors === 0 ? 1 : 0),
    f.wheelchair_users ?? 0,
    1
  )
}

function dropNeed(f: TripForm, need: string): TripForm {
  return {
    ...f,
    required_needs: (f.required_needs ?? []).filter((n) => n !== need),
  }
}

/** Thêm một trẻ: tăng số người nếu cần, một mình / cặp đôi thì thành gia đình. */
function withKid(f: TripForm, key: "kids_under_6" | "kids_6_12"): TripForm {
  const next = { ...f, [key]: (f[key] ?? 0) + 1 }
  const solo = next.group_type === "solo" || next.group_type === "couple"
  return {
    ...next,
    group_size: Math.max(next.group_size + (solo ? 1 : 0), minPeople(next)),
    group_type: solo ? "family" : next.group_type,
  }
}

function noKids(f: TripForm): TripForm {
  return {
    ...dropNeed(dropNeed(f, "high_chair"), "kids"),
    kids_under_6: 0,
    kids_6_12: 0,
  }
}

export function daysOf(f: TripForm): number {
  return (
    Math.round(
      (+new Date(`${f.end_date}T00:00:00`) -
        +new Date(`${f.start_date}T00:00:00`)) /
        86_400_000
    ) + 1
  )
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  const pad = (x: number) => String(x).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function viDate(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

/** Mâu thuẫn giữa các ô trong form. */
function formConflicts(f: TripForm): Conflict[] {
  const out: Conflict[] = []
  const kids = kidsOf(f)
  const needs = f.required_needs ?? []
  const size = f.group_size

  // Đi cùng ai <-> số người, trẻ em.
  if (f.group_type === "couple" && kids > 0) {
    out.push({
      id: `couple-kids:${kids}`,
      text: `Chọn “Cặp đôi” nhưng có ${kids} trẻ em đi cùng.`,
      options: [
        {
          label: "Đổi sang Gia đình",
          apply: (x) => ({ ...x, group_type: "family" }),
        },
        {
          label: "Không có trẻ em (2 người)",
          apply: (x) => ({ ...noKids(x), group_size: 2 }),
        },
      ],
    })
  } else if (f.group_type === "couple" && size !== 2) {
    out.push({
      id: `couple-size:${size}`,
      text: `Chọn “Cặp đôi” nhưng số người là ${size}.`,
      options: [
        { label: "Đặt 2 người", apply: (x) => ({ ...x, group_size: 2 }) },
        {
          label: "Đổi sang Bạn bè",
          apply: (x) => ({ ...x, group_type: "friends" }),
        },
        {
          label: "Đổi sang Gia đình",
          apply: (x) => ({ ...x, group_type: "family" }),
        },
      ],
    })
  }
  if (f.group_type === "solo" && (size !== 1 || kids > 0)) {
    out.push({
      id: `solo:${size}:${kids}`,
      text: `Chọn “Một mình” nhưng đoàn có ${size} người${kids ? `, ${kids} trẻ em` : ""}.`,
      options: [
        {
          label: "Đi 1 mình",
          apply: (x) => ({
            ...noKids(x),
            group_size: 1,
            seniors_65: Math.min(x.seniors_65 ?? 0, 1),
            wheelchair_users: Math.min(x.wheelchair_users ?? 0, 1),
          }),
        },
        {
          label: kids ? "Đổi sang Gia đình" : "Đổi sang Bạn bè",
          apply: (x) => ({ ...x, group_type: kids ? "family" : "friends" }),
        },
      ],
    })
  }

  // Số người không đủ chứa trẻ em / người già / người ngồi xe lăn đã khai.
  const need = minPeople(f)
  if (size < need) {
    const parts = [
      kids && `${kids} trẻ em`,
      f.seniors_65 && `${f.seniors_65} người từ 65 tuổi`,
      f.wheelchair_users && `${f.wheelchair_users} người ngồi xe lăn`,
    ].filter(Boolean)
    out.push({
      id: `size:${size}:${need}`,
      text: `Số người là ${size} nhưng đã khai ${parts.join(", ")}${kids && !f.seniors_65 ? " (trẻ em cần người lớn đi kèm)" : ""}.`,
      options: [
        {
          label: `Đặt ${need} người`,
          apply: (x) => ({ ...x, group_size: need }),
        },
      ],
    })
  }

  // Nhu cầu bắt buộc <-> thành phần đoàn.
  if (needs.includes("high_chair") && !(f.kids_under_6 ?? 0)) {
    out.push({
      id: "need-high-chair",
      text: "Chọn “Ghế cao cho bé” nhưng đoàn không có trẻ dưới 6 tuổi.",
      options: [
        { label: "Bỏ ghế cao cho bé", apply: (x) => dropNeed(x, "high_chair") },
        {
          label: "Có 1 bé dưới 6 tuổi",
          apply: (x) => withKid(x, "kids_under_6"),
        },
      ],
    })
  }
  if (needs.includes("kids") && kids === 0) {
    out.push({
      id: "need-kids",
      text: "Chọn “Hợp trẻ em” nhưng đoàn không có trẻ em.",
      options: [
        { label: "Bỏ “Hợp trẻ em”", apply: (x) => dropNeed(x, "kids") },
        { label: "Có 1 trẻ 6–12 tuổi", apply: (x) => withKid(x, "kids_6_12") },
      ],
    })
  }
  if (needs.includes("wheelchair") && !(f.wheelchair_users ?? 0)) {
    out.push({
      id: "need-wheelchair",
      text: "Chọn “Lối xe lăn” nhưng chưa khai ai ngồi xe lăn.",
      options: [
        { label: "Bỏ lối xe lăn", apply: (x) => dropNeed(x, "wheelchair") },
        {
          label: "Có 1 người ngồi xe lăn",
          apply: (x) => ({ ...x, wheelchair_users: 1 }),
        },
      ],
    })
  }
  if (
    needs.includes("car_parking") &&
    f.travel_mode &&
    f.travel_mode !== "car"
  ) {
    out.push({
      id: `need-parking:${f.travel_mode}`,
      text: "Chọn “Chỗ đỗ ô tô” nhưng không tự lái ô tô.",
      options: [
        { label: "Bỏ chỗ đỗ ô tô", apply: (x) => dropNeed(x, "car_parking") },
        {
          label: "Đổi sang Ô tô tự lái",
          apply: (x) => ({ ...x, travel_mode: "car" }),
        },
      ],
    })
  }

  // Phương tiện <-> điểm đến, thành phần đoàn.
  if (f.travel_mode === "bus") {
    const dest = plain(f.destination)
    const spread = dest && SPREAD_OUT.some((p) => dest.includes(p))
    const wheel = (f.wheelchair_users ?? 0) > 0
    if (spread || wheel) {
      const why = spread
        ? `${f.destination.trim()} có các điểm chơi cách xa nhau, nhiều dốc, xe buýt nội vùng rất ít`
        : "Đoàn có người ngồi xe lăn"
      out.push({
        id: `bus:${dest}:${wheel}`,
        text: `${why} — đi bộ, xe buýt sẽ mất rất nhiều thời gian và đi được ít chỗ trong ${daysOf(f)} ngày.`,
        options: [
          {
            label: "Đổi sang Grab, taxi",
            apply: (x) => ({ ...x, travel_mode: "taxi" }),
          },
          ...(wheel
            ? []
            : [
                {
                  label: "Đổi sang Xe máy",
                  apply: (x: TripForm) => ({
                    ...x,
                    travel_mode: "motorbike" as const,
                  }),
                },
              ]),
          { label: "Vẫn đi bộ, xe buýt", keep: true },
        ],
      })
    }
  }
  return out
}

/** Điều đã nói trong chat khác với form: hỏi lấy bên nào. */
function chatConflicts(f: TripForm, info: TripInfo | null): Conflict[] {
  if (!info) return []
  const out: Conflict[] = []
  const chatDest = info.destination?.trim()
  const formDest = f.destination.trim()
  if (chatDest && formDest && plain(chatDest) !== plain(formDest)) {
    out.push({
      id: `chat-dest:${plain(chatDest)}:${plain(formDest)}`,
      text: `Trong chat bạn nói đi “${chatDest}”, form đang ghi “${formDest}”. Lập lộ trình cho nơi nào?`,
      options: [
        { label: chatDest, apply: (x) => ({ ...x, destination: chatDest }) },
        { label: formDest, keep: true },
      ],
    })
  }
  const days = daysOf(f)
  if (info.days && info.days !== days && days >= 1) {
    const chatDays = info.days
    out.push({
      id: `chat-days:${chatDays}:${days}`,
      text: `Trong chat bạn nói đi ${chatDays} ngày, form đang chọn ${days} ngày.`,
      options: [
        {
          label: `${chatDays} ngày`,
          apply: (x) => ({
            ...x,
            end_date: addDays(x.start_date, chatDays - 1),
          }),
        },
        { label: `${days} ngày`, keep: true },
      ],
    })
  }
  if (
    info.start_date &&
    /^\d{4}-\d{2}-\d{2}$/.test(info.start_date) &&
    info.start_date !== f.start_date
  ) {
    const chatStart = info.start_date
    out.push({
      id: `chat-start:${chatStart}:${f.start_date}`,
      text: `Trong chat bạn nói đi ngày ${viDate(chatStart)}, form đang chọn ${viDate(f.start_date)}.`,
      options: [
        {
          label: viDate(chatStart),
          apply: (x) => ({
            ...x,
            start_date: chatStart,
            end_date: addDays(chatStart, daysOf(x) - 1),
          }),
        },
        { label: viDate(f.start_date), keep: true },
      ],
    })
  }
  const chatSize =
    info.adults !== null || info.children !== null || info.seniors !== null
      ? (info.adults ?? 0) + (info.children ?? 0) + (info.seniors ?? 0)
      : 0
  if (chatSize > 0 && chatSize !== f.group_size) {
    out.push({
      id: `chat-size:${chatSize}:${f.group_size}`,
      text: `Trong chat bạn nói đi ${chatSize} người, form đang ghi ${f.group_size} người.`,
      options: [
        {
          label: `${chatSize} người`,
          apply: (x) => ({ ...x, group_size: chatSize }),
        },
        { label: `${f.group_size} người`, keep: true },
      ],
    })
  }
  return out
}

export function conflictsOf(f: TripForm, chat: TripInfo | null): Conflict[] {
  return [...chatConflicts(f, chat), ...formConflicts(f)]
}

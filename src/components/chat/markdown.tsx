"use client"

import * as React from "react"
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  Coffee,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Câu trả lời của trợ lý là Markdown. Ngoài kiểu chữ chung, bộ hiển thị nhận ra hai cấu
 * trúc hay gặp trong lịch trình để dễ đọc lướt:
 * - "Ngày 1: ..." (tiêu đề hoặc dòng in đậm) -> khối ngày có số thứ tự.
 * - "Sáng:", "Trưa:", "Tối:" ... ở đầu một dòng -> nhãn buổi có màu.
 * react-markdown không render HTML thô nên không có rủi ro chèn script.
 */

type HastNode = ExtraProps["node"]

/** Chữ thuần của một nút hast (bỏ định dạng). */
function textOf(node: unknown): string {
  if (!node || typeof node !== "object") return ""
  const n = node as { type?: string; value?: string; children?: unknown[] }
  if (n.type === "text") return n.value ?? ""
  return (n.children ?? []).map(textOf).join("")
}

/** Chữ của phần in đậm đứng đầu đoạn/mục, nếu đoạn/mục mở đầu bằng chữ in đậm. */
function leadingStrong(node: HastNode): string | null {
  const first = node?.children?.find(
    (c) => !(c.type === "text" && !c.value.trim())
  )
  if (first?.type !== "element" || first.tagName !== "strong") return null
  return textOf(first).trim()
}

const DAY_RE = /^(?:ngày|day)\s*(\d+)\b\s*[:.\-–—]?\s*(.*)$/i

function DayHeading({ title }: { title: string }) {
  const match = DAY_RE.exec(title)
  const number = match?.[1]
  const rest = match?.[2]?.replace(/[:*]+$/, "").trim()
  return (
    <div className="mt-7 mb-3 flex items-center gap-3 first:mt-0">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand font-display text-sm font-extrabold text-white shadow-md shadow-primary/25">
        {number}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold tracking-[0.12em] text-primary uppercase">
          Ngày {number}
        </p>
        {rest && (
          <p className="font-display text-[15px] leading-snug font-bold">
            {rest}
          </p>
        )}
      </div>
      <span aria-hidden className="ml-1 h-px flex-1 bg-border" />
    </div>
  )
}

type Period = { icon: LucideIcon; className: string }

/** Nhãn buổi trong ngày -> biểu tượng và màu. Thứ tự quan trọng: "sáng sớm" trước "sáng". */
const PERIODS: [RegExp, Period][] = [
  [
    /^(?:buổi\s+)?sáng sớm/i,
    {
      icon: Sunrise,
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
    },
  ],
  [
    /^(?:buổi\s+)?sáng/i,
    {
      icon: Sun,
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
    },
  ],
  [
    /^(?:buổi\s+)?trưa/i,
    {
      icon: Coffee,
      className:
        "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300",
    },
  ],
  [
    /^(?:buổi\s+)?chiều/i,
    {
      icon: Sunset,
      className:
        "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300",
    },
  ],
  [
    /^(?:buổi\s+)?(?:tối|đêm|khuya)/i,
    {
      icon: Moon,
      className:
        "bg-indigo-100 text-indigo-800 dark:bg-indigo-400/15 dark:text-indigo-300",
    },
  ],
]

function periodOf(label: string | null): Period | null {
  if (!label || label.length > 32) return null
  return PERIODS.find(([re]) => re.test(label))?.[1] ?? null
}

function PeriodPill({ label, period }: { label: string; period: Period }) {
  const Icon = period.icon
  return (
    <span
      className={cn(
        "mr-1.5 inline-flex translate-y-[-1px] items-center gap-1 rounded-full px-2 py-0.5 align-middle text-[12px] font-semibold",
        period.className
      )}
    >
      <Icon className="size-3.5" />
      {label.replace(/:\s*$/, "")}
    </span>
  )
}

/** Bỏ phần tử đầu (chữ in đậm đã được vẽ lại thành nhãn) và khoảng trắng/dấu ":" ngay sau nó. */
function afterLeading(children: React.ReactNode): React.ReactNode[] {
  const rest = React.Children.toArray(children)
  const start = rest.findIndex((c) => typeof c !== "string" || c.trim() !== "")
  const tail = rest.slice(start + 1)
  if (typeof tail[0] === "string") tail[0] = tail[0].replace(/^\s*:?\s*/, "")
  return tail
}

/** react-markdown truyền kèm `node` (cây AST); không được rải nó xuống thẻ HTML. */
function withoutNode<T extends { node?: unknown }>(props: T): Omit<T, "node"> {
  const rest = { ...props }
  delete rest.node
  return rest
}

function heading(level: "h1" | "h2" | "h3" | "h4", className: string) {
  const Heading = ({
    node,
    children,
    ...props
  }: React.ComponentProps<"h1"> & ExtraProps) => {
    const text = textOf(node).trim()
    if (DAY_RE.test(text)) return <DayHeading title={text} />
    const Tag =
      level === "h1" || level === "h2" ? "h3" : level === "h3" ? "h4" : "h5"
    return (
      <Tag className={className} {...props}>
        {children}
      </Tag>
    )
  }
  return Heading
}

const COMPONENTS: Components = {
  h1: heading("h1", "mt-6 mb-2 font-display text-lg font-extrabold first:mt-0"),
  h2: heading(
    "h2",
    "mt-6 mb-2 font-display text-base font-extrabold first:mt-0"
  ),
  h3: heading(
    "h3",
    "mt-5 mb-2 flex items-center gap-2 font-display text-[15px] font-bold text-foreground first:mt-0 before:h-4 before:w-1 before:rounded-full before:bg-brand"
  ),
  h4: heading("h4", "mt-4 mb-1 font-semibold first:mt-0"),
  p: ({ node, children, ...props }) => {
    const lead = leadingStrong(node)
    // Cả đoạn chỉ là "**Ngày 1: ...**" -> khối ngày.
    if (
      lead &&
      DAY_RE.test(lead) &&
      textOf(node).trim().length <= lead.length + 2
    )
      return <DayHeading title={lead} />
    const period = periodOf(lead)
    return (
      <p className="my-2.5 first:mt-0 last:mb-0" {...props}>
        {lead && period ? (
          <>
            <PeriodPill label={lead} period={period} />
            {afterLeading(children)}
          </>
        ) : (
          children
        )}
      </p>
    )
  },
  ul: (props) => (
    <ul className="my-2.5 ml-1 space-y-2" {...withoutNode(props)} />
  ),
  ol: (props) => (
    <ol
      className="my-2.5 ml-5 list-decimal space-y-2 marker:font-bold marker:text-primary"
      {...withoutNode(props)}
    />
  ),
  li: ({ node, children, ...props }) => {
    const lead = leadingStrong(node)
    const period = periodOf(lead)
    return (
      // Chấm đầu dòng tự vẽ cho <ul>; trong <ol> thì để số của trình duyệt.
      <li
        className="relative pl-5 leading-relaxed before:absolute before:top-[0.6em] before:left-1 before:size-1.5 before:rounded-full before:bg-sea/70 [ol>&]:pl-1 [ol>&]:before:hidden"
        {...props}
      >
        {lead && period ? (
          <>
            <PeriodPill label={lead} period={period} />
            {afterLeading(children)}
          </>
        ) : (
          children
        )}
      </li>
    )
  },
  strong: (props) => (
    <strong className="font-semibold text-foreground" {...withoutNode(props)} />
  ),
  em: (props) => (
    <em className="text-muted-foreground" {...withoutNode(props)} />
  ),
  a: (props) => (
    <a
      className="font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
      target="_blank"
      rel="noreferrer"
      {...withoutNode(props)}
    />
  ),
  hr: () => <hr className="my-6 border-dashed border-border" />,
  blockquote: (props) => (
    <blockquote
      className="my-3 rounded-r-xl border-l-4 border-sea bg-accent/50 px-4 py-2.5 text-[14px] text-accent-foreground [&_p]:my-1"
      {...withoutNode(props)}
    />
  ),
  table: (props) => (
    <div className="my-4 overflow-x-auto rounded-xl border">
      <table
        className="w-full border-collapse text-[13px] tabular-nums"
        {...withoutNode(props)}
      />
    </div>
  ),
  thead: (props) => <thead className="bg-muted" {...withoutNode(props)} />,
  th: (props) => (
    <th
      className="border-b px-3 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
      {...withoutNode(props)}
    />
  ),
  td: (props) => (
    <td className="border-b px-3 py-2 align-top" {...withoutNode(props)} />
  ),
  tr: (props) => (
    <tr
      className="even:bg-muted/40 last:[&>td]:border-b-0"
      {...withoutNode(props)}
    />
  ),
  code: (props) => (
    <code
      className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]"
      {...withoutNode(props)}
    />
  ),
}

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
      {children}
    </ReactMarkdown>
  )
}

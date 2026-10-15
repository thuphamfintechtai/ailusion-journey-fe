"use client"

import * as React from "react"
import { Check, Copy, ExternalLink, Link2 } from "lucide-react"
import { DropdownMenu } from "radix-ui"

import { cn } from "@/lib/utils"

// Trang project trên công cụ theo dõi LLM (đặt trong .env, mỗi môi trường một project):
// LangSmith: https://smith.langchain.com/o/<tổ chức>/projects/p/<project>
// Langfuse:  https://us.cloud.langfuse.com/project/<project>
const LANGSMITH = process.env.NEXT_PUBLIC_LANGSMITH_PROJECT_URL?.replace(
  /\/$/,
  ""
)
const LANGFUSE = process.env.NEXT_PUBLIC_LANGFUSE_PROJECT_URL?.replace(
  /\/$/,
  ""
)

type Entry = { key: string; label: string; value: string; open?: boolean }

const ITEM =
  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-trip-ink outline-none select-none data-[highlighted]:bg-trip-sheet-2"

/**
 * Icon mã truy vết để debug: bấm ra menu copy mã / link LangSmith / link Langfuse, hoặc mở link.
 * `threadId` là thread của LLM service (Langfuse gom thành 1 session); `runId` là run gốc trên
 * LangSmith (có thì link mở thẳng trace, không thì mở project để tìm theo metadata `thread_id`).
 */
export function TraceIds({
  threadId,
  runId,
  className,
}: {
  threadId: string
  runId?: string | null
  className?: string
}) {
  const [copied, setCopied] = React.useState<string | null>(null)
  const langsmith = LANGSMITH
    ? runId
      ? `${LANGSMITH}/r/${runId}?poll=true`
      : LANGSMITH
    : null
  const langfuse = LANGFUSE
    ? `${LANGFUSE}/sessions/${encodeURIComponent(threadId)}`
    : null
  const entries: Entry[] = [
    { key: "id", label: "mã truy vết", value: threadId },
    ...(langsmith
      ? [{ key: "ls", label: "link LangSmith", value: langsmith, open: true }]
      : []),
    ...(langfuse
      ? [{ key: "lf", label: "link Langfuse", value: langfuse, open: true }]
      : []),
  ]
  const copy = (e: Entry) =>
    navigator.clipboard.writeText(e.value).then(() => {
      setCopied(e.key)
      window.setTimeout(() => setCopied(null), 1500)
    })

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Mã truy vết ${threadId}`}
          title="Mã truy vết (LangSmith / Langfuse)"
          className={cn(
            "inline-grid size-6 shrink-0 place-items-center rounded-full text-trip-ink-3 outline-none hover:bg-trip-sheet-2 hover:text-trip-ink focus-visible:ring-2 focus-visible:ring-trip-sky/40",
            className
          )}
        >
          <Link2 className="size-3.5" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-[70] min-w-[230px] rounded-xl border border-trip-line bg-trip-sheet p-1 shadow-lg"
        >
          <DropdownMenu.Label className="px-2 pt-1 pb-1.5 font-mono text-[11.5px] text-trip-ink-3">
            {threadId}
          </DropdownMenu.Label>
          {entries.map((e) => (
            <DropdownMenu.Item
              key={e.key}
              className={ITEM}
              onSelect={(ev) => {
                ev.preventDefault() // giữ menu mở để thấy dấu đã copy
                void copy(e)
              }}
            >
              {copied === e.key ? (
                <Check className="size-3.5 text-trip-jade" />
              ) : (
                <Copy className="size-3.5 text-trip-ink-3" />
              )}
              <span className="flex-1">
                {copied === e.key ? "Đã copy" : `Copy ${e.label}`}
              </span>
              {e.open && (
                <a
                  href={e.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Mở ${e.label.replace("link ", "")}`}
                  onClick={(ev) => ev.stopPropagation()}
                  className="grid size-5 place-items-center rounded text-trip-sky hover:bg-trip-sheet"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

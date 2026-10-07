"use client"

import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

/**
 * Câu trả lời của trợ lý là Markdown (tiêu đề ngày, gạch đầu dòng, chữ đậm).
 * react-markdown không render HTML thô nên không có rủi ro chèn script.
 */
const COMPONENTS: Components = {
  h1: (props) => (
    <h3
      className="mt-4 mb-2 font-display text-lg font-bold first:mt-0"
      {...withoutNode(props)}
    />
  ),
  h2: (props) => (
    <h3
      className="mt-4 mb-2 font-display text-base font-bold first:mt-0"
      {...withoutNode(props)}
    />
  ),
  h3: (props) => (
    <h4
      className="mt-6 mb-3 flex items-center gap-2 rounded-lg border-l-4 border-sea bg-accent/70 px-3 py-2 font-display text-[15px] font-bold text-accent-foreground first:mt-0"
      {...withoutNode(props)}
    />
  ),
  h4: (props) => (
    <h5
      className="mt-3 mb-1 font-semibold first:mt-0"
      {...withoutNode(props)}
    />
  ),
  p: (props) => (
    <p className="my-2 first:mt-0 last:mb-0" {...withoutNode(props)} />
  ),
  ul: (props) => (
    <ul
      className="my-2 ml-5 list-disc space-y-1 marker:text-sea"
      {...withoutNode(props)}
    />
  ),
  ol: (props) => (
    <ol
      className="my-2 ml-5 list-decimal space-y-1 marker:font-semibold marker:text-primary"
      {...withoutNode(props)}
    />
  ),
  li: (props) => <li className="pl-1" {...withoutNode(props)} />,
  strong: (props) => (
    <strong className="font-semibold text-foreground" {...withoutNode(props)} />
  ),
  a: (props) => (
    <a
      className="font-medium text-primary underline underline-offset-2"
      target="_blank"
      rel="noreferrer"
      {...withoutNode(props)}
    />
  ),
  hr: () => <hr className="my-5 border-dashed border-border" />,
  blockquote: (props) => (
    <blockquote
      className="my-2 border-l-4 border-sea/60 bg-accent/50 px-3 py-1.5 text-muted-foreground"
      {...withoutNode(props)}
    />
  ),
  table: (props) => (
    <div className="my-3 overflow-x-auto rounded-lg border">
      <table
        className="w-full border-collapse text-[13px]"
        {...withoutNode(props)}
      />
    </div>
  ),
  th: (props) => (
    <th
      className="border-b bg-muted px-3 py-2 text-left font-semibold"
      {...withoutNode(props)}
    />
  ),
  td: (props) => (
    <td className="border-b px-3 py-2 align-top" {...withoutNode(props)} />
  ),
  code: (props) => (
    <code
      className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]"
      {...withoutNode(props)}
    />
  ),
}

/** react-markdown truyền kèm `node` (cây AST); không được rải nó xuống thẻ HTML. */
function withoutNode<T extends { node?: unknown }>(props: T): Omit<T, "node"> {
  const rest = { ...props }
  delete rest.node
  return rest
}

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
      {children}
    </ReactMarkdown>
  )
}

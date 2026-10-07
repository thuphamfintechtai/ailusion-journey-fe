"use client"

import * as React from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/** Độ dài tối thiểu, khớp với kiểu `Password` bên backend. */
export const MIN_PASSWORD_LENGTH = 8

export function AuthHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">
        {eyebrow}
      </p>
      <h1 className="font-display text-3xl leading-tight font-extrabold tracking-tight">
        {title}
      </h1>
      {children && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {children}
        </p>
      )}
    </div>
  )
}

export function Field({
  id,
  label,
  hint,
  action,
  children,
}: {
  id: string
  label: string
  hint?: React.ReactNode
  /** Phần tử nhỏ bên phải nhãn, ví dụ link "Quên mật khẩu?". */
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  )
}

export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = React.useState(false)
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={cn("h-11 bg-card pr-10", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

export function FormError({ children }: { children: React.ReactNode }) {
  if (!children) return null
  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
    >
      {children}
    </div>
  )
}

export function SubmitButton({
  pending,
  children,
}: {
  pending: boolean
  children: React.ReactNode
}) {
  return (
    <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  )
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

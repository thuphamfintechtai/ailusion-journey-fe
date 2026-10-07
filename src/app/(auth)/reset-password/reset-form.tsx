"use client"

import * as React from "react"
import Link from "next/link"
import { CircleCheck, LinkIcon } from "lucide-react"

import {
  AuthHeader,
  Field,
  FormError,
  MIN_PASSWORD_LENGTH,
  PasswordInput,
  SubmitButton,
  errorMessage,
} from "@/components/auth/form"
import { Button } from "@/components/ui/button"
import { ApiError, INVALID_RESET_TOKEN, auth } from "@/lib/api"

type Status = "form" | "done" | "invalid"

export function ResetPasswordForm({ token }: { token: string | null }) {
  const [status, setStatus] = React.useState<Status>(token ? "form" : "invalid")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    const form = new FormData(event.currentTarget)
    const password = String(form.get("password"))

    if (password !== String(form.get("confirm"))) {
      setError("Hai lần nhập mật khẩu chưa khớp nhau.")
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      await auth.resetPassword(token, password)
      setStatus("done")
    } catch (err) {
      if (err instanceof ApiError && err.code === INVALID_RESET_TOKEN)
        setStatus("invalid")
      else setError(errorMessage(err, "Không đặt lại được mật khẩu"))
    } finally {
      setSubmitting(false)
    }
  }

  if (status === "done") {
    return (
      <Outcome
        icon={<CircleCheck className="size-6" />}
        eyebrow="Hoàn tất"
        title="Đã đổi mật khẩu"
        description="Từ giờ hãy đăng nhập bằng mật khẩu mới. Liên kết trong email đã hết hiệu lực."
        action={{ href: "/login", label: "Đăng nhập" }}
      />
    )
  }

  if (status === "invalid") {
    return (
      <Outcome
        tone="warn"
        icon={<LinkIcon className="size-6" />}
        eyebrow="Liên kết không dùng được"
        title="Liên kết đã hết hạn"
        description="Liên kết đặt lại mật khẩu chỉ dùng được một lần, trong 30 phút, và hết hiệu lực khi mật khẩu đã được đổi. Hãy yêu cầu một liên kết mới."
        action={{ href: "/forgot-password", label: "Gửi liên kết mới" }}
      />
    )
  }

  return (
    <div className="grid gap-8">
      <AuthHeader eyebrow="Đặt lại mật khẩu" title="Chọn mật khẩu mới">
        Sau khi đổi, bạn sẽ dùng mật khẩu này cho mọi lần đăng nhập.
      </AuthHeader>

      <form onSubmit={onSubmit} className="grid gap-5">
        <Field
          id="password"
          label="Mật khẩu mới"
          hint={`Ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`}
        >
          <PasswordInput
            id="password"
            name="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            autoFocus
            aria-describedby="password-hint"
          />
        </Field>

        <Field id="confirm" label="Nhập lại mật khẩu mới">
          <PasswordInput
            id="confirm"
            name="confirm"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
          />
        </Field>

        <FormError>{error}</FormError>

        <SubmitButton pending={submitting}>Đổi mật khẩu</SubmitButton>
      </form>
    </div>
  )
}

function Outcome({
  tone = "ok",
  icon,
  eyebrow,
  title,
  description,
  action,
}: {
  tone?: "ok" | "warn"
  icon: React.ReactNode
  eyebrow: string
  title: string
  description: string
  action: { href: string; label: string }
}) {
  return (
    <div className="grid gap-8">
      <div
        className={
          tone === "ok"
            ? "grid size-12 place-items-center rounded-xl bg-accent text-accent-foreground"
            : "grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive"
        }
      >
        {icon}
      </div>
      <AuthHeader eyebrow={eyebrow} title={title}>
        {description}
      </AuthHeader>
      <Button asChild size="lg" className="h-11">
        <Link href={action.href}>{action.label}</Link>
      </Button>
    </div>
  )
}

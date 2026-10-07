"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, MailCheck } from "lucide-react"

import {
  AuthHeader,
  Field,
  FormError,
  SubmitButton,
  errorMessage,
} from "@/components/auth/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { auth } from "@/lib/api"

/** Chặn bấm "Gửi lại" liên tục trong khoảng này. */
const RESEND_COOLDOWN_S = 60

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [cooldown, setCooldown] = React.useState(0)

  React.useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  async function send(email: string) {
    setError(null)
    setSubmitting(true)
    try {
      await auth.forgotPassword(email)
      setSentTo(email)
      setCooldown(RESEND_COOLDOWN_S)
    } catch (err) {
      setError(errorMessage(err, "Không gửi được yêu cầu"))
    } finally {
      setSubmitting(false)
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get("email"))
    void send(email.trim())
  }

  if (sentTo) {
    return (
      <div className="grid gap-8">
        <div className="grid size-12 place-items-center rounded-xl bg-accent text-accent-foreground">
          <MailCheck className="size-6" />
        </div>
        <AuthHeader eyebrow="Đã gửi yêu cầu" title="Kiểm tra hộp thư">
          Nếu <span className="font-medium text-foreground">{sentTo}</span> đã
          đăng ký, bạn sẽ nhận được email có liên kết đặt lại mật khẩu. Liên kết
          dùng được một lần và hết hạn sau 30 phút.
        </AuthHeader>

        <FormError>{error}</FormError>

        <div className="grid gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 bg-card"
            disabled={cooldown > 0 || submitting}
            onClick={() => void send(sentTo)}
          >
            {cooldown > 0 ? `Gửi lại sau ${cooldown} giây` : "Gửi lại email"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSentTo(null)
              setError(null)
            }}
          >
            Dùng email khác
          </Button>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Không thấy email? Hãy xem thư mục Spam hoặc Quảng cáo.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-8">
      <AuthHeader eyebrow="Quên mật khẩu" title="Lấy lại quyền truy cập">
        Nhập email bạn đã dùng để đăng ký. Chúng tôi sẽ gửi liên kết để đặt mật
        khẩu mới.
      </AuthHeader>

      <form onSubmit={onSubmit} className="grid gap-5">
        <Field id="email" label="Email">
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            autoFocus
            placeholder="ban@vidu.vn"
            className="h-11 bg-card"
          />
        </Field>

        <FormError>{error}</FormError>

        <SubmitButton pending={submitting}>Gửi liên kết</SubmitButton>
      </form>

      <Link
        href="/login"
        className="inline-flex items-center justify-center gap-1.5 rounded-sm text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" />
        Quay lại đăng nhập
      </Link>
    </div>
  )
}

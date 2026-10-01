"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth"

type Mode = "login" | "register"

export default function LoginPage() {
  const { user, loading, login, register } = useAuth()
  const router = useRouter()

  const [mode, setMode] = React.useState<Mode>("login")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  // Đã đăng nhập rồi thì không ở lại trang này.
  React.useEffect(() => {
    if (!loading && user) router.replace("/chat")
  }, [loading, user, router])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get("email") ?? "")
    const password = String(form.get("password") ?? "")
    const fullName = String(form.get("full_name") ?? "")

    setError(null)
    setSubmitting(true)
    try {
      if (mode === "login") await login(email, password)
      else await register(email, password, fullName)
      router.replace("/chat")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Ailusion Journey</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Đăng nhập để trò chuyện với trợ lý du lịch."
              : "Tạo tài khoản mới."}
          </CardDescription>
        </CardHeader>

        <form onSubmit={onSubmit}>
          <CardContent className="grid gap-4">
            {mode === "register" && (
              <div className="grid gap-2">
                <Label htmlFor="full_name">Họ tên</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  placeholder="Nguyễn Văn A"
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
              {mode === "register" && (
                <p className="text-xs text-muted-foreground">
                  Tối thiểu 8 ký tự.
                </p>
              )}
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}
          </CardContent>

          <CardFooter className="mt-6 flex-col gap-3">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting
                ? "Đang xử lý…"
                : mode === "login"
                  ? "Đăng nhập"
                  : "Đăng ký"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login")
                setError(null)
              }}
            >
              {mode === "login"
                ? "Chưa có tài khoản? Đăng ký"
                : "Đã có tài khoản? Đăng nhập"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}

"use client"

import { useRouter } from "next/navigation"

import { useAuth } from "@/lib/auth"
import { savePendingPrompt } from "@/lib/pending-prompt"

/** Gửi một câu hỏi sang màn chat; chưa đăng nhập thì đi qua trang đăng ký trước. */
export function usePlanTrip(): (prompt: string) => void {
  const { user } = useAuth()
  const router = useRouter()

  return (prompt: string) => {
    savePendingPrompt(prompt)
    router.push(user ? "/chat" : "/register")
  }
}

/**
 * Câu hỏi soạn sẵn ở trang chủ, chờ gửi khi người dùng vào /chat.
 *
 * Giữ trong sessionStorage để đi qua được bước đăng ký / đăng nhập mà không phải nhét
 * nội dung chuyến đi lên URL.
 */

const KEY = "ailusion.pending-prompt"

export function savePendingPrompt(prompt: string): void {
  try {
    sessionStorage.setItem(KEY, prompt)
  } catch {
    // Trình duyệt chặn storage: người dùng vẫn vào được /chat, chỉ không có câu hỏi soạn sẵn.
  }
}

export function peekPendingPrompt(): string | null {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function takePendingPrompt(): string | null {
  const prompt = peekPendingPrompt()
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // như trên
  }
  return prompt
}

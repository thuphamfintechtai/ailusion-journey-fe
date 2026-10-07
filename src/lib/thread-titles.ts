/**
 * Tiêu đề hội thoại, lưu ở máy người dùng.
 *
 * Backend mới trả `thread_id` và thời điểm dùng gần nhất, chưa có tiêu đề. Tạm lấy câu hỏi
 * đầu tiên của mỗi hội thoại làm tiêu đề; hội thoại tạo ở máy khác sẽ hiện theo thời gian.
 * Khi backend có trường `title`, bỏ file này.
 */

const KEY = "ailusion.thread-titles"
const MAX_LENGTH = 80

type Titles = Record<string, string>

function read(): Titles {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Titles
  } catch {
    return {}
  }
}

export function getThreadTitles(): Titles {
  return read()
}

export function saveThreadTitle(threadId: string, firstMessage: string): void {
  const titles = read()
  if (titles[threadId]) return
  const oneLine = firstMessage.replace(/\s+/g, " ").trim()
  titles[threadId] =
    oneLine.length > MAX_LENGTH
      ? `${oneLine.slice(0, MAX_LENGTH - 1)}…`
      : oneLine
  try {
    localStorage.setItem(KEY, JSON.stringify(titles))
  } catch {
    // Hết chỗ hoặc bị chặn: sidebar sẽ hiện theo thời gian.
  }
}

export function forgetThreadTitle(threadId: string): void {
  const titles = read()
  delete titles[threadId]
  try {
    localStorage.setItem(KEY, JSON.stringify(titles))
  } catch {
    // như trên
  }
}

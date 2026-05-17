export const dayMs = 24 * 60 * 60 * 1000

export const formatDate = (date) => {
  if (!date) return "Never"

  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export const formatTime = (date) => {
  if (!date) return "-"

  return new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export const getLastDays = (amount = 7) => {
  const today = new Date()

  return Array.from({ length: amount }).map((_, index) => {
    const date = new Date(today.getTime() - (amount - 1 - index) * dayMs)
    date.setHours(0, 0, 0, 0)
    return date
  })
}

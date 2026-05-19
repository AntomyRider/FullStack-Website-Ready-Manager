import { useEffect, useMemo, useState } from "react"
import {
  Ban,
  CalendarClock,
  CheckCircle2,
  KeyRound,
  Loader2,
  RefreshCcw,
  Trash2,
} from "lucide-react"
import { listKey } from "../api/licenses"

import { dayMs, getLastDays } from "../utils/formatters"
import StatCard from "../components/dashboard/StatCard"
import UsageChart from "../components/dashboard/UsageChart"
import StatusDonut from "../components/dashboard/StatusDonut"
import ActivityFeed from "../components/dashboard/ActivityFeed"
import TablePreview from "../components/dashboard/TablePreview"

const hasBoundHwids = (license) => {
  return !!license.hwid
}

const Dashboard = () => {
  const [licenses, setLicenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadDashboard = async () => {
      setLoading(true)
      const res = await listKey()

      if (mounted) {
        setLicenses(Array.isArray(res.data) ? res.data : [])
        setLoading(false)
      }
    }

    loadDashboard()

    return () => {
      mounted = false
    }
  }, [])

  const dashboard = useMemo(() => {
    const now = new Date()
    const soon = new Date(now.getTime() + 7 * dayMs)
    const sorted = [...licenses].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    const active = licenses.filter((item) => item.status === "Enable").length
    const disabled = licenses.filter((item) => item.status === "Disable").length
    const expiringSoon = licenses.filter((item) => {
      if (!item.expireAt) return false
      const expireAt = new Date(item.expireAt)
      return expireAt >= now && expireAt <= soon
    }).length

    const days = getLastDays(7)
    const usage = days.map((date) => {
      const next = new Date(date.getTime() + dayMs)
      const count = licenses.filter((item) => {
        const createdAt = new Date(item.createdAt)
        return createdAt >= date && createdAt < next
      }).length

      return {
        label: date.toLocaleDateString("en-GB", { weekday: "short" }),
        count,
      }
    })

    const activities = sorted
      .flatMap((license) => {
        const entries = [
          {
            type: "created",
            title: "Key created",
            key: license.key,
            date: license.createdAt,
            icon: KeyRound,
            tone: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          },
        ]

        // Reset HWID — hwid ต้องเคยมี (activatedAt มีค่า) แต่ตอนนี้ไม่มีแล้ว
        if (!license.hwid && license.activatedAt) {
          entries.push({
            type: "reset",
            title: "Reset HWID",
            key: license.key,
            date: license.updatedAt,
            icon: RefreshCcw,
            tone: "bg-amber-500/10 text-amber-300 border-amber-500/20",
          })
        }

        // Disabled — แยกออกจาก reset ชัดเจน
        if (license.status === "Disable" && license.updatedAt !== license.createdAt) {
          entries.push({
            type: "disabled",
            title: "Key disabled",
            key: license.key,
            date: license.updatedAt,
            icon: Ban,
            tone: "bg-red-500/10 text-red-400 border-red-500/20",
          })
        }

        return entries
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6)

    return {
      total: licenses.length,
      active,
      disabled,
      expiringSoon,
      usage,
      activities,
      recent: sorted.slice(0, 10),
    }
  }, [licenses])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500">
        <Loader2 size={20} className="animate-spin mr-2" />
        Loading dashboard
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto pr-5 py-5 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total" value={dashboard.total} icon={KeyRound} />
        <StatCard label="Active" value={dashboard.active} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Disabled" value={dashboard.disabled} icon={Ban} tone="red" />
        <StatCard label="Expiring Soon" value={dashboard.expiringSoon} icon={CalendarClock} tone="amber" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <UsageChart data={dashboard.usage} />
        <StatusDonut
          total={dashboard.total}
          active={dashboard.active}
          disabled={dashboard.disabled}
          expiringSoon={dashboard.expiringSoon}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4">
        <ActivityFeed items={dashboard.activities} />
        <TablePreview licenses={dashboard.recent} />
      </div>
    </div>
  )
}

export default Dashboard

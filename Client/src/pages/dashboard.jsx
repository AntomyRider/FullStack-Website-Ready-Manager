import { useEffect, useMemo, useState } from "react"
import {
  Ban,
  CalendarClock,
  CheckCircle2,
  KeyRound,
  Loader2,
  Coins,
  Wallet,
  Landmark,
} from "lucide-react"
import { listKey, getTopupStats } from "../api/licenses"

import { dayMs, getLastDays } from "../utils/formatters"
import StatCard from "../components/dashboard/StatCard"
import UsageChart from "../components/dashboard/UsageChart"
import StatusDonut from "../components/dashboard/StatusDonut"

const Dashboard = () => {
  const [licenses, setLicenses] = useState([])
  const [topupStats, setTopupStats] = useState({ totalBank: 0, totalTrueMoney: 0, totalTopup: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadDashboard = async () => {
      setLoading(true)
      const [licensesRes, topupRes] = await Promise.all([listKey(), getTopupStats()])

      if (mounted) {
        setLicenses(Array.isArray(licensesRes.data) ? licensesRes.data : [])
        if (topupRes && topupRes.success && topupRes.data) {
          setTopupStats(topupRes.data)
        }
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

    return {
      total: licenses.length,
      active,
      disabled,
      expiringSoon,
      usage,
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
        <StatCard label="Total Keys" value={dashboard.total} icon={KeyRound} />
        <StatCard label="Active Keys" value={dashboard.active} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Disabled Keys" value={dashboard.disabled} icon={Ban} tone="red" />
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          label="Total Top up" 
          value={`${topupStats.totalTopup.toLocaleString()} THB`} 
          icon={Coins} 
          tone="emerald" 
        />
        <StatCard 
          label="True money Top up" 
          value={`${topupStats.totalTrueMoney.toLocaleString()} THB`} 
          icon={Wallet} 
          tone="amber" 
        />
        <StatCard 
          label="Bank Top up" 
          value={`${topupStats.totalBank.toLocaleString()} THB`} 
          icon={Landmark} 
          tone="zinc" 
        />
      </div>
    </div>
  )
}

export default Dashboard

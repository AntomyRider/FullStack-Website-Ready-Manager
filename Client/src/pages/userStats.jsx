import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Users,
  Search,
  Copy,
  Check,
  RotateCcw,
  Clock,
  Cpu,
  Activity,
} from "lucide-react"
import { useLicensesStore } from "../store/licensesStore"
import Select from "../components/ui/Select"
import { useToast } from "../components/ui/toastContext"

const UserStats = () => {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [copiedKey, setCopiedKey] = useState(null)
  const [copiedHwid, setCopiedHwid] = useState(null)
  const [reloading, setReloading] = useState(false)
  const isFetching = useRef(false)

  const { success } = useToast()
  const licenses = useLicensesStore((s) => s.licenses)
  const fetchLicenses = useLicensesStore((s) => s.fetchLicenses)
  const loading = useLicensesStore((s) => s.loading)

  const loadData = useCallback(async () => {
    if (isFetching.current) return
    try {
      isFetching.current = true
      setReloading(true)
      await fetchLicenses()
    } finally {
      isFetching.current = false
      setReloading(false)
    }
  }, [fetchLicenses])

  useEffect(() => {
    loadData()
    const id = setInterval(loadData, 10_000)
    return () => clearInterval(id)
  }, [loadData])

  // Copy helper
  const handleCopy = (text, type, id) => {
    navigator.clipboard.writeText(text)
    if (type === "key") {
      setCopiedKey(id)
      setTimeout(() => setCopiedKey(null), 1500)
    } else {
      setCopiedHwid(id)
      setTimeout(() => setCopiedHwid(null), 1500)
    }
  }

  // Filters logic
  const filteredLicenses = useMemo(() => {
    // Show only keys that are actually used (claimed or activated)
    let result = licenses.filter((l) => l.usedBy)

    // Search
    const term = search.trim().toLowerCase()
    if (term) {
      result = result.filter(
        (l) =>
          (l.key && l.key.toLowerCase().includes(term)) ||
          (l.discordId && l.discordId.toLowerCase().includes(term)) ||
          (l.hwid && l.hwid.toLowerCase().includes(term))
      )
    }

    // Status filter
    if (statusFilter === "online") {
      result = result.filter((l) => l.isOnline)
    } else if (statusFilter === "offline") {
      result = result.filter((l) => !l.isOnline && l.lastHeartbeatAt) // Has logged in but offline
    } else if (statusFilter === "never") {
      result = result.filter((l) => !l.lastHeartbeatAt) // Never logged in
    }

    // Type filter
    if (typeFilter === "lifetime") {
      result = result.filter((l) => !l.expDays || l.expDays === 0)
    } else if (typeFilter === "days") {
      result = result.filter((l) => l.expDays > 0)
    }

    // Sort: Online first, then offline (most recently active first), then never connected
    result.sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1
      if (!a.isOnline && b.isOnline) return 1

      if (a.lastHeartbeatAt && b.lastHeartbeatAt) {
        return new Date(b.lastHeartbeatAt).getTime() - new Date(a.lastHeartbeatAt).getTime()
      }
      if (a.lastHeartbeatAt && !b.lastHeartbeatAt) return -1
      if (!a.lastHeartbeatAt && b.lastHeartbeatAt) return 1

      return 0
    })

    return result
  }, [licenses, search, statusFilter, typeFilter])

  return (
    <div className="h-full pr-5 py-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users size={18} className="text-emerald-300" />
            <h1 className="text-lg font-medium text-zinc-100">User Stats</h1>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            View user status cards, uptime metrics, and client activity in real-time.
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex h-9 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs font-medium text-zinc-400 transition hover:text-zinc-100 cursor-pointer"
        >
          <RotateCcw size={14} className={reloading ? "animate-spin text-emerald-300" : ""} />
          Refresh
        </button>
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800/45 bg-zinc-950/45 p-3">
        <div className="flex h-9 min-w-56 flex-1 items-center gap-2 rounded-lg border border-zinc-800 bg-black/30 px-3">
          <Search size={14} className="shrink-0 text-zinc-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Discord ID, Key, HWID..."
            className="w-full bg-transparent text-sm text-zinc-300 outline-none placeholder:text-zinc-700"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-600">Status:</span>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "online", label: "Online" },
              { value: "offline", label: "Offline" },
              { value: "never", label: "Never Connected" },
            ]}
            size="sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-600">Key Type:</span>
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: "all", label: "All Types" },
              { value: "lifetime", label: "Lifetime" },
              { value: "days", label: "Custom Days" },
            ]}
            size="sm"
          />
        </div>
      </div>

      {/* Card Grid */}
      {loading && filteredLicenses.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-zinc-500">
          <RotateCcw size={20} className="animate-spin mr-2" />
          Loading user stats
        </div>
      ) : filteredLicenses.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-zinc-600 border border-zinc-800/40 rounded-xl bg-zinc-950/20">
          No matching user licenses found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredLicenses.map((license) => {
            const isOnline = license.isOnline
            const isLifetime = !license.expDays || license.expDays === 0
            const days = license.expDays || (license.expireAt ? Math.ceil((new Date(license.expireAt) - new Date(license.activatedAt || license.createdAt)) / 86_400_000) : 0)
            const typeLabel = isLifetime ? "Lifetime" : `${days} Days`
            const hasConnected = !!license.lastHeartbeatAt

            // Progress bar colors
            const pct = license.usagePercentage || 0
            const usageColor = pct < 20 ? "bg-zinc-500" : pct < 50 ? "bg-amber-300" : "bg-emerald-400"

            return (
              <div
                key={license.id}
                className={`bg-zinc-950/80 border rounded-xl p-5 hover:border-emerald-500/20 transition-all duration-300 relative overflow-hidden group shadow-lg flex flex-col justify-between min-h-[260px] ${
                  isOnline ? "border-emerald-500/15" : "border-zinc-800/50"
                }`}
              >
                {/* Glowing subtle top bar for Online */}
                {isOnline && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/30 via-emerald-400/70 to-emerald-500/30" />
                )}

                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  {/* Status Badge */}
                  <div className="flex items-center gap-1.5">
                    {hasConnected ? (
                      isOnline ? (
                        <>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="text-[11px] font-semibold tracking-wider text-emerald-400 uppercase">
                            Online
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="h-2 w-2 rounded-full bg-red-500/80" />
                          <span className="text-[11px] font-semibold tracking-wider text-red-400 uppercase">
                            Offline
                          </span>
                        </>
                      )
                    ) : (
                      <>
                        <span className="h-2 w-2 rounded-full bg-zinc-600" />
                        <span className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                          Unused
                        </span>
                      </>
                    )}
                  </div>

                  {/* Key Type Badge */}
                  <span
                    className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${
                      isLifetime
                        ? "border-violet-500/20 bg-violet-500/10 text-violet-300"
                        : "border-sky-500/20 bg-sky-500/10 text-sky-300"
                    }`}
                  >
                    {typeLabel}
                  </span>
                </div>

                {/* Key Area */}
                <div className="mt-4">
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                    License Key
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-black/45 p-2 px-3">
                    <span className="font-mono text-xs text-zinc-300 truncate tracking-wide">
                      {license.key}
                    </span>
                    <button
                      onClick={() => handleCopy(license.key, "key", license.id)}
                      className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 cursor-pointer"
                      title="Copy key"
                    >
                      {copiedKey === license.id ? (
                        <Check size={13} className="text-emerald-400" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Telemetry Stats Grid */}
                <div className="mt-4 grid grid-cols-2 gap-4 border-y border-zinc-900 py-3 my-3">
                  {/* Uptime */}
                  <div>
                    <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                      <Clock size={11} /> Uptime
                    </span>
                    <p
                      className={`mt-1 text-xs font-medium truncate ${
                        isOnline ? "text-emerald-400" : hasConnected ? "text-red-400" : "text-zinc-600"
                      }`}
                    >
                      {hasConnected ? license.durationText.replace("Online (", "").replace("Offline (", "").replace(")", "") : "-"}
                    </p>
                  </div>

                  {/* Uptime usage */}
                  <div>
                    <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                      <Activity size={11} /> Uptime Usage
                    </span>
                    {license.activatedAt ? (
                      <div className="mt-1 space-y-1">
                        <p className="text-xs font-semibold tabular-nums text-zinc-300">
                          {pct}%
                        </p>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-900">
                          <div className={`h-full rounded-full ${usageColor}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-zinc-600">-</p>
                    )}
                  </div>
                </div>

                {/* Discord & HWID Info */}
                <div className="space-y-2">
                  {/* Discord ID */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-zinc-600">
                      <Users size={12} /> Discord Owner
                    </span>
                    <span className="font-mono text-zinc-400 font-medium truncate max-w-[150px]">
                      {license.discordId ? `@${license.discordId}` : <span className="text-zinc-700 italic">Not claimed</span>}
                    </span>
                  </div>

                  {/* HWID */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-zinc-600">
                      <Cpu size={12} /> Hardware ID (HWID)
                    </span>
                    {license.hwid ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-zinc-500 max-w-[100px] truncate" title={license.hwid}>
                          {license.hwid}
                        </span>
                        <button
                          onClick={() => handleCopy(license.hwid, "hwid", license.id)}
                          className="text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
                          title="Copy HWID"
                        >
                          {copiedHwid === license.id ? (
                            <Check size={11} className="text-emerald-400" />
                          ) : (
                            <Copy size={11} />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-zinc-700 italic">Not activated</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default UserStats

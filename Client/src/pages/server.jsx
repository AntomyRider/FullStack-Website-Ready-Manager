// ServerMonitor.jsx — Full Server Monitor Dashboard (Tailwind)
import { useCallback, useEffect, useRef, useState } from "react"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Circle,
  Cpu,
  Database,
  Globe,
  HardDrive,
  Layers,
  MemoryStick,
  Network,
  RefreshCcw,
  Search,
  Server,
  Terminal,
  Wifi,
  XCircle,
  Zap,
} from "lucide-react"
import Select from "../components/ui/Select"

// ─── API calls ───────────────────────────────────────────────

const API = "/api" // ปรับตาม base URL ของคุณ

const fetchStats       = () => fetch(`${API}/server/stats`).then((r) => r.json())
const fetchHealth      = () => fetch(`${API}/server/health`).then((r) => r.json())
const fetchLogs        = (params = {}) => {
  const q = new URLSearchParams(params).toString()
  return fetch(`${API}/server/logs?${q}`).then((r) => r.json())
}
const fetchProcesses   = () => fetch(`${API}/server/processes`).then((r) => r.json())
const fetchConnections = () => fetch(`${API}/server/connections`).then((r) => r.json())

// ─── Helpers ─────────────────────────────────────────────────

const fmtBytes = (mb) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`)
const fmtUptime = (s) => {
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`
}
const fmtTime = (iso) => {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

const statusColor = (s) => ({
  ok:       "text-emerald-400",
  warning:  "text-amber-400",
  critical: "text-red-400",
  error:    "text-red-400",
}[s] ?? "text-zinc-500")

const statusBg = (s) => ({
  ok:       "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
  warning:  "bg-amber-500/10 border-amber-500/25 text-amber-400",
  critical: "bg-red-500/10 border-red-500/25 text-red-400",
  error:    "bg-red-500/10 border-red-500/25 text-red-400",
}[s] ?? "bg-zinc-800/50 border-zinc-700/50 text-zinc-500")

const StatusIcon = ({ status, size = 14 }) => {
  if (status === "ok")       return <CheckCircle2 size={size} className="text-emerald-400" />
  if (status === "warning")  return <AlertTriangle size={size} className="text-amber-400" />
  if (status === "critical" || status === "error") return <XCircle size={size} className="text-red-400" />
  return <Circle size={size} className="text-zinc-600" />
}

const logLevelStyle = (level) => ({
  error: "text-red-400 bg-red-500/10 border-red-500/20",
  warn:  "text-amber-400 bg-amber-500/10 border-amber-500/20",
  info:  "text-blue-400 bg-blue-500/10 border-blue-500/20",
  log:   "text-zinc-500 bg-zinc-800/50 border-zinc-700/30",
}[level] ?? "text-zinc-500 bg-zinc-800/50 border-zinc-700/30")

// ─── Sub-components ──────────────────────────────────────────

const SectionLabel = ({ children }) => (
  <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-zinc-600 mb-3">{children}</p>
)

const Card = ({ children, className = "" }) => (
  <div className={`bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4 ${className}`}>
    {children}
  </div>
)

const GaugeBar = ({ value, max = 100, colorClass = "bg-emerald-500" }) => {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)))
  const color =
    pct >= 90 ? "bg-red-500"
    : pct >= 75 ? "bg-amber-400"
    : colorClass
  return (
    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-2">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

const MetricBlock = ({ icon: Icon, label, value, sub, pct, iconClass = "text-zinc-500" }) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center gap-2">
      <Icon size={13} className={iconClass} />
      <span className="text-[10.5px] font-medium tracking-[0.1em] uppercase text-zinc-600">{label}</span>
    </div>
    <p className="text-xl font-medium text-zinc-100 tabular-nums">{value}</p>
    {sub && <p className="text-[11px] text-zinc-600">{sub}</p>}
    {pct != null && <GaugeBar value={pct} />}
  </div>
)

const TabBtn = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
      active
        ? "bg-zinc-800 text-zinc-100"
        : "text-zinc-600 hover:text-zinc-400"
    }`}
  >
    {children}
  </button>
)

// ─── Sections ────────────────────────────────────────────────

const HealthSection = ({ health }) => {
  if (!health) return null
  const checks = health.checks ?? {}
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-zinc-500" />
          <span className="text-[12px] font-medium text-zinc-300">System Health</span>
        </div>
        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${statusBg(health.status)}`}>
          {health.status?.toUpperCase()}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(checks).map(([key, val]) => (
          <div key={key} className="flex items-center justify-between bg-zinc-800/40 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2">
              <StatusIcon status={val.status} size={13} />
              <span className="text-[12px] text-zinc-300 capitalize">{key}</span>
            </div>
            <div className="text-right">
              <span className={`text-[11px] font-medium ${statusColor(val.status)}`}>
                {val.usagePercent != null ? `${val.usagePercent}%` : val.latencyMs != null ? `${val.latencyMs}ms` : val.status}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10.5px] text-zinc-700 mt-3">
        Uptime {fmtUptime(health.uptime ?? 0)} · {fmtTime(health.timestamp)}
      </p>
    </Card>
  )
}

const StatsSection = ({ stats }) => {
  if (!stats) return null
  const { cpu, memory, disk, os: osInfo, process: proc, system } = stats
  return (
    <div className="space-y-3">
      {/* CPU + Memory */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <MetricBlock
            icon={Cpu}
            label="CPU Usage"
            value={`${cpu?.usagePercent ?? 0}%`}
            sub={`${cpu?.cores ?? 0} cores · ${cpu?.model?.split(" ").slice(-2).join(" ")}`}
            pct={cpu?.usagePercent}
            iconClass="text-blue-400"
          />
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[["1m", cpu?.loadAvg?.["1m"]], ["5m", cpu?.loadAvg?.["5m"]], ["15m", cpu?.loadAvg?.["15m"]]].map(([k, v]) => (
              <div key={k} className="text-center bg-zinc-800/40 rounded-lg py-1.5">
                <p className="text-[10px] text-zinc-600 mb-0.5">{k}</p>
                <p className="text-[13px] font-medium text-zinc-300 tabular-nums">{v ?? "—"}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <MetricBlock
            icon={MemoryStick}
            label="Memory"
            value={`${memory?.used?.mb?.toFixed(0) ?? 0} MB`}
            sub={`of ${memory?.total?.gb?.toFixed(1) ?? 0} GB total`}
            pct={memory?.usagePercent}
            iconClass="text-purple-400"
          />
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[["Used", memory?.used?.mb], ["Free", memory?.free?.mb]].map(([k, v]) => (
              <div key={k} className="text-center bg-zinc-800/40 rounded-lg py-1.5">
                <p className="text-[10px] text-zinc-600 mb-0.5">{k}</p>
                <p className="text-[13px] font-medium text-zinc-300">{v != null ? fmtBytes(v) : "—"}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Disk + OS */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <MetricBlock
            icon={HardDrive}
            label="Disk"
            value={disk ? `${disk.usagePercent}%` : "—"}
            sub={disk ? `${fmtBytes(disk.used?.mb)} / ${fmtBytes(disk.total?.mb)}` : "Unavailable"}
            pct={disk?.usagePercent}
            iconClass="text-amber-400"
          />
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Server size={13} className="text-zinc-500" />
            <span className="text-[10.5px] font-medium tracking-[0.1em] uppercase text-zinc-600">System</span>
          </div>
          <div className="space-y-2">
            {[
              ["Hostname", osInfo?.hostname],
              ["OS", `${osInfo?.type} ${osInfo?.release?.split(".")[0]}`],
              ["Arch", osInfo?.arch],
              ["Uptime", fmtUptime(system?.uptime ?? 0)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center">
                <span className="text-[11px] text-zinc-600">{k}</span>
                <span className="text-[11px] text-zinc-300 font-mono">{v ?? "—"}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Node Process */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Zap size={13} className="text-zinc-500" />
          <span className="text-[10.5px] font-medium tracking-[0.1em] uppercase text-zinc-600">Node Process</span>
          <span className="ml-auto text-[10.5px] font-mono text-zinc-600">PID {proc?.pid}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            ["Node", proc?.nodeVersion],
            ["RSS", proc?.memUsage?.rss?.mb != null ? fmtBytes(proc.memUsage.rss.mb) : "—"],
            ["Heap", proc?.memUsage?.heapUsed?.mb != null ? fmtBytes(proc.memUsage.heapUsed.mb) : "—"],
            ["Uptime", fmtUptime(proc?.uptime ?? 0)],
          ].map(([k, v]) => (
            <div key={k} className="text-center bg-zinc-800/40 rounded-lg py-2">
              <p className="text-[10px] text-zinc-600 mb-0.5">{k}</p>
              <p className="text-[12px] font-medium text-zinc-300 font-mono">{v ?? "—"}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

const LogsSection = ({ }) => {
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(false)
  const [level, setLevel]     = useState("all")
  const [search, setSearch]   = useState("")
  const [lines, setLines]     = useState(100)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchLogs({ lines, level: level === "all" ? undefined : level, search: search || undefined })
      if (res.success) setLogs(res.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [level, lines, search])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 bg-zinc-900/70 border border-zinc-800/60 rounded-lg px-3 h-8 flex-1 min-w-48">
          <Search size={13} className="text-zinc-600 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs…"
            className="bg-transparent outline-none text-zinc-300 text-[12px] placeholder:text-zinc-600 w-full"
          />
        </div>
        <Select
          value={level}
          onChange={setLevel}
          options={[
            { value: "all", label: "All levels" },
            { value: "error", label: "error", className: "text-red-400" },
            { value: "warn", label: "warn", className: "text-amber-400" },
            { value: "info", label: "info", className: "text-blue-400" },
            { value: "log", label: "log", className: "text-zinc-500" },
          ]}
          size="sm"
          triggerClassName={`w-28 text-[12px] capitalize font-light ${
            level === "error" ? "text-red-400" :
            level === "warn" ? "text-amber-400" :
            level === "info" ? "text-blue-400" :
            level === "log" ? "text-zinc-500" : "text-zinc-300"
          }`}
          menuClassName="w-28 capitalize font-light"
        />
        <Select
          value={lines}
          onChange={setLines}
          options={[50, 100, 200, 500].map((n) => ({ value: n, label: `${n} lines` }))}
          size="sm"
          triggerClassName="w-24 text-[12px] text-zinc-300 font-light"
          menuClassName="w-24 font-light"
        />
        <button onClick={load} className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-900/70 border border-zinc-800/60 text-zinc-500 hover:text-zinc-300 transition-colors">
          <RefreshCcw size={13} className={loading ? "animate-spin text-emerald-400" : ""} />
        </button>
      </div>

      {/* Log list */}
      <Card className="p-0 overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto font-mono text-[11.5px]">
          {loading ? (
            <div className="py-12 text-center text-zinc-600">Loading logs…</div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-zinc-600">No logs found</div>
          ) : (
            logs.map((entry, i) => (
              <div key={i} className="flex gap-3 px-4 py-2 border-b border-zinc-800/40 hover:bg-zinc-800/30 transition-colors">
                <span className="shrink-0 text-zinc-700 w-36 text-[10.5px] pt-0.5">{fmtTime(entry.timestamp)}</span>
                <span className={`shrink-0 px-1.5 py-0.5 rounded border text-[10px] font-medium self-start ${logLevelStyle(entry.level)}`}>
                  {entry.level?.toUpperCase()}
                </span>
                <span className="text-zinc-400 break-all leading-relaxed">{entry.raw}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}

const ProcessesSection = ({ processes }) => {
  if (!processes) return null
  const { pm2 = [], topProcesses = [] } = processes
  return (
    <div className="space-y-3">
      {pm2.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800/40 flex items-center gap-2">
            <Layers size={13} className="text-zinc-500" />
            <span className="text-[11px] font-medium text-zinc-400">PM2 Processes</span>
          </div>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-zinc-800/40">
                {["Name", "PID", "Status", "CPU", "Memory", "Restarts", "Uptime"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-[10px] font-medium tracking-widest uppercase text-zinc-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pm2.map((p, i) => (
                <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-2.5 text-zinc-200 font-medium">{p.name}</td>
                  <td className="px-4 py-2.5 text-zinc-600 font-mono">{p.pid}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium border ${
                      p.status === "online" ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : "bg-red-500/10 border-red-500/25 text-red-400"
                    }`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400 tabular-nums">{p.cpu ?? "—"}%</td>
                  <td className="px-4 py-2.5 text-zinc-400">{p.memory?.mb != null ? fmtBytes(p.memory.mb) : "—"}</td>
                  <td className="px-4 py-2.5 text-zinc-600 tabular-nums">{p.restarts ?? 0}</td>
                  <td className="px-4 py-2.5 text-zinc-600">{p.uptimeHuman ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800/40 flex items-center gap-2">
          <Terminal size={13} className="text-zinc-500" />
          <span className="text-[11px] font-medium text-zinc-400">Top Processes by CPU</span>
        </div>
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-zinc-800/40">
              {["PID", "User", "CPU%", "MEM%", "Command"].map((h) => (
                <th key={h} className="px-4 py-2 text-left text-[10px] font-medium tracking-widest uppercase text-zinc-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topProcesses.map((p, i) => (
              <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-2.5 text-zinc-600 font-mono">{p.pid}</td>
                <td className="px-4 py-2.5 text-zinc-400">{p.user}</td>
                <td className="px-4 py-2.5 tabular-nums">
                  <span className={p.cpu >= 50 ? "text-red-400" : p.cpu >= 20 ? "text-amber-400" : "text-zinc-400"}>{p.cpu}%</span>
                </td>
                <td className="px-4 py-2.5 text-zinc-400 tabular-nums">{p.mem}%</td>
                <td className="px-4 py-2.5 text-zinc-500 font-mono text-[10.5px] truncate max-w-xs">{p.command}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

const ConnectionsSection = ({ connections }) => {
  if (!connections) return null
  const { summary, connections: conns = [] } = connections
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        {[
          ["Total", summary?.total, "text-zinc-300"],
          ["Established", summary?.established, "text-emerald-400"],
          ["Time-Wait", summary?.timeWait, "text-amber-400"],
          ["Listening", summary?.listening, "text-blue-400"],
        ].map(([k, v, cls]) => (
          <Card key={k} className="text-center">
            <p className="text-[10px] font-medium tracking-[0.1em] uppercase text-zinc-600 mb-1">{k}</p>
            <p className={`text-2xl font-medium tabular-nums ${cls}`}>{v ?? 0}</p>
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800/40 flex items-center gap-2">
          <Wifi size={13} className="text-zinc-500" />
          <span className="text-[11px] font-medium text-zinc-400">Active Connections</span>
        </div>
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-zinc-950/90">
              <tr className="border-b border-zinc-800/40">
                {["State", "Local", "Remote", "Process"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-[10px] font-medium tracking-widest uppercase text-zinc-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {conns.slice(0, 50).map((c, i) => (
                <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-2">
                    <span className={`text-[10.5px] font-medium ${
                      c.state === "ESTAB" ? "text-emerald-400" : c.state === "TIME-WAIT" ? "text-amber-400" : "text-zinc-500"
                    }`}>{c.state}</span>
                  </td>
                  <td className="px-4 py-2 text-zinc-500 font-mono text-[11px]">{c.local}</td>
                  <td className="px-4 py-2 text-zinc-500 font-mono text-[11px]">{c.remote}</td>
                  <td className="px-4 py-2 text-zinc-700 font-mono text-[10.5px] truncate max-w-xs">{c.process ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────

const TABS = [
  { id: "overview",     label: "Overview",     icon: Activity },
  { id: "logs",         label: "Logs",         icon: Terminal },
  { id: "processes",    label: "Processes",    icon: Layers },
  { id: "connections",  label: "Connections",  icon: Network },
]

const ServerMonitor = () => {
  const [tab, setTab]             = useState("overview")
  const [health, setHealth]       = useState(null)
  const [stats, setStats]         = useState(null)
  const [processes, setProcesses] = useState(null)
  const [connections, setConnections] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const intervalRef = useRef(null)

  const loadAll = useCallback(async () => {
    try {
      const [h, s, p, c] = await Promise.allSettled([
        fetchHealth(),
        fetchStats(),
        fetchProcesses(),
        fetchConnections(),
      ])
      if (h.status === "fulfilled" && h.value.success) setHealth(h.value)
      if (s.status === "fulfilled" && s.value.success) setStats(s.value.data)
      if (p.status === "fulfilled" && p.value.success) setProcesses(p.value.data)
      if (c.status === "fulfilled" && c.value.success) setConnections(c.value.data)
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
    intervalRef.current = setInterval(loadAll, 15_000)
    return () => clearInterval(intervalRef.current)
  }, [loadAll])

  const overallStatus = health?.status ?? "ok"

  return (
    <div className="pr-5 py-5 space-y-4 h-full overflow-y-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${
            overallStatus === "ok" ? "bg-emerald-400" : overallStatus === "warning" ? "bg-amber-400" : "bg-red-400"
          } animate-pulse`} />
          <h1 className="text-[15px] font-medium text-zinc-100">Server Monitor</h1>
          <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${statusBg(overallStatus)}`}>
            {overallStatus?.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[11px] text-zinc-600">
              Updated {lastUpdated.toLocaleTimeString("en-GB")}
            </span>
          )}
          <button
            onClick={loadAll}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-900/70 border border-zinc-800/60 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <RefreshCcw size={13} className={loading ? "animate-spin text-emerald-400" : ""} />
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-zinc-900/40 border border-zinc-800/40 rounded-xl p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
              tab === id ? "bg-zinc-800 text-zinc-100" : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-zinc-600 text-[13px] gap-2">
          <RefreshCcw size={14} className="animate-spin" /> Loading server data…
        </div>
      ) : (
        <>
          {tab === "overview" && (
            <div className="space-y-3">
              <HealthSection health={health} />
              <StatsSection stats={stats} />
            </div>
          )}
          {tab === "logs"        && <LogsSection />}
          {tab === "processes"   && <ProcessesSection processes={processes} />}
          {tab === "connections" && <ConnectionsSection connections={connections} />}
        </>
      )}
    </div>
  )
}

export default ServerMonitor
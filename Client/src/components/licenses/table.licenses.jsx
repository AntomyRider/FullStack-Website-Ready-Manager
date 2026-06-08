import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Download, KeyRound, RotateCcw, Search, ShieldCheck, Trash2 } from "lucide-react"
import { useLicensesStore } from "../../store/licensesStore"
import { deleteAllkeys, deleteKey, resetKey, updateKey } from "../../api/licenses"
import { useToast } from "../ui/toastContext"
import CreateLicenses from "./create.licenses"
import DownloadLicensesDialog from "./DownloadLicensesDialog"
import FilterLicenses from "./filter.licenses"

const getLicenseHwids = (license) => (license.hwid ? [license.hwid] : [])

const fmtDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-"

const compactText = (value, limit = 20) => {
  if (!value) return "-"
  return value.length > limit ? `${value.slice(0, limit)}...` : value
}

const StatCard = ({ label, value, tone = "text-zinc-100" }) => (
  <div className="rounded-xl border border-zinc-800/45 bg-zinc-950/70 px-4 py-3">
    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">{label}</p>
    <p className={`mt-1 text-2xl font-medium tabular-nums ${tone}`}>{value}</p>
  </div>
)

const StatusBadge = ({ status, onClick }) => {
  const enabled = status === "Enable"

  return (
    <button
      onClick={onClick}
      className={`inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium transition ${
        enabled
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
          : "border-red-500/25 bg-red-500/10 text-red-300 hover:bg-red-500/15"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-emerald-300" : "bg-red-300"}`} />
      {status}
    </button>
  )
}

const UsedByBadge = ({ usedBy }) => {
  if (!usedBy) return <span className="text-zinc-700">-</span>

  const style =
    usedBy === "Redeemed"
      ? "border-violet-500/25 bg-violet-500/10 text-violet-300"
      : usedBy === "Activated"
        ? "border-sky-500/25 bg-sky-500/10 text-sky-300"
        : "border-zinc-700 bg-zinc-800/50 text-zinc-400"

  return (
    <span className={`inline-flex h-7 items-center rounded-lg border px-2.5 text-[11px] font-medium ${style}`}>
      {usedBy}
    </span>
  )
}

const DaysCell = ({ expDays, expireAt }) => {
  const isLifetime = !expDays || expDays === 0
  const isExpired = expireAt && new Date(expireAt) < new Date()

  let label = ""
  let textColorClass = "text-emerald-400"

  if (isLifetime) {
    label = "Lifetime"
  } else if (isExpired) {
    label = "Expired"
    textColorClass = "text-red-400 font-semibold"
  } else {
    label = `${expDays} days`
  }

  const daysLeft = expireAt ? Math.ceil((new Date(expireAt) - new Date()) / 86_400_000) : null
  const pct = isLifetime ? 100 : (isExpired ? 0 : (daysLeft != null && expDays ? Math.min(100, Math.max(0, Math.round((daysLeft / expDays) * 100))) : null))
  const color = isLifetime ? "bg-emerald-400" : (isExpired ? "bg-red-400" : (pct == null ? "bg-zinc-700" : pct < 15 ? "bg-red-400" : pct < 40 ? "bg-amber-300" : "bg-emerald-400"))

  return (
    <div className="space-y-1">
      <p className={`text-[12px] tabular-nums ${textColorClass}`}>{label}</p>
      <div className="h-1 w-14 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct ?? 0}%` }} />
      </div>
    </div>
  )
}

const UptimeStateCell = ({ isOnline, durationText }) => {
  if (durationText === "-") return <span className="text-zinc-700">-</span>

  return (
    <div className="flex items-center gap-2">
      {isOnline ? (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      ) : (
        <span className="h-2 w-2 rounded-full bg-red-500/80" />
      )}
      <span className={`text-[12px] font-medium tracking-wide ${isOnline ? "text-emerald-400" : "text-zinc-400"}`}>
        {durationText}
      </span>
    </div>
  )
}

const UptimeUsageCell = ({ usagePercentage, activatedAt }) => {
  if (!activatedAt) return <span className="text-zinc-700">-</span>

  const color = usagePercentage < 20 ? "bg-zinc-500" : usagePercentage < 50 ? "bg-amber-300" : "bg-emerald-400"

  return (
    <div className="space-y-1">
      <p className="text-[12px] tabular-nums font-medium text-zinc-300">{usagePercentage}%</p>
      <div className="h-1 w-14 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${usagePercentage}%` }} />
      </div>
    </div>
  )
}

const IconAction = ({ icon: Icon, label, tone = "neutral", onClick }) => {
  const toneClass =
    tone === "danger"
      ? "border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/18"
      : tone === "success"
        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/18"
        : "border-zinc-800 bg-zinc-900/70 text-zinc-500 hover:text-zinc-200"

  return (
    <button
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${toneClass}`}
      aria-label={label}
      title={label}
    >
      <Icon size={14} />
    </button>
  )
}

const TableLicenses = () => {
  const [search, setSearch] = useState("")
  const [selectedDay, setSelectedDay] = useState("all")
  const [openCreate, setOpenCreate] = useState(false)
  const [openDownload, setOpenDownload] = useState(false)
  const [reloading, setReloading] = useState(false)
  const isFetching = useRef(false)

  const { success, error, confirm } = useToast()
  const licenses = useLicensesStore((s) => s.licenses)
  const fetchLicenses = useLicensesStore((s) => s.fetchLicenses)
  const loading = useLicensesStore((s) => s.loading)
  const availableDays = useLicensesStore((s) => s.availableDays)

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
    const id = setInterval(loadData, 30_000)
    return () => clearInterval(id)
  }, [loadData])

  const filteredLicenses = useMemo(() => {
    const source = selectedDay === "all"
      ? licenses
      : licenses.filter((license) => license.expDays === parseInt(selectedDay))
    const term = search.trim().toLowerCase()

    if (!term) return source

    return source.filter((license) =>
      [license.key, license.hwid, license.discordId, license.status, license.usedBy]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    )
  }, [licenses, search, selectedDay])

  const stats = useMemo(() => {
    const active = licenses.filter((license) => license.status === "Enable").length
    const bound = licenses.filter((license) => getLicenseHwids(license).length > 0).length

    return {
      active,
      disabled: licenses.length - active,
      bound,
      unbound: licenses.length - bound,
    }
  }, [licenses])

  const unboundKeys = useMemo(() => licenses.filter((license) => getLicenseHwids(license).length === 0), [licenses])
  const boundKeys = useMemo(() => licenses.filter((license) => getLicenseHwids(license).length > 0), [licenses])

  const handleDelete = async (license) => {
    const ok = await confirm({
      title: "Delete this key?",
      message: compactText(license.key, 42),
    })
    if (!ok) return

    const res = await deleteKey(license.id)
    if (res?.success) {
      await fetchLicenses()
      success("Key deleted", "The selected license key was removed.")
      return
    }
    error("Delete failed", res?.message ?? "Please try again.")
  }

  const handleReset = async (license) => {
    const ok = await confirm({
      title: "Reset HWID?",
      message: "This key can bind to a new machine after reset.",
    })
    if (!ok) return

    const res = await resetKey(license.key)
    if (res?.success) {
      await fetchLicenses()
      success("HWID reset", "The license can now be activated again.")
      return
    }
    error("Reset failed", res?.message ?? "Please try again.")
  }

  const handleUpdate = async (license) => {
    const next = license.status === "Enable" ? "Disable" : "Enable"
    const res = await updateKey(license.id, next)

    if (res?.success) {
      await fetchLicenses()
      success(`Key ${next.toLowerCase()}d`, `License status changed to ${next}.`)
      return
    }
    error("Status update failed", res?.message ?? "Please try again.")
  }

  const handleDeleteAll = async () => {
    const ok = await confirm({
      title: "Delete all keys?",
      message: `This will permanently remove ${licenses.length} license keys.`,
    })
    if (!ok) return

    const res = await deleteAllkeys()
    if (res?.success) {
      await fetchLicenses()
      success("All keys deleted", "License list has been cleared.")
      return
    }
    error("Delete all failed", res?.message ?? "Please try again.")
  }

  return (
    <div className="h-full pr-5 py-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-300" />
            <h1 className="text-lg font-medium text-zinc-100">License Keys</h1>
          </div>
          <p className="mt-1 text-sm text-zinc-600">Manage keys, status, HWID resets, and exports.</p>
        </div>
        <button
          onClick={loadData}
          className="flex h-9 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs font-medium text-zinc-400 transition hover:text-zinc-100"
        >
          <RotateCcw size={14} className={reloading ? "animate-spin text-emerald-300" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Keys" value={licenses.length} />
        <StatCard label="Active" value={stats.active} tone="text-emerald-300" />
        <StatCard label="Disabled" value={stats.disabled} tone="text-red-300" />
        <StatCard label="Unbound" value={stats.unbound} tone="text-sky-300" />
      </div>

      <div className="mt-4 rounded-xl border border-zinc-800/45 bg-zinc-950/45">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/45 p-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-9 min-w-56 flex-1 items-center gap-2 rounded-lg border border-zinc-800 bg-black/30 px-3">
              <Search size={14} className="shrink-0 text-zinc-600" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search key, HWID, Discord..."
                className="w-full bg-transparent text-sm text-zinc-300 outline-none placeholder:text-zinc-700"
              />
            </div>
            <FilterLicenses availableDays={availableDays} selectedDay={selectedDay} onChange={setSelectedDay} />
          </div>

          <div className="flex items-center gap-2">
            <IconAction icon={Trash2} label="Delete all keys" tone="danger" onClick={handleDeleteAll} />
            <button
              onClick={() => setOpenDownload(true)}
              className="flex h-9 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800/70"
            >
              <Download size={14} />
              Export
            </button>
            <button
              onClick={() => setOpenCreate(true)}
              className="flex h-9 items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/15"
            >
              <KeyRound size={14} />
              New Key
            </button>
          </div>
        </div>

        <div className="max-h-[720px] overflow-auto">
          <table className="w-full min-w-[1080px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-zinc-950">
              <tr className="border-b border-zinc-800/50">
                {["ID", "Key", "HWID", "Status", "Expires", "Days", "Created", "Used By", "Discord", "Actions"].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-zinc-600">
                    <div className="inline-flex items-center gap-2 text-sm">
                      <RotateCcw size={14} className="animate-spin" />
                      Loading licenses
                    </div>
                  </td>
                </tr>
              ) : filteredLicenses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-sm text-zinc-600">
                    No licenses found
                  </td>
                </tr>
              ) : (
                filteredLicenses.map((license) => {
                  const hwid = getLicenseHwids(license).join(", ")

                  return (
                    <tr key={license.id} className="border-b border-zinc-800/35 transition hover:bg-zinc-900/45">
                      <td className="px-4 py-3 text-xs font-medium tabular-nums text-zinc-600">#{license.id}</td>
                      <td className="px-4 py-3 font-mono text-xs tracking-wide text-zinc-300" title={license.key}>
                        {compactText(license.key, 24)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-600" title={hwid || undefined}>
                        {compactText(hwid, 24)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={license.status} onClick={() => handleUpdate(license)} />
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{fmtDate(license.expireAt)}</td>
                      <td className="px-4 py-3">
                        <DaysCell expDays={license.expDays} expireAt={license.expireAt} />
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{fmtDate(license.createdAt)}</td>
                      <td className="px-4 py-3">
                        <UsedByBadge usedBy={license.usedBy} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500" title={license.discordId || undefined}>
                        {compactText(license.discordId, 18)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <IconAction icon={Trash2} label="Delete key" tone="danger" onClick={() => handleDelete(license)} />
                          <IconAction icon={RotateCcw} label="Reset HWID" tone="success" onClick={() => handleReset(license)} />
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DownloadLicensesDialog
        open={openDownload}
        setOpen={setOpenDownload}
        unboundKeys={unboundKeys}
        boundKeys={boundKeys}
      />
      <CreateLicenses open={openCreate} setOpen={setOpenCreate} fetchLicenses={fetchLicenses} />
    </div>
  )
}

export default TableLicenses

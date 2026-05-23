// TableLicenses.jsx (Redesigned — Tailwind)
import { useCallback, useEffect, useState, useRef } from "react"
import { useLicensesStore } from "../../store/licensesStore"
import { Trash2, RotateCcw, KeyRound, Search, Download } from "lucide-react"
import CreateLicenses from "./create.licenses"
import { deleteAllkeys, deleteKey, resetKey, updateKey } from "../../api/licenses"
import DownloadLicensesDialog from "./DownloadLicensesDialog"
import FilterLicenses from "./filter.licenses"

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

const StatCard = ({ label, value, valueClass = "text-zinc-100" }) => (
  <div className="flex-1 bg-zinc-900/60 border border-zinc-800/50 rounded-xl px-5 py-3.5 flex flex-col gap-1">
    <p className="text-[10.5px] font-medium tracking-[0.1em] uppercase text-zinc-600">{label}</p>
    <p className={`text-2xl font-medium tabular-nums ${valueClass}`}>{value}</p>
  </div>
)

const StatusBadge = ({ status, onClick }) => {
  const on = status === "Enable"
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium border transition-colors ${
        on
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/18"
          : "bg-red-500/10 text-red-400 border-red-500/25 hover:bg-red-500/18"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${on ? "bg-emerald-400" : "bg-red-400"}`} />
      {status}
    </button>
  )
}

const DaysCell = ({ expDays, expireAt }) => {
  const daysLeft = expireAt
    ? Math.ceil((new Date(expireAt) - new Date()) / 86_400_000)
    : null
  const pct =
    daysLeft != null ? Math.min(100, Math.max(0, Math.round((daysLeft / expDays) * 100))) : null

  const barColor =
    pct == null ? "" : pct < 15 ? "bg-red-500" : pct < 40 ? "bg-amber-400" : "bg-emerald-400"
  const textColor =
    daysLeft == null ? "text-zinc-600"
    : daysLeft < 0 ? "text-red-400"
    : pct < 15 ? "text-red-400"
    : pct < 40 ? "text-amber-400"
    : "text-zinc-400"

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className={`text-[12px] tabular-nums ${textColor}`}>
        {daysLeft == null ? "—" : daysLeft < 0 ? "Expired" : `${daysLeft}d`}
      </span>
      {pct != null && (
        <div className="w-12 h-[3px] bg-zinc-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}

const ActionBtn = ({ onClick, icon: Icon, variant = "danger", label }) => {
  const cls =
    variant === "danger"
      ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/35"
      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/35"
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex items-center justify-center w-[30px] h-[30px] rounded-lg border transition-all duration-150 ${cls}`}
    >
      <Icon size={13} />
    </button>
  )
}

const UsedByBadge = ({ usedBy }) => {
  if (!usedBy) return <span className="text-zinc-700 text-[11.5px]">—</span>
  const isRedeemed = usedBy === "Redeemed"
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium border ${
        isRedeemed
          ? "bg-violet-500/10 text-violet-400 border-violet-500/25"
          : "bg-sky-500/10 text-sky-400 border-sky-500/25"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isRedeemed ? "bg-violet-400" : "bg-sky-400"}`} />
      {usedBy}
    </span>
  )
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

const getLicenseHwids = (license) => (license.hwid ? [license.hwid] : [])

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—"

// ────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────

const TableLicenses = () => {
  const [search, setSearch] = useState("")
  const [selectedDay, setSelectedDay] = useState("all")
  const [open, setOpen] = useState(false)
  const [openDownload, setOpenDownload] = useState(false)
  const [reloading, setReloading] = useState(false)

  const licenses = useLicensesStore((s) => s.licenses)
  const fetchLicenses = useLicensesStore((s) => s.fetchLicenses)
  const loading = useLicensesStore((s) => s.loading)
  const availableDays = useLicensesStore((s) => s.availableDays)

  const isFetching = useRef(false)

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

  // Actions
  const handleDelete = async (id) => {
    try { const r = await deleteKey(id); if (r.success) await fetchLicenses() } catch (e) { console.error(e) }
  }
  const handleReset = async (key) => {
    try { const r = await resetKey(key); if (r.success) await fetchLicenses() } catch (e) { console.error(e) }
  }
  const handleUpdate = async (id, status) => {
    const next = status === "Enable" ? "Disable" : "Enable"
    try { const r = await updateKey(id, next); if (r?.success) await fetchLicenses() } catch (e) { console.error(e) }
  }
  const handleDeleteAll = async () => {
    try { const r = await deleteAllkeys(); if (r?.success) await fetchLicenses() } catch (e) { console.error(e) }
  }

  // Derived data
  const filteredLicenses = useLicensesStore
    .getState()
    .filterByDays(selectedDay)
    .filter((l) => l.key.toLowerCase().includes(search.toLowerCase()))

  const unboundKeys = licenses.filter((l) => getLicenseHwids(l).length === 0)
  const boundKeys = licenses.filter((l) => getLicenseHwids(l).length > 0)
  const activeCount = licenses.filter((l) => l.status === "Enable").length
  const disabledCount = licenses.length - activeCount

  return (
    <div className="pr-5 space-y-4">

      {/* ── Stat cards ───────────────────────────────────── */}
      <div className="flex gap-3">
        <StatCard label="Total Keys" value={licenses.length} />
        <StatCard label="Active" value={activeCount} valueClass="text-emerald-400" />
        <StatCard label="Disabled" value={disabledCount} valueClass="text-red-400" />
      </div>

      {/* ── Toolbar ──────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left: search + filter */}
        <div className="flex gap-2 flex-1 min-w-0 max-w-lg">
          <div className="flex items-center gap-2 bg-zinc-900/70 border border-zinc-800/60 rounded-xl px-3 h-9 flex-1 min-w-0">
            <Search size={14} className="text-zinc-600 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search license key…"
              className="bg-transparent outline-none text-zinc-300 text-[13px] placeholder:text-zinc-600 w-full"
            />
          </div>
          <FilterLicenses
            availableDays={availableDays}
            selectedDay={selectedDay}
            onChange={setSelectedDay}
          />
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDeleteAll}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/18 transition-colors"
            aria-label="Delete all keys"
          >
            <Trash2 size={15} />
          </button>

          <button
            onClick={loadData}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-900/70 border border-zinc-800/60 text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="Reload"
          >
            <RotateCcw
              size={15}
              className={`transition-all duration-300 ${reloading ? "animate-spin [animation-direction:reverse] text-emerald-400" : ""}`}
            />
          </button>

          <button
            onClick={() => setOpenDownload(true)}
            className="flex items-center gap-2 h-9 px-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800/60 text-zinc-300 text-[13px] hover:bg-zinc-800/60 transition-colors"
          >
            <Download size={14} /> Export
          </button>
          <DownloadLicensesDialog
            open={openDownload}
            setOpen={setOpenDownload}
            unboundKeys={unboundKeys}
            boundKeys={boundKeys}
          />

          <button
            onClick={() => setOpen(true)}
            className="relative flex items-center gap-2 h-9 px-4 rounded-xl overflow-hidden border border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/16 text-emerald-400 text-[13px] font-medium tracking-wide transition-colors"
          >
            <KeyRound size={14} />
            New Key
          </button>
          <CreateLicenses open={open} setOpen={setOpen} fetchLicenses={fetchLicenses} />
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <div className="border border-zinc-800/50 rounded-2xl overflow-hidden">
        <div className="max-h-[820px] overflow-y-auto overflow-x-auto">
          <table className="w-full border-collapse text-[13px]" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: 48 }} />
              <col style={{ width: 190 }} />
              <col style={{ width: 145 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 105 }} />
              <col style={{ width: 72 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 105 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 80 }} />
            </colgroup>

            {/* Head */}
            <thead className="sticky top-0 z-10 bg-zinc-950">
              <tr className="border-b border-zinc-800/50">
                {["ID", "Key", "HWID", "Status", "Expires", "Days", "Created", "Used By", "Discord", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[10.5px] font-medium tracking-[0.1em] uppercase text-zinc-600 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-14 text-center text-zinc-600 text-[13px]">
                    <div className="flex items-center justify-center gap-2">
                      <RotateCcw size={14} className="animate-spin" /> Loading…
                    </div>
                  </td>
                </tr>
              ) : filteredLicenses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-14 text-center text-zinc-600 text-[13px]">
                    No licenses found
                  </td>
                </tr>
              ) : (
                filteredLicenses.map((license) => {
                  const hwids = getLicenseHwids(license)
                  const raw = hwids.join(", ")
                  const hwid = raw ? (raw.length > 18 ? `${raw.slice(0, 18)}…` : raw) : "—"

                  return (
                    <tr
                      key={license.id}
                      className="border-t border-zinc-800/40 hover:bg-zinc-900/50 transition-colors group"
                    >
                      {/* ID */}
                      <td className="px-4 py-3.5 text-[12px] text-zinc-600 font-medium">
                        #{license.id}
                      </td>

                      {/* Key */}
                      <td className="px-4 py-3.5 font-mono text-[12.5px] text-zinc-300 tracking-wide truncate">
                        {license.key}
                      </td>

                      {/* HWID */}
                      <td className="px-4 py-3.5 font-mono text-[11.5px] text-zinc-600 truncate">
                        {hwid}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <StatusBadge
                          status={license.status}
                          onClick={() => handleUpdate(license.id, license.status)}
                        />
                      </td>

                      {/* Expires */}
                      <td className="px-4 py-3.5 text-[12px] text-zinc-500">
                        {fmtDate(license.expireAt)}
                      </td>

                      {/* Days */}
                      <td className="px-4 py-3.5 text-zinc-500">
                        {license.expDays} Days
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3.5 text-[12px] text-zinc-500">
                        {fmtDate(license.createdAt)}
                      </td>

                      {/* Used By */}
                      <td className="px-4 py-3.5">
                        <UsedByBadge usedBy={license.usedBy} />
                      </td>

                      {/* Discord */}
                      <td className="px-4 py-3.5 font-mono text-[11.5px] text-zinc-500 truncate">
                        {license.discordId ? (
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                            {license.discordId}
                          </span>
                        ) : (
                          <span className="text-zinc-700">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <ActionBtn
                            onClick={() => handleDelete(license.id)}
                            icon={Trash2}
                            variant="danger"
                            label={`Delete license ${license.id}`}
                          />
                          <ActionBtn
                            onClick={() => handleReset(license.key)}
                            icon={RotateCcw}
                            variant="success"
                            label={`Reset HWID for license ${license.id}`}
                          />
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
    </div>
  )
}

export default TableLicenses
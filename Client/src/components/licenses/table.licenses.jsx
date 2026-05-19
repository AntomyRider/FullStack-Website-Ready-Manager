// TableLicenses.jsx (รวม Filter By Days)
import { useCallback, useEffect, useState, useRef } from "react"
import { useLicensesStore } from "../../store/licensesStore"
import { Trash2, RotateCcw, KeyRound, Search, CircleDot, Download } from 'lucide-react'
import CreateLicenses from "./create.licenses"
import { deleteAllkeys, deleteKey, resetKey, updateKey } from "../../api/licenses"
import DownloadLicensesDialog from './DownloadLicensesDialog'
import FilterLicenses from "./filter.licenses"

const StatCard = ({ label, value, color = "text-zinc-100" }) => (
  <div className="flex-1 bg-zinc-950 border border-zinc-800/60 rounded-xl px-4 py-3">
    <p className="text-[11px] font-medium tracking-widest uppercase text-zinc-600 mb-1">{label}</p>
    <p className={`text-xl font-medium ${color}`}>{value}</p>
  </div>
)

const getLicenseHwids = (license) => (license.hwid ? [license.hwid] : [])

const TableLicenses = () => {
  const [search, setSearch] = useState("")
  const [selectedDay, setSelectedDay] = useState("all")

  const licenses = useLicensesStore((state) => state.licenses)
  const fetchLicenses = useLicensesStore((state) => state.fetchLicenses)
  const loading = useLicensesStore((state) => state.loading)
  const availableDays = useLicensesStore((state) => state.availableDays)

  const [openDownload, setOpenDownload] = useState(false)
  const [open, setOpen] = useState(false)
  const [reloading, setReloading] = useState(false)

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
    const interval = setInterval(() => loadData(), 30000)
    return () => clearInterval(interval)
  }, [loadData])

  // Actions
  const handleDelete = async (id) => {
    try { const res = await deleteKey(id); if (res.success) await fetchLicenses() } catch (e) { console.error(e) }
  }
  const handleReset = async (key) => {
    try { const res = await resetKey(key); if (res.success) await fetchLicenses() } catch (e) { console.error(e) }
  }
  const handleUpdate = async (id, status) => {
    const newStatus = status === "Enable" ? "Disable" : "Enable"
    try { const res = await updateKey(id, newStatus); if (res?.success) await fetchLicenses() } catch (e) { console.error(e) }
  }
  const handelDeleteAll = async () => {
    try { const res = await deleteAllkeys(); if (res?.success) await fetchLicenses() } catch (e) { console.log(e) }
  }

  // Filtered licenses by search + days
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
      {/* Stat Cards */}
      <div className="flex gap-3">
        <StatCard label="Total Keys" value={licenses.length} />
        <StatCard label="Active" value={activeCount} color="text-emerald-400" />
        <StatCard label="Disabled" value={disabledCount} color="text-red-400" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 flex-1 max-w-lg">
          {/* Search */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 h-10 flex-1">
            <Search size={15} className="text-zinc-600 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search license key..."
              className="bg-transparent border-none outline-none text-zinc-300 text-sm placeholder:text-zinc-600 w-full"
            />
          </div>

          {/* Filter By Days */}
          <FilterLicenses
            availableDays={availableDays}
            selectedDay={selectedDay}
            onChange={setSelectedDay}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex justify-center hover:bg-red-500/20">
            <Trash2 onClick={handelDeleteAll} size={20} className="text-red-500" />
          </div>
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex justify-center">
            <RotateCcw size={20} className={`transition-all ${reloading ? "text-emerald-400 animate-spin [animation-direction:reverse]" : "text-zinc-600"}`} />
          </div>
          <button onClick={() => setOpenDownload(true)} className="flex items-center gap-2 px-3 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300">
            <Download size={16} /> Export
          </button>
          <DownloadLicensesDialog open={openDownload} setOpen={setOpenDownload} unboundKeys={unboundKeys} boundKeys={boundKeys} />
          <button onClick={() => setOpen(true)} className="group relative h-10 px-4 rounded-xl overflow-hidden border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400 transition-all duration-300 flex items-center gap-2 text-sm font-medium">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-400/10 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <KeyRound size={15} />
            <span className="relative tracking-wide">NEW KEY</span>
          </button>
          <CreateLicenses open={open} setOpen={setOpen} fetchLicenses={fetchLicenses} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-950 border border-zinc-800/60 rounded-2xl overflow-hidden">
        <div className="max-h-[820px] overflow-y-auto">
          <table className="w-full">
            <colgroup>
              <col style={{ width: "60px" }} />
              <col style={{ width: "220px" }} />
              <col style={{ width: "220px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "160px" }} />
              <col style={{ width: "80px" }} />
              <col style={{ width: "160px" }} />
              <col style={{ width: "90px" }} />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-zinc-950 border-b border-zinc-800/60">
              {["ID", "Key", "HWID", "Status", "Expires At", "Days", "Created At", "Action"].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-[11px] font-medium tracking-widest uppercase text-zinc-600">{h}</th>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-zinc-600 text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <RotateCcw size={15} className="animate-spin" />Loading...
                    </div>
                  </td>
                </tr>
              ) : filteredLicenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-zinc-600 text-sm">No licenses found</td>
                </tr>
              ) : (
                filteredLicenses.map((license) => {
                  const isEnabled = license.status === "Enable"
                  const boundHwid = getLicenseHwids(license).join(", ")
                  const hwid = boundHwid ? (boundHwid.length > 18 ? `${boundHwid.slice(0, 18)}...` : boundHwid) : "N/A"

                  return (
                    <tr key={license.id} className="border-t border-zinc-800/50 hover:bg-zinc-900/60 transition-colors group">
                      <td className="px-5 py-4 text-xs text-zinc-600 font-medium">#{license.id}</td>
                      <td className="px-5 py-4 font-mono text-[13px] text-zinc-300 tracking-wide">{license.key}</td>
                      <td className="px-5 py-4 font-mono text-xs text-zinc-600">{hwid}</td>
                      <td className="px-5 py-4">
                        <button onClick={() => handleUpdate(license.id, license.status)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${isEnabled ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                          <CircleDot size={8} /> {license.status}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-xs text-zinc-600">{license.expireAt ? new Date(license.expireAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}</td>
                      <td className="px-5 py-4 text-xs text-zinc-600">{license.expDays}</td>
                      <td className="px-5 py-4 text-xs text-zinc-600">{new Date(license.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleDelete(license.id)} className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 transition-all duration-200" aria-label={`Delete license ${license.id}`}><Trash2 size={14} /></button>
                          <button onClick={() => handleReset(license.key)} className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 transition-all duration-200" aria-label={`Reset HWID for license ${license.id}`}><RotateCcw size={14} /></button>
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
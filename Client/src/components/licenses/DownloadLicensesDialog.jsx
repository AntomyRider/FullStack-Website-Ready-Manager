import { useState, useMemo } from "react"
import { Download, FileText, FileDown, X } from "lucide-react"
import { useLicensesStore } from "../../store/licensesStore"

const DownloadLicensesDialog = ({ open, setOpen, unboundKeys, boundKeys }) => {
  const [type, setType] = useState("unbound")
  const [format, setFormat] = useState("txt")
  const [days, setDays] = useState("all") // ใหม่: เลือกจำนวนวัน

  if (!open) return null

  const getLicenseHwids = (license) => license.hwid || ""

  const downloadFile = (content, filename, mime) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // สร้างรายการ dropdown จาก expDays ของ keys
  const availableDays = useMemo(() => {
    const list = type === "unbound" ? unboundKeys : boundKeys
    const setDays = new Set(list.map(k => k.expDays).filter(Boolean))
    return Array.from(setDays).sort((a, b) => a - b)
  }, [type, unboundKeys, boundKeys])

  const handleDownload = () => {
    let list = type === "unbound" ? unboundKeys : boundKeys

    if (days !== "all") {
      list = list.filter(k => k.expDays === parseInt(days))
    }

    if (format === "txt") {
      const data = list.map(k => type === "unbound"
        ? k.key
        : `${k.key} | ${getLicenseHwids(k)}`
      ).join("\n")
      const filename = `${type}-${days}-keys.txt`
      downloadFile(data, filename, "text/plain")
    }

    if (format === "csv") {
      const data = type === "unbound"
        ? "key\n" + list.map(k => k.key).join("\n")
        : "key,hwid\n" + list.map(k => `${k.key},${getLicenseHwids(k)}`).join("\n")
      const filename = `${type}-${days}-keys.csv`
      downloadFile(data, filename, "text/csv")
    }

    setOpen(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="w-[420px] bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-zinc-200 font-medium flex items-center gap-2">
            <Download size={16} />
            Export Licenses
          </h2>
          <button onClick={() => setOpen(false)}>
            <X size={16} className="text-zinc-500" />
          </button>
        </div>

        {/* Type */}
        <div className="space-y-2">
          <p className="text-xs text-zinc-500">Data Type</p>
          <div className="flex gap-2">
            <button
              onClick={() => setType("unbound")}
              className={`flex-1 px-3 py-2 rounded-lg text-sm border ${
                type === "unbound"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "border-zinc-800 text-zinc-400"
              }`}
            >
              No HWID ({unboundKeys.length})
            </button>
            <button
              onClick={() => setType("bound")}
              className={`flex-1 px-3 py-2 rounded-lg text-sm border ${
                type === "bound"
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                  : "border-zinc-800 text-zinc-400"
              }`}
            >
              With HWID ({boundKeys.length})
            </button>
          </div>
        </div>

        {/* Days Dropdown */}
        <div className="space-y-2">
          <p className="text-xs text-zinc-500">Select Days</p>
          <select
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-2 rounded-lg text-sm"
          >
            <option value="all">All</option>
            {availableDays.map(d => (
              <option key={d} value={d}>{d} Day{d > 1 ? "s" : ""}</option>
            ))}
          </select>
        </div>

        {/* Format */}
        <div className="space-y-2">
          <p className="text-xs text-zinc-500">Format</p>
          <div className="flex gap-2">
            <button
              onClick={() => setFormat("txt")}
              className={`flex-1 px-3 py-2 rounded-lg text-sm border flex items-center justify-center gap-2 ${
                format === "txt"
                  ? "bg-zinc-800 border-zinc-700 text-zinc-200"
                  : "border-zinc-800 text-zinc-500"
              }`}
            >
              <FileText size={14} /> TXT
            </button>
            <button
              onClick={() => setFormat("csv")}
              className={`flex-1 px-3 py-2 rounded-lg text-sm border flex items-center justify-center gap-2 ${
                format === "csv"
                  ? "bg-zinc-800 border-zinc-700 text-zinc-200"
                  : "border-zinc-800 text-zinc-500"
              }`}
            >
              <FileDown size={14} /> CSV
            </button>
          </div>
        </div>

        {/* Action */}
        <button
          onClick={handleDownload}
          className="w-full h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15 transition"
        >
          Download
        </button>
      </div>
    </div>
  )
}

export default DownloadLicensesDialog
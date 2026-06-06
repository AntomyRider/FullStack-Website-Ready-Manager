import { useMemo, useState } from "react"
import { Download, FileDown, FileText, X } from "lucide-react"
import { useToast } from "../ui/toastContext"
import Select from "../ui/Select"

const optionClass = (active, tone = "zinc") => {
  if (active && tone === "emerald") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  if (active && tone === "sky") return "border-sky-500/30 bg-sky-500/10 text-sky-300"
  if (active) return "border-zinc-700 bg-zinc-800/80 text-zinc-100"
  return "border-zinc-800 bg-black/20 text-zinc-500 hover:text-zinc-300"
}

const DownloadLicensesDialog = ({ open, setOpen, unboundKeys, boundKeys }) => {
  const [type, setType] = useState("unbound")
  const [format, setFormat] = useState("txt")
  const [days, setDays] = useState("all")
  const { success, error } = useToast()

  const list = type === "unbound" ? unboundKeys : boundKeys

  const availableDays = useMemo(() => {
    const uniqueDays = new Set(list.map((key) => key.expDays).filter(Boolean))
    return Array.from(uniqueDays).sort((a, b) => a - b)
  }, [list])

  if (!open) return null

  const getLicenseHwids = (license) => license.hwid || ""

  const downloadFile = (content, filename, mime) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleDownload = () => {
    let filtered = list

    if (days !== "all") {
      filtered = filtered.filter((key) => key.expDays === parseInt(days))
    }

    if (filtered.length === 0) {
      error("Nothing to export", "No keys match the selected filters.")
      return
    }

    if (format === "txt") {
      const data = filtered
        .map((key) => (type === "unbound" ? key.key : `${key.key} | ${getLicenseHwids(key)}`))
        .join("\n")
      downloadFile(data, `${type}-${days}-keys.txt`, "text/plain")
    }

    if (format === "csv") {
      const data =
        type === "unbound"
          ? `key\n${filtered.map((key) => key.key).join("\n")}`
          : `key,hwid\n${filtered.map((key) => `${key.key},${getLicenseHwids(key)}`).join("\n")}`
      downloadFile(data, `${type}-${days}-keys.csv`, "text/csv")
    }

    setOpen(false)
    success("Export ready", `${filtered.length} key(s) downloaded as ${format.toUpperCase()}.`)
  }

  const selectOptions = useMemo(() => [
    { value: "all", label: "All days" },
    ...availableDays.map((day) => ({ value: day, label: `${day} days` })),
  ], [availableDays])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-zinc-800/70 bg-zinc-950 shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between border-b border-zinc-800/60 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-300">
              <Download size={17} />
            </div>
            <div>
              <h2 className="text-base font-medium text-zinc-100">Export Licenses</h2>
              <p className="mt-1 text-sm text-zinc-600">Download key lists by status and duration.</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-200"
            aria-label="Close export licenses"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-500">Data Type</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setType("unbound")
                  setDays("all")
                }}
                className={`h-10 rounded-lg border px-3 text-sm font-medium transition ${optionClass(type === "unbound", "emerald")}`}
              >
                No HWID ({unboundKeys.length})
              </button>
              <button
                onClick={() => {
                  setType("bound")
                  setDays("all")
                }}
                className={`h-10 rounded-lg border px-3 text-sm font-medium transition ${optionClass(type === "bound", "sky")}`}
              >
                With HWID ({boundKeys.length})
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-zinc-500">Expire Days</p>
            <Select
              value={days}
              onChange={setDays}
              options={selectOptions}
              size="md"
              className="w-full"
              triggerClassName="w-full text-zinc-300"
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-zinc-500">Format</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFormat("txt")}
                className={`flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${optionClass(format === "txt")}`}
              >
                <FileText size={14} />
                TXT
              </button>
              <button
                onClick={() => setFormat("csv")}
                className={`flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${optionClass(format === "csv")}`}
              >
                <FileDown size={14} />
                CSV
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setOpen(false)}
              className="h-9 rounded-lg border border-zinc-800 px-3 text-sm font-medium text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              className="h-9 rounded-lg border border-sky-500/25 bg-sky-500/10 px-4 text-sm font-medium text-sky-300 transition hover:bg-sky-500/15"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DownloadLicensesDialog

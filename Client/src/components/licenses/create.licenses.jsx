import { useState, useEffect } from "react"
import { KeyRound, X } from "lucide-react"
import { createKey } from "../../api/licenses"
import { useToast } from "../ui/toastContext"

const CreateLicenses = ({ open, setOpen, fetchLicenses }) => {
  const [form, setForm] = useState({ amount: "", exp: "" })
  const [keyType, setKeyType] = useState("lifetime") // "lifetime" or "days"
  const [submitting, setSubmitting] = useState(false)
  const { success, error } = useToast()

  // State for enter/exit transitions
  const [shouldRender, setShouldRender] = useState(open)
  const [animateShow, setAnimateShow] = useState(false)

  useEffect(() => {
    if (open) {
      setShouldRender(true)
      const timer = setTimeout(() => {
        setAnimateShow(true)
      }, 20)
      return () => clearTimeout(timer)
    } else {
      setAnimateShow(false)
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [open])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)

    try {
      const submitForm = {
        amount: form.amount,
        exp: keyType === "lifetime" ? 0 : parseInt(form.exp) || 0
      }
      const res = await createKey(submitForm)

      if (res?.success) {
        await fetchLicenses()
        setForm({ amount: "", exp: "" })
        setOpen(false)
        success("Licenses created", `${form.amount || 0} new key(s) generated.`)
        return
      }

      error("Create failed", res?.message ?? "Please check the form and try again.")
    } catch (err) {
      error("Create failed", err?.message ?? "Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!shouldRender) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm transition-opacity duration-200 ease-out ${animateShow ? "opacity-100" : "opacity-0"}`}>
      <div className={`w-full max-w-md overflow-hidden rounded-xl border border-zinc-800/70 bg-zinc-950 shadow-2xl shadow-black/40 transition-all duration-200 ease-out transform ${animateShow ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
        <div className="flex items-start justify-between border-b border-zinc-800/60 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
              <KeyRound size={17} />
            </div>
            <div>
              <h2 className="text-base font-medium text-zinc-100">Create Licenses</h2>
              <p className="mt-1 text-sm text-zinc-600">Generate clean license keys in bulk.</p>
            </div>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-200"
            aria-label="Close create licenses"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-500">Amount</label>
            <input
              type="number"
              min={1}
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              className="h-10 w-full rounded-lg border border-zinc-800 bg-black/30 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-emerald-500/35"
              placeholder="10"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-500">Key Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setKeyType("lifetime")}
                className={`flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${
                  keyType === "lifetime"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-zinc-800 bg-black/20 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Lifetime (ใช้งานถาวร)
              </button>
              <button
                type="button"
                onClick={() => setKeyType("days")}
                className={`flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${
                  keyType === "days"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-zinc-800 bg-black/20 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Custom Days (กำหนดวัน)
              </button>
            </div>
          </div>

          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
            keyType === "days" ? "max-h-24 opacity-100 mt-4" : "max-h-0 opacity-0 mt-0 pointer-events-none"
          }`}>
            <label className="mb-2 block text-xs font-medium text-zinc-500">Expire Days</label>
            <input
              type="number"
              min={1}
              value={form.exp}
              onChange={(event) => setForm((current) => ({ ...current, exp: event.target.value }))}
              className="h-10 w-full rounded-lg border border-zinc-800 bg-black/30 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-emerald-500/35"
              placeholder="30"
              required={keyType === "days"}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-9 rounded-lg border border-zinc-800 px-3 text-sm font-medium text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-9 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateLicenses

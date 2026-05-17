import { useState } from "react"
import { X } from "lucide-react"
import { createKey } from "../../api/licenses"

const CreateLicenses = ({ open, setOpen, fetchLicenses }) => {
  const [form, setForm] = useState({
    amount: "",
    exp: "",
    maxUsersPerKey: "",
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
        const res = await createKey(form)
        if (res.success === true)
            await fetchLicenses()
            setForm({
            amount: '',
            exp: ''
            })
            setOpen(false)
    } catch (error) {
        console.log(error)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">

      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">

        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          
          <div>
            <h1 className="text-lg font-semibold text-white">
              Create Licenses
            </h1>

            <p className="text-sm text-zinc-500 mt-1">
              Generate new licenses key
            </p>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
          >
            <X size={18} />
          </button>

        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-5"
        >

          <div>
            <label className="block text-sm text-zinc-400 mb-2">
              Amount
            </label>

            <input
              type="number"
              min={1}
              value={form.amount}
              onChange={(e) =>
                setForm({
                  ...form,
                  amount: e.target.value,
                })
              }
              className="w-full h-12 px-4 rounded-lg bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-emerald-500/40 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">
              Expire Days
            </label>

            <input
              type="number"
              min={0}
              value={form.exp}
              onChange={(e) =>
                setForm({
                  ...form,
                  exp: e.target.value,
                })
              }
              className="w-full h-12 px-4 rounded-lg bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-emerald-500/40 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">
              Max User
            </label>

            <input
              type="number"
              min={0}
              value={form.maxUsersPerKey}
              onChange={(e) =>
                setForm({
                  ...form,
                  maxUsersPerKey: e.target.value,
                })
              }
              className="w-full h-12 px-4 rounded-lg bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-emerald-500/40 transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full h-12 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold transition-all duration-200"
          >
            Create Licenses
          </button>

        </form>

      </div>

    </div>
  )
}

export default CreateLicenses
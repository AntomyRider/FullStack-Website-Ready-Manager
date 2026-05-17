import { ShieldAlert } from "lucide-react"
import Legend from "./Legend"

const StatusDonut = ({ active, disabled, expiringSoon, total }) => {
  const chartTotal = Math.max(active + disabled, 1)
  const activeDeg = (active / chartTotal) * 360
  const disabledDeg = activeDeg + (disabled / chartTotal) * 360

  return (
    <div className="bg-zinc-950 border border-zinc-800/70 rounded-xl p-5 min-h-80">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-white">Status Donut</h2>
          <p className="text-xs text-zinc-600 mt-1">Active, disabled, expiring</p>
        </div>
        <ShieldAlert size={18} className="text-amber-300" />
      </div>

      <div className="mt-7 flex items-center justify-center">
        <div
          className="relative w-44 h-44 rounded-full"
          style={{
            background: `conic-gradient(#34d399 0deg ${activeDeg}deg, #f87171 ${activeDeg}deg ${disabledDeg}deg, #27272a ${disabledDeg}deg 360deg)`,
          }}
        >
          <div className="absolute inset-5 rounded-full bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center">
            <span className="text-3xl font-semibold text-white">{total}</span>
            <span className="text-[11px] uppercase tracking-widest text-zinc-600">Tracked</span>
          </div>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-3 gap-2">
        <Legend color="bg-emerald-400" label="Active" value={active} />
        <Legend color="bg-red-400" label="Disabled" value={disabled} />
        <Legend color="bg-amber-300" label="Soon" value={expiringSoon} />
      </div>
    </div>
  )
}

export default StatusDonut

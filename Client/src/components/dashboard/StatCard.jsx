const StatCard = ({ label, value, icon: Icon, tone = "zinc" }) => {
  const tones = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    zinc: "text-zinc-300 bg-zinc-900 border-zinc-800",
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800/70 rounded-xl p-4 min-h-28">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-zinc-600">{label}</p>
          <p className="text-3xl font-semibold text-white mt-3">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${tones[tone]}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

export default StatCard
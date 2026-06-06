const Legend = ({ color, label, value }) => (
  <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2">
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
    <p className="text-lg font-medium text-zinc-100 mt-1">{value}</p>
  </div>
)

export default Legend
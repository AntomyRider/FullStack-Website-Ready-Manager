import { Activity } from "lucide-react"

const UsageChart = ({ data }) => {
  const max = Math.max(...data.map((item) => item.count), 1)
  const width = 560
  const height = 190
  const padding = 18
  const points = data.map((item, index) => {
    const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2)
    const y = height - padding - (item.count / max) * (height - padding * 2)

    return { ...item, x, y }
  })
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ")
  const fillPath = points.length
    ? `${path} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : ""

  return (
    <div className="bg-zinc-950 border border-zinc-800/70 rounded-xl p-5 min-h-80">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-white">Usage Chart</h2>
          <p className="text-xs text-zinc-600 mt-1">Keys created over 7 days</p>
        </div>
        <Activity size={18} className="text-emerald-400" />
      </div>

      <div className="mt-6 h-56">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Usage line chart"
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          {[0, 1, 2, 3].map((line) => {
            const y = padding + (line / 3) * (height - padding * 2)
            return (
              <line
                key={line}
                x1={padding}
                x2={width - padding}
                y1={y}
                y2={y}
                stroke="#27272a"
                strokeWidth="1"
              />
            )
          })}

          <path d={fillPath} fill="url(#usageFill)" opacity="0.65" />
          <path
            d={path}
            fill="none"
            stroke="#34d399"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {points.map((point) => (
            <g key={point.label}>
              <circle cx={point.x} cy={point.y} r="5" fill="#34d399" />
              <circle cx={point.x} cy={point.y} r="9" fill="#34d399" opacity="0.12" />
              <title>{`${point.label}: ${point.count} keys`}</title>
            </g>
          ))}

          <defs>
            <linearGradient id="usageFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.02" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-2">
        {points.map((point) => (
          <div key={point.label} className="min-w-0 text-center">
            <p className="text-xs text-zinc-300">{point.count}</p>
            <p className="text-[11px] text-zinc-600 truncate">{point.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default UsageChart
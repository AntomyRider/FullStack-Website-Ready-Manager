import { Clock3 } from "lucide-react"
import { formatTime } from "../../utils/formatters"

const ActivityFeed = ({ items }) => (
  <div className="bg-zinc-950 border border-zinc-800/70 rounded-xl p-5">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-medium text-white">Activity Feed</h2>
      <Clock3 size={17} className="text-zinc-500" />
    </div>

    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="py-8 text-center text-sm text-zinc-600">No recent activity</div>
      ) : (
        items.map((item, index) => {
          const Icon = item.icon
          return (
            <div key={`${item.type}-${item.key}-${index}`} className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${item.tone}`}>
                <Icon size={14} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-zinc-200 truncate">{item.title}</p>
                <p className="text-xs text-zinc-600 font-mono truncate">{item.key}</p>
              </div>
              <span className="ml-auto shrink-0 text-xs text-zinc-600">{formatTime(item.date)}</span>
            </div>
          )
        })
      )}
    </div>
  </div>
)

export default ActivityFeed

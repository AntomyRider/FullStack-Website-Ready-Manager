import { Monitor, KeyRound } from "lucide-react"
import { NavLink } from "react-router-dom"

const menus = [
  {
    name: "Dashboard",
    path: "/",
    icon: Monitor,
  },
  {
    name: "Licenses Key",
    path: "/licenses",
    icon: KeyRound,
  },
]


const Sidebar = () => {
  return (
    <aside className="w-72 h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col">
      
      <div className="px-6 py-5 border-b border-zinc-800">
        <h1 className="text-white text-xl font-semibold tracking-wide">
          Automation
        </h1>

        <p className="text-zinc-500 text-sm mt-1">
          Control Panel
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        
        {menus.map((menu, index) => {
          const Icon = menu.icon

          return (
            <NavLink
              key={index}
              to={menu.path}
              end={menu.path === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`
              }
            >
              <Icon size={20} />

              <span className="font-medium">
                {menu.name}
              </span>
            </NavLink>
          )
        })}

      </nav>

      <div className="p-4 border-t border-zinc-800">
        <div className="bg-zinc-900 rounded-xl p-4">
          <p className="text-zinc-400 text-sm">
            Status
          </p>

          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />

            <span className="text-white text-sm">
              Server Online
            </span>
          </div>
        </div>
      </div>

    </aside>
  )
}

export default Sidebar
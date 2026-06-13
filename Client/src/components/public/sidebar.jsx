import { KeyRound, LayoutDashboard, Server, Users, Bot } from "lucide-react"
import { NavLink } from "react-router-dom"

const menus = [
  {
    name: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    name: "License Keys",
    path: "/licenses",
    icon: KeyRound,
  },
  {
    name: "User Stats",
    path: "/user-stats",
    icon: Users,
  },
  {
    name: "Bot Settings",
    path: "/bot-settings",
    icon: Bot,
  },
  {
    name: "Server",
    path: "/server",
    icon: Server,
  },
]

const Sidebar = () => {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-zinc-800/60 bg-zinc-950">
      <div className="border-b border-zinc-800/60 px-5 py-5">
        <h1 className="text-lg font-medium tracking-wide text-zinc-100">
          Automation
        </h1>

        <p className="mt-1 text-sm text-zinc-600">
          Control Panel
        </p>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {menus.map((menu, index) => {
          const Icon = menu.icon

          return (
            <NavLink
              key={index}
              to={menu.path}
              end={menu.path === "/"}
              className={({ isActive }) =>
                `flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition ${
                  isActive
                    ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    : "border border-transparent text-zinc-500 hover:bg-zinc-900/80 hover:text-zinc-200"
                }`
              }
            >
              <Icon size={17} />
              <span className="font-medium">
                {menu.name}
              </span>
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-zinc-800/60 p-4">
        <p className="text-xs text-zinc-700">Client admin workspace</p>
      </div>
    </aside>
  )
}

export default Sidebar

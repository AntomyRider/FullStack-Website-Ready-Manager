import { Outlet } from "react-router-dom"
import Sidebar from "../components/public/sidebar"

const Main = () => {
  return (
    <div className="h-screen overflow-hidden">
      <div className="flex gap-5 bg-black h-full">
        <Sidebar />

        <main className="flex-1 h-full overflow-hidden">
          <div className="h-full overflow-y-auto">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  )
}

export default Main
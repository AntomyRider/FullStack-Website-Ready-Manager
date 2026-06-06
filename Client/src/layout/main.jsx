import { Outlet } from "react-router-dom"
import Sidebar from "../components/public/sidebar"

const Main = () => {
  return (
    <div className="h-screen overflow-hidden">
      <div className="flex h-full bg-black">
        <Sidebar />

        <main className="flex-1 h-full overflow-hidden">
          <div className="h-full overflow-y-auto pl-5">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  )
}

export default Main

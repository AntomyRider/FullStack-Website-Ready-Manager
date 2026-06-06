import { BrowserRouter, Routes, Route } from "react-router-dom"

import Main from "./layout/main"
import Dashboard from "./pages/dashboard"
import Licenses from "./pages/licenses"
import Login from "./pages/login"
import ProtectedRoute from "./middlewares/protectedRoute"
import Server from "./pages/server"
import { ToastProvider } from "./components/ui/ToastProvider"

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>

          {/* public */}
          <Route path="/login" element={<Login />} />

          {/* protected group */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Main />}>
              <Route index element={<Dashboard />} />
              <Route path="licenses" element={<Licenses />} />
              <Route path="server" element={<Server />} />
            </Route>
          </Route>

        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App

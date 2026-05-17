import { BrowserRouter, Routes, Route } from "react-router-dom"

import Main from "./layout/main"
import Dashboard from "./pages/dashboard"
import Lincenses from "./pages/licenses"
import Login from "./pages/login"
import ProtectedRoute from "./middlewares/protectedRoute"

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* public */}
        <Route path="/login" element={<Login />} />

        {/* protected group */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Main />}>
            <Route index element={<Dashboard />} />
            <Route path="licenses" element={<Lincenses />} />
          </Route>
        </Route>

      </Routes>
    </BrowserRouter>
  )
}

export default App
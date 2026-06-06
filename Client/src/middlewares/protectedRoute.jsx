import { useEffect, useState } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { me } from "../api/auth"

const ProtectedRoute = ({ redirectTo = "/login" }) => {
  const [status, setStatus] = useState("checking")
  const location = useLocation()

  useEffect(() => {
    let mounted = true

    const checkAuth = async () => {
      const res = await me()
      if (!mounted) return

      setStatus(res.success ? "authenticated" : "unauthenticated")
    }

    checkAuth()

    return () => {
      mounted = false
    }
  }, [])

  if (status === "checking") {
    return null
  }

  if (status === "unauthenticated") {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export default ProtectedRoute

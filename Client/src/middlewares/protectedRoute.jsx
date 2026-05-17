import { useEffect, useState } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { me } from "../api/auth"

const ProtectedRoute = ({ redirectTo = "/login" }) => {
  const [status, setStatus] = useState("checking")

  useEffect(() => {
    let mounted = true

    const checkAuth = async () => {
      const res = await me()
      if (mounted) setStatus(res.success ? "authenticated" : "unauthenticated")
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
    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}

export default ProtectedRoute

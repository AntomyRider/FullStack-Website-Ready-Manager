import { useEffect, useState } from "react"
import { Mail, Lock, Eye, EyeOff, Zap, ArrowRight, Loader2 } from "lucide-react"
import { login, me } from "../api/auth"
import { useLocation, useNavigate } from "react-router-dom"

const Login = () => {

    const navigate = useNavigate()
    const location = useLocation()
    const redirectTo = location.state?.from || "/"

  const [form, setForm] = useState({
    email: "",
    password: ""
  })

  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState({})
  const [checking, setChecking] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true

    const checkExistingSession = async () => {
      const res = await me()

      if (!mounted) return

      if (res.success) {
        navigate(redirectTo, { replace: true })
        return
      }

      setChecking(false)
    }

    checkExistingSession()

    return () => {
      mounted = false
    }
  }, [navigate, redirectTo])

  const validate = () => {
    const errs = {}

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Invalid email"
    }

    if (form.password.length < 6) {
      errs.password = "Min 6 characters"
    }

    return errs
  }

  const handleSubmit = async () => {
    if (submitting) return

    const errs = validate()
    setErrors(errs)

    if (Object.keys(errs).length > 0) return

    try {
      setSubmitting(true)
      const res = await login(form)
      if (res.success === true) {
        navigate(redirectTo, { replace: true })
      } else {
        setErrors({ form: res.message || "Login failed" })
      }
    } catch (error) {
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-zinc-500">
        <Loader2 size={20} className="animate-spin mr-2" />
        Checking session
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl p-10 shadow-2xl">

        {/* Header */}
        <div className="mb-8">
          <div className="w-9 h-9 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center mb-5">
            <Zap size={16} className="text-emerald-400" />
          </div>

          <h1 className="text-xl font-medium text-white">Welcome back</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Sign in to continue
          </p>
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="text-xs text-zinc-400 uppercase tracking-wider">
            Email
          </label>

          <div className="relative mt-2">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />

            <input
              value={form.email}
              onChange={e =>
                setForm({ ...form, email: e.target.value })
              }
              placeholder="you@example.com"
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-zinc-900 border border-zinc-800 rounded-lg outline-none focus:border-emerald-500/60 transition"
            />
          </div>

          {errors.email && (
            <p className="text-xs text-red-400 mt-1">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div className="mb-3">
          <label className="text-xs text-zinc-400 uppercase tracking-wider">
            Password
          </label>

          <div className="relative mt-2">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />

            <input
              type={showPw ? "text" : "password"}
              value={form.password}
              onChange={e =>
                setForm({ ...form, password: e.target.value })
              }
              placeholder="••••••••"
              className="w-full pl-9 pr-9 py-2.5 text-sm bg-zinc-900 border border-zinc-800 rounded-lg outline-none focus:border-emerald-500/60 transition"
            />

            <button
              onClick={() => setShowPw(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {errors.password && (
            <p className="text-xs text-red-400 mt-1">{errors.password}</p>
          )}
        </div>

        {errors.form && (
          <p className="text-xs text-red-400 mb-3">{errors.form}</p>
        )}

        {/* Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15 transition"
        >
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
          {submitting ? "Signing in" : "Sign in"}
        </button>

      </div>
    </div>
  )
}

export default Login

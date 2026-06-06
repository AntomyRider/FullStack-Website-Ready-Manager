import { useCallback, useMemo, useRef, useState } from "react"
import { AlertTriangle, CheckCircle2, Info, Trash2, X, XCircle } from "lucide-react"
import { ToastContext } from "./toastContext"

const toneStyles = {
  success: {
    icon: CheckCircle2,
    className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  },
  error: {
    icon: XCircle,
    className: "border-red-500/25 bg-red-500/10 text-red-300",
  },
  info: {
    icon: Info,
    className: "border-zinc-700/70 bg-zinc-900/95 text-zinc-300",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  },
  danger: {
    icon: Trash2,
    className: "border-red-500/30 bg-red-500/10 text-red-300",
  },
}

const ToastItem = ({ toast, onClose }) => {
  const tone = toneStyles[toast.type] ?? toneStyles.info
  const Icon = tone.icon
  const isExiting = toast.isExiting

  const handleClose = () => {
    if (isExiting) return
    onClose(toast.id)
  }

  return (
    <div className={`w-full max-w-sm rounded-xl border p-3 shadow-2xl shadow-black/30 backdrop-blur transition-all duration-200 ${tone.className} ${
      isExiting ? "animate-toast-slide-out" : "animate-toast-slide-in"
    }`}>
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/20">
          <Icon size={15} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-100">{toast.title}</p>
              {toast.message && <p className="mt-1 text-xs leading-5 text-zinc-400">{toast.message}</p>}
            </div>
            <button
              onClick={handleClose}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
              aria-label="Close notification"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const ConfirmDialog = ({ toast }) => {
  const tone = toneStyles[toast.type] ?? toneStyles.danger
  const Icon = tone.icon
  const isExiting = toast.isExiting

  const handleResolve = (value) => {
    if (isExiting) return
    toast.onResolve(value)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop overlay with blur */}
      <div
        onClick={() => handleResolve(false)}
        className={`absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200 cursor-pointer ${
          isExiting ? "opacity-0" : "animate-backdrop-fade"
        }`}
      />
      
      {/* Dialog card */}
      <div className={`relative w-full max-w-md transform overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/95 p-6 shadow-2xl shadow-black/80 transition-all duration-200 ${
        isExiting ? "opacity-0 scale-95" : "animate-content-show"
      }`}>
        <div className="flex gap-4">
          {/* Icon wrapper */}
          <div className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-black/20 ${tone.className}`}>
            <Icon size={22} />
          </div>

          {/* Title and Message */}
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold tracking-wide text-zinc-100">
              {toast.title}
            </h3>
            {toast.message && (
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {toast.message}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={() => handleResolve(false)}
            className="h-10 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            onClick={() => handleResolve(true)}
            className={`h-10 rounded-xl px-5 text-sm font-medium transition active:scale-[0.98] ${
              toast.type === "danger"
                ? "border border-red-500/30 bg-red-500/20 text-red-200 hover:bg-red-500/30"
                : toast.type === "success"
                ? "border border-emerald-500/30 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
                : "border border-zinc-700 bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const removeToast = useCallback((id) => {
    setToasts((current) => {
      const target = current.find((toast) => toast.id === id)
      if (!target || target.isExiting) return current

      const next = current.map((toast) =>
        toast.id === id ? { ...toast, isExiting: true } : toast
      )

      setTimeout(() => {
        setToasts((curr) => curr.filter((toast) => toast.id !== id))
      }, 200)

      return next
    })
  }, [])

  const showToast = useCallback(
    ({ type = "info", title, message, duration = 3200 }) => {
      const id = ++idRef.current
      setToasts((current) => [{ id, type, title, message }, ...current].slice(0, 5))

      if (duration > 0) {
        window.setTimeout(() => removeToast(id), duration)
      }

      return id
    },
    [removeToast],
  )

  const confirm = useCallback(
    ({ title, message, type = "danger" }) =>
      new Promise((resolve) => {
        const id = ++idRef.current
        const onResolve = (value) => {
          removeToast(id)
          resolve(value)
        }

        setToasts((current) => [
          { id, type, title, message, confirm: true, onResolve },
          ...current,
        ].slice(0, 5))
      }),
    [removeToast],
  )

  const value = useMemo(
    () => ({
      toast: showToast,
      success: (title, message) => showToast({ type: "success", title, message }),
      error: (title, message) => showToast({ type: "error", title, message, duration: 4200 }),
      info: (title, message) => showToast({ type: "info", title, message }),
      confirm,
    }),
    [confirm, showToast],
  )

  return (
    <ToastContext.Provider value={value}>
      <style>{`
        @keyframes modalBackdropFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalContentShow {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-backdrop-fade {
          animation: modalBackdropFade 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-content-show {
          animation: modalContentShow 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(2rem) scale(0.95); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toastSlideOut {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to { opacity: 0; transform: translateX(2rem) scale(0.95); }
        }
        .animate-toast-slide-in {
          animation: toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-toast-slide-out {
          animation: toastSlideOut 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      {children}
      
      {/* Toast Notifications (Top Right) */}
      <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
        {toasts
          .filter((toast) => !toast.confirm)
          .map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem toast={toast} onClose={removeToast} />
            </div>
          ))}
      </div>

      {/* Confirm Dialogs (Centered) */}
      {toasts
        .filter((toast) => toast.confirm)
        .map((toast) => (
          <ConfirmDialog key={toast.id} toast={toast} />
        ))}
    </ToastContext.Provider>
  )
}

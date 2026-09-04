import { useEffect, useRef } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useToast, type Toast, type ToastType } from '../contexts/ToastContext'

const config: Record<
  ToastType,
  { Icon: typeof CheckCircle2; iconClass: string; barClass: string; borderClass: string }
> = {
  success: {
    Icon: CheckCircle2,
    iconClass: 'text-emerald-500',
    barClass: 'bg-emerald-500',
    borderClass: 'border-l-emerald-500',
  },
  error: {
    Icon: XCircle,
    iconClass: 'text-red-500',
    barClass: 'bg-red-500',
    borderClass: 'border-l-red-500',
  },
  warning: {
    Icon: AlertTriangle,
    iconClass: 'text-amber-500',
    barClass: 'bg-amber-500',
    borderClass: 'border-l-amber-500',
  },
  info: {
    Icon: Info,
    iconClass: 'text-blue-500',
    barClass: 'bg-blue-500',
    borderClass: 'border-l-blue-500',
  },
}

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToast()
  const { Icon, iconClass, barClass, borderClass } = config[toast.type]
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!barRef.current || toast.duration <= 0) return
    const el = barRef.current
    el.style.transition = 'none'
    el.style.width = '100%'
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = `width ${toast.duration}ms linear`
        el.style.width = '0%'
      })
    })
  }, [toast.duration])

  return (
    <div
      role="alert"
      className={`
        flex items-start gap-3 w-80 rounded-xl shadow-lg
        border border-gray-100 dark:border-gray-700 border-l-4
        bg-white dark:bg-gray-900
        px-4 py-3.5 overflow-hidden relative
        transition-all duration-300 ease-out
        ${borderClass}
        ${toast.visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
      `}
    >
      <Icon size={18} className={`shrink-0 mt-0.5 ${iconClass}`} aria-hidden="true" />

      <p className="text-sm text-gray-800 dark:text-gray-200 font-medium leading-snug flex-1 pr-1">
        {toast.message}
      </p>

      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition mt-0.5"
        aria-label="Cerrar"
      >
        <X size={14} />
      </button>

      {toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gray-100 dark:bg-gray-800">
          <div ref={barRef} className={`h-full ${barClass} w-full`} />
        </div>
      )}
    </div>
  )
}

export default function ToastContainer() {
  const { toasts } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 items-end pointer-events-none"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  )
}

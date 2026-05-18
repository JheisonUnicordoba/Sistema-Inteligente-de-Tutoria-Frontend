import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

interface ReporteData {
  nivel_actual: string
  puntaje_diagnostico: number | null
  sesiones_completadas: number
  puntaje_promedio: number | null
  puntaje_saber_pro_estimado: number
  resumen: string
  fortalezas: string[]
  areas_mejora: string[]
  plan_sugerido: string[]
  mensaje_motivacional: string
  puntaje_por_tema: Record<string, number>
}

type Estado = 'cargando' | 'datos' | 'sin_diagnostico' | 'error'

function puntajeColor(p: number): string {
  if (p >= 200) return 'text-emerald-600'
  if (p >= 140) return 'text-amber-600'
  return 'text-rose-600'
}

function barColor(puntaje: number): string {
  if (puntaje >= 70) return 'bg-emerald-500'
  if (puntaje >= 40) return 'bg-amber-500'
  return 'bg-rose-500'
}

function SkeletonBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: i === lines - 1 ? '60%' : '100%' }} />
      ))}
    </div>
  )
}

export default function ReportePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [estado, setEstado] = useState<Estado>('cargando')
  const [datos, setDatos] = useState<ReporteData | null>(null)

  useEffect(() => {
    void fetchReporte()
  }, [])

  async function fetchReporte() {
    setEstado('cargando')
    try {
      const res = await api.get('/reporte')
      setDatos(res.data as ReporteData)
      setEstado('datos')
    } catch (err: unknown) {
      const status =
        typeof err === 'object' &&
        err !== null &&
        'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined
      if (status === 409) {
        setEstado('sin_diagnostico')
      } else {
        setEstado('error')
      }
    }
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const barData = datos
    ? Object.entries(datos.puntaje_por_tema).map(([tema, puntaje]) => ({
        tema,
        puntaje: Math.round(puntaje),
      }))
    : []

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-base">T</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">TutorIA Saber Pro</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-sm font-medium text-gray-600 hover:text-primary-600 transition">
              Dashboard
            </Link>
            {user?.rol === 'admin' && (
              <Link to="/admin/dashboard" className="text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-100 hover:border-primary-500 rounded-lg px-3 py-1.5 transition">
                Panel Admin
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-gray-600 hover:text-red-600 border border-gray-300 hover:border-red-300 rounded-lg px-4 py-1.5 transition focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Mi Reporte</h2>
          <p className="mt-1 text-gray-500 text-sm">Análisis detallado de tu desempeño en Razonamiento Cuantitativo.</p>
        </div>

        {estado === 'cargando' && (
          <div className="space-y-6">
            {/* Skeleton for puntaje */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col items-center gap-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-40" />
              <div className="h-16 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
            {['Resumen', 'Fortalezas', 'Áreas de Mejora', 'Plan Sugerido'].map((label) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="h-3 bg-gray-200 rounded animate-pulse w-28 mb-4" />
                <SkeletonBlock lines={4} />
              </div>
            ))}
          </div>
        )}

        {estado === 'error' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            <p className="text-gray-700 font-medium mb-2">Error al cargar el reporte</p>
            <p className="text-sm text-gray-500 mb-5">Verifica tu conexión e intenta nuevamente.</p>
            <button
              onClick={() => void fetchReporte()}
              className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl px-4 py-2.5"
            >
              Reintentar
            </button>
          </div>
        )}

        {estado === 'sin_diagnostico' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-amber-600">!</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Diagnóstico requerido</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
              Para ver tu reporte completo necesitas completar primero el diagnóstico inicial.
            </p>
            <Link
              to="/diagnostico"
              className="inline-block bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition"
            >
              Ir al Diagnóstico
            </Link>
          </div>
        )}

        {estado === 'datos' && datos && (
          <div className="space-y-6">
            {/* Puntaje estimado */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col items-center gap-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Puntaje Saber Pro Estimado</p>
              <p className={`text-6xl font-extrabold ${puntajeColor(datos.puntaje_saber_pro_estimado)}`}>
                {datos.puntaje_saber_pro_estimado}
              </p>
              <p className="text-xs text-gray-400">sobre 300 puntos</p>
            </div>

            {/* Resumen */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Resumen</p>
              <p className="text-sm text-gray-700 leading-relaxed">{datos.resumen}</p>
            </div>

            {/* Fortalezas */}
            {datos.fortalezas.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Fortalezas</p>
                <ul className="space-y-2">
                  {datos.fortalezas.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="mt-0.5 text-emerald-500 font-bold shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Áreas de mejora */}
            {datos.areas_mejora.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Áreas de Mejora</p>
                <ul className="space-y-2">
                  {datos.areas_mejora.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="mt-0.5 text-amber-500 font-bold shrink-0">!</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Plan sugerido */}
            {datos.plan_sugerido.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Plan Sugerido</p>
                <ol className="space-y-3">
                  {datos.plan_sugerido.map((paso, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                      <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {paso}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Mensaje motivacional */}
            {datos.mensaje_motivacional && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
                <p className="text-sm text-indigo-700 italic leading-relaxed">
                  "{datos.mensaje_motivacional}"
                </p>
              </div>
            )}

            {/* Puntaje por tema */}
            {barData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Puntaje por Tema</p>
                <div className="space-y-3">
                  {barData.map(({ tema, puntaje }) => (
                    <div key={tema}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700">{tema}</span>
                        <span className="text-sm font-semibold text-gray-900">{puntaje}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${barColor(puntaje)}`}
                          style={{ width: `${puntaje}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-start">
              <Link
                to="/progreso"
                className="bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-gray-50 transition"
              >
                Ver progreso detallado
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

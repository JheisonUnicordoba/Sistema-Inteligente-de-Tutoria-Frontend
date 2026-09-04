import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'

interface Sesion {
  id: number
  tipo: string
  fecha: string
  puntaje: number | null
  nivel_alcanzado: string
  completada: boolean
}

interface ProgresoData {
  nivel_actual: string
  puntaje_diagnostico: number | null
  sesiones_completadas: number
  puntaje_promedio: number | null
  temas_debiles: string[]
  temas_fuertes: string[]
  sesiones: Sesion[]
  puntaje_por_tema: Record<string, number>
}

type Estado = 'cargando' | 'datos' | 'sin_sesiones' | 'error'

const nivelConfig: Record<string, { label: string; badgeClass: string }> = {
  Basico: { label: 'Básico', badgeClass: 'bg-rose-100 text-rose-800' },
  Intermedio: { label: 'Intermedio', badgeClass: 'bg-amber-100 text-amber-800' },
  Avanzado: { label: 'Avanzado', badgeClass: 'bg-emerald-100 text-emerald-800' },
}

function barColor(puntaje: number): string {
  if (puntaje >= 70) return '#10b981'
  if (puntaje >= 40) return '#f59e0b'
  return '#f43f5e'
}

function formatFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

interface BarShapeProps {
  x?: number
  y?: number
  width?: number
  height?: number
  value?: number
}

function renderCustomBar(props: BarShapeProps): React.ReactElement {
  const { x = 0, y = 0, width = 0, height = 0, value = 0 } = props
  return <rect x={x} y={y} width={width} height={height} fill={barColor(value)} rx={4} />
}

export default function ProgresoPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [estado, setEstado] = useState<Estado>('cargando')
  const [datos, setDatos] = useState<ProgresoData | null>(null)

  useEffect(() => {
    void fetchProgreso()
  }, [])

  async function fetchProgreso() {
    setEstado('cargando')
    try {
      const res = await api.get('/progreso')
      const data = res.data as ProgresoData
      if (data.sesiones_completadas === 0) {
        setEstado('sin_sesiones')
      } else {
        setDatos(data)
        setEstado('datos')
      }
    } catch {
      setEstado('error')
    }
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const nivel = datos?.nivel_actual ?? 'Basico'
  const nivelDisplay = nivelConfig[nivel] ?? nivelConfig['Basico']

  const lineData =
    datos?.sesiones
      .filter((s) => s.puntaje !== null)
      .map((s) => ({
        fecha: formatFecha(s.fecha),
        puntaje: s.puntaje,
      })) ?? []

  const barData = datos
    ? Object.entries(datos.puntaje_por_tema).map(([tema, puntaje]) => ({
        tema,
        puntaje: Math.round(puntaje),
      }))
    : []

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-base">T</span>
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">TutorIA Saber Pro</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition">
              Dashboard
            </Link>
            {user?.rol === 'admin' && (
              <Link to="/admin/dashboard" className="text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-100 hover:border-primary-500 rounded-lg px-3 py-1.5 transition">
                Panel Admin
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 border border-gray-300 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-700 rounded-lg px-4 py-1.5 transition focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mi Progreso</h2>
          <p className="mt-1 text-gray-500 dark:text-gray-400 text-sm">Visualiza tu avance en el Saber Pro.</p>
        </div>

        {estado === 'cargando' && (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          </div>
        )}

        {estado === 'error' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 text-center">
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">Error al cargar el progreso</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Verifica tu conexión e intenta nuevamente.</p>
            <button
              onClick={() => void fetchProgreso()}
              className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl px-4 py-2.5"
            >
              Reintentar
            </button>
          </div>
        )}

        {estado === 'sin_sesiones' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-10 text-center">
            <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">G</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Aún no tienes sesiones</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              Comienza una sesión de tutoría para ver tu progreso aquí.
            </p>
            <Link
              to="/tutoria"
              className="inline-block bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition"
            >
              Ir a Tutoría
            </Link>
          </div>
        )}

        {estado === 'datos' && datos && (
          <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 flex flex-col items-center gap-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nivel Actual</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${nivelDisplay.badgeClass}`}>
                  {nivelDisplay.label}
                </span>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 flex flex-col items-center gap-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Puntaje Promedio</p>
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * (1 - (datos.puntaje_promedio ?? 0) / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold text-gray-900 dark:text-gray-100">
                    {datos.puntaje_promedio !== null ? Math.round(datos.puntaje_promedio) : '—'}
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 flex flex-col items-center gap-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sesiones Completadas</p>
                <p className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">{datos.sesiones_completadas}</p>
              </div>
            </div>

            {/* Line chart */}
            {lineData.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Evolución del Puntaje</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="puntaje"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Bar chart */}
            {barData.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Puntaje por Tema</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="tema" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="puntaje" shape={renderCustomBar} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Temas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {datos.temas_debiles.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Temas a Mejorar</p>
                  <div className="flex flex-wrap gap-2">
                    {datos.temas_debiles.map((t) => (
                      <span key={t} className="px-2.5 py-1 bg-rose-100 text-rose-800 text-xs font-semibold rounded-full">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {datos.temas_fuertes.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Temas Fuertes</p>
                  <div className="flex flex-wrap gap-2">
                    {datos.temas_fuertes.map((t) => (
                      <span key={t} className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Link to report */}
            <div className="flex justify-end">
              <Link
                to="/reporte"
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Ver reporte completo
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

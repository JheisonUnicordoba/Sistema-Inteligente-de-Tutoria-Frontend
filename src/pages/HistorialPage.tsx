import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

interface SesionHistorial {
  id: number
  tipo: string
  fecha: string
  puntaje: number | null
  nivel_alcanzado: string
  completada: boolean
  total_preguntas: number | null
  correctas: number | null
}

interface HistorialResponse {
  items: SesionHistorial[]
  total: number
  page: number
  page_size: number
  pages: number
}

const TIPO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'tutoria', label: 'Tutoría' },
  { value: 'simulacro', label: 'Simulacro' },
  { value: 'diagnostico', label: 'Diagnóstico' },
]

const tipoBadge: Record<string, string> = {
  tutoria: 'bg-blue-100 text-blue-800',
  simulacro: 'bg-purple-100 text-purple-800',
  diagnostico: 'bg-gray-100 text-gray-700',
}

const tipoLabel: Record<string, string> = {
  tutoria: 'Tutoría',
  simulacro: 'Simulacro',
  diagnostico: 'Diagnóstico',
}

const nivelLabel: Record<string, string> = {
  Basico: 'Básico',
  Intermedio: 'Intermedio',
  Avanzado: 'Avanzado',
}

function formatFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

export default function HistorialPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [items, setItems] = useState<SesionHistorial[]>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [filterTipo, setFilterTipo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void fetchHistorial()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterTipo])

  async function fetchHistorial() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), page_size: '10' })
      if (filterTipo) params.set('tipo', filterTipo)
      const res = await api.get(`/historial?${params.toString()}`)
      const data = res.data as HistorialResponse
      setItems(data.items)
      setTotal(data.total)
      setPage(data.page)
      setPages(data.pages)
    } catch {
      setError('Error al cargar el historial')
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function handleFilterChange(value: string) {
    setFilterTipo(value)
    setPage(1)
  }

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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Historial de Sesiones</h2>
            <p className="mt-1 text-gray-500 text-sm">{total} sesión{total !== 1 ? 'es' : ''} registrada{total !== 1 ? 's' : ''}</p>
          </div>
          <select
            value={filterTipo}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
          >
            {TIPO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Puntaje</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nivel</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Aciertos</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <p className="text-sm text-gray-400 font-medium">Sin sesiones</p>
                      <p className="text-xs text-gray-400 mt-1">No hay sesiones registradas para este filtro.</p>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${tipoBadge[item.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                          {tipoLabel[item.tipo] ?? item.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatFecha(item.fecha)}</td>
                      <td className="px-4 py-3 text-gray-900 font-semibold">
                        {item.puntaje !== null ? `${Math.round(item.puntaje)}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {nivelLabel[item.nivel_alcanzado] ?? item.nivel_alcanzado ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {item.correctas !== null && item.total_preguntas !== null
                          ? `${item.correctas}/${item.total_preguntas}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${item.completada ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          <span className={`text-xs font-medium ${item.completada ? 'text-emerald-700' : 'text-gray-500'}`}>
                            {item.completada ? 'Completada' : 'Incompleta'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">Página {page} de {pages}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 border border-gray-200 rounded-lg transition"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 border border-gray-200 rounded-lg transition"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

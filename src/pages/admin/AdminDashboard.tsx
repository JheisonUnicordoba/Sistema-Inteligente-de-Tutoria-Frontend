import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import api from '../../lib/api'

interface AdminStats {
  total_usuarios: number
  total_estudiantes: number
  total_preguntas_activas: number
  total_sesiones: number
}

interface StatCard {
  label: string
  key: keyof AdminStats
  icon: string
  color: string
}

const statCards: StatCard[] = [
  {
    label: 'Total Usuarios',
    key: 'total_usuarios',
    icon: '👤',
    color: 'bg-blue-50 text-blue-700 border-blue-100',
  },
  {
    label: 'Total Estudiantes',
    key: 'total_estudiantes',
    icon: '🎓',
    color: 'bg-violet-50 text-violet-700 border-violet-100',
  },
  {
    label: 'Preguntas Activas',
    key: 'total_preguntas_activas',
    icon: '❓',
    color: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  {
    label: 'Total Sesiones',
    key: 'total_sesiones',
    icon: '📚',
    color: 'bg-green-50 text-green-700 border-green-100',
  },
]

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-1/3" />
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/admin/stats')
      .then((res) => setStats(res.data as AdminStats))
      .catch(() => setError('No se pudieron cargar las estadísticas'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Layout title="Panel de Administración">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Resumen del Sistema</h2>
          <p className="mt-1 text-sm text-gray-500">
            Vista general de la actividad en la plataforma.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : statCards.map((card) => (
                <div
                  key={card.key}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-3"
                >
                  <div
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border text-xl ${card.color}`}
                  >
                    {card.icon}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {card.label}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-0.5">
                      {stats ? stats[card.key].toLocaleString('es-CO') : '—'}
                    </p>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </Layout>
  )
}

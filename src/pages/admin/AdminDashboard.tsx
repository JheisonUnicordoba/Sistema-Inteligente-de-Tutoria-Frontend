import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import api from '../../lib/api'
import { Users, GraduationCap, HelpCircle, BookOpen, type LucideIcon } from 'lucide-react'

interface AdminStats {
  total_usuarios: number
  total_estudiantes: number
  total_preguntas_activas: number
  total_sesiones: number
}

interface StatCard {
  label: string
  key: keyof AdminStats
  Icon: LucideIcon
  iconClass: string
  wrapperClass: string
}

const statCards: StatCard[] = [
  {
    label: 'Total Usuarios',
    key: 'total_usuarios',
    Icon: Users,
    iconClass: 'text-blue-600',
    wrapperClass: 'bg-blue-50 border-blue-100',
  },
  {
    label: 'Total Estudiantes',
    key: 'total_estudiantes',
    Icon: GraduationCap,
    iconClass: 'text-violet-600',
    wrapperClass: 'bg-violet-50 border-violet-100',
  },
  {
    label: 'Preguntas Activas',
    key: 'total_preguntas_activas',
    Icon: HelpCircle,
    iconClass: 'text-amber-600',
    wrapperClass: 'bg-amber-50 border-amber-100',
  },
  {
    label: 'Total Sesiones',
    key: 'total_sesiones',
    Icon: BookOpen,
    iconClass: 'text-green-600',
    wrapperClass: 'bg-green-50 border-green-100',
  },
]

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3" />
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Resumen del Sistema</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Vista general de la actividad en la plataforma.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : statCards.map((card) => (
                <div
                  key={card.key}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 flex flex-col gap-3"
                >
                  <div
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border ${card.wrapperClass}`}
                  >
                    <card.Icon size={20} className={card.iconClass} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {card.label}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
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

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'
import {
  ScanSearch,
  BrainCircuit,
  Target,
  TrendingUp,
  AlertCircle,
  GraduationCap,
  LogOut,
  Shield,
  type LucideIcon,
} from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'

interface UserProfile {
  nivel_actual: string
  puntaje_diagnostico: number | null
  diagnostico_realizado: boolean
}

interface DashboardCard {
  title: string
  description: string
  Icon: LucideIcon
  path: string
}

const cards: DashboardCard[] = [
  {
    Icon: ScanSearch,
    title: 'Diagnóstico Inicial',
    description:
      'Evalúa tu nivel actual de razonamiento cuantitativo para personalizar tu plan de estudio.',
    path: '/diagnostico',
  },
  {
    Icon: BrainCircuit,
    title: 'Tutoría IA',
    description:
      'Recibe explicaciones adaptadas, ejemplos interactivos y retroalimentación inmediata de la IA.',
    path: '/tutoria',
  },
  {
    Icon: Target,
    title: 'Evaluación Adaptativa',
    description:
      'Practica con ejercicios que se ajustan automáticamente a tu nivel de desempeño.',
    path: '/evaluacion',
  },
  {
    Icon: TrendingUp,
    title: 'Mi Progreso',
    description:
      'Visualiza tu avance, identifica áreas de mejora y celebra tus logros alcanzados.',
    path: '/progreso',
  },
]

const nivelConfig: Record<string, { label: string; badgeClass: string }> = {
  Basico: {
    label: 'Básico',
    badgeClass: 'bg-rose-100 text-rose-800 border border-rose-200',
  },
  Intermedio: {
    label: 'Intermedio',
    badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
  },
  Avanzado: {
    label: 'Avanzado',
    badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  },
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    api
      .get('/users/me/profile')
      .then((res) => setProfile(res.data as UserProfile))
      .catch(() => {
        // Non-blocking: if profile fails, dashboard still renders
      })
      .finally(() => setLoadingProfile(false))
  }, [])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const nivel = profile?.nivel_actual ?? 'Basico'
  const nivelDisplay = nivelConfig[nivel] ?? nivelConfig['Basico']
  const puntajePct =
    profile?.puntaje_diagnostico !== null && profile?.puntaje_diagnostico !== undefined
      ? Math.round(profile.puntaje_diagnostico)
      : null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
              <GraduationCap size={18} className="text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">TutorIA Saber Pro</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/perfil"
              className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition"
            >
              Mi Perfil
            </Link>
            {user?.rol === 'admin' && (
              <Link
                to="/admin/dashboard"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 border border-primary-100 dark:border-primary-800 hover:border-primary-500 dark:hover:border-primary-600 rounded-lg px-3 py-1.5 transition"
              >
                <Shield size={14} aria-hidden="true" />
                Panel Admin
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 border border-gray-300 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-800 rounded-lg px-4 py-1.5 transition focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
            >
              <LogOut size={14} aria-hidden="true" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Bienvenido, {user?.nombre ?? 'estudiante'}
          </h2>
          <p className="mt-1 text-gray-500 dark:text-gray-400 text-sm">
            Selecciona un módulo para comenzar tu preparación para el Saber Pro.
          </p>
        </div>

        {!loadingProfile && (
          <div className="mb-6">
            {profile && !profile.diagnostico_realizado ? (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertCircle size={16} className="text-amber-700 dark:text-amber-400" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                      Completa tu diagnóstico inicial
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      Realiza el diagnóstico para personalizar tu plan de estudio y desbloquear todas las funciones.
                    </p>
                  </div>
                </div>
                <Link
                  to="/diagnostico"
                  className="flex-shrink-0 text-xs font-semibold px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                >
                  Iniciar
                </Link>
              </div>
            ) : profile && profile.diagnostico_realizado ? (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Mi Nivel
                  </p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${nivelDisplay.badgeClass}`}>
                    {nivelDisplay.label}
                  </span>
                </div>
                {puntajePct !== null && (
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Puntaje diagnóstico</p>
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{puntajePct}%</p>
                    <div className="mt-1.5 h-1.5 w-24 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ml-auto">
                      <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${puntajePct}%` }} />
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {cards.map((card, index) => {
            const isDiagnostico = card.path === '/diagnostico'
            return (
              <div
                key={card.title}
                className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition ${
                  isDiagnostico && index === 0
                    ? 'border-primary-200 dark:border-primary-800 ring-1 ring-primary-100 dark:ring-primary-900'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isDiagnostico ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400' : 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                }`}>
                  <card.Icon size={24} aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{card.title}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{card.description}</p>
                </div>
                <Link
                  to={card.path}
                  className={`w-full text-sm font-medium py-2 px-4 rounded-lg transition text-center focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    isDiagnostico && index === 0
                      ? 'bg-primary-600 hover:bg-primary-700 text-white border border-primary-600'
                      : 'border border-primary-100 dark:border-primary-900 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/40'
                  }`}
                >
                  Ir al módulo
                </Link>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

interface UserProfile {
  nivel_actual: string
  puntaje_diagnostico: number | null
  diagnostico_realizado: boolean
}

interface DashboardCard {
  title: string
  description: string
  icon: string
  path: string
}

const cards: DashboardCard[] = [
  {
    icon: '?',
    title: 'Diagnóstico Inicial',
    description:
      'Evalúa tu nivel actual de razonamiento cuantitativo para personalizar tu plan de estudio.',
    path: '/diagnostico',
  },
  {
    icon: 'R',
    title: 'Tutoría IA',
    description:
      'Recibe explicaciones adaptadas, ejemplos interactivos y retroalimentación inmediata de la IA.',
    path: '/tutoria',
  },
  {
    icon: 'E',
    title: 'Evaluación Adaptativa',
    description:
      'Practica con ejercicios que se ajustan automáticamente a tu nivel de desempeño.',
    path: '/evaluacion',
  },
  {
    icon: 'G',
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
            <Link
              to="/perfil"
              className="text-sm font-medium text-gray-600 hover:text-primary-600 transition"
            >
              Mi Perfil
            </Link>
            {user?.rol === 'admin' && (
              <Link
                to="/admin/dashboard"
                className="text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-100 hover:border-primary-500 rounded-lg px-3 py-1.5 transition"
              >
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
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Bienvenido, {user?.nombre ?? 'estudiante'}
          </h2>
          <p className="mt-1 text-gray-500 text-sm">
            Selecciona un módulo para comenzar tu preparación para el Saber Pro.
          </p>
        </div>

        {/* Mi Nivel card (HU-21) */}
        {!loadingProfile && (
          <div className="mb-6">
            {profile && !profile.diagnostico_realizado ? (
              /* Diagnostic not done: yellow banner */
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-amber-700 font-bold text-sm">!</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      Completa tu diagnóstico inicial
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Realiza el diagnóstico para personalizar tu plan de estudio y desbloquear
                      todas las funciones.
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
              /* Diagnostic done: level + score card */
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Mi Nivel
                  </p>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${nivelDisplay.badgeClass}`}
                  >
                    {nivelDisplay.label}
                  </span>
                </div>
                {puntajePct !== null && (
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-500 mb-1">Puntaje diagnóstico</p>
                    <p className="text-2xl font-extrabold text-gray-900">{puntajePct}%</p>
                    <div className="mt-1.5 h-1.5 w-24 bg-gray-200 rounded-full overflow-hidden ml-auto">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all"
                        style={{ width: `${puntajePct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Navigation cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {cards.map((card, index) => {
            const isDiagnostico = card.path === '/diagnostico'
            return (
              <div
                key={card.title}
                className={`bg-white rounded-2xl border shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition ${
                  isDiagnostico && index === 0
                    ? 'border-primary-200 ring-1 ring-primary-100'
                    : 'border-gray-200'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${
                    isDiagnostico
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-primary-50 text-primary-600'
                  }`}
                >
                  {card.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900">{card.title}</h3>
                  <p className="mt-1 text-sm text-gray-500 leading-relaxed">{card.description}</p>
                </div>
                <Link
                  to={card.path}
                  className={`w-full text-sm font-medium py-2 px-4 rounded-lg transition text-center focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    isDiagnostico && index === 0
                      ? 'bg-primary-600 hover:bg-primary-700 text-white border border-primary-600'
                      : 'border border-primary-100 bg-primary-50 text-primary-700 hover:bg-primary-100'
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

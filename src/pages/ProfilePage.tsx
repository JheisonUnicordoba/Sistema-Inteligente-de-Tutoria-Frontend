import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'
import axios from 'axios'

interface UserProfile {
  id: number
  nombre: string
  email: string
  rol: string
  nivel_actual: string
  puntaje_diagnostico: number | null
  diagnostico_realizado: boolean
  total_sesiones: number
  fecha_registro: string
}

type ToastType = 'success' | 'error'

interface Toast {
  message: string
  type: ToastType
}

const nivelConfig: Record<string, { label: string; className: string }> = {
  Basico: { label: 'Básico', className: 'bg-red-100 text-red-700 border border-red-200' },
  Intermedio: {
    label: 'Intermedio',
    className: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  },
  Avanzado: {
    label: 'Avanzado',
    className: 'bg-green-100 text-green-700 border border-green-200',
  },
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

export default function ProfilePage() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [fetchError, setFetchError] = useState('')
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  const [editingNombre, setEditingNombre] = useState(false)
  const [nombreInput, setNombreInput] = useState('')
  const [saving, setSaving] = useState(false)

  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    api
      .get('/users/me/profile')
      .then((res) => {
        const data = res.data as UserProfile
        setProfile(data)
        setNombreInput(data.nombre)
      })
      .catch(() => setFetchError('No se pudo cargar el perfil. Intenta de nuevo.'))
      .finally(() => setIsLoadingProfile(false))
  }, [])

  function showToast(message: string, type: ToastType) {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleSaveNombre() {
    if (!profile || nombreInput.trim() === '') return
    setSaving(true)
    try {
      await api.put('/users/me', { nombre: nombreInput.trim() })
      setProfile((prev) => (prev ? { ...prev, nombre: nombreInput.trim() } : prev))
      setEditingNombre(false)
      showToast('Nombre actualizado correctamente', 'success')
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        showToast('Error al actualizar el nombre', 'error')
      } else {
        showToast('Error al conectar con el servidor', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

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

  const fechaFormateada = profile?.fecha_registro
    ? new Date(profile.fecha_registro).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-base">T</span>
              </div>
              <span className="text-lg font-semibold text-gray-900 group-hover:text-primary-700 transition">
                TutorIA Saber Pro
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="text-sm font-medium text-gray-600 hover:text-primary-600 transition"
            >
              Inicio
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-gray-600 hover:text-red-600 border border-gray-300 hover:border-red-300 rounded-lg px-4 py-1.5 transition focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona tu información personal y revisa tu progreso.
          </p>
        </div>

        {fetchError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {fetchError}
          </div>
        )}

        {/* Diagnostic banner */}
        {!isLoadingProfile && profile && !profile.diagnostico_realizado && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <span className="text-amber-500 text-lg mt-0.5">!</span>
            <div>
              <p className="text-sm font-medium text-amber-800">
                Completa tu diagnóstico inicial
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Realiza el diagnóstico para personalizar tu plan de estudio y desbloquear todas las
                funciones.
              </p>
              <Link
                to="/diagnostico"
                className="inline-block mt-2 text-xs font-semibold text-amber-800 hover:text-amber-900 underline underline-offset-2 transition"
              >
                Ir al diagnóstico
              </Link>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Personal info card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Información Personal</h2>

            {isLoadingProfile ? (
              <div className="space-y-4">
                <SkeletonBlock className="h-5 w-48" />
                <SkeletonBlock className="h-5 w-64" />
                <SkeletonBlock className="h-5 w-32" />
              </div>
            ) : profile ? (
              <dl className="space-y-4">
                {/* Nombre */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Nombre
                    </dt>
                    {editingNombre ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={nombreInput}
                          onChange={(e) => setNombreInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void handleSaveNombre()
                            if (e.key === 'Escape') {
                              setEditingNombre(false)
                              setNombreInput(profile.nombre)
                            }
                          }}
                          autoFocus
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                        />
                        <button
                          onClick={() => void handleSaveNombre()}
                          disabled={saving}
                          className="text-xs font-medium bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg transition"
                        >
                          {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingNombre(false)
                            setNombreInput(profile.nombre)
                          }}
                          className="text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1.5 transition"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <dd className="text-sm font-medium text-gray-900">{profile.nombre}</dd>
                    )}
                  </div>
                  {!editingNombre && (
                    <button
                      onClick={() => setEditingNombre(true)}
                      className="text-xs font-medium text-primary-600 hover:text-primary-700 transition mt-5"
                    >
                      Editar
                    </button>
                  )}
                </div>

                {/* Email */}
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Correo electrónico
                  </dt>
                  <dd className="text-sm text-gray-900">{profile.email}</dd>
                </div>

                {/* Rol */}
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Rol
                  </dt>
                  <dd className="text-sm text-gray-900 capitalize">{profile.rol}</dd>
                </div>

                {/* Fecha registro */}
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Miembro desde
                  </dt>
                  <dd className="text-sm text-gray-900">{fechaFormateada}</dd>
                </div>
              </dl>
            ) : null}
          </div>

          {/* Stats card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Mi Desempeño</h2>

            {isLoadingProfile ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <SkeletonBlock key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : profile ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Nivel */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Nivel Actual
                  </p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${nivelDisplay.className}`}
                  >
                    {nivelDisplay.label}
                  </span>
                </div>

                {/* Puntaje diagnóstico */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Diagnóstico
                  </p>
                  {puntajePct !== null ? (
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{puntajePct}%</p>
                      <div className="mt-1.5 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all"
                          style={{ width: `${puntajePct}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Sin realizar</p>
                  )}
                </div>

                {/* Sesiones */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Sesiones
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{profile.total_sesiones}</p>
                  <p className="text-xs text-gray-400 mt-0.5">sesiones completadas</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  )
}

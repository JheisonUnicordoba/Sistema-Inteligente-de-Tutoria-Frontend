import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../lib/api'
import axios from 'axios'
import { GraduationCap, AlertCircle, LogOut } from 'lucide-react'

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
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
}

const inputClass =
  'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition'

export default function ProfilePage() {
  const { logout } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [fetchError, setFetchError] = useState('')
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  // Nombre
  const [editingNombre, setEditingNombre] = useState(false)
  const [nombreInput, setNombreInput] = useState('')
  const [savingNombre, setSavingNombre] = useState(false)

  // Email
  const [editingEmail, setEditingEmail] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)

  // Password
  const [pwActual, setPwActual] = useState('')
  const [pwNueva, setPwNueva] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [pwError, setPwError] = useState('')

  useEffect(() => {
    api
      .get('/users/me/profile')
      .then((res) => {
        const data = res.data as UserProfile
        setProfile(data)
        setNombreInput(data.nombre)
        setEmailInput(data.email)
      })
      .catch(() => setFetchError('No se pudo cargar el perfil. Intenta de nuevo.'))
      .finally(() => setIsLoadingProfile(false))
  }, [])

  async function handleSaveNombre() {
    if (!profile || nombreInput.trim() === '') return
    setSavingNombre(true)
    try {
      await api.put('/users/me', { nombre: nombreInput.trim() })
      setProfile((prev) => (prev ? { ...prev, nombre: nombreInput.trim() } : prev))
      setEditingNombre(false)
      addToast('Nombre actualizado correctamente', 'success')
    } catch {
      addToast('Error al actualizar el nombre', 'error')
    } finally {
      setSavingNombre(false)
    }
  }

  async function handleSaveEmail() {
    if (!profile || emailInput.trim() === '') return
    setSavingEmail(true)
    try {
      await api.put('/users/me', { email: emailInput.trim() })
      setProfile((prev) => (prev ? { ...prev, email: emailInput.trim() } : prev))
      setEditingEmail(false)
      addToast('Correo actualizado correctamente', 'success')
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        addToast('Este correo ya está registrado por otra cuenta', 'error')
      } else {
        addToast('Error al actualizar el correo', 'error')
      }
    } finally {
      setSavingEmail(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    if (pwNueva !== pwConfirm) {
      setPwError('Las contraseñas no coinciden')
      return
    }
    if (pwNueva.length < 6) {
      setPwError('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }
    setSavingPw(true)
    try {
      await api.put('/users/me', { password_actual: pwActual, password_nueva: pwNueva })
      setPwActual('')
      setPwNueva('')
      setPwConfirm('')
      addToast('Contraseña actualizada correctamente', 'success')
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail as string | undefined
        setPwError(detail ?? 'Error al cambiar la contraseña')
      } else {
        setPwError('Error al conectar con el servidor')
      }
    } finally {
      setSavingPw(false)
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
              <GraduationCap size={18} className="text-white" aria-hidden="true" />
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-700 dark:group-hover:text-primary-400 transition">
              TutorIA Saber Pro
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition"
            >
              Inicio
            </Link>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mi Perfil</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gestiona tu información personal y seguridad de cuenta.
          </p>
        </div>

        {fetchError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg">
            {fetchError}
          </div>
        )}

        {/* Diagnostic banner */}
        {!isLoadingProfile && profile && profile.rol === 'estudiante' && !profile.diagnostico_realizado && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Completa tu diagnóstico inicial</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Realiza el diagnóstico para personalizar tu plan de estudio y desbloquear todas las funciones.
              </p>
              <Link
                to="/diagnostico"
                className="inline-block mt-2 text-xs font-semibold text-amber-800 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 underline underline-offset-2 transition"
              >
                Ir al diagnóstico
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LEFT — Personal info */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Información Personal</h2>

            {isLoadingProfile ? (
              <div className="space-y-4">
                <SkeletonBlock className="h-5 w-48" />
                <SkeletonBlock className="h-5 w-64" />
                <SkeletonBlock className="h-5 w-32" />
              </div>
            ) : profile ? (
              <dl className="space-y-5">
                {/* Nombre */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Nombre
                    </dt>
                    {editingNombre ? (
                      <div className="flex items-center gap-2 flex-wrap">
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
                          className={inputClass}
                        />
                        <button
                          onClick={() => void handleSaveNombre()}
                          disabled={savingNombre}
                          className="text-xs font-medium bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg transition"
                        >
                          {savingNombre ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          onClick={() => { setEditingNombre(false); setNombreInput(profile.nombre) }}
                          className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1.5 transition"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{profile.nombre}</dd>
                    )}
                  </div>
                  {!editingNombre && (
                    <button
                      onClick={() => setEditingNombre(true)}
                      className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition mt-5"
                    >
                      Editar
                    </button>
                  )}
                </div>

                {/* Email */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Correo electrónico
                    </dt>
                    {editingEmail ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void handleSaveEmail()
                            if (e.key === 'Escape') {
                              setEditingEmail(false)
                              setEmailInput(profile.email)
                            }
                          }}
                          autoFocus
                          className={inputClass}
                        />
                        <button
                          onClick={() => void handleSaveEmail()}
                          disabled={savingEmail}
                          className="text-xs font-medium bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg transition"
                        >
                          {savingEmail ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          onClick={() => { setEditingEmail(false); setEmailInput(profile.email) }}
                          className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1.5 transition"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <dd className="text-sm text-gray-900 dark:text-gray-100">{profile.email}</dd>
                    )}
                  </div>
                  {!editingEmail && (
                    <button
                      onClick={() => setEditingEmail(true)}
                      className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition mt-5"
                    >
                      Editar
                    </button>
                  )}
                </div>

                {/* Rol */}
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Rol
                  </dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100 capitalize">{profile.rol}</dd>
                </div>

                {/* Fecha registro */}
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Miembro desde
                  </dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{fechaFormateada}</dd>
                </div>
              </dl>
            ) : null}
          </div>

          {/* RIGHT — Password + Stats */}
          <div className="space-y-6">
            {/* Password card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Cambiar Contraseña</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
                Usa una contraseña de al menos 6 caracteres con letras y números.
              </p>

              {pwError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg">
                  {pwError}
                </div>
              )}

              <form onSubmit={(e) => void handleChangePassword(e)} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Contraseña actual
                  </label>
                  <input
                    type="password"
                    value={pwActual}
                    onChange={(e) => setPwActual(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    value={pwNueva}
                    onChange={(e) => setPwNueva(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Confirmar nueva contraseña
                  </label>
                  <input
                    type="password"
                    value={pwConfirm}
                    onChange={(e) => setPwConfirm(e.target.value)}
                    required
                    placeholder="••••••••"
                    className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition ${
                      pwConfirm && pwConfirm !== pwNueva
                        ? 'border-red-400 focus:border-red-400'
                        : 'border-gray-300 dark:border-gray-600 focus:border-primary-500'
                    }`}
                  />
                  {pwConfirm && pwConfirm !== pwNueva && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">Las contraseñas no coinciden</p>
                  )}
                </div>
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={savingPw}
                    className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                  >
                    {savingPw ? 'Guardando...' : 'Actualizar Contraseña'}
                  </button>
                </div>
              </form>
            </div>

            {/* Stats card — only for students */}
            {(isLoadingProfile || profile?.rol === 'estudiante') && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Mi Desempeño</h2>

                {isLoadingProfile ? (
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                      <SkeletonBlock key={i} className="h-20 rounded-xl" />
                    ))}
                  </div>
                ) : profile ? (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Nivel
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${nivelDisplay.className}`}>
                        {nivelDisplay.label}
                      </span>
                    </div>

                    <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Diagnóstico
                      </p>
                      {puntajePct !== null ? (
                        <div>
                          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{puntajePct}%</p>
                          <div className="mt-1.5 h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${puntajePct}%` }} />
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 dark:text-gray-500 italic">Sin realizar</p>
                      )}
                    </div>

                    <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Sesiones
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{profile.total_sesiones}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">completadas</p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

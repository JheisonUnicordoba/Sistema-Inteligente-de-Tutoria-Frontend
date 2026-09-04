import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import api from '../../lib/api'
import { ArrowLeft, User, Mail, Shield, Calendar, Activity, BookOpen, BarChart2 } from 'lucide-react'

interface UsuarioPerfil {
  id: number
  nombre: string
  email: string
  rol: string
  activo: boolean
  nivel_actual: string | null
  puntaje_diagnostico: number | null
  diagnostico_realizado: boolean
  total_sesiones: number
  fecha_registro: string
}

const nivelConfig: Record<string, { label: string; className: string }> = {
  Basico: { label: 'Básico', className: 'bg-red-100 text-red-700 border border-red-200' },
  Intermedio: { label: 'Intermedio', className: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
  Avanzado: { label: 'Avanzado', className: 'bg-green-100 text-green-700 border border-green-200' },
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
}

export default function AdminPerfilUsuario() {
  const { id } = useParams<{ id: string }>()
  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    api
      .get(`/admin/usuarios/${id}/perfil`)
      .then((res) => setPerfil(res.data as UsuarioPerfil))
      .catch(() => setError('No se pudo cargar el perfil del usuario.'))
      .finally(() => setLoading(false))
  }, [id])

  const nivel = perfil?.nivel_actual ?? 'Basico'
  const nivelDisplay = nivelConfig[nivel] ?? nivelConfig['Basico']
  const puntajePct =
    perfil?.puntaje_diagnostico !== null && perfil?.puntaje_diagnostico !== undefined
      ? Math.round(perfil.puntaje_diagnostico)
      : null
  const fechaFormateada = perfil?.fecha_registro
    ? new Date(perfil.fecha_registro).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  return (
    <Layout title="Perfil de Usuario">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <div className="mb-5">
          <Link
            to="/admin/usuarios"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Volver a Usuarios
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Header card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-5">
          {loading ? (
            <div className="flex items-center gap-4">
              <SkeletonBlock className="w-14 h-14 rounded-full" />
              <div className="space-y-2 flex-1">
                <SkeletonBlock className="h-5 w-48" />
                <SkeletonBlock className="h-4 w-64" />
              </div>
            </div>
          ) : perfil ? (
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/40 rounded-full flex items-center justify-center shrink-0">
                <User size={26} className="text-primary-600 dark:text-primary-400" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{perfil.nombre}</h2>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                      perfil.rol === 'admin'
                        ? 'bg-violet-100 text-violet-700 border border-violet-200'
                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {perfil.rol}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      perfil.activo
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}
                  >
                    {perfil.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">ID #{perfil.id}</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          {/* Contact info */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Información de Contacto</h3>
            {loading ? (
              <div className="space-y-3">
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-3/4" />
              </div>
            ) : perfil ? (
              <dl className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <Mail size={15} className="text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <dt className="text-xs font-medium text-gray-400 dark:text-gray-500">Correo</dt>
                    <dd className="text-sm text-gray-900 dark:text-gray-100 break-all">{perfil.email}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Shield size={15} className="text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <dt className="text-xs font-medium text-gray-400 dark:text-gray-500">Rol</dt>
                    <dd className="text-sm text-gray-900 dark:text-gray-100 capitalize">{perfil.rol}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Calendar size={15} className="text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <dt className="text-xs font-medium text-gray-400 dark:text-gray-500">Miembro desde</dt>
                    <dd className="text-sm text-gray-900 dark:text-gray-100">{fechaFormateada}</dd>
                  </div>
                </div>
              </dl>
            ) : null}
          </div>

          {/* Activity */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Actividad</h3>
            {loading ? (
              <div className="space-y-3">
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-1/2" />
              </div>
            ) : perfil ? (
              <dl className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <BookOpen size={15} className="text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <dt className="text-xs font-medium text-gray-400 dark:text-gray-500">Sesiones completadas</dt>
                    <dd className="text-2xl font-bold text-gray-900 dark:text-gray-100">{perfil.total_sesiones}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Activity size={15} className="text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <dt className="text-xs font-medium text-gray-400 dark:text-gray-500">Diagnóstico</dt>
                    <dd className="text-sm font-medium">
                      {perfil.diagnostico_realizado ? (
                        <span className="text-green-700 dark:text-green-400">Realizado</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">Pendiente</span>
                      )}
                    </dd>
                  </div>
                </div>
              </dl>
            ) : null}
          </div>
        </div>

        {/* Performance */}
        {perfil?.rol === 'estudiante' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Desempeño Académico</h3>
            {loading ? (
              <div className="grid grid-cols-2 gap-4">
                <SkeletonBlock className="h-20 rounded-xl" />
                <SkeletonBlock className="h-20 rounded-xl" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nivel */}
                <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Nivel Actual
                  </p>
                  {perfil?.nivel_actual ? (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${nivelDisplay.className}`}>
                      {nivelDisplay.label}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500 italic">Sin diagnóstico</span>
                  )}
                </div>

                {/* Puntaje */}
                <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    <span className="inline-flex items-center gap-1">
                      <BarChart2 size={12} aria-hidden="true" />
                      Puntaje Diagnóstico
                    </span>
                  </p>
                  {puntajePct !== null ? (
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{puntajePct}%</p>
                      <div className="mt-1.5 h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${puntajePct}%` }} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">Sin realizar</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}

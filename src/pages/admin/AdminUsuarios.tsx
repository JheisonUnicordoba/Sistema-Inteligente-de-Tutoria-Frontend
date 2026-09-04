import { useState, useEffect, useRef, type ReactNode, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import api from '../../lib/api'
import axios from 'axios'
import { useToast } from '../../contexts/ToastContext'

interface Usuario {
  id: number
  nombre: string
  email: string
  rol: string
  activo: boolean
  created_at: string
}

interface PaginatedResponse {
  items: Usuario[]
  total: number
  page: number
  pages: number
}

interface UsuarioFormData {
  nombre: string
  email: string
  rol: string
  password: string
  activo?: boolean
}

const ROLES = ['estudiante', 'admin']

function Badge({ activo }: { activo: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
        activo
          ? 'bg-green-100 text-green-700 border border-green-200'
          : 'bg-gray-100 text-gray-500 border border-gray-200'
      }`}
    >
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  )
}

function RolBadge({ rol }: { rol: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
        rol === 'admin'
          ? 'bg-violet-100 text-violet-700 border border-violet-200'
          : 'bg-blue-100 text-blue-700 border border-blue-200'
      }`}
    >
      {rol}
    </span>
  )
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl dark:shadow-gray-950/50 border border-transparent dark:border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition text-xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

const emptyForm: UsuarioFormData = { nombre: '', email: '', rol: 'estudiante', password: '' }

export default function AdminUsuarios() {
  const { addToast } = useToast()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [tableError, setTableError] = useState('')

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null)
  const [formData, setFormData] = useState<UsuarioFormData>(emptyForm)
  const [formError, setFormError] = useState('')
  const [formSaving, setFormSaving] = useState(false)

  const [confirmModal, setConfirmModal] = useState<{ open: boolean; usuario: Usuario | null }>({
    open: false,
    usuario: null,
  })
  const [confirmLoading, setConfirmLoading] = useState(false)

  // Debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query)
      setPage(1)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  useEffect(() => {
    fetchUsuarios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedQuery])

  async function fetchUsuarios() {
    setLoading(true)
    setTableError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (debouncedQuery) params.set('q', debouncedQuery)
      const res = await api.get(`/admin/usuarios?${params.toString()}`)
      const data = res.data as PaginatedResponse
      setUsuarios(data.items)
      setTotal(data.total)
      setPage(data.page)
      setPages(data.pages)
    } catch {
      setTableError('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingUsuario(null)
    setFormData(emptyForm)
    setFormError('')
    setModalOpen(true)
  }

  function openEditModal(u: Usuario) {
    setEditingUsuario(u)
    setFormData({ nombre: u.nombre, email: u.email, rol: u.rol, password: '', activo: u.activo })
    setFormError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingUsuario(null)
    setFormError('')
  }

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    setFormSaving(true)
    try {
      if (editingUsuario) {
        const body: { nombre?: string; email?: string; rol?: string; activo?: boolean; password?: string } = {
          nombre: formData.nombre,
          email: formData.email,
          rol: formData.rol,
          activo: formData.activo,
        }
        if (formData.password.trim()) body.password = formData.password.trim()
        await api.put(`/admin/usuarios/${editingUsuario.id}`, body)
      } else {
        await api.post('/admin/usuarios', {
          nombre: formData.nombre,
          email: formData.email,
          rol: formData.rol,
          password: formData.password,
        })
      }
      closeModal()
      await fetchUsuarios()
      addToast(editingUsuario ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente', 'success')
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        if (status === 409) {
          setFormError('Este correo ya está registrado')
        } else {
          const detail = err.response?.data?.detail as string | undefined
          setFormError(detail ?? 'Error al guardar el usuario')
        }
      } else {
        setFormError('Error al conectar con el servidor')
      }
    } finally {
      setFormSaving(false)
    }
  }

  function openConfirmToggle(u: Usuario) {
    setConfirmModal({ open: true, usuario: u })
  }

  async function handleToggleActive() {
    if (!confirmModal.usuario) return
    setConfirmLoading(true)
    try {
      await api.put(`/admin/usuarios/${confirmModal.usuario.id}`, {
        activo: !confirmModal.usuario.activo,
      })
      const wasActive = confirmModal.usuario?.activo
      setConfirmModal({ open: false, usuario: null })
      await fetchUsuarios()
      addToast(wasActive ? 'Usuario desactivado' : 'Usuario activado', 'success')
    } catch {
      setConfirmModal({ open: false, usuario: null })
      addToast('Error al cambiar el estado del usuario', 'error')
    } finally {
      setConfirmLoading(false)
    }
  }

  const fechaFormateada = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  return (
    <Layout title="Gestión de Usuarios">
      <div className="max-w-6xl mx-auto">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Usuarios</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {total} usuario{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="search"
              placeholder="Buscar por nombre o email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition w-56"
            />
            <button
              onClick={openCreateModal}
              className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 whitespace-nowrap"
            >
              + Nuevo Usuario
            </button>
          </div>
        </div>

        {tableError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg">
            {tableError}
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Rol</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Registro</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-gray-800">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                      No se encontraron usuarios
                    </td>
                  </tr>
                ) : (
                  usuarios.map((u) => (
                    <tr key={u.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                      <td className="px-4 py-3 text-gray-400 dark:text-gray-500 font-mono text-xs">{u.id}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{u.nombre}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.email}</td>
                      <td className="px-4 py-3"><RolBadge rol={u.rol} /></td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fechaFormateada(u.created_at)}</td>
                      <td className="px-4 py-3"><Badge activo={u.activo} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/admin/usuarios/${u.id}/perfil`}
                            className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                          >
                            Ver Perfil
                          </Link>
                          <button
                            onClick={() => openEditModal(u)}
                            className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => openConfirmToggle(u)}
                            className={`text-xs font-medium transition ${
                              u.activo
                                ? 'text-red-500 hover:text-red-700'
                                : 'text-green-600 hover:text-green-700'
                            }`}
                          >
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Página {page} de {pages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg transition"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg transition"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}
      >
        {formError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg">
            {formError}
          </div>
        )}
        <form onSubmit={(e) => void handleFormSubmit(e)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre completo
            </label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData((f) => ({ ...f, nombre: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
            <select
              value={formData.rol}
              onChange={(e) => setFormData((f) => ({ ...f, rol: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            >
              {ROLES.map((r) => (
                <option key={r} value={r} className="capitalize">
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {editingUsuario && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
              <select
                value={formData.activo ? 'activo' : 'inactivo'}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, activo: e.target.value === 'activo' }))
                }
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {editingUsuario ? 'Nueva contraseña' : 'Contraseña'}
            </label>
            <input
              type="password"
              required={!editingUsuario}
              value={formData.password}
              onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
              placeholder={editingUsuario ? 'Dejar en blanco para no cambiar' : '••••••••'}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
            {editingUsuario && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Mínimo 6 caracteres. Dejar vacío para conservar la contraseña actual.
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={formSaving}
              className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold py-2 rounded-lg transition"
            >
              {formSaving ? 'Guardando...' : editingUsuario ? 'Guardar Cambios' : 'Crear Usuario'}
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium py-2 rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Toggle Modal */}
      <Modal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, usuario: null })}
        title="Confirmar acción"
      >
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-5">
          ¿Estás seguro de que deseas{' '}
          <strong>
            {confirmModal.usuario?.activo ? 'desactivar' : 'activar'} a{' '}
            {confirmModal.usuario?.nombre}
          </strong>
          ?
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => void handleToggleActive()}
            disabled={confirmLoading}
            className={`flex-1 text-sm font-semibold py-2 rounded-lg transition disabled:opacity-60 ${
              confirmModal.usuario?.activo
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {confirmLoading
              ? 'Procesando...'
              : confirmModal.usuario?.activo
                ? 'Desactivar'
                : 'Activar'}
          </button>
          <button
            onClick={() => setConfirmModal({ open: false, usuario: null })}
            className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium py-2 rounded-lg transition"
          >
            Cancelar
          </button>
        </div>
      </Modal>
    </Layout>
  )
}

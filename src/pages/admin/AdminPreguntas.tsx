import { useState, useEffect, type ReactNode, type FormEvent } from 'react'
import Layout from '../../components/Layout'
import api from '../../lib/api'
import axios from 'axios'

interface Opciones {
  A: string
  B: string
  C: string
  D: string
}

interface Pregunta {
  id: number
  enunciado: string
  opciones: Opciones
  respuesta_correcta: 'A' | 'B' | 'C' | 'D'
  tema: string
  nivel: string
  explicacion: string
  activa: boolean
}

interface PaginatedResponse {
  items: Pregunta[]
  total: number
  page: number
  pages: number
}

const TEMAS = [
  { value: '', label: 'Todos los temas' },
  { value: 'Proporcionalidad', label: 'Proporcionalidad' },
  { value: 'Estadistica', label: 'Estadística' },
  { value: 'Interpretacion', label: 'Interpretación' },
  { value: 'Geometria', label: 'Geometría' },
  { value: 'Aritmetica', label: 'Aritmética' },
]

const NIVELES = [
  { value: '', label: 'Todos los niveles' },
  { value: 'Basico', label: 'Básico' },
  { value: 'Intermedio', label: 'Intermedio' },
  { value: 'Avanzado', label: 'Avanzado' },
]

const NIVEL_DISPLAY: Record<string, string> = {
  Basico: 'Básico',
  Intermedio: 'Intermedio',
  Avanzado: 'Avanzado',
}

interface PreguntaFormData {
  enunciado: string
  opcionA: string
  opcionB: string
  opcionC: string
  opcionD: string
  respuesta_correcta: 'A' | 'B' | 'C' | 'D'
  tema: string
  nivel: string
  explicacion: string
}

const emptyForm: PreguntaFormData = {
  enunciado: '',
  opcionA: '',
  opcionB: '',
  opcionC: '',
  opcionD: '',
  respuesta_correcta: 'A',
  tema: 'Aritmetica',
  nivel: 'Basico',
  explicacion: '',
}

function formToApiBody(f: PreguntaFormData) {
  return {
    enunciado: f.enunciado,
    opciones: { A: f.opcionA, B: f.opcionB, C: f.opcionC, D: f.opcionD },
    respuesta_correcta: f.respuesta_correcta,
    tema: f.tema,
    nivel: f.nivel,
    explicacion: f.explicacion || undefined,
  }
}

function preguntaToForm(p: Pregunta): PreguntaFormData {
  return {
    enunciado: p.enunciado,
    opcionA: p.opciones.A,
    opcionB: p.opciones.B,
    opcionC: p.opciones.C,
    opcionD: p.opciones.D,
    respuesta_correcta: p.respuesta_correcta,
    tema: p.tema,
    nivel: p.nivel,
    explicacion: p.explicacion ?? '',
  }
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition text-xl leading-none"
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

function NivelBadge({ nivel }: { nivel: string }) {
  const config: Record<string, string> = {
    Basico: 'bg-red-100 text-red-700 border-red-200',
    Intermedio: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Avanzado: 'bg-green-100 text-green-700 border-green-200',
  }
  const cls = config[nivel] ?? 'bg-gray-100 text-gray-600 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {NIVEL_DISPLAY[nivel] ?? nivel}
    </span>
  )
}

export default function AdminPreguntas() {
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [filterTema, setFilterTema] = useState('')
  const [filterNivel, setFilterNivel] = useState('')
  const [loading, setLoading] = useState(true)
  const [tableError, setTableError] = useState('')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPregunta, setEditingPregunta] = useState<Pregunta | null>(null)
  const [formData, setFormData] = useState<PreguntaFormData>(emptyForm)
  const [formError, setFormError] = useState('')
  const [formSaving, setFormSaving] = useState(false)

  // Confirm delete
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; pregunta: Pregunta | null }>({
    open: false,
    pregunta: null,
  })
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    void fetchPreguntas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterTema, filterNivel])

  async function fetchPreguntas() {
    setLoading(true)
    setTableError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (filterTema) params.set('tema', filterTema)
      if (filterNivel) params.set('nivel', filterNivel)
      const res = await api.get(`/admin/preguntas?${params.toString()}`)
      const data = res.data as PaginatedResponse
      setPreguntas(data.items)
      setTotal(data.total)
      setPage(data.page)
      setPages(data.pages)
    } catch {
      setTableError('Error al cargar las preguntas')
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingPregunta(null)
    setFormData(emptyForm)
    setFormError('')
    setModalOpen(true)
  }

  function openEditModal(p: Pregunta) {
    setEditingPregunta(p)
    setFormData(preguntaToForm(p))
    setFormError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingPregunta(null)
    setFormError('')
  }

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    setFormSaving(true)
    try {
      const body = formToApiBody(formData)
      if (editingPregunta) {
        await api.put(`/admin/preguntas/${editingPregunta.id}`, body)
      } else {
        await api.post('/admin/preguntas', body)
      }
      closeModal()
      await fetchPreguntas()
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setFormError('Error al guardar la pregunta')
      } else {
        setFormError('Error al conectar con el servidor')
      }
    } finally {
      setFormSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteModal.pregunta) return
    setDeleteLoading(true)
    try {
      await api.delete(`/admin/preguntas/${deleteModal.pregunta.id}`)
      setDeleteModal({ open: false, pregunta: null })
      await fetchPreguntas()
    } catch {
      setDeleteModal({ open: false, pregunta: null })
    } finally {
      setDeleteLoading(false)
    }
  }

  function setField<K extends keyof PreguntaFormData>(key: K, value: PreguntaFormData[K]) {
    setFormData((f) => ({ ...f, [key]: value }))
  }

  return (
    <Layout title="Gestión de Preguntas">
      <div className="max-w-6xl mx-auto">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Preguntas</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {total} pregunta{total !== 1 ? 's' : ''} en total
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filterTema}
              onChange={(e) => {
                setFilterTema(e.target.value)
                setPage(1)
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            >
              {TEMAS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <select
              value={filterNivel}
              onChange={(e) => {
                setFilterNivel(e.target.value)
                setPage(1)
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            >
              {NIVELES.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </select>

            <button
              onClick={openCreateModal}
              className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 whitespace-nowrap"
            >
              + Nueva Pregunta
            </button>
          </div>
        </div>

        {tableError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {tableError}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    ID
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Enunciado
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Tema
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Nivel
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Acciones
                  </th>
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
                ) : preguntas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                      No se encontraron preguntas
                    </td>
                  </tr>
                ) : (
                  preguntas.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition"
                    >
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{p.id}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs">
                        <span title={p.enunciado}>
                          {p.enunciado.length > 80
                            ? p.enunciado.slice(0, 80) + '…'
                            : p.enunciado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.tema}</td>
                      <td className="px-4 py-3">
                        <NivelBadge nivel={p.nivel} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            p.activa
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-gray-100 text-gray-500 border border-gray-200'
                          }`}
                        >
                          {p.activa ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(p)}
                            className="text-xs font-medium text-primary-600 hover:text-primary-700 transition"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setDeleteModal({ open: true, pregunta: p })}
                            className="text-xs font-medium text-red-500 hover:text-red-700 transition"
                          >
                            Eliminar
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Página {page} de {pages}
              </p>
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
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingPregunta ? 'Editar Pregunta' : 'Nueva Pregunta'}
      >
        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {formError}
          </div>
        )}
        <form onSubmit={(e) => void handleFormSubmit(e)} className="space-y-4">
          {/* Enunciado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enunciado</label>
            <textarea
              required
              rows={3}
              value={formData.enunciado}
              onChange={(e) => setField('enunciado', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              placeholder="Escribe el enunciado de la pregunta..."
            />
          </div>

          {/* Opciones */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Opciones de respuesta</p>
            <div className="space-y-2">
              {(['A', 'B', 'C', 'D'] as const).map((letra) => {
                const fieldKey = `opcion${letra}` as keyof PreguntaFormData
                return (
                  <div key={letra} className="flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 shrink-0">
                      {letra}
                    </span>
                    <input
                      type="text"
                      required
                      value={formData[fieldKey] as string}
                      onChange={(e) => setField(fieldKey, e.target.value)}
                      placeholder={`Opción ${letra}`}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Respuesta correcta */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Respuesta correcta</p>
            <div className="flex gap-4">
              {(['A', 'B', 'C', 'D'] as const).map((letra) => (
                <label key={letra} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="respuesta_correcta"
                    value={letra}
                    checked={formData.respuesta_correcta === letra}
                    onChange={() => setField('respuesta_correcta', letra)}
                    className="accent-primary-600"
                  />
                  <span className="text-sm font-medium text-gray-700">{letra}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tema */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tema</label>
            <select
              value={formData.tema}
              onChange={(e) => setField('tema', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            >
              {TEMAS.slice(1).map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Nivel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nivel</label>
            <select
              value={formData.nivel}
              onChange={(e) => setField('nivel', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            >
              {NIVELES.slice(1).map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>

          {/* Explicación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Explicación{' '}
              <span className="text-gray-400 font-normal text-xs">(opcional)</span>
            </label>
            <textarea
              rows={2}
              value={formData.explicacion}
              onChange={(e) => setField('explicacion', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              placeholder="Explica por qué esa es la respuesta correcta..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={formSaving}
              className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold py-2 rounded-lg transition"
            >
              {formSaving
                ? 'Guardando...'
                : editingPregunta
                  ? 'Guardar Cambios'
                  : 'Crear Pregunta'}
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium py-2 rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, pregunta: null })}
        title="Eliminar Pregunta"
      >
        <p className="text-sm text-gray-700 mb-2">
          ¿Estás seguro de que deseas eliminar esta pregunta? Esta acción no se puede deshacer.
        </p>
        {deleteModal.pregunta && (
          <p className="text-xs text-gray-500 mb-5 italic">
            "{deleteModal.pregunta.enunciado.slice(0, 100)}
            {deleteModal.pregunta.enunciado.length > 100 ? '…' : ''}"
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => void handleDelete()}
            disabled={deleteLoading}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold py-2 rounded-lg transition"
          >
            {deleteLoading ? 'Eliminando...' : 'Eliminar'}
          </button>
          <button
            onClick={() => setDeleteModal({ open: false, pregunta: null })}
            className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium py-2 rounded-lg transition"
          >
            Cancelar
          </button>
        </div>
      </Modal>
    </Layout>
  )
}

import { useState, useEffect, type ReactNode, type FormEvent } from 'react'
import Layout from '../../components/Layout'
import api from '../../lib/api'
import axios from 'axios'

interface Evaluacion {
  id: number
  nombre: string
  tipo: string
  descripcion: string | null
  activa: boolean
  created_at: string
  total_preguntas: number
}

interface EvalFormData {
  nombre: string
  tipo: 'diagnostico' | 'simulacro'
  descripcion: string
  pregunta_ids_raw: string
}

const emptyForm: EvalFormData = {
  nombre: '',
  tipo: 'diagnostico',
  descripcion: '',
  pregunta_ids_raw: '',
}

const tipoLabel: Record<string, string> = {
  diagnostico: 'Diagnóstico',
  simulacro: 'Simulacro',
}

const tipoBadge: Record<string, string> = {
  diagnostico: 'bg-gray-100 text-gray-700',
  simulacro: 'bg-purple-100 text-purple-800',
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
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
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

function parseIds(raw: string): number[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0)
}

export default function AdminEvaluaciones() {
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  const [loading, setLoading] = useState(true)
  const [tableError, setTableError] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingEval, setEditingEval] = useState<Evaluacion | null>(null)
  const [formData, setFormData] = useState<EvalFormData>(emptyForm)
  const [formError, setFormError] = useState('')
  const [formSaving, setFormSaving] = useState(false)

  useEffect(() => {
    void fetchEvaluaciones()
  }, [])

  async function fetchEvaluaciones() {
    setLoading(true)
    setTableError('')
    try {
      const res = await api.get('/admin/evaluaciones')
      setEvaluaciones(res.data as Evaluacion[])
    } catch {
      setTableError('Error al cargar las evaluaciones')
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingEval(null)
    setFormData(emptyForm)
    setFormError('')
    setModalOpen(true)
  }

  function openEditModal(ev: Evaluacion) {
    setEditingEval(ev)
    setFormData({
      nombre: ev.nombre,
      tipo: ev.tipo as 'diagnostico' | 'simulacro',
      descripcion: ev.descripcion ?? '',
      pregunta_ids_raw: '',
    })
    setFormError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingEval(null)
    setFormError('')
  }

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')

    const ids = parseIds(formData.pregunta_ids_raw)
    if (!editingEval && ids.length < 10) {
      setFormError('Debes ingresar al menos 10 IDs de preguntas válidos.')
      return
    }
    if (editingEval && formData.pregunta_ids_raw.trim() !== '' && ids.length < 10) {
      setFormError('Si actualizas los IDs, debes ingresar al menos 10 válidos.')
      return
    }

    setFormSaving(true)
    try {
      const body: Record<string, unknown> = {
        nombre: formData.nombre,
        tipo: formData.tipo,
      }
      if (formData.descripcion.trim()) body.descripcion = formData.descripcion.trim()
      if (!editingEval || formData.pregunta_ids_raw.trim() !== '') {
        body.pregunta_ids = ids
      }

      if (editingEval) {
        await api.put(`/admin/evaluaciones/${editingEval.id}`, body)
      } else {
        await api.post('/admin/evaluaciones', body)
      }
      closeModal()
      await fetchEvaluaciones()
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = (err.response?.data as { detail?: string })?.detail
        setFormError(msg ?? 'Error al guardar la evaluación')
      } else {
        setFormError('Error al conectar con el servidor')
      }
    } finally {
      setFormSaving(false)
    }
  }

  async function handleToggleActiva(ev: Evaluacion) {
    try {
      await api.put(`/admin/evaluaciones/${ev.id}`, { activa: !ev.activa })
      await fetchEvaluaciones()
    } catch {
      setTableError('Error al actualizar el estado de la evaluación')
    }
  }

  async function handleDelete(ev: Evaluacion) {
    if (!confirm(`¿Eliminar la evaluación "${ev.nombre}"? Esta acción no se puede deshacer.`)) return
    try {
      await api.delete(`/admin/evaluaciones/${ev.id}`)
      await fetchEvaluaciones()
    } catch {
      setTableError('Error al eliminar la evaluación')
    }
  }

  function setField<K extends keyof EvalFormData>(key: K, value: EvalFormData[K]) {
    setFormData((f) => ({ ...f, [key]: value }))
  }

  return (
    <Layout title="Gestión de Evaluaciones">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Evaluaciones</h2>
            <p className="text-sm text-gray-500 mt-0.5">{evaluaciones.length} evaluación{evaluaciones.length !== 1 ? 'es' : ''} en total</p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 whitespace-nowrap"
          >
            + Nueva evaluación
          </button>
        </div>

        {tableError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {tableError}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Preguntas</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : evaluaciones.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                      No hay evaluaciones registradas
                    </td>
                  </tr>
                ) : (
                  evaluaciones.map((ev) => (
                    <tr key={ev.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-800 font-medium">{ev.nombre}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${tipoBadge[ev.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                          {tipoLabel[ev.tipo] ?? ev.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{ev.total_preguntas}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ev.activa ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          {ev.activa ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => openEditModal(ev)}
                            className="text-xs font-medium text-primary-600 hover:text-primary-700 transition"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => void handleToggleActiva(ev)}
                            className="text-xs font-medium text-gray-500 hover:text-gray-700 transition"
                          >
                            {ev.activa ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            onClick={() => void handleDelete(ev)}
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
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingEval ? 'Editar Evaluación' : 'Nueva Evaluación'}
      >
        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {formError}
          </div>
        )}
        <form onSubmit={(e) => void handleFormSubmit(e)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setField('nombre', e.target.value)}
              placeholder="Ej. Simulacro Saber Pro 2025"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={formData.tipo}
              onChange={(e) => setField('tipo', e.target.value as 'diagnostico' | 'simulacro')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            >
              <option value="diagnostico">Diagnóstico</option>
              <option value="simulacro">Simulacro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción <span className="text-gray-400 font-normal text-xs">(opcional)</span>
            </label>
            <textarea
              rows={2}
              value={formData.descripcion}
              onChange={(e) => setField('descripcion', e.target.value)}
              placeholder="Descripción de la evaluación..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IDs de preguntas{' '}
              {editingEval
                ? <span className="text-gray-400 font-normal text-xs">(dejar vacío para no cambiar)</span>
                : <span className="text-red-500 text-xs">* mínimo 10</span>}
            </label>
            <input
              type="text"
              required={!editingEval}
              value={formData.pregunta_ids_raw}
              onChange={(e) => setField('pregunta_ids_raw', e.target.value)}
              placeholder="Ej: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
            <p className="text-xs text-gray-400 mt-1">IDs separados por coma. Mínimo 10 preguntas.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={formSaving}
              className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold py-2 rounded-lg transition"
            >
              {formSaving ? 'Guardando...' : editingEval ? 'Guardar Cambios' : 'Crear Evaluación'}
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
    </Layout>
  )
}

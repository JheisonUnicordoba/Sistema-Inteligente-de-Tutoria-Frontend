import React, { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import api from '../../lib/api'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

interface AdminReportesData {
  total_estudiantes: number
  total_sesiones: number
  sesiones_por_tipo: Record<string, number>
  puntaje_promedio_global: number | null
  distribucion_niveles: Record<string, number>
  puntaje_por_tema: Record<string, number>
}

const nivelColors: Record<string, string> = {
  Basico: '#f43f5e',
  Intermedio: '#f59e0b',
  Avanzado: '#10b981',
}

const nivelLabel: Record<string, string> = {
  Basico: 'Básico',
  Intermedio: 'Intermedio',
  Avanzado: 'Avanzado',
}

const tipoLabel: Record<string, string> = {
  tutoria: 'Tutoría',
  simulacro: 'Simulacro',
  diagnostico: 'Diagnóstico',
}

function barColor(puntaje: number): string {
  if (puntaje >= 70) return '#10b981'
  if (puntaje >= 40) return '#f59e0b'
  return '#f43f5e'
}

interface BarShapeProps {
  x?: number
  y?: number
  width?: number
  height?: number
  value?: number
}

function renderCustomBar(props: BarShapeProps): React.ReactElement {
  const { x = 0, y = 0, width = 0, height = 0, value = 0 } = props
  return <rect x={x} y={y} width={width} height={height} fill={barColor(value)} rx={4} />
}

export default function AdminReportes() {
  const [datos, setDatos] = useState<AdminReportesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    void fetchReportes()
  }, [])

  async function fetchReportes() {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/reportes')
      setDatos(res.data as AdminReportesData)
    } catch {
      setError('Error al cargar los reportes')
    } finally {
      setLoading(false)
    }
  }

  async function handleExportCSV() {
    setExporting(true)
    try {
      const res = await api.get('/admin/reportes/csv', { responseType: 'blob' })
      const blob = new Blob([res.data as BlobPart], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'reporte_tutoria.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setError('Error al exportar el CSV')
    } finally {
      setExporting(false)
    }
  }

  const pieData = datos
    ? Object.entries(datos.distribucion_niveles).map(([nivel, count]) => ({
        name: nivelLabel[nivel] ?? nivel,
        value: count,
        color: nivelColors[nivel] ?? '#6366f1',
      }))
    : []

  const barData = datos
    ? Object.entries(datos.puntaje_por_tema).map(([tema, puntaje]) => ({
        tema,
        puntaje: Math.round(puntaje),
      }))
    : []

  return (
    <Layout title="Reportes Globales">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Reportes</h2>
            <p className="text-sm text-gray-500 mt-0.5">Estadísticas globales de la plataforma</p>
          </div>
          <button
            onClick={() => void handleExportCSV()}
            disabled={exporting}
            className="bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-gray-50 transition disabled:opacity-60 whitespace-nowrap"
          >
            {exporting ? 'Exportando...' : 'Exportar CSV'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-24 mb-3" />
                  <div className="h-10 bg-gray-200 rounded animate-pulse w-16" />
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="h-3 bg-gray-200 rounded animate-pulse w-40 mb-4" />
              <div className="h-48 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        ) : datos ? (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Total Estudiantes</p>
                <p className="text-4xl font-extrabold text-gray-900">{datos.total_estudiantes}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Total Sesiones</p>
                <p className="text-4xl font-extrabold text-gray-900">{datos.total_sesiones}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Puntaje Promedio Global</p>
                <p className="text-4xl font-extrabold text-gray-900">
                  {datos.puntaje_promedio_global !== null ? `${Math.round(datos.puntaje_promedio_global)}%` : '—'}
                </p>
              </div>
            </div>

            {/* Sesiones por tipo */}
            {Object.keys(datos.sesiones_por_tipo).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Sesiones por Tipo</p>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(datos.sesiones_por_tipo).map(([tipo, count]) => (
                    <div key={tipo} className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-sm font-medium text-gray-700">{tipoLabel[tipo] ?? tipo}</span>
                      <span className="text-sm font-bold text-primary-600">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Distribution pie chart */}
            {pieData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Distribución por Nivel</p>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Bar chart puntaje por tema */}
            {barData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Puntaje Promedio por Tema</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="tema" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="puntaje" shape={renderCustomBar} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Layout>
  )
}

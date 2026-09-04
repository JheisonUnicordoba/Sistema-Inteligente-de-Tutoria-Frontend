import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import api from '../lib/api'
import axios from 'axios'

// ─── Types ───────────────────────────────────────────────────────────────────

type View = 'bienvenida' | 'pregunta' | 'procesando' | 'resultados' | 'ya_realizado'

interface PreguntaOut {
  id: number
  enunciado: string
  opciones: { A: string; B: string; C: string; D: string }
  tema: string
  nivel: string
  numero: number
  total: number
}

interface ResultadosDiagnostico {
  perfil: {
    nivel: string
    puntaje: number
    temas_debiles: string[]
    temas_fuertes: string[]
    analisis: string
    puntaje_por_tema: Record<string, number>
  }
  correctas: number
  total: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TEMAS_COLORES: Record<string, string> = {
  Proporcionalidad: 'bg-blue-100 text-blue-700 border-blue-200',
  Estadística: 'bg-purple-100 text-purple-700 border-purple-200',
  'Interpretación de datos': 'bg-teal-100 text-teal-700 border-teal-200',
  Geometría: 'bg-orange-100 text-orange-700 border-orange-200',
  Aritmética: 'bg-indigo-100 text-indigo-700 border-indigo-200',
}

function temaColor(tema: string): string {
  return TEMAS_COLORES[tema] ?? 'bg-gray-100 text-gray-700 border-gray-200'
}

function nivelBadgeClass(nivel: string): string {
  if (nivel === 'Avanzado') return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
  if (nivel === 'Intermedio') return 'bg-amber-100 text-amber-800 border border-amber-200'
  return 'bg-rose-100 text-rose-800 border border-rose-200'
}

function formatTime(seconds: number): string {
  return (
    Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0') +
    ':' +
    (seconds % 60).toString().padStart(2, '0')
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Spinner({ size = 8 }: { size?: number }) {
  return (
    <div
      className={`animate-spin rounded-full border-b-2 border-primary-600`}
      style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
    />
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function DiagnosticoPage() {
  const navigate = useNavigate()

  const [view, setView] = useState<View>('bienvenida')
  const [sesionId, setSesionId] = useState<number | null>(null)
  const [preguntaActual, setPreguntaActual] = useState<PreguntaOut | null>(null)
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState<string | null>(null)
  const [tiempoRestante, setTiempoRestante] = useState(180)
  const [iniciandoSesion, setIniciandoSesion] = useState(false)
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false)
  const [resultados, setResultados] = useState<ResultadosDiagnostico | null>(null)
  const [error, setError] = useState('')

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Timer effect (resets when pregunta changes) ──────────────────────────
  useEffect(() => {
    if (view !== 'pregunta' || !preguntaActual) return

    setTiempoRestante(180)
    setRespuestaSeleccionada(null)

    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      setTiempoRestante((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          // Auto-submit with null on timeout
          void handleResponder(null, 180)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preguntaActual?.id, view])

  // ── API actions ──────────────────────────────────────────────────────────

  async function handleIniciar() {
    setError('')
    setIniciandoSesion(true)
    try {
      const res = await api.post('/diagnostico/iniciar')
      const data = res.data as { sesion_id: number; pregunta: PreguntaOut }
      setSesionId(data.sesion_id)
      setPreguntaActual(data.pregunta)
      setView('pregunta')
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        // Backend returns sesion_id when questions were answered but finalizar failed
        const detail = err.response.data?.detail
        if (detail && typeof detail === 'object' && 'sesion_id' in detail) {
          setSesionId(detail.sesion_id as number)
        }
        setView('ya_realizado')
      } else if (axios.isAxiosError(err) && err.response?.status === 422) {
        setError(
          'El banco de preguntas es insuficiente. Contacta al administrador del sistema.',
        )
      } else {
        setError('Error al iniciar el diagnóstico. Intenta de nuevo.')
      }
    } finally {
      setIniciandoSesion(false)
    }
  }

  async function handleResponder(respuesta: string | null, tiempoUsado: number) {
    if (timerRef.current) clearInterval(timerRef.current)
    setEnviandoRespuesta(true)
    try {
      const res = await api.post(`/diagnostico/${sesionId}/responder`, {
        pregunta_id: preguntaActual!.id,
        respuesta_dada: respuesta,
        tiempo_seg: tiempoUsado,
      })
      const data = res.data as { es_correcta: boolean; terminado: boolean; pregunta: PreguntaOut | null }
      if (data.terminado) {
        setView('procesando')
        try {
          await handleFinalizar()
        } catch {
          setError('Error al procesar resultados. Intenta de nuevo.')
          setView('bienvenida')
        }
      } else {
        setPreguntaActual(data.pregunta)
        setRespuestaSeleccionada(null)
      }
    } catch {
      setError('Error al registrar respuesta. Intenta de nuevo.')
    } finally {
      setEnviandoRespuesta(false)
    }
  }

  async function handleFinalizar() {
    const res = await api.post(`/diagnostico/${sesionId}/finalizar`)
    setResultados(res.data as ResultadosDiagnostico)
    setView('resultados')
  }

  // ── Render views ─────────────────────────────────────────────────────────

  if (view === 'bienvenida') {
    return <ViewBienvenida onIniciar={handleIniciar} iniciando={iniciandoSesion} error={error} />
  }

  if (view === 'ya_realizado') {
    return (
      <ViewYaRealizado
        sesionHuerfanaId={sesionId}
        onFinalizar={handleFinalizar}
        finalizando={view === 'ya_realizado' && enviandoRespuesta}
        error={error}
      />
    )
  }

  if (view === 'pregunta' && preguntaActual) {
    return (
      <ViewPregunta
        pregunta={preguntaActual}
        respuestaSeleccionada={respuestaSeleccionada}
        onSeleccionar={setRespuestaSeleccionada}
        tiempoRestante={tiempoRestante}
        enviando={enviandoRespuesta}
        error={error}
        onResponder={(resp) => {
          void handleResponder(resp, 180 - tiempoRestante)
        }}
      />
    )
  }

  if (view === 'procesando') {
    return <ViewProcesando />
  }

  if (view === 'resultados' && resultados) {
    return <ViewResultados resultados={resultados} />
  }

  // Fallback — should not reach here normally
  return null
}

// ─── View: Bienvenida ─────────────────────────────────────────────────────────

interface ViewBienvenidaProps {
  onIniciar: () => void
  iniciando: boolean
  error: string
}

function ViewBienvenida({ onIniciar, iniciando, error }: ViewBienvenidaProps) {
  const temas = [
    'Proporcionalidad',
    'Estadística',
    'Interpretación de datos',
    'Geometría',
    'Aritmética',
  ]

  const infoItems = [
    { label: '15 preguntas', icon: '?' },
    { label: '3 min por pregunta', icon: 'T' },
    { label: '5 temas evaluados', icon: '#' },
    { label: 'Resultado inmediato', icon: 'R' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-base">T</span>
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-700 dark:group-hover:text-primary-400 transition">
              TutorIA Saber Pro
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-primary-50 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">?</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Diagnóstico Inicial</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Este diagnóstico evaluará tu nivel en Razonamiento Cuantitativo para Saber Pro.
            </p>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {infoItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 border border-gray-100 dark:border-gray-700"
              >
                <div className="w-6 h-6 bg-primary-100 dark:bg-primary-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-700 dark:text-primary-400 text-xs font-bold">{item.icon}</span>
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Topics */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Temas evaluados
            </p>
            <div className="flex flex-wrap gap-2">
              {temas.map((tema) => (
                <span key={tema} className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${temaColor(tema)}`}>
                  {tema}
                </span>
              ))}
            </div>
          </div>

          {/* Important note */}
          <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <span className="font-semibold">Importante:</span> Este diagnóstico solo puede realizarse una vez. Responde con calma.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={onIniciar}
            disabled={iniciando}
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            {iniciando ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin inline-block w-4 h-4 border-b-2 border-white rounded-full" />
                Iniciando...
              </span>
            ) : (
              'Iniciar diagnóstico'
            )}
          </button>
        </div>
      </main>
    </div>
  )
}

// ─── View: Ya Realizado ───────────────────────────────────────────────────────

interface ViewYaRealizadoProps {
  sesionHuerfanaId: number | null
  onFinalizar: () => Promise<void>
  finalizando: boolean
  error: string
}

function ViewYaRealizado({ sesionHuerfanaId, onFinalizar, finalizando, error }: ViewYaRealizadoProps) {
  const navigate = useNavigate()
  const [procesando, setProcesando] = useState(false)
  const [errorLocal, setErrorLocal] = useState('')

  async function handleCompletarAnalisis() {
    setProcesando(true)
    setErrorLocal('')
    try {
      await onFinalizar()
    } catch {
      setErrorLocal('Error al procesar el análisis. Intenta de nuevo.')
    } finally {
      setProcesando(false)
    }
  }

  const huerfana = sesionHuerfanaId !== null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-base">T</span>
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-700 dark:group-hover:text-primary-400 transition">
              TutorIA Saber Pro
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 text-center">
          <div className={`w-14 h-14 ${huerfana ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-green-50 dark:bg-green-900/20'} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
            <span className="text-3xl">{huerfana ? '!' : 'V'}</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Ya completaste tu diagnóstico inicial
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {huerfana
              ? 'Respondiste todas las preguntas pero el análisis IA no se completó. Finaliza el proceso para ver tus resultados.'
              : 'Tu diagnóstico ya fue registrado. Puedes ver tu progreso o continuar practicando.'}
          </p>

          {(errorLocal || error) && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-left">
              <p className="text-xs text-red-700 dark:text-red-400">{errorLocal || error}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {huerfana && (
              <button
                onClick={() => void handleCompletarAnalisis()}
                disabled={procesando || finalizando}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
              >
                {procesando ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin inline-block w-4 h-4 border-b-2 border-white rounded-full" />
                    Analizando con IA...
                  </span>
                ) : (
                  'Completar análisis IA'
                )}
              </button>
            )}
            <button
              onClick={() => navigate('/progreso')}
              className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Ver mi progreso
            </button>
            <button
              onClick={() => navigate('/evaluacion')}
              className="w-full py-2.5 px-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-xl border border-gray-300 dark:border-gray-600 transition focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              Ir a Evaluación Adaptativa
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

// ─── View: Pregunta ───────────────────────────────────────────────────────────

const OPCIONES: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D']

interface ViewPreguntaProps {
  pregunta: PreguntaOut
  respuestaSeleccionada: string | null
  onSeleccionar: (letra: string) => void
  tiempoRestante: number
  enviando: boolean
  error: string
  onResponder: (respuesta: string | null) => void
}

function ViewPregunta({
  pregunta,
  respuestaSeleccionada,
  onSeleccionar,
  tiempoRestante,
  enviando,
  error,
  onResponder,
}: ViewPreguntaProps) {
  const progresoPct = (pregunta.numero / pregunta.total) * 100
  const timerRojo = tiempoRestante < 30

  const esUltima = pregunta.numero === pregunta.total
  const botonTexto = esUltima ? 'Ver mis resultados' : 'Siguiente'
  const botonDesactivado = !respuestaSeleccionada || enviando

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header bar */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Pregunta {pregunta.numero} de {pregunta.total}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${temaColor(pregunta.tema)}`}>
                {pregunta.tema}
              </span>
            </div>
            {/* Timer */}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-mono font-semibold transition-colors ${
              timerRojo
                ? 'bg-red-100 text-red-700 border border-red-200'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}>
              <span>{formatTime(tiempoRestante)}</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${progresoPct}%` }} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Question card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-6">
          <p className="text-base font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
            {pregunta.enunciado}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {OPCIONES.map((letra) => {
            const texto = pregunta.opciones[letra]
            const seleccionada = respuestaSeleccionada === letra
            return (
              <button
                key={letra}
                onClick={() => onSeleccionar(letra)}
                disabled={enviando}
                className={`w-full flex items-start gap-3 px-4 py-4 rounded-xl border-2 text-left transition focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 ${
                  seleccionada
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  seleccionada ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}>
                  {letra}
                </span>
                <span className={`text-sm leading-relaxed pt-0.5 ${
                  seleccionada ? 'text-primary-900 dark:text-primary-200 font-medium' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {texto}
                </span>
              </button>
            )
          })}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Footer button */}
        <button
          onClick={() => onResponder(respuestaSeleccionada)}
          disabled={botonDesactivado}
          className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          {enviando ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin inline-block w-4 h-4 border-b-2 border-white rounded-full" />
              Registrando...
            </span>
          ) : (
            botonTexto
          )}
        </button>
      </main>
    </div>
  )
}

// ─── View: Procesando ─────────────────────────────────────────────────────────

function ViewProcesando() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <Spinner size={12} />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Analizando tus resultados con IA...
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Esto puede tomar unos segundos</p>
      </div>
    </div>
  )
}

// ─── View: Resultados ─────────────────────────────────────────────────────────

interface ViewResultadosProps {
  resultados: ResultadosDiagnostico
}

function ViewResultados({ resultados }: ViewResultadosProps) {
  const navigate = useNavigate()

  const { perfil, correctas, total } = resultados
  const puntajePct = Math.round(perfil.puntaje)

  const radarData = Object.entries(perfil.puntaje_por_tema).map(([tema, puntaje]) => ({
    tema: tema.substring(0, 6),
    fullTema: tema,
    puntaje,
    fullMark: 100,
  }))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-base">T</span>
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-700 dark:group-hover:text-primary-400 transition">
              TutorIA Saber Pro
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Resultados del Diagnóstico</h1>

          {/* Level badge */}
          <div className="flex justify-center mb-4">
            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold ${nivelBadgeClass(perfil.nivel)}`}>
              Nivel: {perfil.nivel}
            </span>
          </div>

          {/* Score circle */}
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-primary-50 dark:bg-primary-900/30 border-4 border-primary-200 dark:border-primary-800 mb-3">
            <span className="text-3xl font-extrabold text-primary-700 dark:text-primary-400">{puntajePct}%</span>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            {correctas} de {total} respuestas correctas
          </p>
        </div>

        {/* Radar chart */}
        {radarData.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Desempeño por tema</h2>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="tema" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Radar name="Puntaje" dataKey="puntaje" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                <Tooltip formatter={(value: number | string) => [`${value}%`, 'Puntaje']} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Temas débiles / fuertes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {perfil.temas_debiles.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Temas a reforzar
              </p>
              <div className="flex flex-wrap gap-2">
                {perfil.temas_debiles.map((tema) => (
                  <span key={tema} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                    {tema}
                  </span>
                ))}
              </div>
            </div>
          )}
          {perfil.temas_fuertes.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Puntos fuertes
              </p>
              <div className="flex flex-wrap gap-2">
                {perfil.temas_fuertes.map((tema) => (
                  <span key={tema} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                    {tema}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* IA Analysis */}
        {perfil.analisis && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-8">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Analisis de la IA
            </p>
            <blockquote className="border-l-4 border-primary-300 dark:border-primary-700 pl-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">
              {perfil.analisis}
            </blockquote>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('/tutoria')}
            className="flex-1 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Comenzar mi primera sesión de tutoría
          </button>
          <button
            onClick={() => navigate('/perfil')}
            className="flex-1 py-3 px-4 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-xl border border-gray-300 dark:border-gray-700 transition focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            Ver mi perfil
          </button>
        </div>
      </main>
    </div>
  )
}

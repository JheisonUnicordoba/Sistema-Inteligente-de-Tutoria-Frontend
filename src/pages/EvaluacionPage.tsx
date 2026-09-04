import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../lib/api'
import axios from 'axios'
import {
  Clock,
  Check,
  X,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  GraduationCap,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type EvalView =
  | 'cargando'
  | 'pregunta'
  | 'feedback'
  | 'resultados'
  | 'sin_diagnostico'

interface PreguntaEval {
  id: number
  enunciado: string
  opciones: { A: string; B: string; C: string; D: string }
  tema: string
  nivel: string
  numero: number
  nivel_actual_sesion: string
}

interface RetroalimentacionEval {
  explicacion_error: string
  concepto_clave: string
  ejemplo_resuelto: string
  tip_saber_pro: string
}

interface ResponderEvalData {
  es_correcta: boolean
  respuesta_correcta: string
  nivel_anterior: string
  nivel_actual: string
  cambio_nivel: 'subio' | 'bajo' | null
  terminado: boolean
  pregunta: PreguntaEval | null
  retroalimentacion: RetroalimentacionEval | null
}

interface ResultadosEval {
  sesion_id: number
  nivel_inicial: string
  nivel_final: string
  puntaje: number
  correctas: number
  total: number
  puntaje_por_tema: Record<string, number>
  incompleta: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OPCIONES: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D']

function formatTime(seconds: number): string {
  return (
    Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0') +
    ':' +
    (seconds % 60).toString().padStart(2, '0')
  )
}

function nivelBadgeClass(nivel: string): string {
  if (nivel === 'Avanzado') return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
  if (nivel === 'Intermedio') return 'bg-amber-100 text-amber-800 border border-amber-200'
  return 'bg-rose-100 text-rose-800 border border-rose-200'
}

function nivelBadgeSolid(nivel: string): string {
  if (nivel === 'Avanzado') return 'bg-emerald-500 text-white'
  if (nivel === 'Intermedio') return 'bg-amber-500 text-white'
  return 'bg-rose-500 text-white'
}

function nivelBarColor(nivel: string): string {
  if (nivel === 'Avanzado') return 'bg-emerald-500'
  if (nivel === 'Intermedio') return 'bg-amber-500'
  return 'bg-rose-500'
}

function Spinner({ size = 8 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-b-2 border-primary-600"
      style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
    />
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EvaluacionPage() {
  const navigate = useNavigate()

  const [view, setView] = useState<EvalView>('cargando')
  const [sesionId, setSesionId] = useState<number | null>(null)
  const [pregunta, setPregunta] = useState<PreguntaEval | null>(null)
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState<string | null>(null)
  const [respuestaCorrecta, setRespuestaCorrecta] = useState<string>('')
  const [retroalimentacion, setRetroalimentacion] = useState<RetroalimentacionEval | null>(null)
  const [nivelActual, setNivelActual] = useState<string>('')
  const [cambioNivel, setCambioNivel] = useState<'subio' | 'bajo' | null>(null)
  const [resultados, setResultados] = useState<ResultadosEval | null>(null)
  const [tiempoRestante, setTiempoRestante] = useState(2700)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [nextPreguntaRef, setNextPreguntaRef] = useState<PreguntaEval | null>(null)

  const timerGlobalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cambioNivelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Keep a stable ref to handleFinalizar to avoid stale closure in the timer
  const finalizarRef = useRef<(() => Promise<void>) | null>(null)
  const sesionIdRef = useRef<number | null>(null)

  // ── Init session ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function iniciar() {
      try {
        const res = await api.post('/evaluacion/iniciar')
        const data = res.data as {
          sesion_id: number
          pregunta: PreguntaEval
          nivel_inicial: string
          tiempo_limite_seg: number
        }
        setSesionId(data.sesion_id)
        sesionIdRef.current = data.sesion_id
        setPregunta(data.pregunta)
        setNivelActual(data.nivel_inicial)
        setTiempoRestante(data.tiempo_limite_seg ?? 2700)
        setView('pregunta')
        iniciarTimer(data.tiempo_limite_seg ?? 2700)
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.status === 409) {
          setView('sin_diagnostico')
        } else {
          setError('Error al iniciar la evaluación.')
          setView('sin_diagnostico')
        }
      }
    }
    void iniciar()

    return () => {
      if (timerGlobalRef.current) clearInterval(timerGlobalRef.current)
      if (cambioNivelTimerRef.current) clearTimeout(cambioNivelTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep finalizarRef up to date
  useEffect(() => {
    finalizarRef.current = handleFinalizar
  })

  function iniciarTimer(_limiteSeg: number) {
    if (timerGlobalRef.current) clearInterval(timerGlobalRef.current)
    timerGlobalRef.current = setInterval(() => {
      setTiempoRestante((prev) => {
        if (prev <= 1) {
          clearInterval(timerGlobalRef.current!)
          void finalizarRef.current?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // ── API: submit answer ───────────────────────────────────────────────────
  async function handleResponder() {
    if (!pregunta || !sesionId) return
    setEnviando(true)
    setError('')
    try {
      const res = await api.post(`/evaluacion/${sesionId}/responder`, {
        pregunta_id: pregunta.id,
        respuesta_dada: respuestaSeleccionada,
        tiempo_seg: null,
      })
      const data = res.data as ResponderEvalData

      setRespuestaCorrecta(data.respuesta_correcta)
      setNivelActual(data.nivel_actual)
      setNextPreguntaRef(data.pregunta)

      // Show level change indicator briefly
      if (data.cambio_nivel) {
        setCambioNivel(data.cambio_nivel)
        if (cambioNivelTimerRef.current) clearTimeout(cambioNivelTimerRef.current)
        cambioNivelTimerRef.current = setTimeout(() => setCambioNivel(null), 2500)
      }

      if (data.terminado) {
        if (timerGlobalRef.current) clearInterval(timerGlobalRef.current)
        await handleFinalizar()
        return
      }

      if (!data.es_correcta && data.retroalimentacion) {
        setRetroalimentacion(data.retroalimentacion)
        setView('feedback')
      } else {
        // Correct — advance immediately
        if (data.pregunta) {
          setPregunta(data.pregunta)
          setRespuestaSeleccionada(null)
          setView('pregunta')
        } else {
          if (timerGlobalRef.current) clearInterval(timerGlobalRef.current)
          await handleFinalizar()
        }
      }
    } catch {
      setError('Error al enviar respuesta. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  // ── API: finalize ────────────────────────────────────────────────────────
  async function handleFinalizar() {
    const id = sesionIdRef.current
    if (!id) return
    setError('')
    try {
      const res = await api.post(`/evaluacion/${id}/finalizar`)
      setResultados(res.data as ResultadosEval)
      setView('resultados')
    } catch {
      setError('Error al finalizar la evaluación.')
    }
  }

  // ── Continue from feedback ───────────────────────────────────────────────
  function handleContinuarDesdeFeedback() {
    if (nextPreguntaRef) {
      setPregunta(nextPreguntaRef)
      setRespuestaSeleccionada(null)
      setView('pregunta')
    } else {
      if (timerGlobalRef.current) clearInterval(timerGlobalRef.current)
      void handleFinalizar()
    }
  }

  const timerRojo = tiempoRestante < 300 // < 5 min
  const timerNaranja = tiempoRestante < 300 && tiempoRestante >= 60

  // ─── View: Cargando ──────────────────────────────────────────────────────
  if (view === 'cargando') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Spinner size={12} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Iniciando evaluación adaptativa...</p>
        </div>
      </div>
    )
  }

  // ─── View: Sin diagnóstico ───────────────────────────────────────────────
  if (view === 'sin_diagnostico') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
        <EvalHeader tiempoRestante={null} timerRojo={false} timerNaranja={false} nivelActual="" cambioNivel={null} showTimer={false} />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 text-center">
            <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-amber-500" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Diagnóstico requerido</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              Debes completar tu diagnóstico inicial antes de acceder a la evaluación adaptativa.
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}
            <button
              onClick={() => navigate('/diagnostico')}
              className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Ir al diagnóstico
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ─── View: Feedback ──────────────────────────────────────────────────────
  if (view === 'feedback' && pregunta) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
        <EvalHeader
          tiempoRestante={tiempoRestante}
          timerRojo={timerRojo}
          timerNaranja={timerNaranja}
          nivelActual={nivelActual}
          cambioNivel={cambioNivel}
          showTimer
        />

        <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          {/* Question recap */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-5">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Pregunta — {pregunta.tema}
            </p>
            <p className="text-base font-medium text-gray-900 dark:text-gray-100 leading-relaxed mb-5">
              {pregunta.enunciado}
            </p>
            <div className="space-y-2.5">
              {OPCIONES.map((letra) => {
                const isSelected = respuestaSeleccionada === letra
                const isCorrect = respuestaCorrecta === letra

                let borderClass = 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                let badgeClass = 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                let textClass = 'text-gray-700 dark:text-gray-300'

                if (isCorrect) {
                  borderClass = 'border-green-500 bg-green-50'
                  badgeClass = 'bg-green-500 text-white'
                  textClass = 'text-green-900 font-medium'
                } else if (isSelected && !isCorrect) {
                  borderClass = 'border-red-500 bg-red-50'
                  badgeClass = 'bg-red-500 text-white'
                  textClass = 'text-red-900 font-medium'
                }

                return (
                  <div
                    key={letra}
                    className={`flex items-start gap-3 px-4 py-3 rounded-xl border-2 ${borderClass}`}
                  >
                    <span
                      className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${badgeClass}`}
                    >
                      {letra}
                    </span>
                    <span className={`text-sm leading-relaxed pt-0.5 ${textClass}`}>
                      {pregunta.opciones[letra]}
                    </span>
                    {isCorrect && (
                      <Check size={16} className="ml-auto flex-shrink-0 text-green-600" aria-label="Correcta" />
                    )}
                    {isSelected && !isCorrect && (
                      <X size={16} className="ml-auto flex-shrink-0 text-red-600" aria-label="Incorrecta" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* AI Feedback */}
          {retroalimentacion && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-5 space-y-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Retroalimentación de la IA
              </p>
              <div className="border-l-4 border-red-400 pl-4">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Tu error</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {retroalimentacion.explicacion_error}
                </p>
              </div>
              <div className="border-l-4 border-amber-400 pl-4">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Concepto clave</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {retroalimentacion.concepto_clave}
                </p>
              </div>
              <div className="border-l-4 border-blue-400 pl-4">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Ejemplo resuelto</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {retroalimentacion.ejemplo_resuelto}
                </p>
              </div>
              <div className="border-l-4 border-purple-400 pl-4">
                <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1">Tip para Saber Pro</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {retroalimentacion.tip_saber_pro}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={handleContinuarDesdeFeedback}
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Continuar
          </button>
        </main>
      </div>
    )
  }

  // ─── View: Pregunta ──────────────────────────────────────────────────────
  if (view === 'pregunta' && pregunta) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
        <EvalHeader
          tiempoRestante={tiempoRestante}
          timerRojo={timerRojo}
          timerNaranja={timerNaranja}
          nivelActual={nivelActual}
          cambioNivel={cambioNivel}
          showTimer
        />

        <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          {/* Info bar */}
          <div className="flex items-center justify-between mb-4">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
              {pregunta.tema}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Pregunta #{pregunta.numero} · Mín. 10 preguntas
            </span>
          </div>

          {/* Question card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-5">
            <p className="text-base font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
              {pregunta.enunciado}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {OPCIONES.map((letra) => {
              const seleccionada = respuestaSeleccionada === letra
              return (
                <button
                  key={letra}
                  onClick={() => setRespuestaSeleccionada(letra)}
                  disabled={enviando}
                  className={`w-full flex items-start gap-3 px-4 py-4 rounded-xl border-2 text-left transition focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 dark:focus:ring-offset-gray-950 ${
                    seleccionada
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  <span
                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                      seleccionada ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {letra}
                  </span>
                  <span
                    className={`text-sm leading-relaxed pt-0.5 ${
                      seleccionada ? 'text-blue-900 dark:text-blue-200 font-medium' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {pregunta.opciones[letra]}
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

          <button
            onClick={() => void handleResponder()}
            disabled={!respuestaSeleccionada || enviando}
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            {enviando ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin inline-block w-4 h-4 border-b-2 border-white rounded-full" />
                Registrando...
              </span>
            ) : (
              'Confirmar respuesta'
            )}
          </button>
        </main>
      </div>
    )
  }

  // ─── View: Resultados (HU-17) ────────────────────────────────────────────
  if (view === 'resultados' && resultados) {
    const puntajePct = Math.round(resultados.puntaje)
    const temaEntries = Object.entries(resultados.puntaje_por_tema)

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
        <EvalHeader tiempoRestante={null} timerRojo={false} timerNaranja={false} nivelActual="" cambioNivel={null} showTimer={false} />

        <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Resultado de Evaluación Adaptativa
            </h1>

            {resultados.incompleta && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-full text-xs font-semibold mb-4">
                <span>!</span>
                Evaluación incompleta por tiempo
              </div>
            )}

            {/* Score circle */}
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-primary-50 dark:bg-primary-900/30 border-4 border-primary-200 dark:border-primary-800 mb-4">
              <span className="text-4xl font-extrabold text-primary-700 dark:text-primary-400">{puntajePct}%</span>
            </div>

            <p className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {resultados.correctas}/{resultados.total} correctas
            </p>
          </div>

          {/* Level progression */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-5">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
              Progresión de nivel
            </p>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Inicial</p>
                <span
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold ${nivelBadgeSolid(resultados.nivel_inicial)}`}
                >
                  {resultados.nivel_inicial}
                </span>
              </div>
              <ArrowRight size={20} className="text-gray-400 dark:text-gray-500" aria-hidden="true" />
              <div className="text-center">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Final</p>
                <span
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold ${nivelBadgeSolid(resultados.nivel_final)}`}
                >
                  {resultados.nivel_final}
                </span>
              </div>
            </div>
          </div>

          {/* Score by topic table */}
          {temaEntries.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
                Puntaje por tema
              </p>
              <div className="space-y-4">
                {temaEntries.map(([tema, puntaje]) => {
                  const pct = Math.round(puntaje)
                  const barColor =
                    pct >= 70
                      ? nivelBarColor('Avanzado')
                      : pct >= 40
                      ? nivelBarColor('Intermedio')
                      : nivelBarColor('Basico')
                  return (
                    <div key={tema}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{tema}</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{pct}%</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/progreso')}
              className="flex-1 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Ver mi progreso
            </button>
            <button
              onClick={() => {
                navigate('/evaluacion')
                window.location.reload()
              }}
              className="flex-1 py-3 px-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-xl border border-gray-300 dark:border-gray-600 transition focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              Nueva evaluación
            </button>
          </div>
        </main>
      </div>
    )
  }

  return null
}

// ─── Shared Evaluation Header ─────────────────────────────────────────────────

interface EvalHeaderProps {
  tiempoRestante: number | null
  timerRojo: boolean
  timerNaranja: boolean
  nivelActual: string
  cambioNivel: 'subio' | 'bajo' | null
  showTimer: boolean
}

function EvalHeader({
  tiempoRestante,
  timerRojo,
  timerNaranja,
  nivelActual,
  cambioNivel,
  showTimer,
}: EvalHeaderProps) {
  const timerClass = timerRojo
    ? timerNaranja
      ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-800'
      : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800'
    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <GraduationCap size={16} className="text-white" aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-primary-700 dark:group-hover:text-primary-400 transition hidden sm:block">
              Evaluación Adaptativa
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Level change indicator */}
            {cambioNivel && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold animate-pulse ${
                  cambioNivel === 'subio'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {cambioNivel === 'subio'
                  ? <><TrendingUp size={12} aria-hidden="true" /> Nivel subió</>
                  : <><TrendingDown size={12} aria-hidden="true" /> Nivel bajó</>}
              </span>
            )}

            {/* Level badge */}
            {nivelActual && (
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${nivelBadgeClass(nivelActual)}`}
              >
                {nivelActual}
              </span>
            )}

            {/* Global countdown timer */}
            {showTimer && tiempoRestante !== null && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-mono font-semibold transition-colors ${timerClass}`}
                aria-label={`Tiempo restante: ${formatTime(tiempoRestante)}`}
              >
                <Clock size={14} aria-hidden="true" />
                <span>{formatTime(tiempoRestante)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../lib/api'
import axios from 'axios'

// ─── Types ────────────────────────────────────────────────────────────────────

type TutoriaView =
  | 'cargando'
  | 'pregunta'
  | 'feedback_incorrecto'
  | 'correcto_breve'
  | 'resumen'
  | 'sin_diagnostico'

interface PreguntaTutoria {
  id: number
  enunciado: string
  opciones: { A: string; B: string; C: string; D: string }
  tema: string
  nivel: string
  numero_sesion: number
}

interface Retroalimentacion {
  explicacion_error: string
  concepto_clave: string
  ejemplo_resuelto: string
  tip_saber_pro: string
}

interface ResumenTutoria {
  sesion_id: number
  puntaje: number
  correctas: number
  total: number
  nivel_final: string
  nivel_inicial: string
  duracion_min: number
  comparativa: string | null
}

interface ResponderData {
  es_correcta: boolean
  respuesta_correcta: string
  retroalimentacion: Retroalimentacion | null
  nivel_actual: string
  pregunta: PreguntaTutoria | null
  mensaje_nivel: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OPCIONES: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D']

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

function Spinner({ size = 8 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-b-2 border-primary-600"
      style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
    />
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TutoriaPage() {
  const navigate = useNavigate()

  const [view, setView] = useState<TutoriaView>('cargando')
  const [sesionId, setSesionId] = useState<number | null>(null)
  const [pregunta, setPregunta] = useState<PreguntaTutoria | null>(null)
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState<string | null>(null)
  const [respuestaCorrecta, setRespuestaCorrecta] = useState<string>('')
  const [retroalimentacion, setRetroalimentacion] = useState<Retroalimentacion | null>(null)
  const [nivelActual, setNivelActual] = useState<string>('')
  const [mensajeNivel, setMensajeNivel] = useState<string | null>(null)
  const [resumen, setResumen] = useState<ResumenTutoria | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [nextPreguntaRef, setNextPreguntaRef] = useState<PreguntaTutoria | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mensajeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Init: start tutoring session ─────────────────────────────────────────
  useEffect(() => {
    async function iniciar() {
      try {
        const res = await api.post('/tutoria/iniciar')
        const data = res.data as {
          sesion_id: number
          pregunta: PreguntaTutoria
          nivel_actual: string
          temas_prioritarios: string[]
        }
        setSesionId(data.sesion_id)
        setPregunta(data.pregunta)
        setNivelActual(data.nivel_actual)
        setView('pregunta')
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.status === 409) {
          setView('sin_diagnostico')
        } else {
          setError('Error al iniciar la sesión de tutoría.')
          setView('sin_diagnostico')
        }
      }
    }
    void iniciar()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (mensajeTimerRef.current) clearTimeout(mensajeTimerRef.current)
    }
  }, [])

  // ── Auto-dismiss mensajeNivel after 3s ───────────────────────────────────
  useEffect(() => {
    if (!mensajeNivel) return
    if (mensajeTimerRef.current) clearTimeout(mensajeTimerRef.current)
    mensajeTimerRef.current = setTimeout(() => {
      setMensajeNivel(null)
    }, 3000)
    return () => {
      if (mensajeTimerRef.current) clearTimeout(mensajeTimerRef.current)
    }
  }, [mensajeNivel])

  // ── API: submit answer ───────────────────────────────────────────────────
  async function handleConfirmar() {
    if (!pregunta || !sesionId) return
    setEnviando(true)
    setError('')
    try {
      const res = await api.post(`/tutoria/${sesionId}/responder`, {
        pregunta_id: pregunta.id,
        respuesta_dada: respuestaSeleccionada,
        tiempo_seg: null,
      })
      const data = res.data as ResponderData

      setRespuestaCorrecta(data.respuesta_correcta)
      setNivelActual(data.nivel_actual)
      if (data.mensaje_nivel) setMensajeNivel(data.mensaje_nivel)

      if (data.es_correcta) {
        setNextPreguntaRef(data.pregunta)
        setView('correcto_breve')
        timerRef.current = setTimeout(() => {
          if (data.pregunta) {
            setPregunta(data.pregunta)
            setRespuestaSeleccionada(null)
            setView('pregunta')
          } else {
            void handleFinalizar()
          }
        }, 1500)
      } else {
        setRetroalimentacion(data.retroalimentacion)
        setNextPreguntaRef(data.pregunta)
        setView('feedback_incorrecto')
      }
    } catch {
      setError('Error al enviar respuesta. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  // ── API: finalize session ────────────────────────────────────────────────
  async function handleFinalizar() {
    if (!sesionId) return
    setError('')
    try {
      const res = await api.post(`/tutoria/${sesionId}/finalizar`)
      setResumen(res.data as ResumenTutoria)
      setView('resumen')
    } catch {
      setError('Error al finalizar sesión.')
    }
  }

  // ── Continue from feedback ───────────────────────────────────────────────
  function handleContinuarDesdeFeedback() {
    if (nextPreguntaRef) {
      setPregunta(nextPreguntaRef)
      setRespuestaSeleccionada(null)
      setView('pregunta')
    } else {
      void handleFinalizar()
    }
  }

  // ─── View: Cargando ──────────────────────────────────────────────────────
  if (view === 'cargando') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Spinner size={12} />
          </div>
          <p className="text-sm text-gray-500">Iniciando sesión de tutoría...</p>
        </div>
      </div>
    )
  }

  // ─── View: Sin diagnóstico ───────────────────────────────────────────────
  if (view === 'sin_diagnostico') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PageHeader />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">!</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Diagnóstico requerido
            </h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Debes completar tu diagnóstico inicial primero para iniciar una sesión de tutoría
              personalizada.
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-xs text-red-700">{error}</p>
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

  // ─── View: Correcto breve ────────────────────────────────────────────────
  if (view === 'correcto_breve') {
    return (
      <div className="min-h-screen bg-emerald-500 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl font-bold">✓</span>
          </div>
          <h2 className="text-3xl font-extrabold mb-2">¡Correcto!</h2>
          <p className="text-emerald-100 text-sm">Cargando siguiente pregunta...</p>
        </div>
      </div>
    )
  }

  // ─── View: Feedback incorrecto ───────────────────────────────────────────
  if (view === 'feedback_incorrecto' && pregunta) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PageHeader nivelActual={nivelActual} />

        <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          {/* Question recap with colored options */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Pregunta — {pregunta.tema}
            </p>
            <p className="text-base font-medium text-gray-900 leading-relaxed mb-5">
              {pregunta.enunciado}
            </p>
            <div className="space-y-2.5">
              {OPCIONES.map((letra) => {
                const isSelected = respuestaSeleccionada === letra
                const isCorrect = respuestaCorrecta === letra

                let borderClass = 'border-gray-200 bg-gray-50'
                let badgeClass = 'bg-gray-100 text-gray-600'
                let textClass = 'text-gray-700'

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
                      <span className="ml-auto flex-shrink-0 text-green-600 font-bold text-sm">
                        ✓
                      </span>
                    )}
                    {isSelected && !isCorrect && (
                      <span className="ml-auto flex-shrink-0 text-red-600 font-bold text-sm">
                        ✗
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* AI Feedback card */}
          {retroalimentacion && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5 space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Retroalimentación de la IA
              </p>

              {/* Error explanation */}
              <div className="border-l-4 border-red-400 pl-4">
                <p className="text-xs font-semibold text-red-700 mb-1">Tu error</p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {retroalimentacion.explicacion_error}
                </p>
              </div>

              {/* Key concept */}
              <div className="border-l-4 border-amber-400 pl-4">
                <p className="text-xs font-semibold text-amber-700 mb-1">Concepto clave</p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {retroalimentacion.concepto_clave}
                </p>
              </div>

              {/* Solved example */}
              <div className="border-l-4 border-blue-400 pl-4">
                <p className="text-xs font-semibold text-blue-700 mb-1">Ejemplo resuelto</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {retroalimentacion.ejemplo_resuelto}
                </p>
              </div>

              {/* Saber Pro tip */}
              <div className="border-l-4 border-purple-400 pl-4">
                <p className="text-xs font-semibold text-purple-700 mb-1">Tip para Saber Pro</p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {retroalimentacion.tip_saber_pro}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs text-red-700">{error}</p>
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
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Sticky header */}
        <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link to="/dashboard" className="flex items-center gap-2 group">
                  <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">T</span>
                  </div>
                </Link>
                <span className="text-sm font-semibold text-gray-700">Sesión de Tutoría</span>
              </div>
              <div className="flex items-center gap-2">
                {nivelActual && (
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${nivelBadgeClass(nivelActual)}`}
                  >
                    {nivelActual}
                  </span>
                )}
                <span className="text-xs text-gray-400 font-medium">
                  #{pregunta.numero_sesion}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Level change toast */}
        {mensajeNivel && (
          <div className="bg-primary-50 border-b border-primary-200 px-4 py-2 text-center">
            <p className="text-xs font-semibold text-primary-700">{mensajeNivel}</p>
          </div>
        )}

        <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          {/* Topic badge */}
          <div className="mb-4">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
              {pregunta.tema}
            </span>
          </div>

          {/* Question card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">
            <p className="text-base font-medium text-gray-900 leading-relaxed">
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
                  className={`w-full flex items-start gap-3 px-4 py-4 rounded-xl border-2 text-left transition focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 ${
                    seleccionada
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-gray-100 hover:border-gray-300 hover:bg-gray-50'
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  <span
                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                      seleccionada ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {letra}
                  </span>
                  <span
                    className={`text-sm leading-relaxed pt-0.5 ${
                      seleccionada ? 'text-blue-900 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {pregunta.opciones[letra]}
                  </span>
                </button>
              )
            })}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => void handleConfirmar()}
              disabled={!respuestaSeleccionada || enviando}
              className="flex-1 py-3 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              {enviando ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin inline-block w-4 h-4 border-b-2 border-white rounded-full" />
                  Confirmando...
                </span>
              ) : (
                'Confirmar respuesta'
              )}
            </button>
            <button
              onClick={() => void handleFinalizar()}
              disabled={enviando}
              className="sm:w-auto py-3 px-5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl border border-gray-300 transition focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Terminar sesión
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ─── View: Resumen (HU-14) ───────────────────────────────────────────────
  if (view === 'resumen' && resumen) {
    const puntajePct = Math.round(resumen.puntaje)

    let comparativaClass = 'bg-blue-50 border-blue-200 text-blue-800'
    if (resumen.nivel_final === 'Avanzado') comparativaClass = 'bg-emerald-50 border-emerald-200 text-emerald-800'
    else if (resumen.nivel_final === 'Basico') comparativaClass = 'bg-rose-50 border-rose-200 text-rose-800'

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PageHeader />

        <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Resumen de Sesión</h1>

            {/* Score circle */}
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-primary-50 border-4 border-primary-200 mb-4">
              <span className="text-4xl font-extrabold text-primary-700">{puntajePct}%</span>
            </div>

            <p className="text-base font-semibold text-gray-700 mb-1">
              {resumen.correctas}/{resumen.total} correctas
            </p>
            <p className="text-sm text-gray-500">{resumen.duracion_min} min de sesión</p>
          </div>

          {/* Level progression */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Progresión de nivel
            </p>
            <div className="flex items-center justify-center gap-4">
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold ${nivelBadgeSolid(resumen.nivel_inicial)}`}
              >
                {resumen.nivel_inicial}
              </span>
              <span className="text-gray-400 font-bold text-lg">→</span>
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold ${nivelBadgeSolid(resumen.nivel_final)}`}
              >
                {resumen.nivel_final}
              </span>
            </div>
          </div>

          {/* Comparativa */}
          {resumen.comparativa && (
            <div className={`border rounded-2xl p-4 mb-5 ${comparativaClass}`}>
              <p className="text-sm leading-relaxed">{resumen.comparativa}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                navigate('/tutoria')
                window.location.reload()
              }}
              className="flex-1 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Nueva sesión
            </button>
            <button
              onClick={() => navigate('/progreso')}
              className="flex-1 py-3 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl border border-gray-300 transition focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              Ver mi progreso
            </button>
          </div>
        </main>
      </div>
    )
  }

  return null
}

// ─── Shared header ─────────────────────────────────────────────────────────────

function PageHeader({ nivelActual }: { nivelActual?: string }) {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-base">T</span>
          </div>
          <span className="text-lg font-semibold text-gray-900 group-hover:text-primary-700 transition">
            TutorIA Saber Pro
          </span>
        </Link>
        {nivelActual && (
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
              nivelActual === 'Avanzado'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : nivelActual === 'Intermedio'
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-rose-100 text-rose-800 border border-rose-200'
            }`}
          >
            {nivelActual}
          </span>
        )}
      </div>
    </header>
  )
}

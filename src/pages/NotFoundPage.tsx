import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-8xl font-extrabold text-primary-600 leading-none">404</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Página no encontrada</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          La ruta que buscas no existe o fue movida.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="mt-8 inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700
            text-white font-semibold py-2.5 px-6 rounded-lg transition focus:outline-none
            focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  )
}

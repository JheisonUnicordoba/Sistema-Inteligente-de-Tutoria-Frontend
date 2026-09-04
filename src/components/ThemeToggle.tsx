import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

interface Props {
  className?: string
}

export default function ThemeToggle({ className = '' }: Props) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${className}`}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

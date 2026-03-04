"use client";

import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useTheme } from 'next-themes'
import Link from 'next/link'

export default function Landing() {
  const router = useRouter()
  const { theme } = useTheme()

  return (
    <div className="min-h-screen bg-bg-deep text-text-main font-sans flex flex-col transition-colors relative overflow-hidden">
      {/* Animated Grid Background */}
      <div className="bg-grid-mask">
        <div className="bg-grid-moving"></div>
      </div>

      {/* Backdrop Blur Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-accent/20 blur-[120px] rounded-full pointer-events-none rotate-12 z-0"></div>

      {/* Header */}
      <header className="h-16 px-6 lg:px-10 flex items-center justify-between border-b border-border-color bg-bg-main shrink-0 relative z-20">
        <div className="flex items-center gap-2">
          {theme === 'dark' ? (
            <svg width="24" height="24" viewBox="0 0 128 128" fill="none"><path d="M109.13 62.06L72.29 101.99C66.19 108.6 56 104.28 56 95.28V72H18.87C10.74 72 6.13 62.61 11.09 56.17L49.03 7.03C55.03 -0.77 67 -0.19 67 9.61V32H103.11C111.95 32 116.14 42.79 109.13 42.06V62.06Z" fill="#4285f4" /></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#4285f4" stroke="#4285f4" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          )}
          <span className="font-semibold text-lg tracking-tight">Zenit <span className="text-[#4285f4]">Docs</span></span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/editor"
            className="text-sm font-medium hover:text-accent transition-colors hidden sm:block"
          >
            Ir al Editor
          </Link>
          <Link
            href="/editor"
            className="bg-accent text-white px-5 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Iniciar Sesión
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto space-y-8 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-border-color/30 backdrop-blur-sm text-xs font-semibold text-text-muted mb-4 border border-border-color shadow-sm">
          <span>✨</span> Nueva experiencia de Markdown
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-text-main">
          La forma <span className="text-accent">Zen</span> de crear documentación.
        </h1>

        <p className="text-lg md:text-xl text-text-muted max-w-2xl mt-4 leading-relaxed">
          Un editor local-first y profesional de Markdown, diseñado para mantenerte enfocado. Variables dinámicas, atajos rápidos y componentes estilo GitHub en tiempo real.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Link
            href="/editor"
            className="bg-accent text-white px-8 py-3 rounded-md font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-accent/20"
          >
            Empezar a escribir gratis
          </Link>
          <button
            className="px-8 py-3 rounded-md font-semibold bg-bg-card border border-border-color hover:bg-border-color/30 transition-colors"
          >
            Leer la documentación
          </button>
        </div>
      </main>

      {/* Basic Footer */}
      <footer className="py-8 text-center text-sm text-text-muted border-t border-border-color bg-bg-card relative z-20">
        <p>© 2026 Zenit Docs. Diseñado con una interfaz táctil y estática.</p>
      </footer>
    </div>
  )
}

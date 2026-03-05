"use client";

import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Zap, BookOpen, Hash, GitBranch, Cloud, Shield, ArrowRight, Github, Star } from 'lucide-react'

const FEATURES = [
  {
    icon: <BookOpen size={18} />,
    title: 'Editor Markdown',
    desc: 'Escribe con sintaxis Markdown estándar. Vista previa en tiempo real al lado.'
  },
  {
    icon: <Hash size={18} />,
    title: 'Variables Dinámicas',
    desc: 'Inyecta valores con {{variable}} y cámbia todo el doc al instante.'
  },
  {
    icon: <GitBranch size={18} />,
    title: 'Diagramas UML',
    desc: 'Crea diagramas Mermaid directamente desde bloques de código.'
  },
  {
    icon: <Cloud size={18} />,
    title: 'Auto-guardado',
    desc: 'Todos tus documentos se sincronizan automáticamente en la nube.'
  },
  {
    icon: <Shield size={18} />,
    title: 'Seguro y Privado',
    desc: 'Autenticación con Clerk. Solo vos accedés a tus documentos.'
  },
  {
    icon: <Zap size={18} />,
    title: 'Modo Zen',
    desc: 'Activá el modo sin distracciones con Alt+Z y enfocáte en escribir.'
  },
]

export default function Landing() {
  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: 'var(--bg-deep)', color: 'var(--text-main)' }}
    >
      {/* Animated grid background */}
      <div className="bg-grid-mask">
        <div className="bg-grid-moving" />
      </div>

      {/* Purple glow orb */}
      <div
        className="absolute pointer-events-none z-0"
        style={{
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 700,
          height: 300,
          background: 'radial-gradient(ellipse, color-mix(in srgb, var(--accent) 25%, transparent), transparent 70%)',
          filter: 'blur(40px)',
          borderRadius: '50%',
        }}
      />
      <div
        className="absolute pointer-events-none z-0"
        style={{
          bottom: '20%',
          right: '10%',
          width: 400,
          height: 200,
          background: 'radial-gradient(ellipse, color-mix(in srgb, var(--accent2) 15%, transparent), transparent 70%)',
          filter: 'blur(60px)',
          borderRadius: '50%',
        }}
      />

      {/* Header */}
      <header
        className="relative z-20 h-14 px-6 lg:px-10 flex items-center justify-between border-b"
        style={{ background: 'color-mix(in srgb, var(--bg-main) 80%, transparent)', borderColor: 'var(--border-color)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg" style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
                fill="var(--accent)" stroke="var(--accent)"
                strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-bold text-base tracking-tight" style={{ color: 'var(--text-main)' }}>
            Zenit <span style={{ color: 'var(--accent)' }}>Docs</span>
          </span>
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
            style={{ color: 'var(--accent)', borderColor: 'color-mix(in srgb, var(--accent) 40%, transparent)', background: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}
          >
            BETA
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/editor"
            className="text-sm font-medium transition-colors hidden sm:block"
            style={{ color: 'var(--text-muted)' }}
            onMouseOver={e => (e.currentTarget.style.color = 'var(--text-main)')}
            onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            Editor
          </Link>
          <Link
            href="/sign-in"
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-85"
            style={{ background: 'var(--accent)' }}
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto space-y-8 relative z-10">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold fade-in-up"
          style={{
            background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
            borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
            color: 'var(--accent)',
          }}
        >
          <Star size={11} fill="currentColor" />
          Editor de documentación local-first
        </div>

        {/* Title */}
        <h1
          className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.08] fade-in-up"
          style={{ animationDelay: '0.05s', color: 'var(--text-main)' }}
        >
          La forma{' '}
          <span
            className="relative"
            style={{
              background: 'linear-gradient(135deg, #4285f4, #6ea8fe)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Zen
          </span>{' '}
          de escribir.
        </h1>

        {/* Subtitle */}
        <p
          className="text-lg md:text-xl max-w-2xl leading-relaxed fade-in-up"
          style={{ color: 'var(--text-muted)', animationDelay: '0.1s' }}
        >
          Editor Markdown profesional con vista previa en tiempo real, variables dinámicas,
          diagramas UML y auto-guardado en la nube.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 fade-in-up" style={{ animationDelay: '0.15s' }}>
          <Link
            href="/editor"
            className="group flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02] shadow-xl"
            style={{
              background: 'var(--accent)',
              boxShadow: '0 8px 32px color-mix(in srgb, var(--accent) 40%, transparent)',
            }}
          >
            Empezar gratis
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a
            href="#features"
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold border transition-colors"
            style={{
              background: 'color-mix(in srgb, var(--bg-card) 80%, transparent)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-muted)',
              backdropFilter: 'blur(8px)',
            }}
            onMouseOver={e => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
            onMouseOut={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)' }}
          >
            Ver características
          </a>
        </div>

        {/* Feature grid */}
        <div
          id="features"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-3xl mt-8 text-left fade-in-up"
          style={{ animationDelay: '0.2s' }}
        >
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border transition-all duration-200"
              style={{
                background: 'color-mix(in srgb, var(--bg-card) 70%, transparent)',
                borderColor: 'var(--border-color)',
                backdropFilter: 'blur(8px)',
              }}
              onMouseOver={e => {
                e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--accent) 50%, transparent)'
                e.currentTarget.style.background = 'color-mix(in srgb, var(--bg-card) 90%, transparent)'
              }}
              onMouseOut={e => {
                e.currentTarget.style.borderColor = 'var(--border-color)'
                e.currentTarget.style.background = 'color-mix(in srgb, var(--bg-card) 70%, transparent)'
              }}
            >
              <div
                className="p-2 rounded-lg w-fit mb-3"
                style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}
              >
                {f.icon}
              </div>
              <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-main)' }}>{f.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer
        className="relative z-20 py-6 text-center border-t"
        style={{ borderColor: 'var(--border-color)', background: 'color-mix(in srgb, var(--bg-main) 60%, transparent)', backdropFilter: 'blur(8px)' }}
      >
        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
          © 2026 Zenit Docs — Hecho con 💜 para escritores y desarrolladores
        </p>
      </footer>
    </div>
  )
}

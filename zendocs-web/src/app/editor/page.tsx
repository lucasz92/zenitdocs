"use client";

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Download, FileText, Plus, Hash, X, Clock, Calendar, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Printer } from 'lucide-react'
import { useTheme } from 'next-themes'
import { UserButton } from "@clerk/nextjs"
import { SileoToast } from '@/components/SileoToast'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Editor } from '@/components/Editor'
import { Preview } from '@/components/Preview'
import { toast } from 'sonner'
import localforage from 'localforage'
import 'highlight.js/styles/github.css'

export type DocumentNode = {
  id: string;
  name: string;
  content: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export default function App() {
  const [isZen, setIsZen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isPreviewOpen, setIsPreviewOpen] = useState(true)

  // --- Robust IndexedDB Storage with localforage ---
  const [docs, setDocs] = useState<DocumentNode[]>([])
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [isDBReady, setIsDBReady] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [activeDocId, setActiveDocId] = useState<string>('')

  useEffect(() => {
    // Escucha de conectividad de red
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cargar DB Inicial Asincrónicamente
    const initDB = async () => {
      try {
        const savedDocs = await localforage.getItem<DocumentNode[]>('zenit_docs_v1')
        const savedVars = await localforage.getItem<Record<string, string>>('zenit_vars_react')

        if (savedDocs && savedDocs.length > 0) {
          setDocs(savedDocs)
          setActiveDocId(savedDocs[0].id)
        } else {
          // Documento por defecto en la primera carga (Offline first)
          const defaultDoc = {
            id: Date.now().toString(),
            name: 'Bienvenido.md',
            content: "# Bienvenido\n> [!TIP]\n> Pulsa Alt + Z para el modo Zen.\n\nEscribe tu documentación aquí.",
            description: 'Documento inicial de bienvenida al sistema Zenit.',
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
          setDocs([defaultDoc])
          setActiveDocId(defaultDoc.id)
          await localforage.setItem('zenit_docs_v1', [defaultDoc])
        }

        if (savedVars) setVariables(savedVars)
        else setVariables({ proyecto: 'Mi_Nota', autor: 'User' })

        setIsDBReady(true)
      } catch (err) {
        console.error("Error cargando BD Local:", err)
        toast.error("Error al cargar la base de datos local.")
      }
    }

    initDB()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const [status, setStatus] = useState("Cargando DB...")
  const { theme } = useTheme()

  // Modal States
  const [isDocModalOpen, setIsDocModalOpen] = useState(false)
  const [newDocData, setNewDocData] = useState({ name: '', description: '' })

  const [isVarModalOpen, setIsVarModalOpen] = useState(false)
  const [newVarData, setNewVarData] = useState({ name: '', value: '' })

  const activeDoc = isDBReady ? (docs.find(d => d.id === activeDocId) || docs[0] || null) : null

  // Handle Zen mode toggle natively with tailwind instead of classes if needed
  // We keep the state to orchestrate layout smoothly

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        setIsZen(prev => !prev)
      }
      if (e.key === 'Escape' && isZen) {
        setIsZen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isZen])

  useEffect(() => {
    if (!isDBReady) return
    localforage.setItem('zenit_vars_react', variables).catch(console.error)
  }, [variables, isDBReady])

  useEffect(() => {
    if (!isDBReady) return
    const timer = setTimeout(() => {
      localforage.setItem('zenit_docs_v1', docs).then(() => {
        setStatus(isOnline ? "Guardado local seguro" : "Guardado offline seguro")
      }).catch(err => {
        console.error("Error guardando localmente:", err)
        setStatus("Error de guardado")
      })
    }, 500)
    setStatus("Sincronizando disco...")
    return () => clearTimeout(timer)
  }, [docs, isDBReady, isOnline])

  const handleUpdateContent = (newContent: string) => {
    setDocs(prev => prev.map(d =>
      d.id === activeDocId
        ? { ...d, content: newContent, updatedAt: Date.now() }
        : d
    ))
  }

  const handleCreateDocSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDocData.name.trim()) return

    const nameStr = newDocData.name.trim()
    const finalName = nameStr.endsWith('.md') ? nameStr : `${nameStr}.md`

    const newDoc: DocumentNode = {
      id: Date.now().toString(),
      name: finalName,
      content: `# ${finalName.replace('.md', '')}\n\nEscribe aquí...`,
      description: newDocData.description.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    setDocs(prev => [...prev, newDoc])
    setActiveDocId(newDoc.id)
    setIsDocModalOpen(false)
    setNewDocData({ name: '', description: '' })
    toast.success('Documento creado', { description: finalName })
  }

  const handleCreateVarSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newVarData.name.trim()) return

    const safeName = newVarData.name.trim().replace(/\s+/g, '_')
    setVariables(prev => ({ ...prev, [safeName]: newVarData.value }))
    setIsVarModalOpen(false)
    setNewVarData({ name: '', value: '' })
    toast.success('Variable añadida', { description: `{{${safeName}}}` })
  }

  const handleDownload = () => {
    if (!activeDoc) return
    const blob = new Blob([activeDoc.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = activeDoc.name
    a.click()
    toast.success('Documento exportado', {
      description: 'El archivo markdown ha sido descargado.',
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(ts))
  }

  if (!isDBReady || !activeDoc) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-deep font-mono text-text-muted text-sm">
        Extrayendo datos de la caja fuerte local...
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col font-sans">
      <SileoToast />

      {/* MODAL: Nuevo Documento */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-bg-main p-6 rounded-2xl border border-border-color shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-text-main">Nuevo Documento</h2>
              <button onClick={() => setIsDocModalOpen(false)} className="text-text-muted hover:text-text-main transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateDocSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Nombre del archivo</label>
                <input
                  autoFocus
                  type="text"
                  value={newDocData.name}
                  onChange={e => setNewDocData({ ...newDocData, name: e.target.value })}
                  placeholder="ej. mi-proyecto.md"
                  className="bg-bg-deep text-sm text-text-main px-3 py-2.5 rounded-lg border border-border-color outline-none focus:border-accent transition-colors"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Descripción (opcional)</label>
                <textarea
                  value={newDocData.description}
                  onChange={e => setNewDocData({ ...newDocData, description: e.target.value })}
                  placeholder="Un breve resumen de este documento..."
                  className="bg-bg-deep text-sm text-text-main px-3 py-2.5 rounded-lg border border-border-color outline-none focus:border-accent transition-colors resize-none h-20"
                />
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setIsDocModalOpen(false)} className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-main transition-colors">Cancelar</button>
                <button type="submit" className="bg-accent text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-sm shadow-accent/20">Crear Documento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nueva Variable */}
      {isVarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-bg-main p-6 rounded-2xl border border-border-color shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-text-main">Añadir Variable</h2>
              <button onClick={() => setIsVarModalOpen(false)} className="text-text-muted hover:text-text-main transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateVarSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Nombre de la variable</label>
                <input
                  autoFocus
                  type="text"
                  value={newVarData.name}
                  onChange={e => setNewVarData({ ...newVarData, name: e.target.value })}
                  placeholder="ej. proyecto_id"
                  className="bg-bg-deep text-sm text-text-main px-3 py-2.5 rounded-lg border border-border-color outline-none focus:border-accent font-mono transition-colors"
                  required
                />
                <p className="text-[10px] text-text-muted">No uses espacios. Se usará como {'{{nombre}}'}.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Valor inicial (opcional)</label>
                <input
                  type="text"
                  value={newVarData.value}
                  onChange={e => setNewVarData({ ...newVarData, value: e.target.value })}
                  placeholder="Valor a inyectar..."
                  className="bg-bg-deep text-sm text-text-main px-3 py-2.5 rounded-lg border border-border-color outline-none focus:border-accent transition-colors"
                />
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setIsVarModalOpen(false)} className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-main transition-colors">Cancelar</button>
                <button type="submit" className="bg-accent text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-sm shadow-accent/20">Añadir Variable</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HUD Zen */}
      <div id="zen-indicator" className={`fixed bottom-5 right-5 text-xs text-text-muted font-mono transition-opacity ${isZen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        Modo Zen Activo - Alt + Z para salir
      </div>

      <header id="main-header" className={`h-14 border-b border-border-color flex justify-between items-center bg-bg-main px-4 shrink-0 transition-all duration-500 z-30 ${isZen ? 'h-0 border-none px-0 opacity-0 overflow-hidden' : ''}`}>
        <div className="flex items-center gap-2">
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 128 128" fill="none"><path d="M109.13 62.06L72.29 101.99C66.19 108.6 56 104.28 56 95.28V72H18.87C10.74 72 6.13 62.61 11.09 56.17L49.03 7.03C55.03 -0.77 67 -0.19 67 9.61V32H103.11C111.95 32 116.14 42.79 109.13 42.06V62.06Z" fill="#4285f4" /></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#4285f4" stroke="#4285f4" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          )}
          <h1 className="text-sm font-medium">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              Zenit <span className={theme === 'dark' ? 'text-gray-500' : 'text-blue-600'}>Docs</span>
            </Link>
          </h1>
        </div>

        {/* Document Meta Header info */}
        <div className="hidden md:flex items-center gap-6 text-[10px] text-text-muted/70 font-mono absolute left-1/2 -translate-x-1/2">
          {!isOnline && (
            <div className="flex items-center gap-1.5 text-[#ff5c5c]" title="Sin conexión - Usando base de datos local (Offline Mode)">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff5c5c] animate-pulse"></span>
              Offline
            </div>
          )}
          <div className="flex items-center gap-1.5" title="Fecha de creación">
            <Calendar size={12} />
            <span>{formatDate(activeDoc.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Última modificación">
            <Clock size={12} />
            <span>{formatDate(activeDoc.updatedAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-text-muted">{status}</span>
          <ThemeToggle />
          <UserButton />
          <button onClick={() => setIsZen(!isZen)} className="bg-bg-card border border-border-color text-text-main hover:border-text-muted transition-colors text-xs px-3 py-1.5 rounded-md font-medium">
            Alt + Z Modo Zen
          </button>

          <button onClick={handlePrint} className="bg-bg-card border border-border-color text-text-main hover:border-text-muted transition-colors text-xs px-3 py-1.5 rounded-md font-medium flex gap-1 items-center">
            <Printer size={14} /> PDF
          </button>

          <button onClick={handleDownload} className="bg-accent text-white border border-transparent text-xs px-4 py-1.5 rounded-md font-medium flex gap-1.5 items-center hover:opacity-90 transition-opacity">
            <Download size={14} className="text-white" />
            <span className="text-white">.MD</span>
          </button>

          <div className="w-px h-6 bg-border-color mx-1"></div>

          <button
            onClick={() => setIsPreviewOpen(!isPreviewOpen)}
            className="p-1.5 text-text-muted hover:text-text-main hover:bg-border-color/50 rounded-md transition-all active:scale-95"
            title="Contraer / Expandir Vista Previa"
          >
            {isPreviewOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside
          id="main-sidebar"
          className={`bg-bg-card flex flex-col border-r border-border-color shrink-0 transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] relative z-40 ${isSidebarOpen ? 'w-[320px]' : 'w-[68px]'
            }`}
        >
          {/* Header del Sidebar */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-border-color shrink-0 bg-bg-card/50 backdrop-blur-sm z-10 relative">
            <div className={`font-semibold text-xs text-text-muted transition-opacity duration-200 whitespace-nowrap overflow-hidden ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>Explorador CSS</div>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-1.5 text-text-muted hover:text-text-main hover:bg-border-color/50 rounded-md transition-all active:scale-95 ${!isSidebarOpen && 'mx-auto'}`}
              title="Contraer / Expandir Panel"
            >
              {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
          </div>

          <div className="flex-1 relative">
            {/* Contenido Completo (Visible cuando está abierto) */}
            <div className={`absolute inset-0 overflow-y-auto overflow-x-hidden transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'}`}>
              <div className="w-[320px] p-5 flex flex-col gap-8">
                {/* ARCHIVOS */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Archivos</h2>
                    <button onClick={() => setIsDocModalOpen(true)} className="text-text-muted hover:text-accent transition-colors bg-bg-main border border-border-color shadow-sm p-1.5 rounded-lg active:scale-95">
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {docs.map(doc => (
                      <button
                        key={doc.id}
                        onClick={() => setActiveDocId(doc.id)}
                        className={`w-full flex flex-col items-start gap-1.5 p-3 rounded-none border-r-[4px] border-y border-l text-left transition-all ${activeDocId === doc.id
                          ? 'bg-bg-main border-r-accent border-y-border-color border-l-border-color shadow-sm ring-1 ring-accent/10'
                          : 'bg-bg-deep border-r-transparent border-y-border-color border-l-border-color text-text-main hover:bg-border-color/20 shadow-sm'
                          }`}
                      >
                        <div className="flex items-center gap-2.5 w-full">
                          <FileText size={16} className={activeDocId === doc.id ? 'text-accent' : 'text-text-muted'} />
                          <span className="truncate text-xs font-semibold flex-1">{doc.name}</span>
                        </div>
                        {doc.description && (
                          <span className="text-[10px] text-text-muted line-clamp-1 w-full pl-[26px] leading-tight opacity-80">{doc.description}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-border-color w-full shrink-0"></div>

                {/* VARIABLES */}
                <div className="flex flex-col gap-4 pb-10">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Variables</h2>
                    <button onClick={() => setIsVarModalOpen(true)} className="text-text-muted hover:text-accent transition-colors bg-bg-main border border-border-color shadow-sm p-1.5 rounded-lg active:scale-95">
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    {Object.entries(variables).map(([key, val]) => (
                      <div key={key} className="bg-bg-deep p-3.5 rounded-none border-r-[4px] border-r-accent/50 border-y border-l border-border-color shadow-sm transition-all focus-within:ring-1 focus-within:ring-accent/50 focus-within:border-r-accent">
                        <p className="text-[11px] text-accent font-mono mb-2 font-bold flex items-center gap-1.5">
                          <Hash size={12} />
                          {"{{"}{key}{"}}"}
                        </p>
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => setVariables(prev => ({ ...prev, [key]: e.target.value }))}
                          className="bg-bg-main w-full text-xs text-text-main px-3 py-2.5 rounded-none border border-border-color outline-none font-mono focus:border-accent transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Contenido Colapsado (Barra de Íconos con Flotantes en Hover/Click) */}
            <div className={`absolute top-0 left-0 w-full p-3 flex flex-col items-center gap-4 transition-opacity duration-200 ${!isSidebarOpen ? 'opacity-100 z-20' : 'opacity-0 pointer-events-none z-0'}`}>
              <div
                className="relative group cursor-pointer"
                onClick={() => setIsSidebarOpen(true)}
              >
                <div className="flex items-center justify-center w-10 h-10 text-text-muted group-hover:text-accent bg-bg-main border border-border-color rounded-xl shadow-sm transition-all group-hover:shadow-md group-hover:scale-105">
                  <FileText size={18} />
                </div>
                {/* Popover Flotante de Archivos */}
                <div className="absolute left-full top-0 ml-4 w-[280px] hidden group-hover:flex flex-col bg-bg-card border border-border-color shadow-2xl rounded-2xl p-5 z-[100] cursor-default" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Archivos Rápido</h2>
                    <button onClick={() => setIsDocModalOpen(true)} className="text-text-muted hover:text-accent transition-colors bg-bg-main border border-border-color shadow-sm p-1.5 rounded-lg active:scale-95">
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {docs.map(doc => (
                      <button
                        key={doc.id}
                        onClick={() => setActiveDocId(doc.id)}
                        className={`w-full flex flex-col items-start gap-1 p-3 rounded-none border-r-[3px] border-y border-l text-left transition-all ${activeDocId === doc.id
                          ? 'bg-bg-main border-r-accent border-y-border-color border-l-border-color shadow-sm ring-1 ring-accent/10'
                          : 'bg-bg-deep border-r-transparent border-y-border-color border-l-border-color text-text-main hover:bg-border-color/20 shadow-sm'
                          }`}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <FileText size={15} className={activeDocId === doc.id ? 'text-accent' : 'text-text-muted'} />
                          <span className="truncate text-[12px] font-semibold flex-1">{doc.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="relative group cursor-pointer"
                onClick={() => setIsSidebarOpen(true)}
              >
                <div className="flex items-center justify-center w-10 h-10 text-text-muted group-hover:text-accent bg-bg-main border border-border-color rounded-xl shadow-sm transition-all group-hover:shadow-md group-hover:scale-105">
                  <Hash size={18} />
                </div>
                {/* Popover Flotante de Variables */}
                <div className="absolute left-full top-0 ml-4 w-[280px] hidden group-hover:flex flex-col bg-bg-card border border-border-color shadow-2xl rounded-2xl p-5 z-[100] cursor-default" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Variables</h2>
                    <button onClick={() => setIsVarModalOpen(true)} className="text-text-muted hover:text-accent transition-colors bg-bg-main border border-border-color shadow-sm p-1.5 rounded-lg active:scale-95">
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                    {Object.entries(variables).map(([key, val]) => (
                      <div key={key} className="bg-bg-deep p-3 rounded-none border-r-[4px] border-r-accent/50 border-y border-l border-border-color shadow-sm transition-all focus-within:ring-1 focus-within:ring-accent/50 focus-within:border-r-accent">
                        <p className="text-[11px] text-accent font-mono mb-1.5 font-bold flex items-center gap-1.5">
                          <Hash size={12} />
                          {"{{"}{key}{"}}"}
                        </p>
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => setVariables(prev => ({ ...prev, [key]: e.target.value }))}
                          className="bg-bg-main w-full text-[11px] text-text-main px-2.5 py-2 rounded-none border border-border-color outline-none font-mono focus:border-accent transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div id="main-editor-container" className="flex-1 flex flex-col bg-bg-main relative z-0">
          {/* Milkdown Editor Keyed by activeDocId to force re-render per doc */}
          <Editor key={activeDoc.id} content={activeDoc.content} onChange={handleUpdateContent} />
        </div>

        <div id="main-preview-container" className={`bg-bg-deep border-l border-border-color z-0 transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${(isPreviewOpen && !isZen) ? 'flex-1 flex flex-col opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}>
          <Preview content={activeDoc.content} variables={variables} />
        </div>
      </main>
    </div >
  )
}

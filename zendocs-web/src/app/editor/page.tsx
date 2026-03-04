"use client";

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  Download, FileText, Plus, Hash, X, Clock, Calendar,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  Printer, Trash2, Cloud, CloudOff, Loader2
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { UserButton } from "@clerk/nextjs"
import { SileoToast } from '@/components/SileoToast'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Editor } from '@/components/Editor'
import { Preview } from '@/components/Preview'
import { toast } from 'sonner'
import 'highlight.js/styles/github.css'
import { loadDocuments, saveDocument, deleteDocument } from '@/app/actions/documents'

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

  const [docs, setDocs] = useState<DocumentNode[]>([])
  const [variables, setVariables] = useState<Record<string, string>>({ proyecto: 'Mi_Nota', autor: 'User' })
  const [isDBReady, setIsDBReady] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [activeDocId, setActiveDocId] = useState<string>('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { theme } = useTheme()

  // Modal States
  const [isDocModalOpen, setIsDocModalOpen] = useState(false)
  const [newDocData, setNewDocData] = useState({ name: '', description: '' })
  const [isVarModalOpen, setIsVarModalOpen] = useState(false)
  const [newVarData, setNewVarData] = useState({ name: '', value: '' })

  const activeDoc = isDBReady ? (docs.find(d => d.id === activeDocId) || docs[0] || null) : null

  // Online/Offline detection
  useEffect(() => {
    const setOnline = () => setIsOnline(true)
    const setOffline = () => setIsOnline(false)
    setIsOnline(navigator.onLine)
    window.addEventListener('online', setOnline)
    window.addEventListener('offline', setOffline)
    return () => {
      window.removeEventListener('online', setOnline)
      window.removeEventListener('offline', setOffline)
    }
  }, [])

  // Load from Neon DB on mount
  useEffect(() => {
    const init = async () => {
      try {
        const rows = await loadDocuments()
        if (rows.length > 0) {
          const mapped: DocumentNode[] = rows.map(r => ({
            id: r.id,
            name: r.name,
            content: r.content ?? '',
            description: r.description ?? '',
            createdAt: r.createdAt instanceof Date ? r.createdAt.getTime() : Date.now(),
            updatedAt: r.updatedAt instanceof Date ? r.updatedAt.getTime() : Date.now(),
          }))
          setDocs(mapped)
          setActiveDocId(mapped[0].id)
        } else {
          // First time: create a welcome doc and persist it
          const welcome: DocumentNode = {
            id: Date.now().toString(),
            name: 'Bienvenido.md',
            content: "# Bienvenido\n> [!TIP]\n> Pulsa Alt + Z para el modo Zen.\n\nEscribe tu documentación aquí.",
            description: 'Documento inicial de bienvenida.',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
          await saveDocument(welcome)
          setDocs([welcome])
          setActiveDocId(welcome.id)
        }
        setIsDBReady(true)
      } catch (err) {
        console.error("Error loading from DB:", err)
        toast.error("Error al cargar documentos de la nube.")
        setIsDBReady(true)
      }
    }
    init()
  }, [])

  // Zen mode keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        setIsZen(prev => !prev)
      }
      if (e.key === 'Escape' && isZen) setIsZen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isZen])

  // Auto-save to Neon DB (debounced 1.5s)
  const persistDoc = useCallback(async (doc: DocumentNode) => {
    setStatus('saving')
    try {
      await saveDocument({
        id: doc.id,
        name: doc.name,
        content: doc.content,
        description: doc.description,
      })
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }, [])

  const handleUpdateContent = (newContent: string) => {
    setDocs(prev => prev.map(d =>
      d.id === activeDocId
        ? { ...d, content: newContent, updatedAt: Date.now() }
        : d
    ))
  }

  // Watch for content changes and debounce save
  useEffect(() => {
    if (!isDBReady || !activeDoc) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setStatus('saving')
    saveTimerRef.current = setTimeout(() => {
      persistDoc(activeDoc)
    }, 1500)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDoc?.content, activeDoc?.name])

  const handleCreateDocSubmit = async (e: React.FormEvent) => {
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
      updatedAt: Date.now(),
    }
    setDocs(prev => [...prev, newDoc])
    setActiveDocId(newDoc.id)
    setIsDocModalOpen(false)
    setNewDocData({ name: '', description: '' })
    await saveDocument(newDoc)
    toast.success('Documento creado', { description: finalName })
  }

  const handleDeleteDoc = async (id: string) => {
    const doc = docs.find(d => d.id === id)
    if (!doc) return
    setDocs(prev => prev.filter(d => d.id !== id))
    if (activeDocId === id) {
      const remaining = docs.filter(d => d.id !== id)
      setActiveDocId(remaining[0]?.id ?? '')
    }
    await deleteDocument(id)
    toast.success('Documento eliminado', { description: doc.name })
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
    toast.success('Documento exportado')
  }

  const handlePrint = () => window.print()

  const formatDate = (ts: number) =>
    new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(ts))

  if (!isDBReady) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-bg-deep gap-3">
        <Loader2 className="animate-spin text-accent" size={24} />
        <span className="font-mono text-text-muted text-xs">Conectando con la nube...</span>
      </div>
    )
  }

  if (!activeDoc) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-bg-deep gap-4">
        <FileText className="text-text-muted" size={32} />
        <p className="text-text-muted text-sm">No hay documentos. Crea uno nuevo.</p>
        <button
          onClick={() => setIsDocModalOpen(true)}
          className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium"
        >Nuevo Documento</button>
      </div>
    )
  }

  const statusIcon = () => {
    if (!isOnline) return <CloudOff size={12} className="text-amber-500" />
    if (status === 'saving') return <Loader2 size={12} className="animate-spin text-text-muted" />
    if (status === 'saved') return <Cloud size={12} className="text-emerald-500" />
    if (status === 'error') return <CloudOff size={12} className="text-red-500" />
    return null
  }

  return (
    <div className="h-screen flex flex-col font-sans">
      <SileoToast />

      {/* MODAL: Nuevo Documento */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm p-4" onClick={() => setIsDocModalOpen(false)}>
          <div className="bg-bg-main p-6 rounded-2xl border border-border-color shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-base font-semibold text-text-main">Nuevo documento</h2>
              <button onClick={() => setIsDocModalOpen(false)} className="text-text-muted hover:text-text-main transition-colors p-1 rounded-md hover:bg-border-color/50"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateDocSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Nombre del archivo</label>
                <input autoFocus type="text" value={newDocData.name}
                  onChange={e => setNewDocData({ ...newDocData, name: e.target.value })}
                  placeholder="ej. mi-proyecto.md"
                  className="bg-bg-deep text-sm text-text-main px-3 py-2.5 rounded-lg border border-border-color outline-none focus:border-accent transition-colors"
                  required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Descripción (opcional)</label>
                <textarea value={newDocData.description}
                  onChange={e => setNewDocData({ ...newDocData, description: e.target.value })}
                  placeholder="Un breve resumen..."
                  className="bg-bg-deep text-sm text-text-main px-3 py-2.5 rounded-lg border border-border-color outline-none focus:border-accent transition-colors resize-none h-20" />
              </div>
              <div className="flex justify-end gap-3 mt-1">
                <button type="button" onClick={() => setIsDocModalOpen(false)} className="px-4 py-2 text-sm text-text-muted hover:text-text-main transition-colors">Cancelar</button>
                <button type="submit" className="bg-accent text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nueva Variable */}
      {isVarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm p-4" onClick={() => setIsVarModalOpen(false)}>
          <div className="bg-bg-main p-6 rounded-2xl border border-border-color shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-base font-semibold text-text-main">Nueva variable</h2>
              <button onClick={() => setIsVarModalOpen(false)} className="text-text-muted hover:text-text-main transition-colors p-1 rounded-md hover:bg-border-color/50"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateVarSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Nombre</label>
                <input autoFocus type="text" value={newVarData.name}
                  onChange={e => setNewVarData({ ...newVarData, name: e.target.value })}
                  placeholder="ej. cliente_nombre"
                  className="bg-bg-deep text-sm text-text-main px-3 py-2.5 rounded-lg border border-border-color outline-none focus:border-accent font-mono transition-colors"
                  required />
                <p className="text-[10px] text-text-muted">Se usará como {'{{nombre}}'} en tu doc.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Valor (opcional)</label>
                <input type="text" value={newVarData.value}
                  onChange={e => setNewVarData({ ...newVarData, value: e.target.value })}
                  placeholder="Valor a inyectar..."
                  className="bg-bg-deep text-sm text-text-main px-3 py-2.5 rounded-lg border border-border-color outline-none focus:border-accent transition-colors" />
              </div>
              <div className="flex justify-end gap-3 mt-1">
                <button type="button" onClick={() => setIsVarModalOpen(false)} className="px-4 py-2 text-sm text-text-muted hover:text-text-main transition-colors">Cancelar</button>
                <button type="submit" className="bg-accent text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Añadir</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zen HUD */}
      <div className={`fixed bottom-5 right-5 text-xs text-text-muted font-mono transition-opacity ${isZen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        Modo Zen · Alt+Z para salir
      </div>

      {/* Header */}
      <header className={`h-12 border-b border-border-color flex justify-between items-center bg-bg-main px-4 shrink-0 transition-all duration-500 z-30 ${isZen ? 'h-0 border-none px-0 opacity-0 overflow-hidden' : ''}`}>
        <div className="flex items-center gap-2">
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 128 128" fill="none"><path d="M109.13 62.06L72.29 101.99C66.19 108.6 56 104.28 56 95.28V72H18.87C10.74 72 6.13 62.61 11.09 56.17L49.03 7.03C55.03 -0.77 67 -0.19 67 9.61V32H103.11C111.95 32 116.14 42.79 109.13 42.06V62.06Z" fill="#4285f4" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#4285f4" stroke="#4285f4" strokeWidth="2" strokeLinejoin="round" /></svg>
          )}
          <h1 className="text-sm font-semibold">
            <Link href="/" className="hover:opacity-70 transition-opacity">
              Zenit <span className={theme === 'dark' ? 'text-gray-500' : 'text-blue-600'}>Docs</span>
            </Link>
          </h1>
        </div>

        {/* Center meta */}
        <div className="hidden md:flex items-center gap-5 text-[10px] text-text-muted/60 font-mono absolute left-1/2 -translate-x-1/2">
          {!isOnline && (
            <span className="flex items-center gap-1 text-amber-500">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Offline
            </span>
          )}
          <span className="flex items-center gap-1.5"><Calendar size={11} />{formatDate(activeDoc.createdAt)}</span>
          <span className="flex items-center gap-1.5"><Clock size={11} />{formatDate(activeDoc.updatedAt)}</span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-mono mr-1">
            {statusIcon()}
            <span>{status === 'saved' ? 'Guardado' : status === 'saving' ? 'Guardando...' : status === 'error' ? 'Error' : ''}</span>
          </div>
          <ThemeToggle />
          <UserButton />
          <button onClick={handlePrint} className="bg-bg-card border border-border-color text-text-muted hover:text-text-main text-xs px-2.5 py-1.5 rounded-md font-medium flex gap-1 items-center transition-colors">
            <Printer size={13} />
          </button>
          <button onClick={handleDownload} className="bg-accent text-white text-xs px-3 py-1.5 rounded-md font-medium flex gap-1.5 items-center hover:opacity-90 transition-opacity">
            <Download size={13} />.MD
          </button>
          <div className="w-px h-5 bg-border-color mx-0.5" />
          <button onClick={() => setIsPreviewOpen(!isPreviewOpen)}
            className="p-1.5 text-text-muted hover:text-text-main hover:bg-border-color/50 rounded-md transition-all"
            title="Vista Previa">
            {isPreviewOpen ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* ─── SIDEBAR ────────────────────────────────────────────────────────── */}
        <aside className={`bg-bg-card flex flex-col border-r border-border-color shrink-0 transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] relative z-40 ${isSidebarOpen ? 'w-[260px]' : 'w-[52px]'}`}>

          {/* Sidebar Header */}
          <div className="h-12 flex items-center justify-between px-3 border-b border-border-color shrink-0">
            <span className={`text-[11px] font-semibold text-text-muted uppercase tracking-widest transition-all duration-200 overflow-hidden whitespace-nowrap ${isSidebarOpen ? 'opacity-100 w-auto ml-1' : 'opacity-0 w-0'}`}>
              Archivos
            </span>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-1.5 text-text-muted hover:text-text-main hover:bg-border-color/50 rounded-md transition-all ${!isSidebarOpen && 'mx-auto'}`}
            >
              {isSidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
            </button>
          </div>

          {/* Expanded sidebar */}
          <div className={`flex-1 flex flex-col overflow-hidden transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none absolute inset-0'}`}>

            {/* Files section */}
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex items-center justify-between px-3 pt-4 pb-2">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Documentos</span>
                <button
                  onClick={() => setIsDocModalOpen(true)}
                  className="text-text-muted hover:text-accent transition-colors p-1 rounded-md hover:bg-border-color/50 active:scale-95"
                  title="Nuevo documento"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-2">
                {docs.map(doc => (
                  <div key={doc.id} className="group relative">
                    <button
                      onClick={() => setActiveDocId(doc.id)}
                      className={`w-full text-left flex items-start gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 transition-all ${activeDocId === doc.id
                          ? 'bg-accent/10 text-accent'
                          : 'text-text-muted hover:bg-border-color/40 hover:text-text-main'
                        }`}
                    >
                      <FileText size={14} className={`mt-0.5 shrink-0 ${activeDocId === doc.id ? 'text-accent' : 'text-text-muted'}`} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium truncate leading-tight pr-5">{doc.name}</span>
                        {doc.description && (
                          <span className="text-[10px] text-text-muted/60 truncate leading-tight mt-0.5">{doc.description}</span>
                        )}
                      </div>
                    </button>
                    {/* Delete button - visible on hover */}
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-400/10 transition-all"
                      title="Eliminar documento"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-border-color mx-3 shrink-0" />

            {/* Variables section */}
            <div className="flex flex-col max-h-[40%] overflow-hidden">
              <div className="flex items-center justify-between px-3 pt-3 pb-2">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Variables</span>
                <button
                  onClick={() => setIsVarModalOpen(true)}
                  className="text-text-muted hover:text-accent transition-colors p-1 rounded-md hover:bg-border-color/50 active:scale-95"
                  title="Nueva variable"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="overflow-y-auto px-2 pb-4 space-y-1.5">
                {Object.entries(variables).map(([key, val]) => (
                  <div key={key} className="bg-bg-deep rounded-lg border border-border-color px-2.5 py-2 focus-within:border-accent/60 transition-colors">
                    <p className="text-[10px] text-accent font-mono font-semibold mb-1.5 flex items-center gap-1">
                      <Hash size={10} />{'{{' + key + '}}'}
                    </p>
                    <input
                      type="text"
                      value={val}
                      onChange={e => setVariables(prev => ({ ...prev, [key]: e.target.value }))}
                      className="bg-transparent w-full text-[11px] text-text-main outline-none font-mono placeholder:text-text-muted/40"
                      placeholder="valor..."
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Collapsed icon bar */}
          {!isSidebarOpen && (
            <div className="flex flex-col items-center gap-3 pt-3 px-2">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="flex items-center justify-center w-9 h-9 text-text-muted hover:text-accent bg-bg-main border border-border-color rounded-xl shadow-sm transition-all hover:shadow-md hover:scale-105"
                title="Documentos"
              >
                <FileText size={16} />
              </button>
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="flex items-center justify-center w-9 h-9 text-text-muted hover:text-accent bg-bg-main border border-border-color rounded-xl shadow-sm transition-all hover:shadow-md hover:scale-105"
                title="Variables"
              >
                <Hash size={16} />
              </button>
            </div>
          )}
        </aside>

        {/* Editor */}
        <div className="flex-1 flex flex-col bg-bg-main relative z-0">
          <Editor key={activeDoc.id} content={activeDoc.content} onChange={handleUpdateContent} />
        </div>

        {/* Preview */}
        <div className={`bg-bg-deep border-l border-border-color z-0 transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${(isPreviewOpen && !isZen) ? 'flex-1 flex flex-col opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}>
          <Preview content={activeDoc.content} variables={variables} />
        </div>
      </main>
    </div>
  )
}

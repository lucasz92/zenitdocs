"use client";

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  Download, FileText, Plus, Hash, X, Clock, Calendar,
  Printer, Trash2, Cloud, CloudOff, Loader2, Search, BookOpen,
  Menu, SplitSquareHorizontal, Eye, Edit3, FolderOpen, Folder,
  FolderPlus, FolderInput, ChevronRight, ChevronDown, MoreHorizontal, Pencil,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { UserButton } from "@clerk/nextjs"
import { SileoToast } from '@/components/SileoToast'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Editor } from '@/components/Editor'
import { Preview } from '@/components/Preview'
import { toast } from 'sonner'
import 'highlight.js/styles/github.css'
import {
  loadDocuments, saveDocument, updateDocument, deleteDocument,
  loadVaults, saveVault, deleteVault,
} from '@/app/actions/documents'

export type DocumentNode = {
  id: string; name: string; content: string;
  description?: string; vaultId?: string | null;
  createdAt: number; updatedAt: number;
}

export type VaultNode = {
  id: string; name: string; color: string; icon: string;
}

type ViewMode = 'editor' | 'preview' | 'split'

const VAULT_COLORS: { label: string; value: string; hex: string }[] = [
  { label: 'Azul', value: 'blue', hex: '#4285f4' },
  { label: 'Verde', value: 'green', hex: '#3fb950' },
  { label: 'Morado', value: 'purple', hex: '#a371f7' },
  { label: 'Naranja', value: 'orange', hex: '#f0883e' },
  { label: 'Rosa', value: 'pink', hex: '#e57eb3' },
  { label: 'Rojo', value: 'red', hex: '#f85149' },
]

const VAULT_ICONS = ['📁', '📂', '🗂️', '📚', '📝', '💡', '🔬', '🔧', '🎨', '🚀', '⭐', '🏠']

function vaultColor(color: string) {
  return VAULT_COLORS.find(c => c.value === color)?.hex ?? '#4285f4'
}

function getDocIcon(name: string) {
  const n = name.toLowerCase()
  if (n.includes('bienvenid') || n.includes('welcome')) return '👋'
  if (n.includes('readme') || n.includes('guide')) return '📖'
  if (n.includes('todo') || n.includes('task')) return '✅'
  if (n.includes('idea') || n.includes('brainstorm')) return '💡'
  if (n.includes('api') || n.includes('code')) return '⚙️'
  return '📄'
}

// ── Small modal component ─────────────────────────────────────────────

function Modal({ title, icon, onClose, children }: { title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border shadow-2xl fade-in-up"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg" style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}>
                <span style={{ color: 'var(--accent)', display: 'flex' }}>{icon}</span>
              </div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{title}</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
              <X size={15} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

function FormInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>{label}</label>
      <input {...props}
        className="text-sm px-3 py-2.5 rounded-lg border outline-none transition-colors"
        style={{ background: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
        onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// ── Main App ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Layout state ────────────────────────────────────────────────────
  const [isZen, setIsZen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('split')

  // ── Data state ──────────────────────────────────────────────────────
  const [docs, setDocs] = useState<DocumentNode[]>([])
  const [vaults, setVaults] = useState<VaultNode[]>([])
  const [variables, setVariables] = useState<Record<string, string>>({ proyecto: 'Mi_Nota', autor: 'User' })
  const [isDBReady, setIsDBReady] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [activeDocId, setActiveDocId] = useState<string>('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState<'files' | 'vars'>('files')
  const [expandedVaults, setExpandedVaults] = useState<Set<string>>(new Set(['__root__']))
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { resolvedTheme } = useTheme()

  // ── Modal state ──────────────────────────────────────────────────────
  const [docModal, setDocModal] = useState<{ open: boolean; vaultId?: string | null }>({ open: false })
  const [newDocData, setNewDocData] = useState({ name: '', description: '' })
  const [varModal, setVarModal] = useState(false)
  const [newVarData, setNewVarData] = useState({ name: '', value: '' })
  const [vaultModal, setVaultModal] = useState<{ open: boolean; editing?: VaultNode }>({ open: false })
  const [newVaultData, setNewVaultData] = useState({ name: '', color: 'blue', icon: '📁' })

  const activeDoc = isDBReady ? (docs.find(d => d.id === activeDocId) || docs[0] || null) : null
  const wordCount = activeDoc ? activeDoc.content.split(/\s+/).filter(Boolean).length : 0
  const charCount = activeDoc ? activeDoc.content.length : 0
  const filteredDocs = docs.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Mobile detection + viewport listener
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setIsSidebarOpen(false) // sidebar closed by default on mobile
        setViewMode('editor')   // no split on mobile
      }
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Online detection ─────────────────────────────────────────────────
  useEffect(() => {
    const on = () => setIsOnline(true); const off = () => setIsOnline(false)
    setIsOnline(navigator.onLine)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // ── Load data on mount ───────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const [docsResp, vaultsResp] = await Promise.all([loadDocuments(), loadVaults()])

        if (vaultsResp.success) {
          setVaults(vaultsResp.data.map(v => ({
            id: v.id, name: v.name,
            color: v.color ?? 'blue', icon: v.icon ?? '📁',
          })))
        }

        if (!docsResp.success) throw new Error(docsResp.error)
        const rows = docsResp.data
        if (rows.length > 0) {
          const mapped: DocumentNode[] = rows.map(r => ({
            id: r.id, name: r.name, content: r.content ?? '',
            description: r.description ?? '', vaultId: r.vaultId ?? null,
            createdAt: r.createdAt instanceof Date ? r.createdAt.getTime() : Date.now(),
            updatedAt: r.updatedAt instanceof Date ? r.updatedAt.getTime() : Date.now(),
          }))
          setDocs(mapped); setActiveDocId(mapped[0].id)
        } else {
          const welcome: DocumentNode = {
            id: Date.now().toString(), name: 'Bienvenido.md',
            content: `# 👋 Bienvenido a Zenit Docs\n\n> [!TIP]\n> Pulsa **Alt+Z** para el modo Zen. Las listas se continúan automáticamente con Enter.\n\n## Características\n\n- Editor Markdown con vista previa en tiempo real\n- Click derecho en el editor para más opciones\n- Bóvedas para organizar tus documentos\n\n## Ejemplo de diagrama\n\n\`\`\`mermaid\ngraph LR;\n    A[Zenit Docs] --> B[Editor];\n    A --> C[Bóvedas];\n    B --> D[Auto-guardado];\n    C --> E[Organización];\n\`\`\`\n\n| Feature | Estado |\n| ------- | ------ |\n| Markdown | ✅ |\n| Mermaid | ✅ |\n| Bóvedas | ✅ |\n`,
            description: 'Documento inicial.', vaultId: null,
            createdAt: Date.now(), updatedAt: Date.now(),
          }
          await saveDocument(welcome); setDocs([welcome]); setActiveDocId(welcome.id)
        }
        setIsDBReady(true)
      } catch (err: any) {
        toast.error("Error al cargar: " + (err.message ?? 'Error desconocido'))
        setIsDBReady(true)
      }
    }
    init()
  }, [])

  // ── Keyboard shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'z') { e.preventDefault(); setIsZen(p => !p) }
      if (e.key === 'Escape' && isZen) setIsZen(false)
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [isZen])

  // ── Auto-save ─────────────────────────────────────────────────────────
  const persistDoc = useCallback(async (doc: DocumentNode) => {
    setStatus('saving')
    try {
      const resp = await saveDocument({ id: doc.id, name: doc.name, content: doc.content, description: doc.description, vaultId: doc.vaultId })
      if (!resp.success) throw new Error(resp.error)
      setStatus('saved')
    } catch { setStatus('error') }
  }, [])

  const handleUpdateContent = (val: string) => {
    setDocs(prev => prev.map(d => d.id === activeDocId ? { ...d, content: val, updatedAt: Date.now() } : d))
  }

  useEffect(() => {
    if (!isDBReady || !activeDoc) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setStatus('saving')
    saveTimerRef.current = setTimeout(() => persistDoc(activeDoc), 1500)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDoc?.content, activeDoc?.name])

  // ── Document CRUD ─────────────────────────────────────────────────────
  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDocData.name.trim()) return
    const name = newDocData.name.trim()
    const finalName = name.endsWith('.md') ? name : `${name}.md`
    const doc: DocumentNode = {
      id: Date.now().toString(), name: finalName,
      content: `# ${finalName.replace('.md', '')}\n\nEscribe aquí...`,
      description: newDocData.description.trim(),
      vaultId: docModal.vaultId ?? null,
      createdAt: Date.now(), updatedAt: Date.now(),
    }
    setDocs(p => [...p, doc]); setActiveDocId(doc.id)
    setDocModal({ open: false }); setNewDocData({ name: '', description: '' })
    const resp = await saveDocument(doc)
    if (resp.success) toast.success('Documento creado', { description: finalName })
    else toast.error('Error al crear', { description: resp.error })
  }

  const handleDeleteDoc = async (id: string) => {
    const doc = docs.find(d => d.id === id); if (!doc) return
    setDocs(p => p.filter(d => d.id !== id))
    if (activeDocId === id) setActiveDocId(docs.filter(d => d.id !== id)[0]?.id ?? '')
    const resp = await deleteDocument(id)
    if (resp.success) toast.success('Eliminado', { description: doc.name })
    else toast.error('Error al eliminar')
  }

  // ── Vault CRUD ────────────────────────────────────────────────────────
  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newVaultData.name.trim()) return
    const vault: VaultNode = {
      id: Date.now().toString(), name: newVaultData.name.trim(),
      color: newVaultData.color, icon: newVaultData.icon,
    }
    setVaults(p => [...p, vault])
    setExpandedVaults(p => new Set([...p, vault.id]))
    setVaultModal({ open: false }); setNewVaultData({ name: '', color: 'blue', icon: '📁' })
    const resp = await saveVault(vault)
    if (resp.success) toast.success('Bóveda creada', { description: vault.name })
    else toast.error('Error al crear bóveda')
  }

  const handleDeleteVault = async (id: string) => {
    const vault = vaults.find(v => v.id === id); if (!vault) return
    setVaults(p => p.filter(v => v.id !== id))
    setDocs(p => p.map(d => d.vaultId === id ? { ...d, vaultId: null } : d))
    const resp = await deleteVault(id)
    if (resp.success) toast.success('Bóveda eliminada', { description: vault.name })
    else toast.error('Error al eliminar bóveda')
  }

  const handleMoveDocToVault = async (docId: string, vaultId: string | null) => {
    setDocs(p => p.map(d => d.id === docId ? { ...d, vaultId } : d))
    const doc = docs.find(d => d.id === docId); if (!doc) return
    await saveDocument({ id: doc.id, name: doc.name, content: doc.content, vaultId })
  }

  // ── Variable CRUD ─────────────────────────────────────────────────────
  const handleCreateVar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newVarData.name.trim()) return
    const key = newVarData.name.trim().replace(/\s+/g, '_')
    setVariables(p => ({ ...p, [key]: newVarData.value }))
    setVarModal(false); setNewVarData({ name: '', value: '' })
    toast.success('Variable añadida', { description: `{{${key}}}` })
  }

  // ── Misc ──────────────────────────────────────────────────────────────
  const handleDownload = () => {
    if (!activeDoc) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([activeDoc.content], { type: 'text/markdown' }))
    a.download = activeDoc.name; a.click()
    toast.success('Exportado')
  }
  const formatDate = (ts: number) =>
    new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(ts))

  const toggleVault = (id: string) => setExpandedVaults(p => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  // ── Move doc to another vault ────────────────────────────────────────
  const [docMenu, setDocMenu] = useState<{ docId: string; open: boolean } | null>(null)

  const handleMoveDoc = async (docId: string, targetVaultId: string | null) => {
    setDocMenu(null)
    const result = await updateDocument(docId, { vaultId: targetVaultId })
    if (result.success) {
      setDocs(prev => prev.map((d: DocumentNode) => d.id === docId ? { ...d, vaultId: targetVaultId } : d))
      toast.success(targetVaultId ? `Movido a bóveda` : 'Movido a raíz')
    } else {
      toast.error('Error al mover el documento')
    }
  }

  // ── Status Indicator ──────────────────────────────────────────────────
  const StatusBadge = () => {
    if (!isOnline) return <span className="flex items-center gap-1.5 text-amber-500 text-[10px] font-mono"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Offline</span>
    if (status === 'saving') return <span className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}><Loader2 size={10} className="animate-spin" /> Guardando</span>
    if (status === 'saved') return <span className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-mono"><Cloud size={10} /> Guardado</span>
    if (status === 'error') return <span className="flex items-center gap-1.5 text-red-400 text-[10px] font-mono"><CloudOff size={10} /> Error</span>
    return null
  }

  // ── Loading ───────────────────────────────────────────────────────────
  if (!isDBReady) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg-deep)' }}>
      <Loader2 className="animate-spin pulse-glow" size={28} style={{ color: 'var(--accent)' }} />
      <span className="font-mono text-xs" style={{ color: 'var(--text-faint)' }}>Sincronizando...</span>
    </div>
  )

  if (!activeDoc) return (
    <div className="h-screen flex flex-col items-center justify-center gap-5" style={{ background: 'var(--bg-deep)' }}>
      <FileText style={{ color: 'var(--text-muted)' }} size={32} />
      <button onClick={() => setDocModal({ open: true })}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90"
        style={{ background: 'var(--accent)' }}>
        <Plus size={15} /> Nuevo Documento
      </button>
    </div>
  )

  // ── Sidebar: docs grouped by vault ────────────────────────────────────
  const rootDocs = filteredDocs.filter(d => !d.vaultId)
  const vaultDocs = (vaultId: string) => filteredDocs.filter(d => d.vaultId === vaultId)

  function DocItem({ doc }: { doc: DocumentNode }) {
    const isActive = activeDocId === doc.id
    const menuOpen = docMenu?.docId === doc.id && docMenu.open
    return (
      <div className="group relative">
        <button onClick={() => setActiveDocId(doc.id)}
          className={`w-full text-left flex items-start gap-2 px-2.5 py-1.5 rounded-lg transition-all ${isActive ? 'doc-tab-active' : ''}`}
          style={{ background: isActive ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent', color: isActive ? 'var(--text-main)' : 'var(--text-muted)' }}
          onMouseOver={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseOut={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
          <span className="text-sm mt-0.5 shrink-0">{getDocIcon(doc.name)}</span>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[12px] font-medium truncate leading-tight" style={{ paddingRight: 36, color: isActive ? 'var(--text-main)' : '' }}>
              {doc.name.replace('.md', '')}
            </span>
            {doc.description && <span className="text-[10px] truncate leading-tight mt-0.5" style={{ color: 'var(--text-faint)' }}>{doc.description}</span>}
          </div>
        </button>

        {/* Action buttons (hover) */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
          {/* Move to vault button */}
          <button
            onClick={e => { e.stopPropagation(); setDocMenu({ docId: doc.id, open: !menuOpen }) }}
            className="p-1 rounded-md"
            title="Mover a..."
            style={{ color: 'var(--text-faint)' }}
            onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)' }}>
            <FolderInput size={11} />
          </button>
          {/* Delete button */}
          <button onClick={() => handleDeleteDoc(doc.id)}
            className="p-1 rounded-md"
            style={{ color: 'var(--text-faint)' }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(248,81,73,0.15)'; e.currentTarget.style.color = '#f85149' }}
            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)' }}>
            <Trash2 size={11} />
          </button>
        </div>

        {/* Move dropdown */}
        {menuOpen && (
          <div
            className="absolute right-1 top-full mt-1 rounded-lg border shadow-xl z-50 py-1 min-w-[160px]"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            onMouseLeave={() => setDocMenu(null)}>
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Mover a...</div>
            {/* Root */}
            <button
              onClick={() => handleMoveDoc(doc.id, null)}
              disabled={!doc.vaultId}
              className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-[12px] transition-colors disabled:opacity-40"
              style={{ color: 'var(--text-muted)' }}
              onMouseOver={e => { if (doc.vaultId) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}>
              <span>📂</span> Raíz
            </button>
            {/* Vault options */}
            {vaults.map(v => (
              <button key={v.id}
                onClick={() => handleMoveDoc(doc.id, v.id)}
                disabled={doc.vaultId === v.id}
                className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-[12px] transition-colors disabled:opacity-40"
                style={{ color: 'var(--text-muted)' }}
                onMouseOver={e => { if (doc.vaultId !== v.id) e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}>
                <span>{v.icon}</span> {v.name}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col font-sans overflow-hidden select-none">
      <SileoToast />

      {/* ── MODAL: Nuevo Documento ─────────────────────────────── */}
      {docModal.open && (
        <Modal title="Nuevo documento" icon={<FileText size={14} />} onClose={() => setDocModal({ open: false })}>
          <form onSubmit={handleCreateDoc} className="flex flex-col gap-4">
            <FormInput label="Nombre del archivo" autoFocus type="text" value={newDocData.name}
              onChange={e => setNewDocData(p => ({ ...p, name: e.target.value }))}
              placeholder="ej. mi-proyecto.md" required />
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Descripción (opcional)</label>
              <textarea value={newDocData.description} onChange={e => setNewDocData(p => ({ ...p, description: e.target.value }))}
                placeholder="Un breve resumen..."
                className="text-sm px-3 py-2.5 rounded-lg border outline-none resize-none h-16 transition-colors"
                style={{ background: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-color)')} />
            </div>
            {vaults.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Bóveda</label>
                <select value={docModal.vaultId ?? ''} onChange={e => setDocModal(p => ({ ...p, vaultId: e.target.value || null }))}
                  className="text-sm px-3 py-2.5 rounded-lg border outline-none"
                  style={{ background: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}>
                  <option value="">Sin bóveda (raíz)</option>
                  {vaults.map(v => <option key={v.id} value={v.id}>{v.icon} {v.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-1">
              <button type="button" onClick={() => setDocModal({ open: false })} className="px-4 py-2 text-xs font-semibold rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>Cancelar</button>
              <button type="submit" className="px-5 py-2 text-xs font-semibold rounded-lg text-white hover:opacity-85" style={{ background: 'var(--accent)' }}>Crear</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: Nueva Variable ──────────────────────────────── */}
      {varModal && (
        <Modal title="Nueva variable" icon={<Hash size={14} />} onClose={() => setVarModal(false)}>
          <form onSubmit={handleCreateVar} className="flex flex-col gap-4">
            <FormInput label="Nombre" autoFocus type="text" value={newVarData.name}
              onChange={e => setNewVarData(p => ({ ...p, name: e.target.value }))}
              placeholder="ej. cliente_nombre" required />
            <p className="text-[10px] -mt-2" style={{ color: 'var(--text-faint)' }}>Se usa como {`{{nombre}}`}</p>
            <FormInput label="Valor inicial (opcional)" type="text" value={newVarData.value}
              onChange={e => setNewVarData(p => ({ ...p, value: e.target.value }))}
              placeholder="valor..." />
            <div className="flex justify-end gap-2 mt-1">
              <button type="button" onClick={() => setVarModal(false)} className="px-4 py-2 text-xs font-semibold rounded-lg" style={{ color: 'var(--text-muted)' }}>Cancelar</button>
              <button type="submit" className="px-5 py-2 text-xs font-semibold rounded-lg text-white hover:opacity-85" style={{ background: 'var(--accent)' }}>Añadir</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: Nueva Bóveda ────────────────────────────────── */}
      {vaultModal.open && (
        <Modal title={vaultModal.editing ? 'Editar bóveda' : 'Nueva bóveda'} icon={<FolderPlus size={14} />} onClose={() => setVaultModal({ open: false })}>
          <form onSubmit={handleCreateVault} className="flex flex-col gap-4">
            <FormInput label="Nombre de la bóveda" autoFocus type="text" value={newVaultData.name}
              onChange={e => setNewVaultData(p => ({ ...p, name: e.target.value }))}
              placeholder="ej. Trabajo, Personal..." required />
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Icono</label>
              <div className="flex flex-wrap gap-1.5">
                {VAULT_ICONS.map(icon => (
                  <button key={icon} type="button" onClick={() => setNewVaultData(p => ({ ...p, icon }))}
                    className="w-8 h-8 text-base rounded-lg transition-all flex items-center justify-center"
                    style={{ background: newVaultData.icon === icon ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--bg-hover)', outline: newVaultData.icon === icon ? '2px solid var(--accent)' : 'none' }}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Color</label>
              <div className="flex gap-2">
                {VAULT_COLORS.map(c => (
                  <button key={c.value} type="button" onClick={() => setNewVaultData(p => ({ ...p, color: c.value }))}
                    className="w-6 h-6 rounded-full transition-all"
                    style={{ background: c.hex, outline: newVaultData.color === c.value ? `3px solid ${c.hex}` : 'none', outlineOffset: 2 }}
                    title={c.label} />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-1">
              <button type="button" onClick={() => setVaultModal({ open: false })} className="px-4 py-2 text-xs font-semibold rounded-lg" style={{ color: 'var(--text-muted)' }}>Cancelar</button>
              <button type="submit" className="px-5 py-2 text-xs font-semibold rounded-lg text-white hover:opacity-85" style={{ background: 'var(--accent)' }}>Crear bóveda</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── ZEN HUD ──────────────────────────────────────────────── */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-mono px-3 py-1.5 rounded-full border transition-all duration-300 z-50 ${isZen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-faint)' }}>
        Modo Zen · Alt+Z para salir
      </div>

      {/* ── HEADER ───────────────────────────────────────────────── */}
      <header className={`h-11 flex justify-between items-center px-3 shrink-0 border-b z-30 transition-all duration-500 ${isZen ? 'h-0 border-none opacity-0 overflow-hidden' : ''}`}
        style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
        {/* Logo + toggle */}
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => setIsSidebarOpen(p => !p)} className="p-1.5 rounded-md transition-colors shrink-0"
            style={{ color: 'var(--text-muted)' }}
            onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
            <Menu size={15} />
          </button>
          <Link href="/" className="flex items-center gap-1.5 shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="var(--accent)" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" /></svg>
            <span className="text-[13px] font-semibold tracking-tight" style={{ color: 'var(--text-main)' }}>Zenit <span style={{ color: 'var(--accent)' }}>Docs</span></span>
          </Link>
          <span className="text-xs mx-1 select-none" style={{ color: 'var(--border-color)' }}>/</span>
          <span className="text-xs truncate max-w-[180px]" style={{ color: 'var(--text-muted)' }}>{activeDoc.name}</span>
        </div>

        {/* View mode — hide split on mobile */}
        <div className={`hidden md:flex items-center gap-0.5 p-0.5 rounded-lg border`}
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          {([
            { mode: 'editor' as ViewMode, icon: <Edit3 size={12} />, label: 'Editor' },
            ...(!isMobile ? [{ mode: 'split' as ViewMode, icon: <SplitSquareHorizontal size={12} />, label: 'Split' }] : []),
            { mode: 'preview' as ViewMode, icon: <Eye size={12} />, label: 'Preview' },
          ]).map(({ mode, icon, label }) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all"
              style={{ background: viewMode === mode ? 'var(--bg-hover)' : 'transparent', color: viewMode === mode ? 'var(--text-main)' : 'var(--text-faint)' }}>
              {icon}<span className="hidden lg:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <StatusBadge />
          <div className="w-px h-4 mx-1" style={{ background: 'var(--border-color)' }} />
          <ThemeToggle /><UserButton />
          <div className="w-px h-4 mx-1" style={{ background: 'var(--border-color)' }} />
          <button onClick={() => window.print()} className="p-1.5 rounded-md transition-colors" style={{ color: 'var(--text-muted)' }}
            onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseOut={e => (e.currentTarget.style.background = 'transparent')} title="Imprimir">
            <Printer size={14} />
          </button>
          <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold text-white hover:opacity-85"
            style={{ background: 'var(--accent)' }}>
            <Download size={12} /> .MD
          </button>
        </div>
      </header>

      {/* ── MAIN ─────────────────────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden" style={{ background: 'var(--bg-deep)' }}>

        {/* ── SIDEBAR BACKDROP (mobile) ───────────────────────── */}
        {isMobile && isSidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />
        )}

        {/* ── SIDEBAR ─────────────────────────────────────────────── */}
        <aside
          className={`flex flex-col border-r shrink-0 transition-all duration-300 z-20 ${isMobile ? 'sidebar-mobile-drawer' : ''} ${isZen ? 'w-0 border-none overflow-hidden' : isSidebarOpen ? 'w-[248px]' : 'w-0 overflow-hidden border-none'}`}
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', transform: isMobile && !isSidebarOpen ? 'translateX(-100%)' : 'translateX(0)' }}>
          <div className="flex flex-col h-full min-w-[248px]">

            {/* Section tabs */}
            <div className="flex items-center gap-1 px-2 py-2 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
              {([
                { id: 'files' as const, icon: <BookOpen size={12} />, label: 'Archivos' },
                { id: 'vars' as const, icon: <Hash size={12} />, label: 'Variables' },
              ]).map(tab => (
                <button key={tab.id} onClick={() => setActiveSection(tab.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-medium transition-colors"
                  style={{ background: activeSection === tab.id ? 'var(--bg-hover)' : 'transparent', color: activeSection === tab.id ? 'var(--text-main)' : 'var(--text-faint)' }}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            {/* ── FILES SECTION ──────────────────────────────────── */}
            {activeSection === 'files' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Search */}
                <div className="px-2 pt-2 pb-1 shrink-0">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border" style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
                    <Search size={11} style={{ color: 'var(--text-faint)' }} />
                    <input type="text" placeholder="Buscar..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      className="bg-transparent text-[11px] outline-none flex-1" style={{ color: 'var(--text-main)' }} />
                    {searchQuery && <button onClick={() => setSearchQuery('')} style={{ color: 'var(--text-faint)' }}><X size={10} /></button>}
                  </div>
                </div>

                {/* New vault button */}
                <div className="flex items-center justify-between px-2 py-1 shrink-0">
                  <span className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-faint)' }}>
                    {filteredDocs.length} doc{filteredDocs.length !== 1 ? 's' : ''}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => setVaultModal({ open: true })} title="Nueva bóveda"
                      className="p-1 rounded-md transition-colors" style={{ color: 'var(--text-faint)' }}
                      onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--accent)' }}
                      onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)' }}>
                      <FolderPlus size={13} />
                    </button>
                    <button onClick={() => setDocModal({ open: true })} title="Nuevo documento"
                      className="p-1 rounded-md transition-colors" style={{ color: 'var(--text-faint)' }}
                      onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--accent)' }}
                      onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)' }}>
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                {/* Tree */}
                <div className="flex-1 overflow-y-auto px-1.5 pb-2 space-y-0.5">

                  {/* VAULTS */}
                  {vaults.map(vault => {
                    const isOpen = expandedVaults.has(vault.id)
                    const children = vaultDocs(vault.id)
                    const color = vaultColor(vault.color)
                    return (
                      <div key={vault.id}>
                        {/* Vault header */}
                        <div className="group flex items-center gap-1 px-1.5 py-1 rounded-lg transition-all cursor-pointer"
                          onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                          onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                          <button onClick={() => toggleVault(vault.id)} className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span className="transition-transform duration-150" style={{ color: 'var(--text-faint)', display: 'flex' }}>
                              {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                            </span>
                            <span className="text-sm">{vault.icon}</span>
                            <span className="text-[11px] font-semibold truncate" style={{ color }}>{vault.name}</span>
                            <span className="text-[9px] rounded-full px-1.5 py-0.5 font-bold ml-1 shrink-0"
                              style={{ background: `${color}18`, color }}>
                              {children.length}
                            </span>
                          </button>
                          {/* Vault actions */}
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button title="Nuevo doc en bóveda" onClick={() => setDocModal({ open: true, vaultId: vault.id })}
                              className="p-0.5 rounded" style={{ color: 'var(--text-faint)' }}
                              onMouseOver={e => { e.currentTarget.style.color = 'var(--accent)' }}
                              onMouseOut={e => { e.currentTarget.style.color = 'var(--text-faint)' }}>
                              <Plus size={11} />
                            </button>
                            <button title="Eliminar bóveda" onClick={() => handleDeleteVault(vault.id)}
                              className="p-0.5 rounded" style={{ color: 'var(--text-faint)' }}
                              onMouseOver={e => { e.currentTarget.style.color = '#f85149' }}
                              onMouseOut={e => { e.currentTarget.style.color = 'var(--text-faint)' }}>
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>

                        {/* Vault docs */}
                        {isOpen && (
                          <div className="ml-4 border-l pl-1 mt-0.5 space-y-0.5" style={{ borderColor: `${color}40` }}>
                            {children.length === 0 ? (
                              <button onClick={() => setDocModal({ open: true, vaultId: vault.id })}
                                className="w-full text-left px-2.5 py-1.5 text-[11px] rounded-lg transition-colors"
                                style={{ color: 'var(--text-faint)' }}
                                onMouseOver={e => (e.currentTarget.style.color = 'var(--accent)')}
                                onMouseOut={e => (e.currentTarget.style.color = 'var(--text-faint)')}>
                                + Nuevo documento
                              </button>
                            ) : (
                              children.map(doc => <DocItem key={doc.id} doc={doc} />)
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* ROOT docs (no vault) */}
                  {(vaults.length > 0 || rootDocs.length > 0) && (
                    <div>
                      {vaults.length > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-1">
                          <span className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-faint)' }}>Raíz</span>
                          <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
                        </div>
                      )}
                      {rootDocs.map(doc => <DocItem key={doc.id} doc={doc} />)}
                    </div>
                  )}

                  {filteredDocs.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>{searchQuery ? 'Sin resultados' : 'Sin documentos'}</p>
                    </div>
                  )}
                </div>

                <div className="px-2 py-2 border-t shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                  <button onClick={() => setDocModal({ open: true })}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold border border-dashed transition-colors"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-faint)' }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-faint)' }}>
                    <Plus size={12} /> Nuevo documento
                  </button>
                </div>
              </div>
            )}

            {/* ── VARIABLES SECTION ──────────────────────────────── */}
            {activeSection === 'vars' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex items-center justify-between px-2 py-2 shrink-0">
                  <span className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-faint)' }}>{Object.keys(variables).length} var{Object.keys(variables).length !== 1 ? 's' : ''}</span>
                  <button onClick={() => setVarModal(true)} className="p-1 rounded-md transition-colors" style={{ color: 'var(--text-faint)' }}
                    onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--accent)' }}
                    onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)' }}>
                    <Plus size={13} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                  {Object.entries(variables).map(([key, val]) => (
                    <div key={key} className="rounded-lg border p-2.5" style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
                      <p className="text-[10px] font-bold font-mono mb-1.5 flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                        <Hash size={9} />{`{{${key}}}`}
                      </p>
                      <input type="text" value={val} onChange={e => setVariables(p => ({ ...p, [key]: e.target.value }))}
                        className="bg-transparent w-full text-[11px] outline-none font-mono" style={{ color: 'var(--text-main)' }} placeholder="valor..." />
                    </div>
                  ))}
                </div>
                <div className="px-2 py-2 border-t shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                  <button onClick={() => setVarModal(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold border border-dashed transition-colors"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-faint)' }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-faint)' }}>
                    <Plus size={12} /> Nueva variable
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── CONTENT ──────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Doc title bar */}
          <div className={`flex items-center justify-between px-4 h-9 border-b shrink-0 ${isZen ? 'h-0 border-none opacity-0 overflow-hidden' : ''}`}
            style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm">{getDocIcon(activeDoc.name)}</span>
              <span className="text-[12px] font-semibold truncate" style={{ color: 'var(--text-muted)' }}>{activeDoc.name}</span>
              {activeDoc.vaultId && (() => {
                const v = vaults.find(v => v.id === activeDoc.vaultId)
                return v ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${vaultColor(v.color)}18`, color: vaultColor(v.color) }}>{v.icon} {v.name}</span> : null
              })()}
            </div>
            <div className="hidden md:flex items-center gap-4 text-[10px] font-mono shrink-0" style={{ color: 'var(--text-faint)' }}>
              <span className="flex items-center gap-1.5"><Calendar size={10} />{formatDate(activeDoc.updatedAt)}</span>
              <span>{wordCount} palabras · {charCount} chars</span>
            </div>
          </div>

          {/* Editor + Preview */}
          <div className="flex-1 flex overflow-hidden">
            <div className={`flex flex-col overflow-hidden transition-all duration-300 ${viewMode === 'preview' ? 'w-0 opacity-0' : 'flex-1'}`}
              style={{ background: 'var(--bg-main)' }}>
              <Editor key={activeDoc.id} content={activeDoc.content} onChange={handleUpdateContent} />
            </div>

            {viewMode === 'split' && <div className="w-px shrink-0" style={{ background: 'var(--border-color)' }} />}

            <div className={`flex flex-col overflow-hidden transition-all duration-300 ${viewMode === 'editor' ? 'w-0 opacity-0' : 'flex-1'}`}
              style={{ background: 'var(--bg-deep)' }}>
              <div className="h-8 flex items-center px-4 border-b shrink-0"
                style={{ borderColor: 'var(--border-color)', background: 'var(--bg-main)' }}>
                <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-faint)' }}>
                  <Eye size={10} /> Vista previa
                </span>
              </div>
              <Preview content={activeDoc.content} variables={variables} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

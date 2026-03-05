"use client";
import {
    Bold, Italic, Heading1, Heading2, Heading3, Link2, List,
    ListOrdered, Quote, Code, Terminal, Highlighter, Strikethrough,
    Image, ListTodo, Table, Minus, ChevronDown, Copy, Scissors,
    ClipboardPaste, Hash, GitBranch, AlertCircle, Zap, CheckSquare,
} from 'lucide-react'
import { useRef, useState, useCallback, useEffect } from 'react'

// ── Toolbar helpers ───────────────────────────────────────────────────

function ToolbarBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            title={title}
            className="p-1.5 rounded-md transition-all duration-100"
            style={{ color: 'var(--text-faint)' }}
            onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-main)' }}
            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)' }}
        >
            {children}
        </button>
    )
}

function Sep() {
    return <div className="w-px h-4 mx-0.5 shrink-0" style={{ background: 'var(--border-color)' }} />
}

function AlertChip({ onClick, label, color }: { onClick: () => void; label: string; color: string }) {
    return (
        <button onClick={onClick} className="text-[9px] font-bold px-2 py-0.5 rounded-md transition-all"
            style={{ color, background: `${color}1a` }}
            onMouseOver={e => { e.currentTarget.style.background = `${color}33` }}
            onMouseOut={e => { e.currentTarget.style.background = `${color}1a` }}
        >{label}</button>
    )
}

// ── Context menu types ────────────────────────────────────────────────

type CtxMenuPos = { x: number; y: number } | null

// ── Editor component ──────────────────────────────────────────────────

export function Editor({ content, onChange }: { content: string; onChange: (v: string) => void }) {
    const taRef = useRef<HTMLTextAreaElement>(null)
    const ctxRef = useRef<HTMLDivElement>(null)
    const [showAlerts, setShowAlerts] = useState(false)
    const [ctxMenu, setCtxMenu] = useState<CtxMenuPos>(null)

    // ── Core insert helpers ─────────────────────────────────────────────

    const insertWrap = useCallback((before: string, after = '') => {
        const ta = taRef.current; if (!ta) return
        const s = ta.selectionStart, e = ta.selectionEnd
        const sel = ta.value.substring(s, e)
        const next = ta.value.substring(0, s) + before + sel + after + ta.value.substring(e)
        onChange(next)
        setTimeout(() => { ta.focus(); ta.setSelectionRange(s + before.length, e + before.length) }, 0)
    }, [onChange])

    const insertLine = useCallback((prefix: string) => {
        const ta = taRef.current; if (!ta) return
        const s = ta.selectionStart
        const ls = ta.value.lastIndexOf('\n', s - 1) + 1
        const next = ta.value.substring(0, ls) + prefix + ta.value.substring(ls)
        onChange(next)
        setTimeout(() => { ta.focus(); const p = ls + prefix.length + (s - ls); ta.setSelectionRange(p, p) }, 0)
    }, [onChange])

    const getSelected = () => { const ta = taRef.current; return ta ? ta.value.substring(ta.selectionStart, ta.selectionEnd) : '' }

    // ── Smart keyboard shortcuts ────────────────────────────────────────

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const ta = taRef.current; if (!ta) return
        const ctrl = e.ctrlKey || e.metaKey
        const pos = ta.selectionStart
        const text = ta.value
        const lineStart = text.lastIndexOf('\n', pos - 1) + 1
        const currentLine = text.substring(lineStart, pos)

        // ── Format shortcuts ──────────────────────────────────────────────
        if (ctrl && !e.shiftKey && e.key === 'b') { e.preventDefault(); insertWrap('**', '**'); return }
        if (ctrl && !e.shiftKey && e.key === 'i') { e.preventDefault(); insertWrap('*', '*'); return }
        if (ctrl && !e.shiftKey && e.key === 'k') { e.preventDefault(); insertWrap('[', '](https://)'); return }
        if (ctrl && e.shiftKey && e.key.toLowerCase() === 'k') { e.preventDefault(); insertWrap('`', '`'); return }

        // ── Tab / Shift+Tab ───────────────────────────────────────────────
        if (e.key === 'Tab') {
            e.preventDefault()
            if (e.shiftKey) {
                // Unindent
                if (currentLine.startsWith('  ')) {
                    const next = text.substring(0, lineStart) + text.substring(lineStart + 2)
                    onChange(next)
                    setTimeout(() => { ta.focus(); ta.setSelectionRange(Math.max(lineStart, pos - 2), Math.max(lineStart, pos - 2)) }, 0)
                }
            } else {
                insertWrap('  ')
            }
            return
        }

        // ── Escape: close menus ───────────────────────────────────────────
        if (e.key === 'Escape') { setShowAlerts(false); setCtxMenu(null); return }

        // ── Smart Enter: list & quote continuation ────────────────────────
        if (e.key === 'Enter' && !e.shiftKey && !ctrl) {
            // Task list: - [ ] or - [x]
            const taskM = currentLine.match(/^(\s*)([-*+]) \[[ xX]\] (.*)/)
            if (taskM) {
                e.preventDefault()
                const [, indent, marker, afterContent] = taskM
                if (!afterContent.trim()) {
                    // Empty task → exit list
                    const next = text.substring(0, lineStart) + '\n' + text.substring(pos)
                    onChange(next)
                    setTimeout(() => { ta.focus(); ta.setSelectionRange(lineStart + 1, lineStart + 1) }, 0)
                } else {
                    const cont = `\n${indent}${marker} [ ] `
                    const next = text.substring(0, pos) + cont + text.substring(pos)
                    onChange(next)
                    setTimeout(() => { ta.focus(); ta.setSelectionRange(pos + cont.length, pos + cont.length) }, 0)
                }
                return
            }

            // Ordered list: 1. 2. etc.
            const ordM = currentLine.match(/^(\s*)(\d+)\. (.*)/)
            if (ordM) {
                e.preventDefault()
                const [, indent, numStr, afterContent] = ordM
                if (!afterContent.trim()) {
                    const next = text.substring(0, lineStart) + '\n' + text.substring(pos)
                    onChange(next)
                    setTimeout(() => { ta.focus(); ta.setSelectionRange(lineStart + 1, lineStart + 1) }, 0)
                } else {
                    const cont = `\n${indent}${parseInt(numStr) + 1}. `
                    const next = text.substring(0, pos) + cont + text.substring(pos)
                    onChange(next)
                    setTimeout(() => { ta.focus(); ta.setSelectionRange(pos + cont.length, pos + cont.length) }, 0)
                }
                return
            }

            // Unordered list: - * +
            const ulM = currentLine.match(/^(\s*)([-*+]) (.*)/)
            if (ulM) {
                e.preventDefault()
                const [, indent, marker, afterContent] = ulM
                if (!afterContent.trim()) {
                    const next = text.substring(0, lineStart) + '\n' + text.substring(pos)
                    onChange(next)
                    setTimeout(() => { ta.focus(); ta.setSelectionRange(lineStart + 1, lineStart + 1) }, 0)
                } else {
                    const cont = `\n${indent}${marker} `
                    const next = text.substring(0, pos) + cont + text.substring(pos)
                    onChange(next)
                    setTimeout(() => { ta.focus(); ta.setSelectionRange(pos + cont.length, pos + cont.length) }, 0)
                }
                return
            }

            // Blockquote: >
            const bqM = currentLine.match(/^(\s*)> (.*)/)
            if (bqM) {
                e.preventDefault()
                const [, indent, afterContent] = bqM
                if (!afterContent.trim()) {
                    const next = text.substring(0, lineStart) + '\n' + text.substring(pos)
                    onChange(next)
                    setTimeout(() => { ta.focus(); ta.setSelectionRange(lineStart + 1, lineStart + 1) }, 0)
                } else {
                    const cont = `\n${indent}> `
                    const next = text.substring(0, pos) + cont + text.substring(pos)
                    onChange(next)
                    setTimeout(() => { ta.focus(); ta.setSelectionRange(pos + cont.length, pos + cont.length) }, 0)
                }
                return
            }
        }
    }

    // ── Right-click context menu ─────────────────────────────────────────

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault()
        setShowAlerts(false)
        setCtxMenu({ x: e.clientX, y: e.clientY })
    }

    useEffect(() => {
        if (!ctxMenu) return
        const close = (e: MouseEvent) => {
            if (!ctxRef.current?.contains(e.target as Node)) setCtxMenu(null)
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [ctxMenu])

    const runCtx = (fn: () => void) => { setCtxMenu(null); setTimeout(() => { taRef.current?.focus(); fn() }, 10) }

    type CMenuItem = { type: 'item' | 'sep' | 'lbl'; icon?: React.ReactNode; label?: string; kbd?: string; action?: () => void }

    const ctxItems: CMenuItem[] = [
        { type: 'lbl', label: 'Portapapeles' },
        { type: 'item', icon: <Copy size={13} />, label: 'Copiar', kbd: 'Ctrl+C', action: () => { const t = getSelected(); if (t) navigator.clipboard.writeText(t) } },
        {
            type: 'item', icon: <Scissors size={13} />, label: 'Cortar', kbd: 'Ctrl+X', action: () => {
                const ta = taRef.current; if (!ta) return
                const s = ta.selectionStart, e = ta.selectionEnd
                navigator.clipboard.writeText(ta.value.substring(s, e))
                onChange(ta.value.substring(0, s) + ta.value.substring(e))
            }
        },
        {
            type: 'item', icon: <ClipboardPaste size={13} />, label: 'Pegar', kbd: 'Ctrl+V', action: async () => {
                const txt = await navigator.clipboard.readText(); insertWrap(txt)
            }
        },
        { type: 'sep' },
        { type: 'lbl', label: 'Formato' },
        { type: 'item', icon: <Bold size={13} />, label: 'Negrita', kbd: 'Ctrl+B', action: () => insertWrap('**', '**') },
        { type: 'item', icon: <Italic size={13} />, label: 'Cursiva', kbd: 'Ctrl+I', action: () => insertWrap('*', '*') },
        { type: 'item', icon: <Strikethrough size={13} />, label: 'Tachado', action: () => insertWrap('~~', '~~') },
        { type: 'item', icon: <Highlighter size={13} />, label: 'Resaltar', action: () => insertWrap('==', '==') },
        { type: 'item', icon: <Link2 size={13} />, label: 'Enlace', kbd: 'Ctrl+K', action: () => insertWrap('[', '](https://)') },
        { type: 'sep' },
        { type: 'lbl', label: 'Insertar' },
        { type: 'item', icon: <Code size={13} />, label: 'Bloque de código', action: () => insertWrap('\n```\n', '\n```\n') },
        { type: 'item', icon: <Quote size={13} />, label: 'Cita', action: () => insertLine('> ') },
        { type: 'item', icon: <CheckSquare size={13} />, label: 'Lista de tareas', action: () => insertLine('- [ ] ') },
        { type: 'item', icon: <Table size={13} />, label: 'Tabla', action: () => insertWrap('\n| Col 1 | Col 2 | Col 3 |\n| ----- | ----- | ----- |\n| Dato  | Dato  | Dato  |\n') },
        { type: 'item', icon: <GitBranch size={13} />, label: 'Diagrama UML', action: () => insertWrap('\n```mermaid\ngraph TD;\n    A-->B;\n```\n') },
        { type: 'sep' },
        { type: 'lbl', label: 'Alertas' },
        { type: 'item', icon: <AlertCircle size={13} style={{ color: '#58a6ff' }} />, label: 'Nota', action: () => insertWrap('> [!NOTE]\n> ') },
        { type: 'item', icon: <Zap size={13} style={{ color: '#3fb950' }} />, label: 'Tip', action: () => insertWrap('> [!TIP]\n> ') },
        { type: 'item', icon: <AlertCircle size={13} style={{ color: '#d29922' }} />, label: 'Aviso', action: () => insertWrap('> [!WARNING]\n> ') },
        { type: 'item', icon: <AlertCircle size={13} style={{ color: '#f85149' }} />, label: 'Peligro', action: () => insertWrap('> [!CAUTION]\n> ') },
    ]

    const menuW = 215, menuH = 500
    const mx = ctxMenu ? Math.min(ctxMenu.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - menuW - 8) : 0
    const my = ctxMenu ? Math.min(ctxMenu.y, (typeof window !== 'undefined' ? window.innerHeight : 800) - menuH - 8) : 0

    return (
        <div className="flex-1 flex flex-col h-full w-full overflow-hidden">

            {/* ── Toolbar ──────────────────────────────────────────────────── */}
            <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b shrink-0"
                style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>

                <ToolbarBtn onClick={() => insertWrap('**', '**')} title="Negrita (Ctrl+B)"><Bold size={14} /></ToolbarBtn>
                <ToolbarBtn onClick={() => insertWrap('*', '*')} title="Cursiva (Ctrl+I)"><Italic size={14} /></ToolbarBtn>
                <ToolbarBtn onClick={() => insertWrap('~~', '~~')} title="Tachado"><Strikethrough size={14} /></ToolbarBtn>
                <ToolbarBtn onClick={() => insertWrap('==', '==')} title="Resaltar"><Highlighter size={14} /></ToolbarBtn>
                <Sep />
                <ToolbarBtn onClick={() => insertLine('# ')} title="H1"><Heading1 size={14} /></ToolbarBtn>
                <ToolbarBtn onClick={() => insertLine('## ')} title="H2"><Heading2 size={14} /></ToolbarBtn>
                <ToolbarBtn onClick={() => insertLine('### ')} title="H3"><Heading3 size={14} /></ToolbarBtn>
                <Sep />
                <ToolbarBtn onClick={() => insertLine('> ')} title="Cita"><Quote size={14} /></ToolbarBtn>
                <ToolbarBtn onClick={() => insertWrap('`', '`')} title="Código inline"><Code size={14} /></ToolbarBtn>
                <ToolbarBtn onClick={() => insertWrap('\n```\n', '\n```\n')} title="Bloque de código"><Terminal size={14} /></ToolbarBtn>
                <Sep />
                <ToolbarBtn onClick={() => insertWrap('[', '](https://)')} title="Enlace (Ctrl+K)"><Link2 size={14} /></ToolbarBtn>
                <ToolbarBtn onClick={() => insertWrap('![desc](', ')')} title="Imagen"><Image size={14} /></ToolbarBtn>
                <Sep />
                <ToolbarBtn onClick={() => insertLine('- ')} title="Lista"><List size={14} /></ToolbarBtn>
                <ToolbarBtn onClick={() => insertLine('1. ')} title="Lista numerada"><ListOrdered size={14} /></ToolbarBtn>
                <ToolbarBtn onClick={() => insertLine('- [ ] ')} title="Lista de tareas"><ListTodo size={14} /></ToolbarBtn>
                <Sep />
                <ToolbarBtn onClick={() => insertWrap('\n| Col 1 | Col 2 | Col 3 |\n| ----- | ----- | ----- |\n| Dato  | Dato  | Dato  |\n')} title="Tabla"><Table size={14} /></ToolbarBtn>
                <ToolbarBtn onClick={() => insertWrap('\n---\n')} title="División"><Minus size={14} /></ToolbarBtn>
                <Sep />

                {/* UML */}
                <button onClick={() => insertWrap('\n```mermaid\ngraph TD;\n    A-->B;\n```\n')} title="Diagrama Mermaid"
                    className="text-[9px] font-bold px-2 py-0.5 rounded-md transition-all"
                    style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}
                    onMouseOver={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 22%, transparent)' }}
                    onMouseOut={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 12%, transparent)' }}>
                    UML
                </button>
                <Sep />

                {/* Alerts dropdown */}
                <div className="relative">
                    <button onClick={() => setShowAlerts(p => !p)}
                        className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md transition-all"
                        style={{ color: showAlerts ? 'var(--text-main)' : 'var(--text-faint)', background: showAlerts ? 'var(--bg-hover)' : 'transparent' }}
                        onMouseOver={e => { e.currentTarget.style.color = 'var(--text-main)'; if (!showAlerts) e.currentTarget.style.background = 'var(--bg-hover)' }}
                        onMouseOut={e => { if (!showAlerts) { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent' } }}>
                        ALERTA <ChevronDown size={9} className={`transition-transform duration-150 ${showAlerts ? 'rotate-180' : ''}`} />
                    </button>
                    {showAlerts && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowAlerts(false)} />
                            <div className="absolute top-full left-0 mt-1 flex flex-col gap-1 p-1.5 rounded-xl border shadow-xl z-20"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', minWidth: 130, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', animation: 'fadeInUp 0.12s ease both' }}>
                                <AlertChip color="#58a6ff" label="NOTA" onClick={() => { insertWrap('> [!NOTE]\n> '); setShowAlerts(false) }} />
                                <AlertChip color="#3fb950" label="TIP" onClick={() => { insertWrap('> [!TIP]\n> '); setShowAlerts(false) }} />
                                <AlertChip color="#a371f7" label="IMPORTANTE" onClick={() => { insertWrap('> [!IMPORTANT]\n> '); setShowAlerts(false) }} />
                                <AlertChip color="#d29922" label="AVISO" onClick={() => { insertWrap('> [!WARNING]\n> '); setShowAlerts(false) }} />
                                <AlertChip color="#f85149" label="PELIGRO" onClick={() => { insertWrap('> [!CAUTION]\n> '); setShowAlerts(false) }} />
                            </div>
                        </>
                    )}
                </div>

                <div className="ml-auto text-[9px] font-mono hidden md:flex items-center gap-1" style={{ color: 'var(--text-faint)' }}>
                    Click der. → más opciones
                </div>
            </div>

            {/* ── Textarea ─────────────────────────────────────────────────── */}
            <textarea
                ref={taRef}
                value={content}
                onChange={e => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onContextMenu={handleContextMenu}
                className="flex-1 w-full px-10 py-8 bg-transparent outline-none font-mono text-[13px] leading-7 resize-none custom-editor-textarea"
                style={{ color: 'var(--text-main)' }}
                placeholder="Escribe en Markdown... (Enter continúa listas | Ctrl+B Negrita | Ctrl+K Enlace | Click derecho → más opciones)"
                spellCheck={false}
            />

            {/* ── Context Menu ─────────────────────────────────────────────── */}
            {ctxMenu && (
                <div ref={ctxRef} className="context-menu" style={{ left: mx, top: my }}>
                    {ctxItems.map((item, i) => {
                        if (item.type === 'sep') return <div key={i} className="context-menu-sep" />
                        if (item.type === 'lbl') return <div key={i} className="context-menu-label">{item.label}</div>
                        return (
                            <div key={i} className="context-menu-item" onClick={() => item.action && runCtx(item.action)}>
                                <span style={{ opacity: 0.7, display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                                <span>{item.label}</span>
                                {item.kbd && <span className="cm-kbd">{item.kbd}</span>}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

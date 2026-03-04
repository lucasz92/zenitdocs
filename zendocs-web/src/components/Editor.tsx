"use client";
import { Bold, Italic, Heading1, Heading2, Heading3, Link, List, ListOrdered, Quote, Code, Terminal, Highlighter, Strikethrough, Image, ListTodo, Table, Minus } from 'lucide-react'
import { useRef } from 'react'

export function Editor({ content, onChange }: { content: string, onChange: (val: string) => void }) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const insertText = (before: string, after: string = '') => {
        const textarea = textareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const text = textarea.value
        const selectedText = text.substring(start, end)

        const newText = text.substring(0, start) + before + selectedText + after + text.substring(end)
        onChange(newText)

        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(start + before.length, end + before.length)
        }, 0)
    }

    return (
        <div className="flex-1 flex flex-col h-full w-full">
            <div className="flex items-center flex-wrap gap-1 p-2 border-b border-border-color bg-bg-card shrink-0 shadow-sm">
                <button onClick={() => insertText('**', '**')} className="p-1.5 rounded-md hover:bg-border-color/50 text-text-muted hover:text-text-main transition-colors" title="Negrita">
                    <Bold size={15} />
                </button>
                <button onClick={() => insertText('*', '*')} className="p-1.5 rounded-md hover:bg-border-color/50 text-text-muted hover:text-text-main transition-colors" title="Cursiva">
                    <Italic size={15} />
                </button>
                <button onClick={() => insertText('~~', '~~')} className="p-1.5 rounded-md hover:bg-border-color/50 text-text-muted hover:text-text-main transition-colors" title="Tachado">
                    <Strikethrough size={15} />
                </button>
                <button onClick={() => insertText('==', '==')} className="p-1.5 rounded-md hover:bg-border-color/50 text-text-muted hover:text-text-main transition-colors" title="Resaltar">
                    <Highlighter size={15} />
                </button>
                <div className="w-px h-4 bg-border-color mx-1"></div>
                <button onClick={() => insertText('# ')} className="p-1.5 rounded-md hover:bg-border-color/50 text-text-muted hover:text-text-main transition-colors" title="Encabezado 1">
                    <Heading1 size={15} />
                </button>
                <button onClick={() => insertText('## ')} className="p-1.5 rounded-md hover:bg-border-color/50 text-text-muted hover:text-text-main transition-colors" title="Encabezado 2">
                    <Heading2 size={15} />
                </button>
                <button onClick={() => insertText('### ')} className="p-1.5 rounded-md hover:bg-border-color/50 text-text-muted hover:text-text-main transition-colors" title="Encabezado 3">
                    <Heading3 size={15} />
                </button>
                <div className="w-px h-4 bg-border-color mx-1"></div>
                <button onClick={() => insertText('> ')} className="p-1.5 rounded-md hover:bg-border-color/50 text-text-muted hover:text-text-main transition-colors" title="Cita">
                    <Quote size={15} />
                </button>
                <button onClick={() => insertText('`', '`')} className="p-1.5 rounded-md hover:bg-border-color/50 text-text-muted hover:text-text-main transition-colors" title="Código en línea">
                    <Code size={15} />
                </button>
                <button onClick={() => insertText('\n```\n', '\n```\n')} className="p-1.5 rounded-md hover:bg-border-color/50 text-text-muted hover:text-text-main transition-colors" title="Bloque de Código">
                    <Terminal size={15} />
                </button>
                <div className="w-px h-4 bg-border-color mx-1"></div>
                <button onClick={() => insertText('\n```mermaid\ngraph TD;\n    A-->B;\n```\n')} className="text-[10px] font-bold px-2 py-1 rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors" title="Crear Diagrama UML (Mermaid)">
                    UML
                </button>
                <div className="w-px h-4 bg-border-color mx-1"></div>
                <button onClick={() => insertText('[', '](https://)')} className="p-1.5 rounded-md hover:bg-border-color/50 text-text-muted hover:text-text-main transition-colors" title="Enlace">
                    <Link size={15} />
                </button>
                <button onClick={() => insertText('![alt](', ')')} className="p-1.5 rounded-md hover:bg-border-color/50 text-text-muted hover:text-text-main transition-colors" title="Imagen">
                    <Image size={15} />
                </button>
                <div className="w-px h-4 bg-border-color mx-1"></div>
                <button onClick={() => insertText('- ')} className="p-1.5 rounded-md hover:bg-border-color/50 text-text-muted hover:text-text-main transition-colors" title="Lista de puntos">
                    <List size={15} />
                </button>
                <button onClick={() => insertText('1. ')} className="p-1.5 rounded-md hover:bg-border-color/50 text-text-muted hover:text-text-main transition-colors" title="Lista numerada">
                    <ListOrdered size={15} />
                </button>
                <button onClick={() => insertText('- [ ] ')} className="p-1.5 rounded-md hover:bg-border-color/50 text-text-muted hover:text-text-main transition-colors" title="Lista de tareas">
                    <ListTodo size={15} />
                </button>
                <div className="w-px h-4 bg-border-color mx-1"></div>
                <button onClick={() => insertText('\n| Columna 1 | Columna 2 |\n| ---- | ---- |\n| Texto | Texto |\n')} className="p-1.5 rounded-md hover:bg-border-color/50 text-text-muted hover:text-text-main transition-colors" title="Tabla">
                    <Table size={15} />
                </button>
                <button onClick={() => insertText('\n---\n')} className="p-1.5 rounded-md hover:bg-border-color/50 text-text-muted hover:text-text-main transition-colors" title="Línea horizontal">
                    <Minus size={15} />
                </button>

                {/* Alertas Rápidas */}
                <div className="w-px h-4 bg-border-color mx-2"></div>
                <button onClick={() => insertText('> [!NOTE]\n> ')} className="text-[10px] font-bold px-2 py-1 rounded-md bg-[#4ea0ff]/10 text-[#4ea0ff] hover:bg-[#4ea0ff]/20 transition-colors" title="Nota">
                    NOTA
                </button>
                <button onClick={() => insertText('> [!TIP]\n> ')} className="text-[10px] font-bold px-2 py-1 rounded-md bg-[#62c562]/10 text-[#62c562] hover:bg-[#62c562]/20 transition-colors" title="Tip (Idea)">
                    TIP
                </button>
                <button onClick={() => insertText('> [!IMPORTANT]\n> ')} className="text-[10px] font-bold px-2 py-1 rounded-md bg-[#8250df]/10 text-[#8250df] hover:bg-[#8250df]/20 transition-colors" title="Importante">
                    IMPORTANTE
                </button>
                <button onClick={() => insertText('> [!WARNING]\n> ')} className="text-[10px] font-bold px-2 py-1 rounded-md bg-[#ffd322]/10 text-[#ffd322] hover:bg-[#ffd322]/20 transition-colors" title="Aviso / Advertencia">
                    AVISO
                </button>
                <button onClick={() => insertText('> [!CAUTION]\n> ')} className="text-[10px] font-bold px-2 py-1 rounded-md bg-[#ff5c5c]/10 text-[#ff5c5c] hover:bg-[#ff5c5c]/20 transition-colors" title="Precaución / Peligro">
                    PELIGRO
                </button>
            </div>

            {/* 
        El textbox principal 
        Se usa la clase .custom-editor-textarea que definimos en index.css
      */}
            <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 w-full p-8 bg-transparent outline-none font-mono text-[13px] leading-relaxed text-text-main resize-none custom-editor-textarea"
                placeholder="Escribe tu documentación en Markdown..."
                spellCheck={false}
            />
        </div>
    )
}


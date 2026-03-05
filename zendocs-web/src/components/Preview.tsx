"use client";
import { marked } from 'marked'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'
import { useEffect, useRef, useMemo, useState } from 'react'
import mermaid from 'mermaid'
import { useTheme } from 'next-themes'

// ── Configure marked ONCE at module level ─────────────────────────────
let markedConfigured = false

function getMarked() {
    if (markedConfigured) return marked

    const renderer = new marked.Renderer()

    // ── Code blocks with syntax highlight + header ──────────────────
    renderer.code = (token: any) => {
        const lang = (token.lang || '').trim().toLowerCase()
        const rawCode = token.text || ''

        // Mermaid: output a blank container — we fill it with JS later
        if (lang === 'mermaid') {
            // Store raw code in data-code attribute (base64 to avoid escaping issues)
            const encoded = typeof btoa !== 'undefined'
                ? btoa(unescape(encodeURIComponent(rawCode)))
                : ''
            return `<div class="mermaid-wrapper not-prose" data-code="${encoded}"><div class="mermaid-loading">Renderizando diagrama...</div></div>\n`
        }

        // Syntax highlight
        let highlighted = ''
        try {
            if (lang && hljs.getLanguage(lang)) {
                highlighted = hljs.highlight(rawCode, { language: lang, ignoreIllegals: true }).value
            } else {
                highlighted = hljs.highlightAuto(rawCode).value
            }
        } catch {
            highlighted = rawCode.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        }

        const displayLang = lang || 'text'
        return `<div class="code-block-wrapper not-prose" data-lang="${displayLang}">
  <div class="code-block-header">
    <span class="code-block-lang">${displayLang}</span>
    <button class="code-block-copy" data-copy="true">Copiar</button>
  </div>
  <pre class="code-block-pre"><code class="hljs language-${displayLang}">${highlighted}</code></pre>
</div>\n`
    }

    // ── Alert blockquotes — Obsidian-style ───────────────────────────
    renderer.blockquote = (token: any) => {
        const text = token.text || ''
        const match = text.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i)
        if (match) {
            const type = match[1].toUpperCase()

            // Lucide icons — stroke-based 24x24, exact paths from lucide-react package
            const S = 'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
            const ico = (p: string) => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" ${S} style="flex-shrink:0">${p}</svg>`

            const ICONS: Record<string, string> = {
                NOTE: ico('<path d="M10 2v8l3-3 3 3V2"/><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>'),      // BookMarked
                TIP: ico('<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><line x1="16" y1="8" x2="20" y2="12"/>'),   // PenLine (notebook-pen)
                IMPORTANT: ico('<path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/>'),                            // Flame
                WARNING: ico('<path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/><path d="M12 15h.01"/><path d="M12 7v4"/>'),  // MessageSquareWarning
                CAUTION: ico('<path d="M7 18v-6a5 5 0 1 1 10 0v6"/><path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z"/><path d="M21 12h1"/><path d="M18.5 4.5 18 5"/><path d="M2 12h1"/><path d="M12 2v1"/><path d="m4.929 4.929.707.707"/><path d="M12 12v6"/>'), // Siren
            }

            const LABELS: Record<string, string> = {
                NOTE: 'Nota', TIP: 'Tip', IMPORTANT: 'Importante', WARNING: 'Aviso', CAUTION: 'Peligro'
            }

            const inner = marked.parse(text.substring(match[0].length).trimStart()) as string
            return `<div class="callout callout-${type.toLowerCase()}">
  <div class="callout-header">${ICONS[type]}<span>${LABELS[type]}</span></div>
  <div class="callout-body">${inner}</div>
</div>`
        }
        return `<blockquote>\n${marked.parse(text) as string}</blockquote>\n`
    }


    // ── ==highlight== inline extension ───────────────────────────────
    marked.use({
        renderer,
        extensions: [{
            name: 'highlightmark',
            level: 'inline',
            start(src: string) { return src.indexOf('==') },
            tokenizer(src: string) {
                const m = /^==([^=\n]+)==/.exec(src)
                return m ? { type: 'highlightmark', raw: m[0], text: m[1] } : undefined
            },
            renderer(token: any) {
                return `<mark>${marked.parseInline(token.text)}</mark>`
            },
        }],
        breaks: true,
        gfm: true,
    })

    markedConfigured = true
    return marked
}

// ── Mermaid config (only light/dark variants) ─────────────────────────
function getMermaidTheme(isDark: boolean) {
    return {
        theme: (isDark ? 'dark' : 'default') as any,
        fontFamily: 'Inter, system-ui, sans-serif',
        themeVariables: isDark
            ? {
                primaryColor: '#1a2d5a',
                primaryTextColor: '#e2e4ed',
                primaryBorderColor: '#2a3045',
                lineColor: '#4285f4',
                background: '#12141c',
                mainBkg: '#181c28',
                nodeBorder: '#2a3045',
                clusterBkg: '#1e2333',
                titleColor: '#e2e4ed',
                edgeLabelBackground: '#1e2333',
                activeTaskBorderColor: '#4285f4',
                activeTaskBkgColor: '#1a2d5a',
            }
            : {
                primaryColor: '#dbeafe',
                primaryTextColor: '#1e3a6e',
                primaryBorderColor: '#93c5fd',
                lineColor: '#2563eb',
                background: '#fafafa',
                mainBkg: '#eff6ff',
                nodeBorder: '#93c5fd',
                clusterBkg: '#f0f0f3',
                titleColor: '#1e3a6e',
            },
    }
}

// ── Preview component ─────────────────────────────────────────────────
export function Preview({ content, variables }: { content: string; variables: Record<string, string> }) {
    const previewRef = useRef<HTMLDivElement>(null)
    const { resolvedTheme } = useTheme()
    const isDark = resolvedTheme === 'dark'

    // Debounce for expensive operations (mermaid)
    const [debouncedContent, setDebouncedContent] = useState(content)
    useEffect(() => {
        const t = setTimeout(() => setDebouncedContent(content), 500)
        return () => clearTimeout(t)
    }, [content])

    // Parse markdown → HTML (runs on every keystroke for instant feedback on text)
    const html = useMemo(() => {
        const m = getMarked()
        let raw = content
        for (const k in variables) {
            if (variables[k]) raw = raw.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), variables[k])
        }
        const rawHtml = m.parse(raw) as string
        return DOMPurify.sanitize(rawHtml, {
            ADD_TAGS: ['svg', 'path', 'line', 'polyline', 'rect', 'circle', 'mark'],
            ADD_ATTR: ['viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
                'd', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
                'class', 'style', 'width', 'height',
                'data-code', 'data-lang', 'data-copy', 'data-rendered'],
            FORBID_ATTR: [],
        })
    }, [content, variables])

    // Attach copy button handlers after HTML renders
    useEffect(() => {
        const container = previewRef.current
        if (!container) return
        const buttons = container.querySelectorAll<HTMLButtonElement>('[data-copy="true"]')
        buttons.forEach(btn => {
            // Clone to remove old listeners
            const fresh = btn.cloneNode(true) as HTMLButtonElement
            btn.replaceWith(fresh)
            fresh.addEventListener('click', () => {
                const code = fresh.closest('.code-block-wrapper')?.querySelector('code')
                if (!code) return
                navigator.clipboard.writeText(code.innerText).then(() => {
                    fresh.textContent = '✓ Copiado'
                    fresh.style.color = '#4285f4'
                    fresh.style.borderColor = '#4285f4'
                    setTimeout(() => {
                        fresh.textContent = 'Copiar'
                        fresh.style.color = ''
                        fresh.style.borderColor = ''
                    }, 2000)
                })
            })
        })
    }, [html])

    // Wrap tables in a scrollable div so wide tables scroll without breaking layout
    useEffect(() => {
        const container = previewRef.current
        if (!container) return
        const tables = container.querySelectorAll<HTMLTableElement>('table:not(.table-scroll-wrapper table)')
        tables.forEach(table => {
            // Don't double-wrap
            if (table.parentElement?.classList.contains('table-scroll-wrapper')) return
            const wrapper = document.createElement('div')
            wrapper.className = 'table-scroll-wrapper'
            table.parentNode?.insertBefore(wrapper, table)
            wrapper.appendChild(table)
        })
    }, [html])

    // Render Mermaid (debounced so it doesn't flicker on every keystroke)
    useEffect(() => {
        const container = previewRef.current
        if (!container) return

        const wrappers = container.querySelectorAll<HTMLElement>('.mermaid-wrapper:not([data-rendered])')
        if (wrappers.length === 0) return

        const cfg = getMermaidTheme(isDark)
        mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', ...cfg })

        const renderAll = async () => {
            for (const wrapper of Array.from(wrappers)) {
                try {
                    const encoded = wrapper.getAttribute('data-code') || ''
                    const code = encoded
                        ? decodeURIComponent(escape(atob(encoded)))
                        : ''

                    if (!code.trim()) continue

                    const id = `mermaid-${Math.random().toString(36).slice(2)}`
                    const { svg } = await mermaid.render(id, code)

                    // Fix SVG dimensions (remove invalid height='auto' attribute, use CSS instead)
                    const tmp = document.createElement('div')
                    tmp.innerHTML = svg
                    const svgEl = tmp.querySelector('svg')
                    if (svgEl) {
                        const w = svgEl.getAttribute('width') || ''
                        const h = svgEl.getAttribute('height') || ''
                        // Set viewBox for proper scaling if missing
                        if (!svgEl.getAttribute('viewBox') && w && h && w !== '100%') {
                            svgEl.setAttribute('viewBox', `0 0 ${parseFloat(w)} ${parseFloat(h)}`)
                        }
                        svgEl.setAttribute('width', '100%')
                        svgEl.removeAttribute('height')       // SVG attr doesn't support 'auto' — let CSS handle it
                        svgEl.style.maxWidth = '100%'
                        svgEl.style.height = 'auto'           // CSS 'auto' is valid here
                    }

                    wrapper.innerHTML = tmp.innerHTML
                    wrapper.setAttribute('data-rendered', 'true')
                } catch (e) {
                    console.warn('Mermaid render error:', e)
                    wrapper.innerHTML = `<div class="mermaid-error">⚠ Error en diagrama. Revisa la sintaxis.</div>`
                    wrapper.setAttribute('data-rendered', 'true')
                }
            }
        }

        renderAll()
    }, [debouncedContent, isDark])  // uses debounced content so it doesn't flicker

    return (
        <div
            id="main-preview-container"
            ref={previewRef}
            className="flex-1 overflow-y-auto"
            style={{
                padding: '2rem 2.5rem',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-sans)',
                background: isDark ? 'var(--bg-deep)' : '#ffffff',
            }}
        >
            <div
                className="prose prose-neutral max-w-none"
                style={{ color: 'var(--text-main)' }}
                dangerouslySetInnerHTML={{ __html: html }}
            />
        </div>
    )
}

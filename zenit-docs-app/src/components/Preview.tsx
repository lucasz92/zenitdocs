import { marked } from 'marked'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'
import { useEffect, useRef, useMemo } from 'react'
import mermaid from 'mermaid'

// We configure marked locally inside the component to avoid weird global state conflicts,
// but usually it's better to do this once. For robust local testing, we do it here.
const configureMarked = () => {
    const renderer = new marked.Renderer()

    // Save the original code renderer
    const originalCodeRenderer = renderer.code.bind(renderer);

    // Override the code renderer for Mermaid
    renderer.code = (token: any) => {
        if (token.lang === 'mermaid') {
            const escapeHtml = (unsafe: string) => {
                return unsafe
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            };
            return `<div class="mermaid">${escapeHtml(token.text)}</div>\n`;
        }
        return originalCodeRenderer(token);
    };

    // Custom Blockquote Renderer for Alerts
    renderer.blockquote = (token: any) => {
        const text = token.text || '';
        const match = text.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i)

        if (match) {
            const type = match[1].toUpperCase()
            const alerts: Record<string, { class: string, icon: string }> = {
                'NOTE': { class: 'alert-note', icon: `<svg class="w-4 h-4 mr-2 mb-0 inline" viewBox="0 0 16 16" fill="currentColor"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1v5.25a.75.75 0 0 1-1.5 0V8h-.25a.75.75 0 0 1-.75-.75ZM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>` },
                'TIP': { class: 'alert-tip', icon: `<svg class="w-4 h-4 mr-2 mb-0 inline" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.843a5.352 5.352 0 0 0-.585-.744l-.224-.264c-.543-.643-.984-1.326-.984-2.255 0-2.81 2.387-5.25 5.5-5.25 3.113 0 5.5 2.44 5.5 5.25 0 .929-.441 1.612-.984 2.255l-.224.264a5.353 5.353 0 0 0-.585.744c-.207.296-.33.561-.37.843a.75.75 0 0 1-1.484-.211c.084-.594.337-1.079.621-1.49.203-.292.45-.584.673-.848l.214-.253c.56-.679.984-1.32.984-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"></path></svg>` },
                'IMPORTANT': { class: 'alert-important', icon: `<svg class="w-4 h-4 mr-2 mb-0 inline" viewBox="0 0 16 16" fill="currentColor"><path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.75.75 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path></svg>` },
                'WARNING': { class: 'alert-warning', icon: `<svg class="w-4 h-4 mr-2 mb-0 inline" viewBox="0 0 16 16" fill="currentColor"><path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.396c.613 1.15-.227 2.557-1.543 2.557H1.918c-1.316 0-2.156-1.407-1.543-2.557Zm2.628-1.047a1.432 1.432 0 0 0-2.17 0L.833 11.396c-.347.65-.015 1.442.709 1.442h12.916c.724 0 1.056-.792.709-1.442ZM8 10.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Zm0-6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4.5Z"></path></svg>` },
                'CAUTION': { class: 'alert-caution', icon: `<svg class="w-4 h-4 mr-2 mb-0 inline" viewBox="0 0 16 16" fill="currentColor"><path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm1.06 1.28L1.5 5.53v4.94l4.03 4.03h4.94l4.03-4.03V5.53L10.47 1.5ZM9 4v4.5a.75.75 0 0 1-1.5 0V4a.75.75 0 0 1 1.5 0ZM7.5 12.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>` }
            }
            const alertInfo = alerts[type]

            // Parse the inner rest of the text
            const innerText = text.substring(match[0].length).trimStart();
            const innerHtml = marked.parse(innerText)

            return `
                    <div class="alert ${alertInfo.class}">
                        <strong>${alertInfo.icon} ${type.toLowerCase()}</strong>
                        ${innerHtml as string}
                    </div>
                `
        }
        // Standard blockquote
        return `<blockquote>\n${marked.parse(text) as string}</blockquote>\n`
    }

    const highlightExtension = {
        name: 'highlightmark',
        level: 'inline',
        start(src: string) { return src.match(/==/)?.index; },
        tokenizer(src: string) {
            const rule = /^==([^=]+)==/;
            const match = rule.exec(src);
            if (match) {
                return {
                    type: 'highlightmark',
                    raw: match[0],
                    text: match[1],
                    // Use this.lexer correctly depending on internal Marked instance bindings
                    // if it fails, fallback to rendering directly
                };
            }
            return false;
        },
        renderer(token: any) {
            return `<mark>${marked.parseInline(token.text)}</mark>`;
        }
    };

    marked.use({
        renderer,
        extensions: [highlightExtension],
        breaks: true, // Prevents aggressive lazy blockquotes that break on a single enter
        gfm: true
    })

    return marked
}

const markedInstance = configureMarked()

export function Preview({ content, variables }: { content: string, variables: Record<string, string> }) {
    const previewRef = useRef<HTMLDivElement>(null)

    const html = useMemo(() => {
        let rawText = content
        for (const key in variables) {
            if (variables[key]) {
                const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
                rawText = rawText.replace(regex, variables[key] as string)
            }
        }

        // 1. Convert Markdown -> HTML
        const rawHtml = markedInstance.parse(rawText) as string

        // 2. Safely Purify HTML
        const safeHtml = DOMPurify.sanitize(rawHtml, {
            ADD_TAGS: ['svg', 'path', 'mark'],  // Ensure alert SVGs and marks stay
            ADD_ATTR: ['viewBox', 'fill', 'stroke', 'strokeWidth', 'strokeLinejoin', 'd', 'class']
        })

        return safeHtml
    }, [content, variables])

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: document.body.classList.contains('dark') ? 'dark' : 'default',
            securityLevel: 'loose'
        });

        const initMermaid = async () => {
            if (previewRef.current) {
                // Initialize Highlight.js
                previewRef.current.querySelectorAll('pre code').forEach((el) => {
                    if (!el.classList.contains('hljs') && !el.classList.contains('language-mermaid')) {
                        hljs.highlightElement(el as HTMLElement)
                    }
                })

                // Run Mermaid correctly
                try {
                    const mermaidNodes = previewRef.current.querySelectorAll('.mermaid')
                    if (mermaidNodes.length > 0) {
                        await mermaid.run({
                            nodes: Array.from(mermaidNodes) as HTMLElement[],
                            suppressErrors: true
                        });
                    }
                } catch (error) {
                    console.error('Mermaid render error', error)
                }
            }
        }

        // Small timeout to ensure DOM is fully painted by React
        const timeoutId = setTimeout(() => {
            initMermaid()
        }, 50);
        return () => clearTimeout(timeoutId);
    }, [html])

    return (
        <div
            ref={previewRef}
            className="flex-1 p-10 overflow-y-auto prose prose-sm dark:prose-invert max-w-none text-text-main prose-p:text-text-main prose-headings:text-text-main prose-strong:text-text-main"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    )
}

import { Toaster } from 'sonner'
import { useTheme } from 'next-themes'

export function SileoToast() {
    const { theme } = useTheme()
    return (
        <Toaster
            position="bottom-right"
            theme={theme as 'light' | 'dark' | 'system'}
            toastOptions={{
                className: 'sileo-toast',
                style: {
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)'
                }
            }}
        />
    )
}

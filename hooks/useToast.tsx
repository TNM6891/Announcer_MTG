import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Types
export type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

// Context
const ToastContext = createContext<ToastContextType | null>(null);

// Provider Component
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    let toastId = 0;

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = ++toastId;
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto-remove after animation
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const getIcon = (type: ToastType) => {
        switch (type) {
            case 'success': return 'fa-solid fa-check-circle';
            case 'error': return 'fa-solid fa-times-circle';
            case 'info': return 'fa-solid fa-info-circle';
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* Toast Container */}
            <div className="toast-container" role="alert" aria-live="polite">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast toast-${toast.type}`}>
                        <i className={getIcon(toast.type)}></i>
                        <span>{toast.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

// Hook
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

// Standalone toast function for non-React contexts
let globalToastFn: ((message: string, type?: ToastType) => void) | null = null;

export function setGlobalToast(fn: (message: string, type?: ToastType) => void) {
    globalToastFn = fn;
}

export function toast(message: string, type: ToastType = 'info') {
    if (globalToastFn) {
        globalToastFn(message, type);
    } else {
        console.log(`[Toast ${type}]: ${message}`);
    }
}

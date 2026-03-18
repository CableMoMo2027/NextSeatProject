import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

let nextToastId = 1;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const timersRef = useRef(new Map());

    const removeToast = useCallback((id) => {
        const timerId = timersRef.current.get(id);
        if (timerId) {
            clearTimeout(timerId);
            timersRef.current.delete(id);
        }
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const pushToast = useCallback((message, options = {}) => {
        const {
            type = 'info',
            duration = 3000,
        } = options;
        const id = nextToastId++;
        setToasts((current) => [...current, { id, message, type }]);

        if (duration > 0) {
            const timerId = setTimeout(() => {
                removeToast(id);
            }, duration);
            timersRef.current.set(id, timerId);
        }
    }, [removeToast]);

    const api = useMemo(() => ({
        toast: pushToast,
        success: (message, options) => pushToast(message, { ...options, type: 'success' }),
        error: (message, options) => pushToast(message, { ...options, type: 'error' }),
        info: (message, options) => pushToast(message, { ...options, type: 'info' }),
    }), [pushToast]);

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="app-toast-viewport" aria-live="polite" aria-atomic="true">
                {toasts.map((toast) => (
                    <div key={toast.id} className={`app-toast app-toast-${toast.type}`}>
                        <span className="app-toast-message">{toast.message}</span>
                        <button
                            type="button"
                            className="app-toast-close"
                            aria-label="Dismiss toast"
                            onClick={() => removeToast(toast.id)}
                        >
                            x
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}

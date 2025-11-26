'use client';
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
  title?: string;
}

const Toast: React.FC<ToastProps> = ({ 
  message, 
  type, 
  onClose, 
  duration = 5000,
  title 
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [onClose, duration]);

  const config = {
    success: {
      icon: CheckCircle,
      bg: 'bg-success-500/10',
      border: 'border-success-500/30',
      iconColor: 'text-success-500',
      title: title || 'Success',
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-error-500/10',
      border: 'border-error-500/30',
      iconColor: 'text-error-500',
      title: title || 'Error',
    },
    info: {
      icon: Info,
      bg: 'bg-primary-500/10',
      border: 'border-primary-500/30',
      iconColor: 'text-primary-500',
      title: title || 'Info',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-warning-500/10',
      border: 'border-warning-500/30',
      iconColor: 'text-warning-500',
      title: title || 'Warning',
    },
  };

  const { icon: Icon, bg, border, iconColor, title: defaultTitle } = config[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`fixed bottom-4 right-4 z-[200] max-w-sm w-full mx-4 
        ${bg} backdrop-blur-2xl ${border} border rounded-2xl shadow-2xl overflow-hidden`}
    >
      {/* Progress bar */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        className={`absolute top-0 left-0 right-0 h-1 ${iconColor.replace('text-', 'bg-')} origin-left`}
      />
      
      <div className="p-4 flex items-start gap-3">
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{defaultTitle}</p>
          <p className="text-sm text-neutral-400 mt-0.5 line-clamp-2">{message}</p>
        </div>
        
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1.5 rounded-lg text-neutral-400 
            hover:text-white hover:bg-white/10 transition-all duration-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

// Toast Container for multiple toasts
interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-3">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast, index) => (
          <motion.div
            key={toast.id}
            layout
            style={{ position: 'relative', bottom: index * 8 }}
          >
            <Toast
              message={toast.message}
              type={toast.type}
              title={toast.title}
              onClose={() => removeToast(toast.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Toast;
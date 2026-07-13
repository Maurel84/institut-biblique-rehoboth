import { type ReactNode } from 'react';
import { Loader2, X, AlertCircle, CheckCircle, Info } from 'lucide-react';

export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 text-ibr-600 animate-spin" />
      {label && <span className="ml-2 text-gray-600 text-sm">{label}</span>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function StatCard({
  label, value, icon: Icon, color = 'ibr', subtitle,
}: {
  label: string;
  value: string | number;
  icon: typeof Loader2;
  color?: 'ibr' | 'gold' | 'green' | 'red' | 'gray';
  subtitle?: string;
}) {
  const colors: Record<string, string> = {
    ibr: 'bg-ibr-50 text-ibr-700',
    gold: 'bg-gold-50 text-gold-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    gray: 'bg-gray-100 text-gray-700',
  };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

export function Badge({
  children, color = 'gray',
}: {
  children: ReactNode;
  color?: 'green' | 'red' | 'gold' | 'ibr' | 'gray' | 'blue';
}) {
  const colors: Record<string, string> = {
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    gold: 'bg-gold-100 text-gold-800',
    ibr: 'bg-ibr-100 text-ibr-800',
    gray: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-100 text-blue-800',
  };
  return <span className={`badge ${colors[color]}`}>{children}</span>;
}

export function Modal({
  open, onClose, title, children, size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  if (!open) return null;
  const sizes: Record<string, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-xl w-full ${sizes[size]} max-h-[90vh] overflow-hidden flex flex-col animate-scale-in`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ message, icon: Icon }: { message: string; icon?: typeof Loader2 }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      {Icon && <Icon className="w-12 h-12 mb-3 opacity-50" />}
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function Toast({ message, type }: { message: string; type: 'success' | 'error' | 'info' }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-600" />,
    error: <AlertCircle className="w-5 h-5 text-red-600" />,
    info: <Info className="w-5 h-5 text-blue-600" />,
  };
  const bg = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
  };
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-in">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${bg[type]}`}>
        {icons[type]}
        <span className="text-sm font-medium text-gray-900">{message}</span>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-gray-600 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button
          className="btn-danger"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          Confirmer
        </button>
      </div>
    </Modal>
  );
}

export function PageHeader({
  title, subtitle, actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SearchInput({
  value, onChange, placeholder = 'Rechercher...',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="input-field max-w-xs"
    />
  );
}

export function Select({
  value, onChange, options, placeholder, className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`input-field ${className}`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

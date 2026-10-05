import { forwardRef } from 'react'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from 'react'

export function Button({
  children,
  className = '',
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline'
}) {
  const base =
    'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed'
  const styles = {
    primary: 'bg-brand text-white hover:bg-brand/90',
    ghost: 'text-gray-700 hover:bg-gray-100',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }[variant]
  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  )
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }
>(function Input({ label, error, className = '', ...props }, ref) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none disabled:bg-gray-50 ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
})

export function Card({
  title,
  children,
  className = '',
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
      {title && (
        <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-800">
          {title}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

export function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const toneClass = {
    default: 'text-gray-900',
    success: 'text-green-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
  }[tone]
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}) {
  const styles = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  }[tone]
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles}`}
    >
      {children}
    </span>
  )
}

export function Spinner() {
  return (
    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  )
}

export function EmptyState({ message }: { message: string }) {
  return <div className="text-center py-12 text-gray-500 text-sm">{message}</div>
}

import { clsx } from 'clsx';
import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...rest }: Props) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={id}
        className={clsx(
          'h-9 rounded-md border px-3 text-sm outline-none transition-colors',
          'placeholder:text-gray-400',
          'focus:ring-2 focus:ring-blue-500',
          error ? 'border-red-400' : 'border-gray-300',
          className
        )}
        {...rest}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

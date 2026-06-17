import { clsx } from 'clsx';
import type { SelectHTMLAttributes, ReactNode } from 'react';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: ReactNode;
}

export function Select({ label, className, id, children, ...rest }: Props) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        id={id}
        className={clsx(
          'h-9 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none transition-colors',
          'focus:ring-2 focus:ring-blue-500',
          className
        )}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}

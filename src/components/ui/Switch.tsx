import { clsx } from 'clsx';

interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export function Switch({ checked, onChange, disabled, ariaLabel }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={clsx(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
        checked ? 'bg-blue-600' : 'bg-gray-300',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <span
        className={clsx(
          'pointer-events-none inline-block h-4 w-4 translate-y-[2px] rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
        )}
      />
    </button>
  );
}

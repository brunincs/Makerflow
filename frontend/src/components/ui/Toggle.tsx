interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, disabled = false }: ToggleProps) {
  return (
    <label className={`flex items-start gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div className="relative flex-shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={`
            w-11
            h-6
            rounded-full
            transition-all
            duration-200
            ${checked ? 'bg-emerald-500' : 'bg-[#1f2937]'}
          `}
        />
        <div
          className={`
            absolute
            top-0.5
            left-0.5
            w-5
            h-5
            bg-[#f9fafb]
            rounded-full
            shadow-lg
            transition-transform
            duration-200
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </div>
      <div className="flex-1">
        <span className="text-sm font-medium text-[#f9fafb]">{label}</span>
        {description && (
          <p className="text-xs text-[#6b7280] mt-0.5">{description}</p>
        )}
      </div>
    </label>
  );
}

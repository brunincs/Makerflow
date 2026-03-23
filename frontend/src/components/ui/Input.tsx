import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[#f9fafb] mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full
            px-3.5
            py-2.5
            border
            rounded-lg
            bg-[#1e293b]
            text-[#f9fafb]
            border-[#1f2937]
            transition-all
            duration-200
            focus:outline-none
            focus:ring-2
            focus:ring-emerald-500/30
            focus:border-emerald-500
            disabled:bg-[#1f2937]
            disabled:cursor-not-allowed
            disabled:text-[#6b7280]
            placeholder:text-[#6b7280]
            ${error ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        {hint && !error && (
          <p className="mt-1.5 text-xs text-[#6b7280]">{hint}</p>
        )}
        {error && (
          <p className="mt-1.5 text-sm text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

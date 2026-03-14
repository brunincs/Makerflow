import { useState, useEffect, useRef } from 'react';

interface DecimalInputProps {
  value: number | undefined;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  min?: number;
  disabled?: boolean;
}

export function DecimalInput({
  value,
  onChange,
  placeholder,
  className = '',
  min = 0,
  disabled = false,
}: DecimalInputProps) {
  // Estado local para armazenar o texto digitado
  const [inputValue, setInputValue] = useState<string>('');
  const isUserTyping = useRef(false);

  // Sincronizar com prop value quando muda externamente
  useEffect(() => {
    if (!isUserTyping.current) {
      if (value === undefined || value === 0) {
        setInputValue('');
      } else {
        setInputValue(String(value));
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // Permitir string vazia, digitos e ponto decimal
    // Regex: opcional digitos, opcional ponto, opcional digitos
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      isUserTyping.current = true;
      setInputValue(val);

      // Converter para numero apenas se for um valor valido completo
      if (val === '') {
        onChange(0);
      } else if (!val.endsWith('.') && val !== '.') {
        const num = parseFloat(val);
        if (!isNaN(num) && num >= min) {
          onChange(num);
        }
      }
    }
  };

  const handleBlur = () => {
    isUserTyping.current = false;

    // Ao sair do campo, normalizar o valor
    if (inputValue === '' || inputValue === '.') {
      setInputValue('');
      onChange(0);
    } else {
      const num = parseFloat(inputValue);
      if (!isNaN(num) && num >= min) {
        // Remover zeros desnecessarios (ex: "0.50" -> "0.5")
        setInputValue(num === 0 ? '' : String(num));
        onChange(num);
      }
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={() => { isUserTyping.current = true; }}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
    />
  );
}

import { useState, useRef, DragEvent, ClipboardEvent, ChangeEvent } from 'react';
import { ImageIcon, Upload, X, FileImage } from 'lucide-react';

interface ImageUploadProps {
  value: File | null;
  preview: string | null;
  onChange: (file: File | null, preview: string | null) => void;
}

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

export function ImageUpload({ value, preview, onChange }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Formato invalido. Use PNG, JPG, WEBP ou GIF.');
      return false;
    }

    if (file.size > MAX_SIZE) {
      setError('Arquivo muito grande. Maximo 5MB.');
      return false;
    }

    return true;
  };

  const handleFile = (file: File) => {
    if (validateFile(file)) {
      const previewUrl = URL.createObjectURL(file);
      onChange(file, previewUrl);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          handleFile(file);
          break;
        }
      }
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleRemove = () => {
    onChange(null, null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Imagem do Produto
      </label>

      {preview ? (
        <div className="relative">
          <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-contain bg-gray-50"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {value && (
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
              <FileImage className="w-4 h-4" />
              <span className="truncate">{value.name}</span>
              <span className="text-gray-400">
                ({(value.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onPaste={handlePaste}
          tabIndex={0}
          className={`
            relative w-full h-48 border-2 border-dashed rounded-lg
            flex flex-col items-center justify-center gap-3
            cursor-pointer transition-all
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
            }
          `}
        >
          <div className={`p-3 rounded-full ${isDragging ? 'bg-blue-100' : 'bg-gray-200'}`}>
            {isDragging ? (
              <Upload className="w-8 h-8 text-blue-500" />
            ) : (
              <ImageIcon className="w-8 h-8 text-gray-400" />
            )}
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              {isDragging ? 'Solte a imagem aqui' : 'Arraste uma imagem ou clique para selecionar'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PNG, JPG, WEBP ou GIF (max. 5MB)
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Ou cole com Ctrl+V
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.gif"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

import { useState, useRef } from 'react';
import { Upload, File, X, Box } from 'lucide-react';

interface STLUploadProps {
  value: File | null;
  existingUrl?: string;
  onChange: (file: File | null, url: string | null) => void;
  compact?: boolean;
}

const ACCEPTED_EXTENSIONS = ['.stl', '.3mf', '.obj'];

export function STLUpload({ value, existingUrl, onChange, compact = false }: STLUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const getFileName = (): string | null => {
    if (value) return value.name;
    if (existingUrl) {
      const parts = existingUrl.split('/');
      return parts[parts.length - 1] || 'arquivo.stl';
    }
    return null;
  };

  const fileName = getFileName();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFile = (file: File): boolean => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    return ACCEPTED_EXTENSIONS.includes(extension);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        onChange(file, null);
      } else {
        alert('Formato nao suportado. Use arquivos .stl, .3mf ou .obj');
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        onChange(file, null);
      } else {
        alert('Formato nao suportado. Use arquivos .stl, .3mf ou .obj');
      }
    }
  };

  const handleRemove = () => {
    onChange(null, null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-600 flex items-center gap-1">
          <Box className="w-3 h-3" />
          Arquivo 3D (opcional)
        </label>

        {fileName ? (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <File className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm text-blue-800 truncate flex-1">{fileName}</span>
            {value && (
              <span className="text-xs text-blue-500">{formatFileSize(value.size)}</span>
            )}
            <button
              type="button"
              onClick={handleRemove}
              className="p-1 hover:bg-blue-200 rounded transition-colors"
            >
              <X className="w-3 h-3 text-blue-600" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Selecionar arquivo
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          onChange={handleChange}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
        <Box className="w-4 h-4" />
        Arquivo STL (opcional)
      </label>

      {fileName ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <File className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-blue-900 truncate">{fileName}</p>
              {value && (
                <p className="text-sm text-blue-600">{formatFileSize(value.size)}</p>
              )}
              {existingUrl && !value && (
                <p className="text-sm text-blue-600">Arquivo salvo</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="p-2 hover:bg-blue-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-blue-600" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
        >
          <Upload className={`w-8 h-8 mx-auto mb-3 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
          <p className="text-sm font-medium text-gray-700 mb-1">
            Arraste o arquivo ou clique para selecionar
          </p>
          <p className="text-xs text-gray-500">
            Formatos aceitos: .stl, .3mf, .obj
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(',')}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}

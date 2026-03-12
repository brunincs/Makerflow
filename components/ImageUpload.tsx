'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'

interface ImageUploadProps {
  value?: string
  onChange: (path: string) => void
  onError?: (error: string) => void
}

export default function ImageUpload({ value, onChange, onError }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(value || null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    // Preview local
    const localPreview = URL.createObjectURL(file)
    setPreview(localPreview)

    // Upload
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro no upload')
      }

      onChange(data.path)
      setPreview(data.path)
    } catch (error) {
      setPreview(value || null)
      onError?.(error instanceof Error ? error.message : 'Erro no upload')
    } finally {
      setUploading(false)
    }
  }, [onChange, onError, value])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  })

  const removeImage = () => {
    setPreview(null)
    onChange('')
  }

  return (
    <div className="space-y-2">
      {preview ? (
        <div className="relative">
          <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
          <button
            type="button"
            onClick={removeImage}
            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} disabled={uploading} />
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {uploading ? (
            <p className="mt-2 text-sm text-gray-600">Enviando...</p>
          ) : isDragActive ? (
            <p className="mt-2 text-sm text-blue-600">Solte a imagem aqui</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-gray-600">
                Arraste uma imagem ou clique para selecionar
              </p>
              <p className="mt-1 text-xs text-gray-500">
                PNG, JPG, WEBP ou GIF (max. 5MB)
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

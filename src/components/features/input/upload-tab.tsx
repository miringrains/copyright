'use client'

import { useCallback, useState } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface UploadedFile {
  name: string
  size: number
  content?: string
}

interface UploadTabProps {
  files: UploadedFile[]
  onFilesChange: (files: UploadedFile[]) => void
  isProcessing: boolean
}

export function UploadTab({ files, onFilesChange, isProcessing }: UploadTabProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      
      const droppedFiles = Array.from(e.dataTransfer.files)
      await processFiles(droppedFiles)
    },
    [onFilesChange]
  )

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    await processFiles(selectedFiles)
  }

  const processFiles = async (fileList: File[]) => {
    const newFiles: UploadedFile[] = []
    
    for (const file of fileList) {
      // For now, just store file info - actual parsing happens on submit
      newFiles.push({
        name: file.name,
        size: file.size,
      })
    }
    
    onFilesChange([...files, ...newFiles])
  }

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    onFilesChange(newFiles)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      <Label>Upload documents</Label>
      
      {/* Drop zone */}
      <div
        className={`relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 cursor-pointer opacity-0"
          multiple
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          disabled={isProcessing}
        />
        <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Drag and drop files here, or click to browse
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          PDF, DOC, DOCX, TXT (max 10MB)
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({formatFileSize(file.size)})
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


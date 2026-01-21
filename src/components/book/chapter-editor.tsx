'use client'

import { useState, useRef, useCallback } from 'react'
import { Plus, Trash2, Image as ImageIcon, GripVertical, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ============================================================================
// TYPES
// ============================================================================

export type ContentBlock = 
  | { type: 'text'; content: string; id: string }
  | { type: 'image'; url: string; width: number; alt?: string; id: string; path?: string }

interface ChapterEditorProps {
  projectId: string
  chapterNumber: number
  initialContent: string // Markdown content
  onSave: (blocks: ContentBlock[]) => void
  className?: string
}

// ============================================================================
// HELPERS
// ============================================================================

// Convert markdown to blocks
function markdownToBlocks(markdown: string): ContentBlock[] {
  const blocks: ContentBlock[] = []
  
  // Split by double newlines to get paragraphs
  const parts = markdown.split(/\n\n+/)
  
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue
    
    // Check for image markdown: ![alt](url)
    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)(?:\{width=(\d+)\})?$/)
    if (imageMatch) {
      blocks.push({
        type: 'image',
        id: Math.random().toString(36).slice(2),
        alt: imageMatch[1] || undefined,
        url: imageMatch[2],
        width: imageMatch[3] ? parseInt(imageMatch[3]) : 100,
      })
    } else {
      blocks.push({
        type: 'text',
        id: Math.random().toString(36).slice(2),
        content: trimmed,
      })
    }
  }
  
  return blocks
}

// Convert blocks back to markdown
export function blocksToMarkdown(blocks: ContentBlock[]): string {
  return blocks.map(block => {
    if (block.type === 'text') {
      return block.content
    } else {
      const alt = block.alt || ''
      const widthAttr = block.width !== 100 ? `{width=${block.width}}` : ''
      return `![${alt}](${block.url})${widthAttr}`
    }
  }).join('\n\n')
}

// ============================================================================
// IMAGE BLOCK COMPONENT
// ============================================================================

function ImageBlock({
  block,
  onUpdate,
  onDelete,
}: {
  block: Extract<ContentBlock, { type: 'image' }>
  onUpdate: (updates: Partial<Extract<ContentBlock, { type: 'image' }>>) => void
  onDelete: () => void
}) {
  const [isResizing, setIsResizing] = useState(false)
  
  const handleWidthChange = (delta: number) => {
    const newWidth = Math.max(25, Math.min(100, block.width + delta))
    onUpdate({ width: newWidth })
  }
  
  return (
    <div className="relative group my-4">
      {/* Image container */}
      <div 
        className="relative mx-auto transition-all"
        style={{ width: `${block.width}%` }}
      >
        <img
          src={block.url}
          alt={block.alt || ''}
          className="w-full h-auto rounded-lg shadow-sm border"
        />
        
        {/* Controls overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleWidthChange(-10)}
            className="h-8 w-8 p-0"
            title="Smaller"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <span className="text-white text-sm font-medium px-2">
            {block.width}%
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleWidthChange(10)}
            className="h-8 w-8 p-0"
            title="Larger"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-white/30 mx-1" />
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="h-8 w-8 p-0"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Caption input */}
      <input
        type="text"
        value={block.alt || ''}
        onChange={(e) => onUpdate({ alt: e.target.value })}
        placeholder="Add caption (optional)"
        className="mt-2 text-sm text-center text-muted-foreground w-full bg-transparent border-none focus:outline-none focus:ring-0"
      />
    </div>
  )
}

// ============================================================================
// INSERT BUTTON (appears between blocks)
// ============================================================================

function InsertButton({
  onInsertImage,
  isUploading,
}: {
  onInsertImage: (file: File) => void
  isUploading: boolean
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onInsertImage(file)
      e.target.value = '' // Reset for next selection
    }
  }
  
  return (
    <div
      className="relative h-8 -my-2 flex items-center justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Line */}
      <div className={`absolute inset-x-0 h-px bg-border transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
      
      {/* Button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className={`
          relative z-10 h-7 w-7 rounded-full border bg-background
          flex items-center justify-center
          transition-all duration-200
          ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
          hover:bg-primary hover:text-primary-foreground hover:border-primary
          disabled:opacity-50
        `}
        title="Insert image"
      >
        {isUploading ? (
          <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}

// ============================================================================
// TEXT BLOCK COMPONENT
// ============================================================================

function TextBlock({ content }: { content: string }) {
  // Format markdown content
  const formatContent = (text: string) => {
    return text
      // Headers
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-3">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-medium mt-4 mb-2">$1</h3>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Line breaks within paragraph
      .replace(/\n/g, '<br />')
  }
  
  return (
    <div 
      className="prose prose-sm max-w-none"
      style={{ fontFamily: '"adobe-garamond-pro", Georgia, serif' }}
      dangerouslySetInnerHTML={{ __html: formatContent(content) }}
    />
  )
}

// ============================================================================
// MAIN EDITOR COMPONENT
// ============================================================================

export function ChapterEditor({
  projectId,
  chapterNumber,
  initialContent,
  onSave,
  className = '',
}: ChapterEditorProps) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => 
    markdownToBlocks(initialContent)
  )
  const [uploadingAt, setUploadingAt] = useState<number | null>(null)
  
  // Insert image at position
  const handleInsertImage = useCallback(async (file: File, position: number) => {
    setUploadingAt(position)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('chapterNumber', chapterNumber.toString())
      
      const response = await fetch(`/api/book/${projectId}/images`, {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error('Upload failed')
      }
      
      const { url, path } = await response.json()
      
      // Insert new image block
      const newBlock: ContentBlock = {
        type: 'image',
        id: Math.random().toString(36).slice(2),
        url,
        path,
        width: 80, // Default 80% width
      }
      
      setBlocks(prev => {
        const updated = [...prev]
        updated.splice(position, 0, newBlock)
        return updated
      })
      
    } catch (error) {
      console.error('Failed to upload image:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setUploadingAt(null)
    }
  }, [projectId, chapterNumber])
  
  // Update a block
  const updateBlock = useCallback((index: number, updates: Partial<ContentBlock>) => {
    setBlocks(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], ...updates } as ContentBlock
      return updated
    })
  }, [])
  
  // Delete a block
  const deleteBlock = useCallback(async (index: number) => {
    const block = blocks[index]
    
    // If it's an image, delete from storage too
    if (block.type === 'image' && block.path) {
      try {
        await fetch(`/api/book/${projectId}/images`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: block.path }),
        })
      } catch (error) {
        console.error('Failed to delete image from storage:', error)
      }
    }
    
    setBlocks(prev => prev.filter((_, i) => i !== index))
  }, [blocks, projectId])
  
  // Auto-save on changes
  const handleSave = useCallback(() => {
    onSave(blocks)
  }, [blocks, onSave])
  
  return (
    <div className={`chapter-editor ${className}`}>
      {/* Insert at beginning */}
      <InsertButton
        onInsertImage={(file) => handleInsertImage(file, 0)}
        isUploading={uploadingAt === 0}
      />
      
      {blocks.map((block, index) => (
        <div key={block.id}>
          {block.type === 'text' ? (
            <TextBlock content={block.content} />
          ) : (
            <ImageBlock
              block={block}
              onUpdate={(updates) => updateBlock(index, updates)}
              onDelete={() => deleteBlock(index)}
            />
          )}
          
          {/* Insert button after each block */}
          <InsertButton
            onInsertImage={(file) => handleInsertImage(file, index + 1)}
            isUploading={uploadingAt === index + 1}
          />
        </div>
      ))}
      
      {/* Save indicator */}
      <div className="mt-6 pt-4 border-t flex justify-end">
        <Button onClick={handleSave} variant="secondary" size="sm">
          Save Changes
        </Button>
      </div>
    </div>
  )
}

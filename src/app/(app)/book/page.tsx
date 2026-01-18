'use client'

import { useState, useCallback, useEffect } from 'react'
import { 
  BookOpen, Upload, Layers, Palette, PenTool, Download, 
  ChevronRight, Check, Loader2, FileText, Trash2, Plus,
  ArrowLeft, RefreshCw, ChevronDown, ChevronUp, Eye
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'

// ============================================================================
// TYPES
// ============================================================================

type Step = 'setup' | 'upload' | 'organize' | 'review_chunks' | 'preview' | 'write' | 'export'

interface TOCChapter {
  number: number
  title: string
  description?: string
}

interface UploadedFile {
  id: string
  name: string
  size: number
  status: 'uploading' | 'processing' | 'ready' | 'error'
  chunks?: number
}

interface ChapterProgress {
  chapter: number
  status: 'pending' | 'writing' | 'done'
  wordCount?: number
  content?: string
}

interface ChunkSummary {
  chapterNumber: number
  title: string
  chunkCount: number
  totalWords: number
}

interface InProgressProject {
  id: string
  title: string
  subtitle: string | null
  progress: {
    current_step: Step
    chunks_reviewed: boolean
    tone_approved: boolean
    chapters_written: number[]
    current_chapter: number | null
    last_activity: string | null
  }
  chapters: { total: number; written: number }
  updatedAt: string
}

// ============================================================================
// STEP INDICATOR (Minimal line-based)
// ============================================================================

const STEPS: { key: Step; label: string }[] = [
  { key: 'setup', label: 'Setup' },
  { key: 'upload', label: 'Upload' },
  { key: 'organize', label: 'Organize' },
  { key: 'review_chunks', label: 'Review' },
  { key: 'preview', label: 'Tone' },
  { key: 'write', label: 'Write' },
  { key: 'export', label: 'Export' },
]

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const currentIndex = STEPS.findIndex(s => s.key === currentStep)
  
  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {STEPS.map((step, i) => {
        const isActive = step.key === currentStep
        const isDone = i < currentIndex
        
        return (
          <div key={step.key} className="flex items-center">
            <div className={`
              px-2 py-1 text-xs font-medium transition-colors rounded
              ${isActive ? 'text-foreground bg-muted' : ''}
              ${isDone ? 'text-primary' : ''}
              ${!isActive && !isDone ? 'text-muted-foreground/50' : ''}
            `}>
              {step.label}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-4 h-px mx-1 ${i < currentIndex ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// RESUME CARD
// ============================================================================

function ResumeCard({
  project,
  onContinue,
  onStartNew,
}: {
  project: InProgressProject
  onContinue: () => void
  onStartNew: () => void
}) {
  const stepLabels: Record<string, string> = {
    setup: 'Setting up',
    upload: 'Uploading files',
    organize: 'Organizing content',
    review_chunks: 'Reviewing chunks',
    preview: 'Tone preview',
    write: 'Writing chapters',
    export: 'Ready to export',
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  return (
    <div className="border-l-2 border-primary bg-background p-4 rounded-r-lg">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground mb-0.5">Continue writing</p>
          <p className="font-medium truncate">{project.title}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {stepLabels[project.progress.current_step] || 'In progress'}
            {project.progress.current_step === 'write' && 
              ` · ${project.chapters.written}/${project.chapters.total} chapters`
            }
            {' · '}{formatTime(project.updatedAt)}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={onStartNew}>
            New
          </Button>
          <Button size="sm" onClick={onContinue}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// STEP: SETUP
// ============================================================================

function SetupStep({
  title,
  subtitle,
  toc,
  onTitleChange,
  onSubtitleChange,
  onTOCChange,
  onNext,
}: {
  title: string
  subtitle: string
  toc: TOCChapter[]
  onTitleChange: (v: string) => void
  onSubtitleChange: (v: string) => void
  onTOCChange: (toc: TOCChapter[]) => void
  onNext: () => void
}) {
  const [tocText, setTocText] = useState('')
  
  const parseTOC = useCallback(() => {
    const lines = tocText.split('\n').filter(l => l.trim())
    const chapters: TOCChapter[] = []
    
    lines.forEach((line, i) => {
      const match = line.match(/^(?:Chapter\s+)?(\d+)[.:)\s]+(.+)$/i) ||
                   line.match(/^(\d+)[.:)\s]+(.+)$/i)
      
      if (match) {
        chapters.push({
          number: parseInt(match[1]),
          title: match[2].trim(),
        })
      } else if (line.trim()) {
        chapters.push({
          number: i + 1,
          title: line.trim(),
        })
      }
    })
    
    onTOCChange(chapters)
  }, [tocText, onTOCChange])

  const updateChapter = (index: number, field: keyof TOCChapter, value: string | number) => {
    const updated = [...toc]
    updated[index] = { ...updated[index], [field]: value }
    onTOCChange(updated)
  }

  const removeChapter = (index: number) => {
    onTOCChange(toc.filter((_, i) => i !== index))
  }

  const addChapter = () => {
    onTOCChange([...toc, { number: toc.length + 1, title: '' }])
  }

  const isValid = title.trim() && toc.length > 0 && toc.every(c => c.title.trim())

  return (
    <div className="space-y-8">
      {/* Book Details */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-xs uppercase tracking-wider text-muted-foreground">Title</Label>
          <Input
            id="title"
            placeholder="The Complete Guide to..."
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="text-lg border-0 border-b rounded-none px-0 focus-visible:ring-0"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="subtitle" className="text-xs uppercase tracking-wider text-muted-foreground">Subtitle (optional)</Label>
          <Input
            id="subtitle"
            placeholder="A practical approach to..."
            value={subtitle}
            onChange={(e) => onSubtitleChange(e.target.value)}
            className="border-0 border-b rounded-none px-0 focus-visible:ring-0"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Table of Contents */}
      <div className="space-y-4">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Chapters</Label>
        
        {toc.length === 0 ? (
          <div className="space-y-3">
            <Textarea
              placeholder={`Paste your table of contents:

1. Introduction
2. Getting Started  
3. Core Concepts
4. Advanced Techniques
5. Conclusion`}
              value={tocText}
              onChange={(e) => setTocText(e.target.value)}
              className="min-h-[180px] font-mono text-sm resize-none"
            />
            <Button onClick={parseTOC} disabled={!tocText.trim()} variant="secondary" className="w-full">
              Parse Chapters
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {toc.map((chapter, i) => (
              <div key={i} className="flex items-center gap-2 group">
                <span className="w-6 text-right text-sm text-muted-foreground tabular-nums">
                  {chapter.number}
                </span>
                <Input
                  value={chapter.title}
                  onChange={(e) => updateChapter(i, 'title', e.target.value)}
                  placeholder="Chapter title"
                  className="flex-1 border-0 border-b rounded-none px-2 h-9 focus-visible:ring-0"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeChapter(i)}
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={addChapter} className="text-muted-foreground">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { onTOCChange([]); setTocText('') }}
                className="text-muted-foreground"
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Action */}
      <Button onClick={onNext} disabled={!isValid} className="w-full">
        Continue <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  )
}

// ============================================================================
// STEP: UPLOAD
// ============================================================================

function UploadStep({
  projectId,
  files,
  onFilesChange,
  onNext,
  onBack,
  isProcessing,
}: {
  projectId: string | null
  files: UploadedFile[]
  onFilesChange: (updater: (prev: UploadedFile[]) => UploadedFile[]) => void
  onNext: () => void
  onBack: () => void
  isProcessing: boolean
}) {
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    
    for (const file of selectedFiles) {
      const newFile: UploadedFile = {
        id: Math.random().toString(36).slice(2),
        name: file.name,
        size: file.size,
        status: 'uploading',
      }
      
      onFilesChange(prev => [...prev, newFile])
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId || '')
      
      try {
        const response = await fetch('/api/book/upload', {
          method: 'POST',
          body: formData,
        })
        
        if (response.ok) {
          const data = await response.json()
          onFilesChange(prev =>
            prev.map(f => f.id === newFile.id 
              ? { ...f, status: 'ready' as const, chunks: data.chunks }
              : f
            )
          )
        } else {
          onFilesChange(prev =>
            prev.map(f => f.id === newFile.id ? { ...f, status: 'error' as const } : f)
          )
        }
      } catch {
        onFilesChange(prev =>
          prev.map(f => f.id === newFile.id ? { ...f, status: 'error' as const } : f)
        )
      }
    }
  }

  const removeFile = (id: string) => {
    onFilesChange(prev => prev.filter(f => f.id !== id))
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const allReady = files.length > 0 && files.every(f => f.status === 'ready')

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <label className="flex flex-col items-center justify-center w-full py-12 border border-dashed rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors">
        <Upload className="h-6 w-6 text-muted-foreground mb-2" />
        <span className="text-sm">Drop files or click to browse</span>
        <span className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT, MD</span>
        <input
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.docx,.doc,.txt,.md"
          onChange={handleFileSelect}
        />
      </label>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map(file => (
            <div
              key={file.id}
              className="flex items-center gap-3 py-2 group"
            >
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm truncate block">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatSize(file.size)}
                  {file.chunks && ` · ${file.chunks} chunks`}
                </span>
              </div>
              {file.status === 'uploading' && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
              {file.status === 'ready' && (
                <Check className="h-3.5 w-3.5 text-primary" />
              )}
              {file.status === 'error' && (
                <span className="text-xs text-destructive">Failed</span>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFile(file.id)}
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button 
          onClick={onNext} 
          disabled={!allReady || isProcessing} 
          className="flex-1"
        >
          {isProcessing ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
          ) : (
            <>Continue <ChevronRight className="ml-1 h-4 w-4" /></>
          )}
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// STEP: CHUNK REVIEW
// ============================================================================

function ChunkReviewStep({
  projectId,
  chapters,
  onApprove,
  onBack,
}: {
  projectId: string | null
  chapters: TOCChapter[]
  onApprove: () => void
  onBack: () => void
}) {
  const [chunkSummary, setChunkSummary] = useState<ChunkSummary[]>([])
  const [unassignedCount, setUnassignedCount] = useState(0)
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null)
  const [chapterChunks, setChapterChunks] = useState<{ id: string; content: string; wordCount: number }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingChunks, setIsLoadingChunks] = useState(false)

  // Load chunk summary
  useEffect(() => {
    if (!projectId) return
    
    fetch(`/api/book/${projectId}/chunks`)
      .then(res => res.json())
      .then(data => {
        setChunkSummary(data.chapters || [])
        setUnassignedCount(data.unassigned?.chunkCount || 0)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [projectId])

  // Load chunks for expanded chapter
  const toggleChapter = async (chapterNum: number) => {
    if (expandedChapter === chapterNum) {
      setExpandedChapter(null)
      setChapterChunks([])
      return
    }
    
    setExpandedChapter(chapterNum)
    setIsLoadingChunks(true)
    
    try {
      const res = await fetch(`/api/book/${projectId}/chunks?chapter=${chapterNum}`)
      const data = await res.json()
      setChapterChunks(data.chunks || [])
    } catch {
      setChapterChunks([])
    } finally {
      setIsLoadingChunks(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        {chunkSummary.map((ch) => (
          <div key={ch.chapterNumber}>
            <button
              onClick={() => toggleChapter(ch.chapterNumber)}
              className="flex items-center justify-between w-full py-2.5 px-1 hover:bg-muted/50 rounded transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="w-5 text-right text-sm text-muted-foreground tabular-nums">
                  {ch.chapterNumber}
                </span>
                <span className="text-sm">{ch.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {ch.chunkCount} chunks · {ch.totalWords.toLocaleString()} words
                </span>
                {expandedChapter === ch.chapterNumber ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
            </button>
            
            {expandedChapter === ch.chapterNumber && (
              <div className="ml-8 mb-2 space-y-2 border-l pl-4">
                {isLoadingChunks ? (
                  <div className="flex items-center py-3">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  </div>
                ) : chapterChunks.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No content assigned</p>
                ) : (
                  chapterChunks.map((chunk, i) => (
                    <div key={chunk.id} className="text-sm">
                      <span className="text-xs text-muted-foreground">
                        {i + 1}. {chunk.wordCount} words
                      </span>
                      <p className="text-muted-foreground line-clamp-2 mt-0.5">{chunk.content}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {unassignedCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {unassignedCount} chunks unassigned — available to all chapters
        </p>
      )}

      <div className="flex gap-2 pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button onClick={onApprove} className="flex-1">
          Continue <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// STEP: TONE PREVIEW
// ============================================================================

function TonePreviewStep({
  sample,
  isLoading,
  onApprove,
  onRegenerate,
  onBack,
  feedback,
  onFeedbackChange,
}: {
  sample: string | null
  isLoading: boolean
  onApprove: () => void
  onRegenerate: () => void
  onBack: () => void
  feedback: string
  onFeedbackChange: (v: string) => void
}) {
  return (
    <div className="space-y-6">
      {/* Sample display */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : sample ? (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {sample.split('\n').map((p, i) => (
            <p key={i} className="mb-3 last:mb-0 leading-relaxed">{p}</p>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Generate a sample to preview the writing style
        </div>
      )}

      {/* Feedback */}
      {sample && (
        <div className="space-y-2 pt-4 border-t">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Adjustments (optional)
          </Label>
          <Textarea
            placeholder="More conversational, shorter sentences, add stories..."
            value={feedback}
            onChange={(e) => onFeedbackChange(e.target.value)}
            className="min-h-[70px] resize-none"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        {sample ? (
          <>
            <Button 
              variant="ghost" 
              onClick={onRegenerate}
              disabled={isLoading}
            >
              <RefreshCw className="mr-1 h-4 w-4" /> Regenerate
            </Button>
            <Button onClick={onApprove} className="flex-1">
              Approve <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button onClick={onRegenerate} disabled={isLoading} className="flex-1">
            Generate Preview
          </Button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// STEP: WRITE (Chapter-by-Chapter OR Write All)
// ============================================================================

type WriteMode = 'select' | 'chapter' | 'all'

function WriteStep({
  projectId,
  chapters,
  progress,
  currentChapterNumber,
  currentChapterContent,
  isWriting,
  isWritingAll,
  writeAllProgress,
  onWriteChapter,
  onWriteAll,
  onApproveChapter,
  onRegenerateChapter,
  onBack,
  onContinue,
  isComplete,
}: {
  projectId: string | null
  chapters: TOCChapter[]
  progress: ChapterProgress[]
  currentChapterNumber: number | null
  currentChapterContent: string | null
  isWriting: boolean
  isWritingAll: boolean
  writeAllProgress: { current: number; total: number; status: string } | null
  onWriteChapter: (chapterNum: number) => void
  onWriteAll: () => void
  onApproveChapter: () => void
  onRegenerateChapter: () => void
  onBack: () => void
  onContinue: () => void
  isComplete: boolean
}) {
  const [mode, setMode] = useState<WriteMode>('select')
  
  const totalWords = progress.reduce((sum, p) => sum + (p.wordCount || 0), 0)
  const completedCount = progress.filter(p => p.status === 'done').length
  const progressPercent = (completedCount / chapters.length) * 100
  
  // Find next chapter to write
  const nextPending = chapters.find(ch => {
    const p = progress.find(pr => pr.chapter === ch.number)
    return !p || p.status === 'pending'
  })
  
  const pendingCount = chapters.filter(ch => {
    const p = progress.find(pr => pr.chapter === ch.number)
    return !p || p.status === 'pending'
  }).length

  // Currently previewing a chapter that was just written
  const isPreviewing = currentChapterContent && !isWriting && !isWritingAll
  
  // Auto-select chapter mode if some chapters are already done
  useEffect(() => {
    if (completedCount > 0 && mode === 'select') {
      setMode('chapter')
    }
  }, [completedCount, mode])

  // Mode Selection Screen
  if (mode === 'select' && completedCount === 0 && !isWriting && !isWritingAll) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <button
            onClick={() => { setMode('all'); onWriteAll(); }}
            className="w-full p-4 rounded-lg border hover:border-primary/50 transition-all text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium mb-0.5">Write All at Once</h3>
                <p className="text-sm text-muted-foreground">
                  Generate all {chapters.length} chapters automatically
                </p>
              </div>
              <span className="text-xs text-muted-foreground">~{Math.ceil(chapters.length * 2)} min</span>
            </div>
          </button>
          
          <button
            onClick={() => setMode('chapter')}
            className="w-full p-4 rounded-lg border hover:border-primary/50 transition-all text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium mb-0.5">Chapter by Chapter</h3>
                <p className="text-sm text-muted-foreground">
                  Write and review each chapter individually
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        </div>
        
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      </div>
    )
  }

  // Write All Progress Screen
  if (isWritingAll && writeAllProgress) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-4" />
          <p className="font-medium mb-1">
            Writing Chapter {currentChapterNumber}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {chapters.find(c => c.number === currentChapterNumber)?.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {writeAllProgress.current} of {writeAllProgress.total} complete
            {totalWords > 0 && ` · ${totalWords.toLocaleString()} words`}
          </p>
        </div>
        
        <Progress 
          value={(writeAllProgress.current / writeAllProgress.total) * 100} 
          className="h-1" 
        />
        
        <p className="text-center text-xs text-muted-foreground">
          Content saved automatically
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress summary */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {completedCount} of {chapters.length} chapters
        </span>
        {totalWords > 0 && (
          <span className="text-muted-foreground">{totalWords.toLocaleString()} words</span>
        )}
      </div>
      
      <Progress value={progressPercent} className="h-1" />

      {/* Chapter Preview */}
      {isPreviewing && (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Chapter {currentChapterNumber}: {chapters.find(c => c.number === currentChapterNumber)?.title}
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none max-h-[350px] overflow-y-auto whitespace-pre-wrap">
            {currentChapterContent}
          </div>
        </div>
      )}

      {/* Writing indicator */}
      {isWriting && !isWritingAll && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Writing Chapter {currentChapterNumber}...
            </p>
          </div>
        </div>
      )}

      {/* Chapter List */}
      {!isPreviewing && !isWriting && !isComplete && (
        <div className="space-y-1">
          {pendingCount > 1 && (
            <div className="flex justify-end mb-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onWriteAll}
                className="text-xs"
              >
                Write All ({pendingCount})
              </Button>
            </div>
          )}
          {chapters.map((chapter) => {
            const chapterProgress = progress.find(p => p.chapter === chapter.number)
            const status = chapterProgress?.status || 'pending'
            const isNext = chapter.number === nextPending?.number
            
            return (
              <div
                key={chapter.number}
                className={`flex items-center gap-3 py-2 px-1 rounded transition-colors ${
                  isNext ? 'bg-muted' : ''
                }`}
              >
                <span className="w-5 text-right text-sm text-muted-foreground tabular-nums">
                  {chapter.number}
                </span>
                <span className="flex-1 text-sm">{chapter.title}</span>
                {status === 'done' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {chapterProgress?.wordCount?.toLocaleString()}
                    </span>
                    <Check className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                {isNext && (
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => onWriteChapter(chapter.number)}
                  >
                    Write
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Complete state */}
      {isComplete && (
        <div className="text-center py-8">
          <Check className="h-6 w-6 text-primary mx-auto mb-3" />
          <p className="font-medium">All chapters complete</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        
        {isPreviewing ? (
          <>
            <Button 
              variant="ghost" 
              onClick={onRegenerateChapter}
            >
              <RefreshCw className="mr-1 h-4 w-4" /> Regenerate
            </Button>
            <Button onClick={onApproveChapter} className="flex-1">
              Approve <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </>
        ) : isComplete ? (
          <Button onClick={onContinue} className="flex-1">
            Continue <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}

// ============================================================================
// STEP: EXPORT
// ============================================================================

function ExportStep({
  title,
  totalWords,
  chapterCount,
  onDownload,
  isDownloading,
  onBack,
  onStartOver,
}: {
  title: string
  totalWords: number
  chapterCount: number
  onDownload: () => void
  isDownloading: boolean
  onBack: () => void
  onStartOver: () => void
}) {
  return (
    <div className="space-y-8">
      <div className="text-center py-8">
        <Check className="h-8 w-8 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-1">{title}</h2>
        <p className="text-sm text-muted-foreground">
          {chapterCount} chapters · {totalWords.toLocaleString()} words
        </p>
      </div>
      
      <Button onClick={onDownload} disabled={isDownloading} className="w-full">
        {isDownloading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
        ) : (
          <><Download className="mr-2 h-4 w-4" /> Download Word Document</>
        )}
      </Button>

      <div className="flex gap-2 pt-4 border-t">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Review
        </Button>
        <Button variant="ghost" onClick={onStartOver} className="flex-1">
          Start New Book
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function BookPage() {
  const [step, setStep] = useState<Step>('setup')
  const [projectId, setProjectId] = useState<string | null>(null)
  
  // Resume state
  const [inProgressProject, setInProgressProject] = useState<InProgressProject | null>(null)
  const [showResume, setShowResume] = useState(false)
  const [checkingResume, setCheckingResume] = useState(true)
  
  // Setup state
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [toc, setToc] = useState<TOCChapter[]>([])
  
  // Upload state
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Tone preview state
  const [toneSample, setToneSample] = useState<string | null>(null)
  const [toneLoading, setToneLoading] = useState(false)
  const [toneFeedback, setToneFeedback] = useState('')
  
  // Write state
  const [chapterProgress, setChapterProgress] = useState<ChapterProgress[]>([])
  const [currentChapter, setCurrentChapter] = useState<number | null>(null)
  const [currentChapterContent, setCurrentChapterContent] = useState<string | null>(null)
  const [isWritingChapter, setIsWritingChapter] = useState(false)
  const [isWritingAll, setIsWritingAll] = useState(false)
  const [writeAllProgress, setWriteAllProgress] = useState<{ current: number; total: number; status: string } | null>(null)
  const [writeComplete, setWriteComplete] = useState(false)
  
  // Export state
  const [isDownloading, setIsDownloading] = useState(false)

  // Check for in-progress projects on load
  useEffect(() => {
    fetch('/api/book')
      .then(res => res.json())
      .then(data => {
        if (data.projects && data.projects.length > 0) {
          setInProgressProject(data.projects[0])
          setShowResume(true)
        }
      })
      .catch(() => {})
      .finally(() => setCheckingResume(false))
  }, [])

  // Update progress in database
  const updateProgress = useCallback(async (updates: Record<string, unknown>) => {
    if (!projectId) return
    
    await fetch(`/api/book/${projectId}/progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
  }, [projectId])

  // Resume a project
  const handleResume = async () => {
    if (!inProgressProject) return
    
    setProjectId(inProgressProject.id)
    setTitle(inProgressProject.title)
    setSubtitle(inProgressProject.subtitle || '')
    
    // Load project details including table of contents
    const progressRes = await fetch(`/api/book/${inProgressProject.id}/progress`)
    const progressData = await progressRes.json()
    
    // Set TOC from the saved table_of_contents
    if (progressData.tableOfContents && Array.isArray(progressData.tableOfContents)) {
      setToc(progressData.tableOfContents.map((ch: { number: number; title: string }) => ({
        number: ch.number,
        title: ch.title,
      })))
    }
    
    // Set chapter progress from chapter details
    if (progressData.chapters?.details) {
      setChapterProgress(progressData.chapters.details.map((ch: { chapter_number: number; status: string; word_count?: number }) => ({
        chapter: ch.chapter_number,
        status: ch.status === 'done' ? 'done' : 'pending',
        wordCount: ch.word_count || 0,
      })))
    }
    
    // Navigate to correct step
    const currentStep = inProgressProject.progress.current_step
    setStep(currentStep)
    setShowResume(false)
  }

  // Create project and move to upload
  const handleSetupNext = async () => {
    try {
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, subtitle, tableOfContents: toc }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setProjectId(data.id)
        setStep('upload')
      }
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  // Process uploads and organize
  const handleUploadNext = async () => {
    setIsProcessing(true)
    try {
      await fetch(`/api/book/${projectId}/organize`, { method: 'POST' })
      await updateProgress({ current_step: 'review_chunks' })
      setStep('review_chunks')
    } catch (error) {
      console.error('Failed to organize:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Approve chunk mapping
  const handleApproveChunks = async () => {
    await updateProgress({ current_step: 'preview', chunks_reviewed: true })
    setStep('preview')
    handleGenerateTone()
  }

  // Generate tone sample
  const handleGenerateTone = async () => {
    setToneLoading(true)
    try {
      const response = await fetch(`/api/book/${projectId}/tone-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: toneFeedback }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setToneSample(data.sample)
      }
    } catch (error) {
      console.error('Failed to generate tone:', error)
    } finally {
      setToneLoading(false)
    }
  }

  // Approve tone and start writing mode
  const handleApproveTone = async () => {
    await updateProgress({ current_step: 'write', tone_approved: true })
    setStep('write')
    setChapterProgress(toc.map(c => ({ chapter: c.number, status: 'pending' })))
  }

  // Write a single chapter
  const handleWriteChapter = async (chapterNum: number) => {
    setCurrentChapter(chapterNum)
    setCurrentChapterContent(null)
    setIsWritingChapter(true)
    
    await updateProgress({ current_chapter: chapterNum })
    
    try {
      const response = await fetch(`/api/book/${projectId}/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterNumber: chapterNum }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setCurrentChapterContent(data.content)
        setChapterProgress(prev =>
          prev.map(p => p.chapter === chapterNum 
            ? { ...p, status: 'writing' as const, wordCount: data.wordCount, content: data.content }
            : p
          )
        )
      }
    } catch (error) {
      console.error(`Failed to write chapter ${chapterNum}:`, error)
    } finally {
      setIsWritingChapter(false)
    }
  }

  // Approve chapter and continue
  const handleApproveChapter = async () => {
    if (!currentChapter) return
    
    // Mark as done
    setChapterProgress(prev =>
      prev.map(p => p.chapter === currentChapter ? { ...p, status: 'done' as const } : p)
    )
    
    // Update progress in DB
    const chaptersWritten = chapterProgress
      .filter(p => p.status === 'done')
      .map(p => p.chapter)
    chaptersWritten.push(currentChapter)
    
    await updateProgress({ chapters_written: chaptersWritten })
    
    // Check if complete
    const allDone = toc.every(ch => 
      chaptersWritten.includes(ch.number)
    )
    
    if (allDone) {
      setWriteComplete(true)
      await updateProgress({ current_step: 'export' })
    }
    
    // Clear current chapter preview
    setCurrentChapterContent(null)
    setCurrentChapter(null)
  }

  // Regenerate current chapter
  const handleRegenerateChapter = () => {
    if (currentChapter) {
      handleWriteChapter(currentChapter)
    }
  }

  // Write all remaining chapters
  const handleWriteAll = async () => {
    // Get list of pending chapters
    const pendingChapters = toc.filter(ch => {
      const p = chapterProgress.find(pr => pr.chapter === ch.number)
      return !p || p.status === 'pending'
    })
    
    if (pendingChapters.length === 0) {
      setWriteComplete(true)
      return
    }
    
    setIsWritingAll(true)
    setWriteAllProgress({ current: 0, total: pendingChapters.length, status: 'Starting...' })
    
    const allChaptersWritten: number[] = chapterProgress
      .filter(p => p.status === 'done')
      .map(p => p.chapter)
    
    for (let i = 0; i < pendingChapters.length; i++) {
      const chapter = pendingChapters[i]
      setCurrentChapter(chapter.number)
      setWriteAllProgress({ 
        current: i, 
        total: pendingChapters.length, 
        status: `Writing chapter ${chapter.number}...` 
      })
      
      // Update progress to show writing status
      setChapterProgress(prev =>
        prev.map(p => p.chapter === chapter.number 
          ? { ...p, status: 'writing' as const }
          : p
        )
      )
      
      try {
        const response = await fetch(`/api/book/${projectId}/write`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chapterNumber: chapter.number }),
        })
        
        if (response.ok) {
          const data = await response.json()
          
          // Mark as done with word count
          setChapterProgress(prev =>
            prev.map(p => p.chapter === chapter.number 
              ? { ...p, status: 'done' as const, wordCount: data.wordCount, content: data.content }
              : p
            )
          )
          
          allChaptersWritten.push(chapter.number)
          
          // Update progress in DB after each chapter
          await updateProgress({ 
            chapters_written: allChaptersWritten,
            current_chapter: chapter.number,
          })
        } else {
          console.error(`Failed to write chapter ${chapter.number}`)
          // Continue with next chapter even if one fails
        }
      } catch (error) {
        console.error(`Error writing chapter ${chapter.number}:`, error)
        // Continue with next chapter
      }
    }
    
    // Complete
    setWriteAllProgress({ 
      current: pendingChapters.length, 
      total: pendingChapters.length, 
      status: 'All chapters complete!' 
    })
    
    setIsWritingAll(false)
    setWriteComplete(true)
    setCurrentChapter(null)
    await updateProgress({ current_step: 'export' })
  }

  // Download book
  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const response = await fetch(`/api/book/${projectId}/export`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.docx`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to download:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  // Reset everything
  const handleStartOver = () => {
    setStep('setup')
    setProjectId(null)
    setTitle('')
    setSubtitle('')
    setToc([])
    setFiles([])
    setToneSample(null)
    setToneFeedback('')
    setChapterProgress([])
    setCurrentChapter(null)
    setCurrentChapterContent(null)
    setIsWritingAll(false)
    setWriteAllProgress(null)
    setWriteComplete(false)
    setShowResume(false)
    setInProgressProject(null)
  }

  const totalWords = chapterProgress.reduce((sum, p) => sum + (p.wordCount || 0), 0)

  // Loading state while checking for resume
  if (checkingResume) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Clean header - no icons, just type */}
      <div className="text-center pt-4 pb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Book Writer</h1>
        {!showResume && (
          <p className="text-sm text-muted-foreground mt-1">
            {step === 'setup' && 'Start with your title and chapters'}
            {step === 'upload' && 'Upload your research materials'}
            {step === 'organize' && 'Organizing your content'}
            {step === 'review_chunks' && 'Review how content maps to chapters'}
            {step === 'preview' && 'Preview and approve the writing style'}
            {step === 'write' && 'Write your book'}
            {step === 'export' && 'Download your finished book'}
          </p>
        )}
      </div>

      {/* Resume Card */}
      {showResume && inProgressProject && (
        <div className="mb-8">
          <ResumeCard
            project={inProgressProject}
            onContinue={handleResume}
            onStartNew={() => { setShowResume(false); setInProgressProject(null) }}
          />
        </div>
      )}

      {!showResume && (
        <>
          <StepIndicator currentStep={step} />

          {/* Content area with paper-like appearance */}
          <div className="bg-background rounded-lg border shadow-sm p-6 md:p-8">
            {step === 'setup' && (
              <SetupStep
                title={title}
                subtitle={subtitle}
                toc={toc}
                onTitleChange={setTitle}
                onSubtitleChange={setSubtitle}
                onTOCChange={setToc}
                onNext={handleSetupNext}
              />
            )}

            {step === 'upload' && (
              <UploadStep
                projectId={projectId}
                files={files}
                onFilesChange={setFiles}
                onNext={handleUploadNext}
                onBack={() => setStep('setup')}
                isProcessing={isProcessing}
              />
            )}

            {step === 'organize' && (
              <div className="text-center py-12">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">Organizing content...</p>
              </div>
            )}

            {step === 'review_chunks' && (
              <ChunkReviewStep
                projectId={projectId}
                chapters={toc}
                onApprove={handleApproveChunks}
                onBack={() => setStep('upload')}
              />
            )}

            {step === 'preview' && (
              <TonePreviewStep
                sample={toneSample}
                isLoading={toneLoading}
                onApprove={handleApproveTone}
                onRegenerate={handleGenerateTone}
                onBack={() => setStep('review_chunks')}
                feedback={toneFeedback}
                onFeedbackChange={setToneFeedback}
              />
            )}

            {step === 'write' && (
              <WriteStep
                projectId={projectId}
                chapters={toc}
                progress={chapterProgress}
                currentChapterNumber={currentChapter}
                currentChapterContent={currentChapterContent}
                isWriting={isWritingChapter}
                isWritingAll={isWritingAll}
                writeAllProgress={writeAllProgress}
                onWriteChapter={handleWriteChapter}
                onWriteAll={handleWriteAll}
                onApproveChapter={handleApproveChapter}
                onRegenerateChapter={handleRegenerateChapter}
                onBack={() => setStep('preview')}
                onContinue={() => setStep('export')}
                isComplete={writeComplete}
              />
            )}

            {step === 'export' && (
              <ExportStep
                title={title}
                totalWords={totalWords}
                chapterCount={toc.length}
                onDownload={handleDownload}
                isDownloading={isDownloading}
                onBack={() => setStep('write')}
                onStartOver={handleStartOver}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}

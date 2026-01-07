'use client'

import { useState, useCallback } from 'react'
import { 
  BookOpen, Upload, Layers, Palette, PenTool, Download, 
  ChevronRight, Check, Loader2, FileText, Trash2, Plus,
  ArrowLeft
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

type Step = 'setup' | 'upload' | 'organize' | 'preview' | 'write' | 'export'

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
}

// ============================================================================
// STEP INDICATOR
// ============================================================================

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: 'setup', label: 'Setup', icon: BookOpen },
  { key: 'upload', label: 'Upload', icon: Upload },
  { key: 'organize', label: 'Organize', icon: Layers },
  { key: 'preview', label: 'Tone', icon: Palette },
  { key: 'write', label: 'Write', icon: PenTool },
  { key: 'export', label: 'Export', icon: Download },
]

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const currentIndex = STEPS.findIndex(s => s.key === currentStep)
  
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, i) => {
        const Icon = step.icon
        const isActive = step.key === currentStep
        const isDone = i < currentIndex
        
        return (
          <div key={step.key} className="flex items-center">
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-all
              ${isActive ? 'bg-primary text-primary-foreground scale-110' : ''}
              ${isDone ? 'bg-primary/20 text-primary' : ''}
              ${!isActive && !isDone ? 'bg-muted text-muted-foreground' : ''}
            `}>
              {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight className={`h-4 w-4 mx-1 ${i < currentIndex ? 'text-primary' : 'text-muted-foreground/50'}`} />
            )}
          </div>
        )
      })}
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
      // Try to parse "1. Chapter Title" or "Chapter 1: Title" patterns
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
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Book Details</CardTitle>
          <CardDescription>Enter your book title and table of contents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Book Title</Label>
            <Input
              id="title"
              placeholder="The Complete Guide to..."
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="text-lg"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtitle (optional)</Label>
            <Input
              id="subtitle"
              placeholder="A practical approach to..."
              value={subtitle}
              onChange={(e) => onSubtitleChange(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Table of Contents</CardTitle>
          <CardDescription>
            Paste your chapter list below, or add chapters manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {toc.length === 0 ? (
            <div className="space-y-3">
              <Textarea
                placeholder={`Paste your table of contents here, e.g.:

1. Introduction
2. Getting Started
3. Core Concepts
4. Advanced Techniques
5. Conclusion`}
                value={tocText}
                onChange={(e) => setTocText(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
              <Button onClick={parseTOC} disabled={!tocText.trim()} className="w-full">
                Parse Table of Contents
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {toc.map((chapter, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-8 text-center text-muted-foreground text-sm">
                    {chapter.number}.
                  </span>
                  <Input
                    value={chapter.title}
                    onChange={(e) => updateChapter(i, 'title', e.target.value)}
                    placeholder="Chapter title"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeChapter(i)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={addChapter} className="w-full mt-2">
                <Plus className="h-4 w-4 mr-2" /> Add Chapter
              </Button>
              <Button
                variant="ghost"
                onClick={() => { onTOCChange([]); setTocText('') }}
                className="w-full text-muted-foreground"
              >
                Start Over
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={onNext} disabled={!isValid} className="w-full h-12">
        Continue to Upload <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  )
}

// ============================================================================
// STEP: UPLOAD
// ============================================================================

function UploadStep({
  files,
  onFilesChange,
  onNext,
  onBack,
  isProcessing,
}: {
  files: UploadedFile[]
  onFilesChange: (files: UploadedFile[]) => void
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
      
      onFilesChange([...files, newFile])
      
      // Upload file
      const formData = new FormData()
      formData.append('file', file)
      
      try {
        const response = await fetch('/api/book/upload', {
          method: 'POST',
          body: formData,
        })
        
        if (response.ok) {
          const data = await response.json()
          onFilesChange(
            files.map(f => f.id === newFile.id 
              ? { ...f, status: 'ready' as const, chunks: data.chunks }
              : f
            )
          )
        } else {
          onFilesChange(
            files.map(f => f.id === newFile.id ? { ...f, status: 'error' as const } : f)
          )
        }
      } catch {
        onFilesChange(
          files.map(f => f.id === newFile.id ? { ...f, status: 'error' as const } : f)
        )
      }
    }
  }

  const removeFile = (id: string) => {
    onFilesChange(files.filter(f => f.id !== id))
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const allReady = files.length > 0 && files.every(f => f.status === 'ready')

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Upload Source Materials</CardTitle>
          <CardDescription>
            Upload PDFs, Word documents, or text files with your research and content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">
              Drop files here or click to browse
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              PDF, DOCX, TXT, MD
            </span>
            <input
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.docx,.doc,.txt,.md"
              onChange={handleFileSelect}
            />
          </label>

          {files.length > 0 && (
            <div className="space-y-2 mt-4">
              {files.map(file => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatSize(file.size)}
                      {file.chunks && ` • ${file.chunks} chunks`}
                    </div>
                  </div>
                  {file.status === 'uploading' && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {file.status === 'ready' && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                  {file.status === 'error' && (
                    <span className="text-xs text-destructive">Error</span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(file.id)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button 
          onClick={onNext} 
          disabled={!allReady || isProcessing} 
          className="flex-1"
        >
          {isProcessing ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
          ) : (
            <>Continue <ChevronRight className="ml-2 h-4 w-4" /></>
          )}
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
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Tone Preview</CardTitle>
          <CardDescription>
            Review this sample passage. Approve it or request adjustments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sample ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="p-4 bg-muted/30 rounded-lg border">
                {sample.split('\n').map((p, i) => (
                  <p key={i} className="mb-3 last:mb-0">{p}</p>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Click &quot;Generate Preview&quot; to see a sample
            </div>
          )}
        </CardContent>
      </Card>

      {sample && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Adjustments (optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Make it more conversational, add more stories, use shorter sentences..."
              value={feedback}
              onChange={(e) => onFeedbackChange(e.target.value)}
              className="min-h-[80px]"
            />
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {sample ? (
          <>
            <Button 
              variant="outline" 
              onClick={onRegenerate}
              disabled={isLoading}
              className="flex-1"
            >
              Regenerate
            </Button>
            <Button onClick={onApprove} className="flex-1">
              Approve & Continue <ChevronRight className="ml-2 h-4 w-4" />
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
// STEP: WRITE
// ============================================================================

function WriteStep({
  chapters,
  progress,
  currentChapter,
  onBack,
  onContinue,
  isComplete,
}: {
  chapters: TOCChapter[]
  progress: ChapterProgress[]
  currentChapter: number | null
  onBack: () => void
  onContinue: () => void
  isComplete: boolean
}) {
  const totalWords = progress.reduce((sum, p) => sum + (p.wordCount || 0), 0)
  const completedCount = progress.filter(p => p.status === 'done').length
  const progressPercent = (completedCount / chapters.length) * 100

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Writing Chapters</CardTitle>
          <CardDescription>
            {isComplete 
              ? `All ${chapters.length} chapters complete! ${totalWords.toLocaleString()} words total.`
              : `Writing chapter ${currentChapter || 1} of ${chapters.length}...`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progressPercent} className="h-2" />
          
          <div className="space-y-2 mt-4">
            {chapters.map((chapter, i) => {
              const chapterProgress = progress.find(p => p.chapter === chapter.number)
              const status = chapterProgress?.status || 'pending'
              
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    status === 'writing' ? 'bg-primary/10 border border-primary/20' :
                    status === 'done' ? 'bg-muted/50' : 'bg-muted/30'
                  }`}
                >
                  <span className="w-6 text-center text-sm text-muted-foreground">
                    {chapter.number}
                  </span>
                  <span className="flex-1 text-sm">{chapter.title}</span>
                  {status === 'writing' && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {status === 'done' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {chapterProgress?.wordCount?.toLocaleString()} words
                      </span>
                      <Check className="h-4 w-4 text-green-500" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={!isComplete} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={onContinue} disabled={!isComplete} className="flex-1">
          Continue to Export <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
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
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card className="border-2 border-primary/50">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Check className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>Your book is ready for download</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center gap-8 text-center">
            <div>
              <div className="text-2xl font-bold">{chapterCount}</div>
              <div className="text-sm text-muted-foreground">Chapters</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{totalWords.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Words</div>
            </div>
          </div>
          
          <Button onClick={onDownload} disabled={isDownloading} className="w-full h-12">
            {isDownloading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
            ) : (
              <><Download className="mr-2 h-5 w-5" /> Download as Word Document</>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" /> Review
        </Button>
        <Button variant="outline" onClick={onStartOver} className="flex-1">
          <Plus className="mr-2 h-4 w-4" /> Write Another Book
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
  const [writeComplete, setWriteComplete] = useState(false)
  
  // Export state
  const [isDownloading, setIsDownloading] = useState(false)

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
      setStep('preview')
      handleGenerateTone()
    } catch (error) {
      console.error('Failed to organize:', error)
    } finally {
      setIsProcessing(false)
    }
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

  // Approve tone and start writing
  const handleApproveTone = async () => {
    setStep('write')
    setChapterProgress(toc.map(c => ({ chapter: c.number, status: 'pending' })))
    
    // Start writing chapters
    for (const chapter of toc) {
      setCurrentChapter(chapter.number)
      setChapterProgress(prev => 
        prev.map(p => p.chapter === chapter.number ? { ...p, status: 'writing' } : p)
      )
      
      try {
        const response = await fetch(`/api/book/${projectId}/write`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chapterNumber: chapter.number }),
        })
        
        if (response.ok) {
          const data = await response.json()
          setChapterProgress(prev =>
            prev.map(p => p.chapter === chapter.number 
              ? { ...p, status: 'done', wordCount: data.wordCount }
              : p
            )
          )
        }
      } catch (error) {
        console.error(`Failed to write chapter ${chapter.number}:`, error)
      }
    }
    
    setWriteComplete(true)
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
    setWriteComplete(false)
  }

  const totalWords = chapterProgress.reduce((sum, p) => sum + (p.wordCount || 0), 0)

  return (
    <div className="container max-w-4xl py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Book Writer</h1>
        <p className="text-muted-foreground mt-2">
          Turn your research into a polished book
        </p>
      </div>

      <StepIndicator currentStep={step} />

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
          files={files}
          onFilesChange={setFiles}
          onNext={handleUploadNext}
          onBack={() => setStep('setup')}
          isProcessing={isProcessing}
        />
      )}

      {step === 'organize' && (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Organizing content...</p>
        </div>
      )}

      {step === 'preview' && (
        <TonePreviewStep
          sample={toneSample}
          isLoading={toneLoading}
          onApprove={handleApproveTone}
          onRegenerate={handleGenerateTone}
          onBack={() => setStep('upload')}
          feedback={toneFeedback}
          onFeedbackChange={setToneFeedback}
        />
      )}

      {step === 'write' && (
        <WriteStep
          chapters={toc}
          progress={chapterProgress}
          currentChapter={currentChapter}
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
  )
}


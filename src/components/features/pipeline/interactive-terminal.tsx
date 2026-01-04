'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Terminal, ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import type { QuestionForUser } from '@/lib/schemas/scan-result'
import type { PipelinePhase } from '@/core/pipeline/question-orchestrator'

// ============================================================================
// TYPES
// ============================================================================

interface TerminalLine {
  id: string
  type: 'system' | 'info' | 'success' | 'error' | 'question' | 'answer' | 'waiting'
  content: string
  timestamp: Date
}

interface InteractiveTerminalProps {
  // State
  phase: PipelinePhase
  phaseMessage: string
  questions: QuestionForUser[]
  isWaitingForAnswers: boolean
  
  // Callbacks
  onAnswersSubmit: (answers: Record<string, string>) => void
  
  // Display
  facts?: string[]
  gaps?: string[]
}

// ============================================================================
// TERMINAL COMPONENT
// ============================================================================

export function InteractiveTerminal({
  phase,
  phaseMessage,
  questions,
  isWaitingForAnswers,
  onAnswersSubmit,
  facts = [],
  gaps = [],
}: InteractiveTerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Add a line to the terminal
  const addLine = useCallback((type: TerminalLine['type'], content: string) => {
    setLines(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      content,
      timestamp: new Date(),
    }])
  }, [])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  // Focus input when waiting for answers
  useEffect(() => {
    if (isWaitingForAnswers && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isWaitingForAnswers, currentQuestionIndex])

  // Update terminal based on phase changes
  useEffect(() => {
    if (phase === 'scan' && phaseMessage) {
      addLine('system', `> ${phaseMessage}`)
    } else if (phase === 'analyze' && phaseMessage) {
      addLine('system', `> ${phaseMessage}`)
    } else if (phase === 'questions' && questions.length > 0 && currentQuestionIndex === 0) {
      // Initial question display
      addLine('info', '')
      addLine('info', `Found ${facts.length} specific facts from website`)
      if (gaps.length > 0) {
        addLine('info', `Missing: ${gaps.slice(0, 3).join(', ')}`)
      }
      addLine('info', '')
      addLine('system', 'Quick questions to make this email useful:')
      addLine('info', '')
      addLine('question', questions[0].question)
      if (questions[0].context) {
        addLine('info', `  (${questions[0].context})`)
      }
    } else if (phase === 'write') {
      addLine('system', '> Writing copy...')
    } else if (phase === 'validate') {
      addLine('system', '> Checking quality...')
    } else if (phase === 'complete') {
      addLine('success', '✓ Done')
    } else if (phase === 'error') {
      addLine('error', `✗ Error: ${phaseMessage}`)
    }
  }, [phase, phaseMessage, questions, facts, gaps, addLine, currentQuestionIndex])

  // Handle answer submission
  const handleSubmitAnswer = () => {
    if (!inputValue.trim()) return

    const currentQuestion = questions[currentQuestionIndex]
    const answer = inputValue.trim()

    // Show the answer
    addLine('answer', `→ ${answer}`)
    
    // Store the answer
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }))
    setInputValue('')

    // Move to next question or submit all
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1
      setCurrentQuestionIndex(nextIndex)
      
      addLine('info', '')
      addLine('question', questions[nextIndex].question)
      if (questions[nextIndex].context) {
        addLine('info', `  (${questions[nextIndex].context})`)
      }
    } else {
      // All questions answered
      setIsSubmitting(true)
      addLine('info', '')
      addLine('system', '> All questions answered. Generating copy...')
      
      const allAnswers = { ...answers, [currentQuestion.id]: answer }
      onAnswersSubmit(allAnswers)
    }
  }

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitAnswer()
    }
  }

  // Get line styling
  const getLineStyle = (type: TerminalLine['type']) => {
    switch (type) {
      case 'system':
        return 'text-primary'
      case 'info':
        return 'text-zinc-500'
      case 'success':
        return 'text-green-400 font-medium'
      case 'error':
        return 'text-red-400'
      case 'question':
        return 'text-white font-medium'
      case 'answer':
        return 'text-zinc-300'
      case 'waiting':
        return 'text-zinc-500 italic'
      default:
        return 'text-zinc-400'
    }
  }

  const currentQuestion = questions[currentQuestionIndex]
  const showInput = isWaitingForAnswers && currentQuestion && !isSubmitting

  return (
    <Card className="border bg-zinc-950 text-zinc-100 font-mono text-sm overflow-hidden">
      <CardHeader className="py-2 px-3 border-b border-zinc-800 bg-zinc-900/80">
        <CardTitle className="text-xs font-medium flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-primary" />
          <span className="text-zinc-300">Copywriter</span>
          {(phase !== 'complete' && phase !== 'error' && phase !== 'questions') && (
            <span className="ml-auto flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
            </span>
          )}
          {phase === 'complete' && (
            <CheckCircle className="ml-auto h-3.5 w-3.5 text-green-400" />
          )}
          {phase === 'error' && (
            <AlertCircle className="ml-auto h-3.5 w-3.5 text-red-400" />
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Terminal output */}
        <div 
          ref={scrollRef}
          className="h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
        >
          <div className="p-3 space-y-1">
            {lines.map((line) => (
              <div key={line.id} className={`leading-relaxed ${getLineStyle(line.type)}`}>
                {line.content || '\u00A0'}
              </div>
            ))}
            
            {/* Blinking cursor when active but not waiting for input */}
            {phase !== 'complete' && phase !== 'error' && !showInput && (
              <div className="flex items-center">
                <span className="animate-pulse">▌</span>
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        {showInput && (
          <div className="border-t border-zinc-800 p-3 bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <span className="text-primary shrink-0">→</span>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={currentQuestion.exampleAnswer || 'Type your answer...'}
                className="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder:text-zinc-600"
                disabled={isSubmitting}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSubmitAnswer}
                disabled={!inputValue.trim() || isSubmitting}
                className="h-7 px-2 text-primary hover:text-primary hover:bg-zinc-800"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Progress indicator */}
            <div className="mt-2 flex items-center gap-2 text-xs text-zinc-600">
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span className="flex-1 h-px bg-zinc-800" />
              {currentQuestionIndex + 1 === questions.length && (
                <span className="text-zinc-500">Press Enter to generate</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// SIMPLE STATUS DISPLAY (for when not in Q&A mode)
// ============================================================================

interface StatusDisplayProps {
  phase: PipelinePhase
  message: string
}

export function StatusDisplay({ phase, message }: StatusDisplayProps) {
  const getIcon = () => {
    switch (phase) {
      case 'scan':
      case 'analyze':
      case 'write':
      case 'validate':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-400" />
      default:
        return null
    }
  }

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-zinc-900 border border-zinc-800">
      {getIcon()}
      <span className="text-sm text-zinc-300">{message}</span>
    </div>
  )
}


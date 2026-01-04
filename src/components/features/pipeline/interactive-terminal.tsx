'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Terminal, Send, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'
import type { QuestionForUser } from '@/lib/schemas/scan-result'
import type { PipelinePhase } from '@/core/pipeline/question-orchestrator'

// ============================================================================
// TYPES
// ============================================================================

interface TerminalLine {
  id: string
  type: 'system' | 'info' | 'highlight' | 'success' | 'error' | 'question' | 'answer'
  content: string
}

interface InteractiveTerminalProps {
  phase: PipelinePhase
  phaseMessage: string
  questions: QuestionForUser[]
  isWaitingForAnswers: boolean
  onAnswersSubmit: (answers: Record<string, string>) => void
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
  const [hasShownQuestions, setHasShownQuestions] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevPhaseRef = useRef<PipelinePhase | null>(null)

  // Generate unique ID
  const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  // Add line helper
  const addLine = (type: TerminalLine['type'], content: string) => {
    setLines(prev => [...prev, { id: genId(), type, content }])
  }

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  // Focus input when questions are ready
  useEffect(() => {
    if (isWaitingForAnswers && inputRef.current && !isProcessing) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isWaitingForAnswers, currentQuestionIndex, isProcessing])

  // Handle phase changes
  useEffect(() => {
    // Prevent duplicate messages for the same phase
    if (prevPhaseRef.current === phase && phase !== 'questions') return
    prevPhaseRef.current = phase

    if (phase === 'scan') {
      addLine('system', `Scanning website...`)
    } else if (phase === 'analyze') {
      addLine('system', `Analyzing content...`)
    } else if (phase === 'questions' && !hasShownQuestions && questions.length > 0) {
      // Show results and first question
      setHasShownQuestions(true)
      
      addLine('success', `✓ Found ${facts.length} facts from website`)
      if (gaps.length > 0) {
        addLine('info', `Need more info: ${gaps.slice(0, 2).join(', ')}`)
      }
      addLine('info', '')
      addLine('highlight', '━━━ Quick questions to make this email great ━━━')
      addLine('info', '')
      addLine('question', `Q1: ${questions[0].question}`)
      if (questions[0].exampleAnswer) {
        addLine('info', `   Example: "${questions[0].exampleAnswer}"`)
      }
    } else if (phase === 'write') {
      addLine('system', `Writing your copy...`)
    } else if (phase === 'critic') {
      addLine('system', `Critic reviewing quality...`)
    } else if (phase === 'validate') {
      addLine('system', `Final polish...`)
    } else if (phase === 'complete') {
      addLine('success', `✓ Copy ready!`)
    } else if (phase === 'error') {
      addLine('error', `✗ ${phaseMessage}`)
    }
  }, [phase, phaseMessage, questions, facts, gaps, hasShownQuestions])

  // Handle answer submission
  const handleSubmit = () => {
    if (!inputValue.trim() || isProcessing) return

    const currentQuestion = questions[currentQuestionIndex]
    const answer = inputValue.trim()

    // Show the answer
    addLine('answer', `→ ${answer}`)
    
    // Store the answer
    const newAnswers = { ...answers, [currentQuestion.id]: answer }
    setAnswers(newAnswers)
    setInputValue('')

    // Move to next question or finish
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1
      setCurrentQuestionIndex(nextIndex)
      
      addLine('info', '')
      addLine('question', `Q${nextIndex + 1}: ${questions[nextIndex].question}`)
      if (questions[nextIndex].exampleAnswer) {
        addLine('info', `   Example: "${questions[nextIndex].exampleAnswer}"`)
      }
    } else {
      // All done - submit
      setIsProcessing(true)
      addLine('info', '')
      addLine('highlight', '━━━ Generating your copy ━━━')
      onAnswersSubmit(newAnswers)
    }
  }

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Get line styling - BRIGHTER colors
  const getLineStyle = (type: TerminalLine['type']) => {
    switch (type) {
      case 'system':
        return 'text-orange-400'
      case 'info':
        return 'text-zinc-400'
      case 'highlight':
        return 'text-orange-500 font-semibold'
      case 'success':
        return 'text-emerald-400 font-medium'
      case 'error':
        return 'text-red-400 font-medium'
      case 'question':
        return 'text-white font-medium text-base'
      case 'answer':
        return 'text-sky-400'
      default:
        return 'text-zinc-300'
    }
  }

  const currentQuestion = questions[currentQuestionIndex]
  const showInput = isWaitingForAnswers && currentQuestion && !isProcessing
  const isRunning = phase !== 'complete' && phase !== 'error' && phase !== 'questions'

  return (
    <Card className="border-2 border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
      {/* Header */}
      <CardHeader className="py-3 px-4 border-b border-zinc-800 bg-zinc-900">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Terminal className="h-4 w-4 text-orange-500" />
          <span className="text-zinc-200">Copywriter Terminal</span>
          
          {/* Status indicator */}
          <span className="ml-auto flex items-center gap-2">
            {isRunning && (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                <span className="text-xs text-zinc-500">Processing...</span>
              </>
            )}
            {phase === 'questions' && !isProcessing && (
              <>
                <Sparkles className="h-4 w-4 text-orange-500" />
                <span className="text-xs text-zinc-400">Answer below</span>
              </>
            )}
            {phase === 'complete' && (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            )}
            {phase === 'error' && (
              <AlertCircle className="h-4 w-4 text-red-400" />
            )}
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Terminal output */}
        <div 
          ref={scrollRef}
          className="h-[300px] overflow-y-auto bg-zinc-950"
        >
          <div className="p-4 space-y-2 font-mono text-sm">
            {lines.length === 0 && (
              <div className="text-zinc-600 animate-pulse">Initializing...</div>
            )}
            
            {lines.map((line) => (
              <div key={line.id} className={`leading-relaxed ${getLineStyle(line.type)}`}>
                {line.content || '\u00A0'}
              </div>
            ))}
            
            {/* Blinking cursor when processing */}
            {isRunning && (
              <div className="flex items-center text-orange-500">
                <span className="animate-pulse">▌</span>
              </div>
            )}
          </div>
        </div>

        {/* Input area - only show when waiting for answers */}
        {showInput && (
          <div className="border-t-2 border-zinc-800 p-4 bg-zinc-900">
            <div className="flex items-center gap-3">
              <span className="text-orange-500 font-bold shrink-0">→</span>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer here..."
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-colors"
                autoFocus
              />
              <Button
                onClick={handleSubmit}
                disabled={!inputValue.trim()}
                className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 h-auto disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Progress bar */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex gap-1.5">
                {questions.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-8 rounded-full transition-colors ${
                      i < currentQuestionIndex
                        ? 'bg-emerald-500'
                        : i === currentQuestionIndex
                        ? 'bg-orange-500'
                        : 'bg-zinc-700'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-zinc-500">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              {currentQuestionIndex === questions.length - 1 && (
                <span className="text-xs text-orange-400 ml-auto">
                  Last question – Enter to generate
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

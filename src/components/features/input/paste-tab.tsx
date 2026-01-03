'use client'

import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface PasteTabProps {
  content: string
  onContentChange: (content: string) => void
}

export function PasteTab({ content, onContentChange }: PasteTabProps) {
  return (
    <div className="space-y-3">
      <Label htmlFor="paste-content">Paste your content, research, or notes</Label>
      <Textarea
        id="paste-content"
        placeholder="Paste product descriptions, research notes, competitor copy, customer testimonials, key points you want to communicate..."
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        className="min-h-[200px] resize-none"
      />
      <p className="text-sm text-muted-foreground">
        Include any relevant information that will help generate better copy.
      </p>
    </div>
  )
}


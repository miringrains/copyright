'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import type { CopyType, Channel } from '@/lib/schemas'

interface CopyTypeSelectorProps {
  copyType: CopyType
  channel: Channel
  onCopyTypeChange: (value: CopyType) => void
  onChannelChange: (value: Channel) => void
}

const COPY_TYPES: { value: CopyType; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'website', label: 'Website' },
  { value: 'social', label: 'Social' },
  { value: 'article', label: 'Article' },
]

const CHANNELS: Record<CopyType, { value: Channel; label: string }[]> = {
  email: [
    { value: 'email_newsletter', label: 'Newsletter' },
    { value: 'email_cold', label: 'Cold Outreach' },
    { value: 'email_follow_up', label: 'Follow-up' },
  ],
  website: [
    { value: 'landing_page', label: 'Landing Page' },
    { value: 'homepage', label: 'Homepage' },
    { value: 'product_page', label: 'Product Page' },
    { value: 'about_page', label: 'About Page' },
  ],
  social: [
    { value: 'x_post', label: 'X (Twitter)' },
    { value: 'linkedin_post', label: 'LinkedIn' },
    { value: 'instagram_caption', label: 'Instagram' },
  ],
  article: [
    { value: 'blog_post', label: 'Blog Post' },
    { value: 'op_ed', label: 'Op-Ed' },
    { value: 'case_study', label: 'Case Study' },
    { value: 'white_paper', label: 'White Paper' },
  ],
}

const VOICE_PRESETS = [
  { value: 'calm_operator', label: 'Calm Operator' },
  { value: 'blunt_expert', label: 'Blunt Expert' },
  { value: 'witty_insider', label: 'Witty Insider' },
  { value: 'friendly_guide', label: 'Friendly Guide' },
  { value: 'authoritative', label: 'Authoritative' },
]

export function CopyTypeSelector({
  copyType,
  channel,
  onCopyTypeChange,
  onChannelChange,
}: CopyTypeSelectorProps) {
  const availableChannels = CHANNELS[copyType] || []

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="copy-type">Copy Type</Label>
        <Select value={copyType} onValueChange={onCopyTypeChange}>
          <SelectTrigger id="copy-type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {COPY_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="channel">Channel</Label>
        <Select value={channel} onValueChange={onChannelChange}>
          <SelectTrigger id="channel">
            <SelectValue placeholder="Select channel" />
          </SelectTrigger>
          <SelectContent>
            {availableChannels.map((ch) => (
              <SelectItem key={ch.value} value={ch.value}>
                {ch.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

interface VoiceSelectorProps {
  voice: string
  onVoiceChange: (value: string) => void
}

export function VoiceSelector({ voice, onVoiceChange }: VoiceSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="voice">Voice</Label>
      <Select value={voice} onValueChange={onVoiceChange}>
        <SelectTrigger id="voice">
          <SelectValue placeholder="Select voice" />
        </SelectTrigger>
        <SelectContent>
          {VOICE_PRESETS.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}


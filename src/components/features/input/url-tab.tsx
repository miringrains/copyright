'use client'

import { useState } from 'react'
import { Globe, Loader2, X, CheckCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface ScrapedUrl {
  url: string
  title?: string
  content?: string
  status: 'pending' | 'loading' | 'success' | 'error'
  error?: string
}

interface UrlTabProps {
  urls: ScrapedUrl[]
  onUrlsChange: (urls: ScrapedUrl[]) => void
}

export function UrlTab({ urls, onUrlsChange }: UrlTabProps) {
  const [inputUrl, setInputUrl] = useState('')

  const addUrl = () => {
    if (!inputUrl.trim()) return

    // Basic URL validation
    let url = inputUrl.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    try {
      new URL(url)
    } catch {
      return // Invalid URL
    }

    onUrlsChange([
      ...urls,
      { url, status: 'pending' },
    ])
    setInputUrl('')
  }

  const removeUrl = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index)
    onUrlsChange(newUrls)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addUrl()
    }
  }

  return (
    <div className="space-y-4">
      <Label>Scrape URLs for research</Label>
      
      {/* URL input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://example.com"
            className="pl-9"
          />
        </div>
        <Button onClick={addUrl} variant="secondary">
          Add
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        URLs will be scraped using Firecrawl when you generate copy.
      </p>

      {/* URL list */}
      {urls.length > 0 && (
        <div className="space-y-2">
          {urls.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                {item.status === 'loading' && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                {item.status === 'success' && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {item.status === 'pending' && (
                  <Globe className="h-4 w-4 text-muted-foreground" />
                )}
                {item.status === 'error' && (
                  <X className="h-4 w-4 text-destructive" />
                )}
                <span className="truncate text-sm">{item.url}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => removeUrl(index)}
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


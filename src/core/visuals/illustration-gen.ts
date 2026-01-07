import { getServerClient } from '@/infrastructure/supabase/client'
import { VisualStyle } from './generator'

/**
 * Illustration Generator
 * 
 * Uses Gemini to generate high-quality illustrations.
 * Key: Very specific prompts to avoid generic AI garbage.
 */

const STYLE_PROMPTS: Record<VisualStyle, string> = {
  minimal: `
Style: Minimal line illustration
Medium: Clean vector lines, single weight stroke
Colors: Monochrome (black lines on white) OR single muted accent color
Aesthetic: Like a high-end textbook diagram or New Yorker magazine illustration
NO: Gradients, shadows, 3D effects, busy backgrounds, cartoonish elements
YES: White space, precise geometry, elegant simplicity`,
  
  flat: `
Style: Modern flat illustration
Medium: Solid color shapes, no outlines
Colors: Limited palette (3-4 colors maximum), muted and sophisticated
Aesthetic: Like Airbnb or Stripe website illustrations
NO: Gradients, drop shadows, bevels, photorealistic elements
YES: Geometric shapes, clean edges, bold but not garish colors`,
  
  technical: `
Style: Technical diagram
Medium: Precise lines, measurement callouts, labeled parts
Colors: Grayscale with one accent color for highlights
Aesthetic: Like an engineering manual or scientific paper figure
NO: Decorative elements, artistic interpretation, vague shapes
YES: Accurate proportions, clear labels, professional precision`,
  
  sketch: `
Style: Hand-drawn sketch aesthetic
Medium: Pencil or ink sketch appearance, natural line variation
Colors: Graphite/ink tones, minimal color if any
Aesthetic: Like a field naturalist's notebook or architectural concept sketch
NO: Perfect geometry, digital perfection, cartoon style
YES: Authentic sketch feel, loose but confident lines, natural imperfection`,
}

/**
 * Build a precise prompt for Gemini image generation
 */
function buildIllustrationPrompt(
  description: string,
  style: VisualStyle
): string {
  return `${STYLE_PROMPTS[style]}

SUBJECT: ${description}

COMPOSITION:
- Centered, with breathing room around edges
- Clear focal point
- No text, labels, or watermarks
- Suitable for a book illustration (will be printed)

QUALITY: Professional editorial illustration quality
ASPECT RATIO: 4:3 horizontal

Generate a single, clean illustration.`
}

/**
 * Generate an illustration using Gemini
 */
export async function generateIllustration(
  description: string,
  style: VisualStyle = 'minimal'
): Promise<string> {
  
  const prompt = buildIllustrationPrompt(description, style)
  
  // Use Gemini image generation
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${process.env.GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
          imageSafetySetting: 'BLOCK_NONE',
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error('[Illustration Gen] Gemini error:', error)
    throw new Error('Failed to generate illustration')
  }

  const data = await response.json()
  
  // Extract image from response
  const parts = data.candidates?.[0]?.content?.parts || []
  const imagePart = parts.find((p: { inlineData?: unknown }) => p.inlineData)
  
  if (!imagePart?.inlineData) {
    throw new Error('No image returned from Gemini')
  }

  // Upload to Supabase storage
  const imageUrl = await uploadToStorage(
    imagePart.inlineData.data,
    imagePart.inlineData.mimeType
  )

  return imageUrl
}

/**
 * Upload base64 image to Supabase storage
 */
async function uploadToStorage(
  base64Data: string,
  mimeType: string
): Promise<string> {
  const supabase = getServerClient()
  
  // Convert base64 to buffer
  const buffer = Buffer.from(base64Data, 'base64')
  
  // Generate filename
  const ext = mimeType.includes('png') ? 'png' : 'jpeg'
  const filename = `illustration_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
  
  // Upload to book-illustrations bucket
  const { error } = await supabase.storage
    .from('book-illustrations')
    .upload(filename, buffer, {
      contentType: mimeType,
      cacheControl: '3600',
    })

  if (error) {
    console.error('[Illustration Gen] Upload error:', error)
    throw new Error('Failed to upload illustration')
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('book-illustrations')
    .getPublicUrl(filename)

  return publicUrl
}

/**
 * Generate a simple placeholder if Gemini fails
 */
export function generatePlaceholder(description: string): string {
  // Return a simple SVG placeholder
  return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="300" fill="#f5f5f5"/>
  <text x="200" y="150" text-anchor="middle" font-family="system-ui" font-size="14" fill="#999">
    [Illustration: ${description.slice(0, 50)}...]
  </text>
</svg>`
}


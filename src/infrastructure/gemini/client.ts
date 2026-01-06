/**
 * Gemini Image Generation Client
 * 
 * Uses gemini-3-pro-image-preview for generating article images
 */

import { GoogleGenAI, Modality } from '@google/genai'
import * as fs from 'fs'
import * as path from 'path'

// ============================================================================
// TYPES
// ============================================================================

export interface GeneratedImage {
  id: string
  prompt: string
  base64: string
  mimeType: string
  alt_text: string
  filename: string
}

export interface ImageGenerationOptions {
  prompt: string
  alt_text?: string
  style?: 'photorealistic' | 'illustration' | 'infographic' | 'diagram'
}

// ============================================================================
// CLIENT
// ============================================================================

let geminiClient: GoogleGenAI | null = null

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY not configured')
    }
    geminiClient = new GoogleGenAI({ apiKey })
  }
  return geminiClient
}

// ============================================================================
// IMAGE GENERATION
// ============================================================================

/**
 * Generate an image using Gemini
 */
export async function generateImage(options: ImageGenerationOptions): Promise<GeneratedImage | null> {
  try {
    const client = getGeminiClient()
    
    // Build the prompt with style guidance
    let fullPrompt = options.prompt
    if (options.style) {
      const styleGuides: Record<string, string> = {
        photorealistic: 'Photorealistic, high quality, professional photography style.',
        illustration: 'Clean modern illustration, flat design, professional.',
        infographic: 'Infographic style, data visualization, clean and informative.',
        diagram: 'Technical diagram, clear labels, professional presentation.',
      }
      fullPrompt = `${styleGuides[options.style]} ${fullPrompt}`
    }

    console.log('[Gemini] Generating image:', fullPrompt.slice(0, 100))

    const response = await client.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: fullPrompt,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    })

    // Extract image from response
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
          const filename = `${id}.${part.inlineData.mimeType?.split('/')[1] || 'png'}`
          
          return {
            id,
            prompt: options.prompt,
            base64: part.inlineData.data || '',
            mimeType: part.inlineData.mimeType || 'image/png',
            alt_text: options.alt_text || options.prompt,
            filename,
          }
        }
      }
    }

    console.warn('[Gemini] No image in response')
    return null
  } catch (error) {
    console.error('[Gemini] Image generation error:', error)
    return null
  }
}

/**
 * Generate multiple images for an article
 */
export async function generateArticleImages(
  imageSpecs: ImageGenerationOptions[]
): Promise<GeneratedImage[]> {
  const results: GeneratedImage[] = []
  
  for (const spec of imageSpecs) {
    const image = await generateImage(spec)
    if (image) {
      results.push(image)
    }
    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  return results
}

/**
 * Save a generated image to the public directory
 * Returns the public URL path
 */
export async function saveImageToPublic(image: GeneratedImage): Promise<string> {
  const publicDir = path.join(process.cwd(), 'public', 'generated-images')
  
  // Ensure directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }
  
  const filePath = path.join(publicDir, image.filename)
  const buffer = Buffer.from(image.base64, 'base64')
  
  fs.writeFileSync(filePath, buffer)
  
  return `/generated-images/${image.filename}`
}


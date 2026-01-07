import OpenAI from 'openai'

// OpenAI embeddings client for vector similarity search
// Uses text-embedding-3-large (3072 dimensions) for best quality

let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured')
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

export interface EmbeddingResult {
  embedding: number[]
  tokens: number
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const client = getOpenAIClient()
  
  const response = await client.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: 3072,
  })

  return {
    embedding: response.data[0].embedding,
    tokens: response.usage.total_tokens,
  }
}

/**
 * Generate embeddings for multiple texts (batched)
 */
export async function generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  if (texts.length === 0) return []
  
  const client = getOpenAIClient()
  
  // OpenAI supports up to 2048 inputs per batch
  const batchSize = 100
  const results: EmbeddingResult[] = []
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    
    const response = await client.embeddings.create({
      model: 'text-embedding-3-large',
      input: batch,
      dimensions: 3072,
    })

    const tokensPerText = Math.floor(response.usage.total_tokens / batch.length)
    
    for (const item of response.data) {
      results.push({
        embedding: item.embedding,
        tokens: tokensPerText,
      })
    }
  }

  return results
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same dimension')
  }
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}


// Custom errors for the pipeline

export class PipelineError extends Error {
  constructor(
    message: string,
    public phase: number,
    public phaseName: string,
    public cause?: Error
  ) {
    super(message)
    this.name = 'PipelineError'
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public schemaName: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public cause?: Error
  ) {
    super(message)
    this.name = 'AIProviderError'
  }
}


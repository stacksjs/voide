// AWS Bedrock Provider for Voide CLI

import type { Provider, ChatRequest, ChatEvent, ModelInfo, ProviderConfig } from './types'
import type { Tool } from '../tool/types'

export interface BedrockConfig extends ProviderConfig {
  region?: string
  accessKeyId?: string
  secretAccessKey?: string
  sessionToken?: string
}

const BEDROCK_MODELS: ModelInfo[] = [
  { id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', name: 'Claude 3.5 Sonnet v2', contextWindow: 200000, maxOutput: 8192 },
  { id: 'anthropic.claude-3-5-sonnet-20240620-v1:0', name: 'Claude 3.5 Sonnet', contextWindow: 200000, maxOutput: 8192 },
  { id: 'anthropic.claude-3-opus-20240229-v1:0', name: 'Claude 3 Opus', contextWindow: 200000, maxOutput: 4096 },
  { id: 'anthropic.claude-3-sonnet-20240229-v1:0', name: 'Claude 3 Sonnet', contextWindow: 200000, maxOutput: 4096 },
  { id: 'anthropic.claude-3-haiku-20240307-v1:0', name: 'Claude 3 Haiku', contextWindow: 200000, maxOutput: 4096 },
  { id: 'amazon.titan-text-premier-v1:0', name: 'Titan Text Premier', contextWindow: 32000, maxOutput: 8192 },
  { id: 'amazon.titan-text-express-v1', name: 'Titan Text Express', contextWindow: 8000, maxOutput: 8192 },
  { id: 'meta.llama3-1-70b-instruct-v1:0', name: 'Llama 3.1 70B', contextWindow: 128000, maxOutput: 2048 },
  { id: 'meta.llama3-1-8b-instruct-v1:0', name: 'Llama 3.1 8B', contextWindow: 128000, maxOutput: 2048 },
  { id: 'mistral.mistral-large-2407-v1:0', name: 'Mistral Large', contextWindow: 128000, maxOutput: 8192 },
]

export class BedrockProvider implements Provider {
  name = 'bedrock'
  private config: BedrockConfig

  constructor(config: BedrockConfig = {}) {
    this.config = config
  }

  getModels(): ModelInfo[] {
    return BEDROCK_MODELS
  }

  getDefaultModel(): string {
    return 'anthropic.claude-3-5-sonnet-20241022-v2:0'
  }

  async *chat(request: ChatRequest): AsyncGenerator<ChatEvent> {
    const region = this.config.region || process.env.AWS_REGION || 'us-east-1'
    const accessKeyId = this.config.accessKeyId || process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = this.config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY
    const sessionToken = this.config.sessionToken || process.env.AWS_SESSION_TOKEN

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.')
    }

    const model = request.model || this.getDefaultModel()
    const isAnthropicModel = model.startsWith('anthropic.')

    // Build request body based on model type
    let body: Record<string, unknown>

    if (isAnthropicModel) {
      // Anthropic models use Messages API format
      body = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: request.maxTokens || 4096,
        messages: request.messages
          .filter(m => m.role !== 'system')
          .map(msg => ({
            role: msg.role,
            content: Array.isArray(msg.content)
              ? msg.content.map(c => {
                  if (c.type === 'text') return { type: 'text', text: c.text }
                  if (c.type === 'image') {
                    return {
                      type: 'image',
                      source: {
                        type: 'base64',
                        media_type: c.source.media_type,
                        data: c.source.data,
                      },
                    }
                  }
                  return { type: 'text', text: '' }
                })
              : msg.content,
          })),
      }

      // Add system message
      const systemMsg = request.messages.find(m => m.role === 'system')
      if (systemMsg) {
        body.system = Array.isArray(systemMsg.content)
          ? systemMsg.content.filter(c => c.type === 'text').map(c => (c as { text: string }).text).join('\n')
          : systemMsg.content
      }

      // Add tools
      if (request.tools && request.tools.length > 0) {
        body.tools = request.tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          input_schema: toolToJsonSchema(tool),
        }))
      }

      if (request.temperature !== undefined) body.temperature = request.temperature
      if (request.topP !== undefined) body.top_p = request.topP
    }
    else {
      // Other models use different formats
      body = {
        inputText: request.messages.map(m => {
          const content = Array.isArray(m.content)
            ? m.content.filter(c => c.type === 'text').map(c => (c as { text: string }).text).join('\n')
            : m.content
          return `${m.role}: ${content}`
        }).join('\n\n'),
        textGenerationConfig: {
          maxTokenCount: request.maxTokens || 4096,
          temperature: request.temperature ?? 0.7,
          topP: request.topP ?? 0.9,
        },
      }
    }

    // Sign request with AWS Signature Version 4
    const host = `bedrock-runtime.${region}.amazonaws.com`
    const endpoint = isAnthropicModel
      ? `https://${host}/model/${model}/invoke-with-response-stream`
      : `https://${host}/model/${model}/invoke`

    const headers = await signAWSRequest({
      method: 'POST',
      host,
      path: isAnthropicModel ? `/model/${model}/invoke-with-response-stream` : `/model/${model}/invoke`,
      body: JSON.stringify(body),
      region,
      service: 'bedrock',
      accessKeyId,
      secretAccessKey,
      sessionToken,
    })

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Bedrock API error: ${response.status} - ${error}`)
    }

    yield { type: 'message_start', message: { id: '', model, role: 'assistant' } }

    if (!response.body) {
      throw new Error('No response body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let inputTokens = 0
    let outputTokens = 0

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })

        // Bedrock streams events in a specific format
        // Parse the event stream
        const events = parseBedrockEventStream(chunk)

        for (const event of events) {
          if (event.type === 'content_block_delta' && event.delta?.text) {
            yield { type: 'content_block_delta', delta: { type: 'text_delta', text: event.delta.text } }
          }

          if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
            yield {
              type: 'content_block_start',
              content_block: {
                type: 'tool_use',
                id: event.content_block.id,
                name: event.content_block.name,
                input: event.content_block.input || {},
              },
            }
          }

          if (event.type === 'message_delta' && event.usage) {
            inputTokens = event.usage.input_tokens || 0
            outputTokens = event.usage.output_tokens || 0
          }
        }
      }

      yield {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn' },
        usage: { input_tokens: inputTokens, output_tokens: outputTokens },
      }
    }
    finally {
      reader.releaseLock()
    }
  }
}

function toolToJsonSchema(tool: Tool): Record<string, unknown> {
  const properties: Record<string, unknown> = {}
  const required: string[] = []

  for (const param of tool.parameters) {
    properties[param.name] = {
      type: param.type,
      description: param.description,
    }
    if (param.enum) {
      properties[param.name] = { ...properties[param.name] as object, enum: param.enum }
    }
    if (param.required) {
      required.push(param.name)
    }
  }

  return {
    type: 'object',
    properties,
    required,
  }
}

// AWS Signature Version 4 signing (simplified)
async function signAWSRequest(params: {
  method: string
  host: string
  path: string
  body: string
  region: string
  service: string
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
}): Promise<Record<string, string>> {
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)

  const algorithm = 'AWS4-HMAC-SHA256'
  const credentialScope = `${dateStamp}/${params.region}/${params.service}/aws4_request`

  // Create canonical request
  const canonicalHeaders = [
    `host:${params.host}`,
    `x-amz-date:${amzDate}`,
    ...(params.sessionToken ? [`x-amz-security-token:${params.sessionToken}`] : []),
  ].join('\n') + '\n'

  const signedHeaders = params.sessionToken
    ? 'host;x-amz-date;x-amz-security-token'
    : 'host;x-amz-date'

  const payloadHash = await sha256Hex(params.body)

  const canonicalRequest = [
    params.method,
    params.path,
    '', // query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  // Create string to sign
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n')

  // Calculate signature
  const signingKey = await getSignatureKey(
    params.secretAccessKey,
    dateStamp,
    params.region,
    params.service,
  )
  const signature = await hmacHex(signingKey, stringToSign)

  // Build authorization header
  const authorization = `${algorithm} Credential=${params.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const headers: Record<string, string> = {
    'X-Amz-Date': amzDate,
    'Authorization': authorization,
  }

  if (params.sessionToken) {
    headers['X-Amz-Security-Token'] = params.sessionToken
  }

  return headers
}

async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hmac(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data))
}

async function hmacHex(key: ArrayBuffer, data: string): Promise<string> {
  const result = await hmac(key, data)
  return Array.from(new Uint8Array(result))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function getSignatureKey(
  secret: string,
  dateStamp: string,
  region: string,
  service: string,
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const kDate = await hmac(encoder.encode('AWS4' + secret), dateStamp)
  const kRegion = await hmac(kDate, region)
  const kService = await hmac(kRegion, service)
  return hmac(kService, 'aws4_request')
}

function parseBedrockEventStream(chunk: string): Array<{
  type: string
  delta?: { text?: string }
  content_block?: { type: string; id?: string; name?: string; input?: unknown }
  usage?: { input_tokens?: number; output_tokens?: number }
}> {
  const events: Array<{
    type: string
    delta?: { text?: string }
    content_block?: { type: string; id?: string; name?: string; input?: unknown }
    usage?: { input_tokens?: number; output_tokens?: number }
  }> = []

  // Bedrock event stream format: binary frames with JSON payloads
  // Simplified parsing for common cases
  const lines = chunk.split('\n')
  for (const line of lines) {
    if (!line.trim()) continue
    try {
      const event = JSON.parse(line)
      events.push(event)
    }
    catch {
      // Try to extract JSON from binary frame
      const jsonMatch = line.match(/\{[^}]+\}/)
      if (jsonMatch) {
        try {
          events.push(JSON.parse(jsonMatch[0]))
        }
        catch {
          // Skip
        }
      }
    }
  }

  return events
}

export function createBedrockProvider(config: BedrockConfig = {}): BedrockProvider {
  return new BedrockProvider(config)
}

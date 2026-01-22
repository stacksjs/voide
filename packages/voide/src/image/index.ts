// Image Support for Voide CLI
// Handles image input for vision capabilities

import { readFile } from 'node:fs/promises'
import { extname, basename } from 'node:path'

export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

export interface ImageInput {
  type: 'base64' | 'url'
  mediaType: ImageMediaType
  data: string // base64 data or URL
  source: string // original file path or URL
}

export interface ImageContent {
  type: 'image'
  source: {
    type: 'base64' | 'url'
    media_type: ImageMediaType
    data: string
  }
}

const SUPPORTED_EXTENSIONS: Record<string, ImageMediaType> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

const MAX_IMAGE_SIZE = 20 * 1024 * 1024 // 20MB

/**
 * Check if a file is a supported image
 */
export function isSupportedImage(path: string): boolean {
  const ext = extname(path).toLowerCase()
  return ext in SUPPORTED_EXTENSIONS
}

/**
 * Get media type from file extension
 */
export function getMediaType(path: string): ImageMediaType | null {
  const ext = extname(path).toLowerCase()
  return SUPPORTED_EXTENSIONS[ext] || null
}

/**
 * Load an image from a file path
 */
export async function loadImage(path: string): Promise<ImageInput> {
  const mediaType = getMediaType(path)
  if (!mediaType) {
    throw new Error(`Unsupported image format: ${extname(path)}`)
  }

  const buffer = await readFile(path)

  if (buffer.length > MAX_IMAGE_SIZE) {
    throw new Error(`Image too large: ${buffer.length} bytes (max ${MAX_IMAGE_SIZE})`)
  }

  const base64 = buffer.toString('base64')

  return {
    type: 'base64',
    mediaType,
    data: base64,
    source: path,
  }
}

/**
 * Create image input from URL
 */
export function imageFromUrl(url: string): ImageInput {
  // Try to detect media type from URL
  const ext = extname(new URL(url).pathname).toLowerCase()
  const mediaType = SUPPORTED_EXTENSIONS[ext] || 'image/jpeg'

  return {
    type: 'url',
    mediaType,
    data: url,
    source: url,
  }
}

/**
 * Create image input from base64 string
 */
export function imageFromBase64(
  base64: string,
  mediaType: ImageMediaType = 'image/png',
  source = 'base64',
): ImageInput {
  // Remove data URL prefix if present
  const data = base64.replace(/^data:image\/[a-z]+;base64,/, '')

  return {
    type: 'base64',
    mediaType,
    data,
    source,
  }
}

/**
 * Convert ImageInput to Anthropic API format
 */
export function toAnthropicImageContent(image: ImageInput): ImageContent {
  return {
    type: 'image',
    source: {
      type: image.type,
      media_type: image.mediaType,
      data: image.data,
    },
  }
}

/**
 * Parse image references from text
 * Supports: @path/to/image.png, ![alt](path), <image:path>
 */
export function parseImageReferences(text: string): string[] {
  const refs: string[] = []

  // @path/to/image.png pattern
  const atPattern = /@([^\s]+\.(?:jpg|jpeg|png|gif|webp))/gi
  let match
  while ((match = atPattern.exec(text)) !== null) {
    refs.push(match[1])
  }

  // Markdown image pattern: ![alt](path)
  const mdPattern = /!\[[^\]]*\]\(([^)]+\.(?:jpg|jpeg|png|gif|webp))\)/gi
  while ((match = mdPattern.exec(text)) !== null) {
    refs.push(match[1])
  }

  // <image:path> pattern
  const tagPattern = /<image:([^>]+\.(?:jpg|jpeg|png|gif|webp))>/gi
  while ((match = tagPattern.exec(text)) !== null) {
    refs.push(match[1])
  }

  return [...new Set(refs)] // Deduplicate
}

/**
 * Process text and extract/load images
 */
export async function processTextWithImages(
  text: string,
  basePath: string = process.cwd(),
): Promise<{
  cleanText: string
  images: ImageInput[]
}> {
  const refs = parseImageReferences(text)
  const images: ImageInput[] = []

  // Clean the text of image references
  let cleanText = text
    .replace(/@([^\s]+\.(?:jpg|jpeg|png|gif|webp))/gi, '')
    .replace(/!\[[^\]]*\]\(([^)]+\.(?:jpg|jpeg|png|gif|webp))\)/gi, '')
    .replace(/<image:([^>]+\.(?:jpg|jpeg|png|gif|webp))>/gi, '')
    .trim()

  // Load each image
  for (const ref of refs) {
    try {
      // Check if it's a URL
      if (ref.startsWith('http://') || ref.startsWith('https://')) {
        images.push(imageFromUrl(ref))
      }
      else {
        // Resolve relative path
        const { join, isAbsolute } = await import('node:path')
        const fullPath = isAbsolute(ref) ? ref : join(basePath, ref)
        const image = await loadImage(fullPath)
        images.push(image)
      }
    }
    catch (error) {
      // Skip images that can't be loaded
      console.error(`Failed to load image ${ref}:`, (error as Error).message)
    }
  }

  return { cleanText, images }
}

/**
 * Create multimodal content array for Anthropic API
 */
export function createMultimodalContent(
  text: string,
  images: ImageInput[],
): Array<{ type: 'text'; text: string } | ImageContent> {
  const content: Array<{ type: 'text'; text: string } | ImageContent> = []

  // Add images first (Claude processes them before text)
  for (const image of images) {
    content.push(toAnthropicImageContent(image))
  }

  // Add text
  if (text.trim()) {
    content.push({ type: 'text', text })
  }

  return content
}

/**
 * Estimate token cost for an image
 * Based on Anthropic's pricing (images counted by size)
 */
export function estimateImageTokens(image: ImageInput): number {
  // Anthropic charges based on image size
  // Rough estimate: base + size factor
  const base64Length = image.data.length

  // Base64 is ~1.33x the binary size
  const byteSize = Math.floor(base64Length * 0.75)

  // Rough token estimate based on common image sizes
  // Small images (~100KB): ~1000 tokens
  // Medium images (~500KB): ~2000 tokens
  // Large images (~2MB): ~5000 tokens
  if (byteSize < 100 * 1024) return 1000
  if (byteSize < 500 * 1024) return 2000
  if (byteSize < 1024 * 1024) return 3500
  if (byteSize < 2 * 1024 * 1024) return 5000
  return 7000
}

/**
 * Validate images for API submission
 */
export function validateImages(images: ImageInput[]): {
  valid: ImageInput[]
  errors: Array<{ image: ImageInput; error: string }>
} {
  const valid: ImageInput[] = []
  const errors: Array<{ image: ImageInput; error: string }> = []

  for (const image of images) {
    // Check media type
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(image.mediaType)) {
      errors.push({ image, error: `Unsupported media type: ${image.mediaType}` })
      continue
    }

    // Check size for base64 images
    if (image.type === 'base64') {
      const estimatedSize = Math.floor(image.data.length * 0.75)
      if (estimatedSize > MAX_IMAGE_SIZE) {
        errors.push({ image, error: `Image too large: ${estimatedSize} bytes` })
        continue
      }
    }

    valid.push(image)
  }

  return { valid, errors }
}

/**
 * Screenshot capture (uses system screenshot on macOS)
 */
export async function captureScreenshot(): Promise<ImageInput | null> {
  const { exec } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const { unlink } = await import('node:fs/promises')

  const execAsync = promisify(exec)

  // Create temp file
  const tempPath = join(tmpdir(), `voide-screenshot-${Date.now()}.png`)

  try {
    // macOS screenshot command
    if (process.platform === 'darwin') {
      await execAsync(`screencapture -x ${tempPath}`)
    }
    // Linux (requires scrot or import)
    else if (process.platform === 'linux') {
      try {
        await execAsync(`scrot ${tempPath}`)
      }
      catch {
        await execAsync(`import -window root ${tempPath}`)
      }
    }
    else {
      return null // Windows not supported yet
    }

    // Load the screenshot
    const image = await loadImage(tempPath)

    // Clean up temp file
    await unlink(tempPath)

    return image
  }
  catch {
    try {
      await unlink(tempPath)
    }
    catch {
      // Ignore cleanup errors
    }
    return null
  }
}

/**
 * Image description helper (for summarizing images in text form)
 */
export function describeImageInput(image: ImageInput): string {
  const filename = image.source.includes('/')
    ? basename(image.source)
    : image.source

  const sizeKB = image.type === 'base64'
    ? Math.floor(image.data.length * 0.75 / 1024)
    : 0

  if (sizeKB > 0) {
    return `[Image: ${filename} (${image.mediaType}, ~${sizeKB}KB)]`
  }
  return `[Image: ${filename} (${image.mediaType})]`
}

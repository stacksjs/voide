// Voice Input (Speech-to-Text) for Voide CLI

import { EventEmitter } from 'node:events'
import { spawn, type ChildProcess } from 'node:child_process'
import { writeFile, unlink, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export interface VoiceInputConfig {
  /** STT provider */
  provider?: 'whisper' | 'openai' | 'system'
  /** OpenAI API key */
  openaiKey?: string
  /** Language code */
  language?: string
  /** Sample rate for recording */
  sampleRate?: number
  /** Silence threshold (0-1) */
  silenceThreshold?: number
  /** Silence duration to end recording (ms) */
  silenceDuration?: number
}

export interface TranscriptionResult {
  text: string
  confidence?: number
  language?: string
  duration?: number
}

/**
 * Voice Input handler
 */
export class VoiceInput extends EventEmitter {
  private config: Required<VoiceInputConfig>
  private recorder?: ChildProcess
  private isRecording = false
  private audioBuffer: Buffer[] = []

  constructor(config: VoiceInputConfig = {}) {
    super()
    this.config = {
      provider: config.provider || 'whisper',
      openaiKey: config.openaiKey || '',
      language: config.language || 'en',
      sampleRate: config.sampleRate || 16000,
      silenceThreshold: config.silenceThreshold || 0.01,
      silenceDuration: config.silenceDuration || 1500,
    }
  }

  /**
   * Start recording audio
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) return

    this.isRecording = true
    this.audioBuffer = []
    this.emit('recording:start')

    // Use sox for recording on all platforms
    const tempPath = join(tmpdir(), `voide-recording-${Date.now()}.wav`)

    this.recorder = spawn('sox', [
      '-d', // Default audio device
      '-r', String(this.config.sampleRate),
      '-c', '1', // Mono
      '-b', '16', // 16-bit
      tempPath,
      'silence', '1', '0.1', `${this.config.silenceThreshold * 100}%`,
      '1', String(this.config.silenceDuration / 1000), `${this.config.silenceThreshold * 100}%`,
    ])

    this.recorder.on('close', async (code) => {
      this.isRecording = false

      if (code === 0) {
        try {
          const audioData = await readFile(tempPath)
          this.emit('recording:complete', { path: tempPath, data: audioData })

          // Auto-transcribe
          const result = await this.transcribe(tempPath)
          this.emit('transcription', result)
        }
        catch (error) {
          this.emit('error', error)
        }
        finally {
          try {
            await unlink(tempPath)
          }
          catch {
            // Ignore cleanup errors
          }
        }
      }
      else {
        this.emit('recording:cancelled')
      }
    })

    this.recorder.on('error', (error) => {
      this.isRecording = false
      this.emit('error', error)
    })
  }

  /**
   * Stop recording
   */
  stopRecording(): void {
    if (!this.isRecording || !this.recorder) return

    this.recorder.kill('SIGTERM')
    this.isRecording = false
    this.emit('recording:stop')
  }

  /**
   * Cancel recording
   */
  cancelRecording(): void {
    if (!this.isRecording || !this.recorder) return

    this.recorder.kill('SIGKILL')
    this.isRecording = false
    this.audioBuffer = []
    this.emit('recording:cancelled')
  }

  /**
   * Transcribe audio file
   */
  async transcribe(audioPath: string): Promise<TranscriptionResult> {
    const { provider } = this.config

    switch (provider) {
      case 'openai':
        return this.transcribeOpenAI(audioPath)
      case 'whisper':
      default:
        return this.transcribeWhisper(audioPath)
    }
  }

  /**
   * Transcribe using local Whisper
   */
  private transcribeWhisper(audioPath: string): Promise<TranscriptionResult> {
    return new Promise((resolve, reject) => {
      const outputDir = tmpdir()

      const proc = spawn('whisper', [
        audioPath,
        '--model', 'base',
        '--language', this.config.language,
        '--output_format', 'json',
        '--output_dir', outputDir,
      ])

      let stderr = ''
      proc.stderr.on('data', (data) => {
        stderr += data.toString()
        // Emit progress events
        const progressMatch = stderr.match(/(\d+)%/)
        if (progressMatch) {
          this.emit('transcription:progress', Number.parseInt(progressMatch[1], 10))
        }
      })

      proc.on('close', async (code) => {
        if (code !== 0) {
          reject(new Error(`Whisper failed: ${stderr}`))
          return
        }

        const { basename } = await import('node:path')
        const outputPath = join(outputDir, basename(audioPath).replace(/\.[^.]+$/, '.json'))

        try {
          const content = await readFile(outputPath, 'utf-8')
          const result = JSON.parse(content) as {
            text: string
            language?: string
            segments?: Array<{ start: number; end: number }>
          }

          // Calculate duration from segments
          let duration = 0
          if (result.segments && result.segments.length > 0) {
            duration = result.segments[result.segments.length - 1].end
          }

          resolve({
            text: result.text.trim(),
            language: result.language,
            duration,
          })

          // Cleanup
          await unlink(outputPath).catch(() => {})
        }
        catch (error) {
          reject(error)
        }
      })

      proc.on('error', (error) => {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new Error('Whisper not installed. Install with: pip install openai-whisper'))
        }
        else {
          reject(error)
        }
      })
    })
  }

  /**
   * Transcribe using OpenAI Whisper API
   */
  private async transcribeOpenAI(audioPath: string): Promise<TranscriptionResult> {
    const apiKey = this.config.openaiKey
    if (!apiKey) throw new Error('OpenAI API key required')

    const audioData = await readFile(audioPath)

    const formData = new FormData()
    formData.append('file', new Blob([audioData]), 'audio.wav')
    formData.append('model', 'whisper-1')
    formData.append('language', this.config.language)
    formData.append('response_format', 'verbose_json')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`OpenAI transcription failed: ${response.status} - ${JSON.stringify(error)}`)
    }

    const result = await response.json() as {
      text: string
      language: string
      duration: number
    }

    return {
      text: result.text,
      language: result.language,
      duration: result.duration,
    }
  }

  /**
   * Transcribe from buffer
   */
  async transcribeBuffer(buffer: Buffer): Promise<TranscriptionResult> {
    const tempPath = join(tmpdir(), `voide-transcribe-${Date.now()}.wav`)

    try {
      await writeFile(tempPath, buffer)
      return await this.transcribe(tempPath)
    }
    finally {
      await unlink(tempPath).catch(() => {})
    }
  }

  /**
   * Check if recording is available
   */
  async checkAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('which', ['sox'])
      proc.on('close', (code) => resolve(code === 0))
      proc.on('error', () => resolve(false))
    })
  }

  /**
   * Get recording state
   */
  get recording(): boolean {
    return this.isRecording
  }
}

/**
 * Create voice input handler
 */
export function createVoiceInput(config: VoiceInputConfig = {}): VoiceInput {
  return new VoiceInput(config)
}

/**
 * One-shot recording and transcription
 */
export async function recordAndTranscribe(
  config: VoiceInputConfig = {},
): Promise<TranscriptionResult> {
  const input = createVoiceInput(config)

  return new Promise((resolve, reject) => {
    input.on('transcription', resolve)
    input.on('error', reject)
    input.on('recording:cancelled', () => reject(new Error('Recording cancelled')))

    input.startRecording()
  })
}

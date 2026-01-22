/**
 * Voice Commands Composable
 * Process voice commands like reset, oops, send, etc.
 */

export type VoiceCommandType =
  | 'reset'
  | 'oops'
  | 'send'
  | 'stop'
  | 'cancel'
  | 'repeat'
  | 'quiet'
  | 'clear_chat'
  | 'none'

export interface VoiceCommandResult {
  type: VoiceCommandType
  transcript: string // The transcript after removing the command
}

export interface PunctuationRule {
  pattern: RegExp
  replacement: string
}

// Spoken punctuation to symbol mappings
const punctuationMap: PunctuationRule[] = [
  // Common punctuation
  { pattern: /\bperiod\b/gi, replacement: '.' },
  { pattern: /\bfull stop\b/gi, replacement: '.' },
  { pattern: /\bcomma\b/gi, replacement: ',' },
  { pattern: /\bquestion mark\b/gi, replacement: '?' },
  { pattern: /\bexclamation mark\b/gi, replacement: '!' },
  { pattern: /\bexclamation point\b/gi, replacement: '!' },
  { pattern: /\bcolon\b/gi, replacement: ':' },
  { pattern: /\bsemicolon\b/gi, replacement: ';' },
  { pattern: /\bsemi colon\b/gi, replacement: ';' },
  // Quotes
  { pattern: /\bquote\b/gi, replacement: '"' },
  { pattern: /\bend quote\b/gi, replacement: '"' },
  { pattern: /\bopen quote\b/gi, replacement: '"' },
  { pattern: /\bclose quote\b/gi, replacement: '"' },
  { pattern: /\bsingle quote\b/gi, replacement: "'" },
  { pattern: /\bapostrophe\b/gi, replacement: "'" },
  // Brackets
  { pattern: /\bopen paren\b/gi, replacement: '(' },
  { pattern: /\bclose paren\b/gi, replacement: ')' },
  { pattern: /\bopen parenthesis\b/gi, replacement: '(' },
  { pattern: /\bclose parenthesis\b/gi, replacement: ')' },
  { pattern: /\bleft paren\b/gi, replacement: '(' },
  { pattern: /\bright paren\b/gi, replacement: ')' },
  { pattern: /\bopen bracket\b/gi, replacement: '[' },
  { pattern: /\bclose bracket\b/gi, replacement: ']' },
  { pattern: /\bleft bracket\b/gi, replacement: '[' },
  { pattern: /\bright bracket\b/gi, replacement: ']' },
  { pattern: /\bopen brace\b/gi, replacement: '{' },
  { pattern: /\bclose brace\b/gi, replacement: '}' },
  { pattern: /\bleft brace\b/gi, replacement: '{' },
  { pattern: /\bright brace\b/gi, replacement: '}' },
  { pattern: /\bopen curly\b/gi, replacement: '{' },
  { pattern: /\bclose curly\b/gi, replacement: '}' },
  // Special characters
  { pattern: /\bhyphen\b/gi, replacement: '-' },
  { pattern: /\bdash\b/gi, replacement: '-' },
  { pattern: /\bunderscore\b/gi, replacement: '_' },
  { pattern: /\bslash\b/gi, replacement: '/' },
  { pattern: /\bforward slash\b/gi, replacement: '/' },
  { pattern: /\bbackslash\b/gi, replacement: '\\' },
  { pattern: /\bback slash\b/gi, replacement: '\\' },
  { pattern: /\bpipe\b/gi, replacement: '|' },
  { pattern: /\bampersand\b/gi, replacement: '&' },
  { pattern: /\bat sign\b/gi, replacement: '@' },
  { pattern: /\bhash\b/gi, replacement: '#' },
  { pattern: /\bhashtag\b/gi, replacement: '#' },
  { pattern: /\bpound sign\b/gi, replacement: '#' },
  { pattern: /\basterisk\b/gi, replacement: '*' },
  { pattern: /\bstar\b/gi, replacement: '*' },
  { pattern: /\bpercent\b/gi, replacement: '%' },
  { pattern: /\bpercent sign\b/gi, replacement: '%' },
  { pattern: /\bcaret\b/gi, replacement: '^' },
  { pattern: /\btilde\b/gi, replacement: '~' },
  { pattern: /\bbacktick\b/gi, replacement: '`' },
  { pattern: /\bgrave\b/gi, replacement: '`' },
  { pattern: /\bellipsis\b/gi, replacement: '...' },
  { pattern: /\bdot dot dot\b/gi, replacement: '...' },
  // Comparison operators
  { pattern: /\bequals\b/gi, replacement: '=' },
  { pattern: /\bequal sign\b/gi, replacement: '=' },
  { pattern: /\bless than\b/gi, replacement: '<' },
  { pattern: /\bgreater than\b/gi, replacement: '>' },
  // New line
  { pattern: /\bnew line\b/gi, replacement: '\n' },
  { pattern: /\bnewline\b/gi, replacement: '\n' },
]

/**
 * Convert spoken punctuation words to symbols
 */
export function convertSpokenPunctuation(text: string): string {
  let result = text
  for (const { pattern, replacement } of punctuationMap) {
    result = result.replace(pattern, replacement)
  }
  // Clean up extra spaces around punctuation
  result = result.replace(/\s+([.,!?;:])/g, '$1')
  result = result.replace(/([(\[{])\s+/g, '$1')
  result = result.replace(/\s+([)\]}])/g, '$1')
  return result
}

/**
 * Detect voice command from transcript
 */
export function detectVoiceCommand(transcript: string): VoiceCommandResult {
  const trimmed = transcript.trim().toLowerCase()

  // "reset" clears the prompt
  if (trimmed.endsWith(' reset') || trimmed === 'reset') {
    return { type: 'reset', transcript: '' }
  }

  // "oops" deletes last word
  if (trimmed.endsWith(' oops') || trimmed === 'oops') {
    let text = transcript.replace(/\s*oops\s*$/i, '')
    text = text.replace(/[ \t]*[^ \t\n]+[ \t]*$/, '') // Remove last word
    return { type: 'oops', transcript: convertSpokenPunctuation(text) }
  }

  // "go", "send", or "submit" submits the prompt
  if (/(^|\s)(go|send|submit)$/i.test(trimmed)) {
    const text = transcript.replace(/\s*(go|send|submit)\s*$/i, '').trim()
    return { type: 'send', transcript: convertSpokenPunctuation(text) }
  }

  // "stop" or "pause" - turn off the mic
  if (trimmed === 'stop' || trimmed === 'pause' ||
      trimmed.endsWith(' stop') || trimmed.endsWith(' pause')) {
    return { type: 'stop', transcript: '' }
  }

  // "cancel" - stop Claude mid-response
  if (trimmed === 'cancel' || trimmed.endsWith(' cancel')) {
    return { type: 'cancel', transcript: '' }
  }

  // "repeat" or "say again" - repeat last response
  if (trimmed === 'repeat' || trimmed === 'say again' || trimmed === 'repeat that' ||
      trimmed.endsWith(' repeat') || trimmed.endsWith(' say again')) {
    return { type: 'repeat', transcript: '' }
  }

  // "quiet", "shut up", "be quiet", "silence" - stop TTS
  if (trimmed === 'quiet' || trimmed === 'shut up' || trimmed === 'be quiet' ||
      trimmed === 'silence' || trimmed === 'stop talking' ||
      trimmed.endsWith(' quiet') || trimmed.endsWith(' shut up')) {
    return { type: 'quiet', transcript: '' }
  }

  // "clear chat" or "new chat" - clear conversation
  if (trimmed === 'clear chat' || trimmed === 'new chat' ||
      trimmed.endsWith(' clear chat') || trimmed.endsWith(' new chat')) {
    return { type: 'clear_chat', transcript: '' }
  }

  // No command detected
  return { type: 'none', transcript: convertSpokenPunctuation(transcript) }
}

export interface VoiceCommandsRef {
  detect: (transcript: string) => VoiceCommandResult
  convertPunctuation: (text: string) => string
}

export function useVoiceCommands(): VoiceCommandsRef {
  return {
    detect: detectVoiceCommand,
    convertPunctuation: convertSpokenPunctuation,
  }
}

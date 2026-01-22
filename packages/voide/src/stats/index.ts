// Stats and Usage tracking for Voide CLI

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

const STATS_DIR = join(homedir(), '.voide', 'stats')
const USAGE_FILE = join(STATS_DIR, 'usage.json')

export interface UsageStats {
  totalSessions: number
  totalMessages: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  byModel: Record<string, ModelStats>
  byDay: Record<string, DayStats>
  firstUsed: number
  lastUsed: number
}

export interface ModelStats {
  sessions: number
  messages: number
  inputTokens: number
  outputTokens: number
  cost: number
}

export interface DayStats {
  sessions: number
  messages: number
  inputTokens: number
  outputTokens: number
  cost: number
}

// Model pricing (per million tokens)
const MODEL_PRICING: Record<string, { input: number, output: number }> = {
  'claude-opus-4-20250514': { input: 15, output: 75 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  'claude-3-5-haiku-20241022': { input: 0.8, output: 4 },
  'claude-3-opus-20240229': { input: 15, output: 75 },
  'gpt-4o': { input: 5, output: 15 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
}

/**
 * Load usage stats from disk
 */
export async function loadStats(): Promise<UsageStats> {
  try {
    const data = await readFile(USAGE_FILE, 'utf-8')
    return JSON.parse(data) as UsageStats
  }
  catch {
    // Return default stats
    return {
      totalSessions: 0,
      totalMessages: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      byModel: {},
      byDay: {},
      firstUsed: Date.now(),
      lastUsed: Date.now(),
    }
  }
}

/**
 * Save usage stats to disk
 */
export async function saveStats(stats: UsageStats): Promise<void> {
  await mkdir(STATS_DIR, { recursive: true })
  await writeFile(USAGE_FILE, JSON.stringify(stats, null, 2), 'utf-8')
}

/**
 * Calculate cost for tokens
 */
export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model]
  if (!pricing) return 0

  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output

  return inputCost + outputCost
}

/**
 * Record usage for a message
 */
export async function recordUsage(
  model: string,
  inputTokens: number,
  outputTokens: number,
  isNewSession = false,
): Promise<void> {
  const stats = await loadStats()
  const cost = calculateCost(model, inputTokens, outputTokens)
  const today = new Date().toISOString().split('T')[0]

  // Update totals
  stats.totalMessages++
  stats.totalInputTokens += inputTokens
  stats.totalOutputTokens += outputTokens
  stats.totalCost += cost
  stats.lastUsed = Date.now()

  if (isNewSession) {
    stats.totalSessions++
  }

  // Update by model
  if (!stats.byModel[model]) {
    stats.byModel[model] = {
      sessions: 0,
      messages: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    }
  }
  stats.byModel[model].messages++
  stats.byModel[model].inputTokens += inputTokens
  stats.byModel[model].outputTokens += outputTokens
  stats.byModel[model].cost += cost
  if (isNewSession) {
    stats.byModel[model].sessions++
  }

  // Update by day
  if (!stats.byDay[today]) {
    stats.byDay[today] = {
      sessions: 0,
      messages: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    }
  }
  stats.byDay[today].messages++
  stats.byDay[today].inputTokens += inputTokens
  stats.byDay[today].outputTokens += outputTokens
  stats.byDay[today].cost += cost
  if (isNewSession) {
    stats.byDay[today].sessions++
  }

  await saveStats(stats)
}

/**
 * Format stats for display
 */
export function formatStats(stats: UsageStats): string {
  const parts: string[] = ['## Usage Statistics\n']

  // Overall stats
  parts.push(`**Total Sessions:** ${stats.totalSessions}`)
  parts.push(`**Total Messages:** ${stats.totalMessages}`)
  parts.push(`**Total Tokens:** ${formatNumber(stats.totalInputTokens + stats.totalOutputTokens)}`)
  parts.push(`  - Input: ${formatNumber(stats.totalInputTokens)}`)
  parts.push(`  - Output: ${formatNumber(stats.totalOutputTokens)}`)
  parts.push(`**Estimated Cost:** $${stats.totalCost.toFixed(4)}`)
  parts.push('')

  // Usage period
  const firstDate = new Date(stats.firstUsed).toLocaleDateString()
  const lastDate = new Date(stats.lastUsed).toLocaleDateString()
  parts.push(`**Active:** ${firstDate} - ${lastDate}`)
  parts.push('')

  // By model
  if (Object.keys(stats.byModel).length > 0) {
    parts.push('### By Model\n')
    for (const [model, modelStats] of Object.entries(stats.byModel)) {
      parts.push(`**${model}**`)
      parts.push(`  Messages: ${modelStats.messages} | Tokens: ${formatNumber(modelStats.inputTokens + modelStats.outputTokens)} | Cost: $${modelStats.cost.toFixed(4)}`)
    }
    parts.push('')
  }

  // Recent days
  const days = Object.entries(stats.byDay)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 7)

  if (days.length > 0) {
    parts.push('### Last 7 Days\n')
    for (const [day, dayStats] of days) {
      parts.push(`**${day}:** ${dayStats.messages} messages | ${formatNumber(dayStats.inputTokens + dayStats.outputTokens)} tokens | $${dayStats.cost.toFixed(4)}`)
    }
  }

  return parts.join('\n')
}

/**
 * Format number with commas
 */
function formatNumber(n: number): string {
  return n.toLocaleString()
}

/**
 * Get today's stats
 */
export async function getTodayStats(): Promise<DayStats | null> {
  const stats = await loadStats()
  const today = new Date().toISOString().split('T')[0]
  return stats.byDay[today] || null
}

/**
 * Reset stats (with confirmation)
 */
export async function resetStats(): Promise<void> {
  const stats: UsageStats = {
    totalSessions: 0,
    totalMessages: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    byModel: {},
    byDay: {},
    firstUsed: Date.now(),
    lastUsed: Date.now(),
  }
  await saveStats(stats)
}

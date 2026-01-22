// Permission system for Voide CLI
// Integrates with config driver system

import type { PermissionChecker, PermissionType, PermissionResult } from '../tool/types'
import type { ResolvedVoideConfig, PermissionRule } from '../config/types'
import { checkPermission as checkConfigPermission } from '../config/loader'

/**
 * Create a permission checker from config
 */
export function createPermissionChecker(
  config: ResolvedVoideConfig,
  askCallback?: (question: string) => Promise<boolean>,
): PermissionChecker {
  return {
    async check(permission: PermissionType, path?: string): Promise<PermissionResult> {
      const result = checkConfigPermission(config, permission, path)

      if (result === 'allow') {
        return { allowed: true }
      }

      if (result === 'deny') {
        return {
          allowed: false,
          reason: `Permission denied by configuration: ${permission}${path ? ` for ${path}` : ''}`,
        }
      }

      // result === 'ask'
      if (askCallback) {
        const question = path
          ? `Allow ${permission} access to ${path}?`
          : `Allow ${permission}?`

        const allowed = await askCallback(question)
        return {
          allowed,
          reason: allowed ? undefined : 'User denied permission',
        }
      }

      // No callback, default deny for safety
      return {
        allowed: false,
        reason: 'Interactive permission required but no callback provided',
      }
    },

    async checkBash(command: string): Promise<PermissionResult> {
      // Check denied commands
      for (const pattern of config.permissions.deniedCommands) {
        if (command.includes(pattern)) {
          return {
            allowed: false,
            reason: `Command contains blocked pattern: ${pattern}`,
          }
        }
      }

      // Check allowed commands
      for (const pattern of config.permissions.allowedCommands) {
        if (command.includes(pattern)) {
          return { allowed: true }
        }
      }

      // Check general bash permission
      const result = checkConfigPermission(config, 'bash')

      if (result === 'allow') {
        return { allowed: true }
      }

      if (result === 'deny') {
        return {
          allowed: false,
          reason: 'Bash execution is disabled by configuration',
        }
      }

      // result === 'ask'
      if (askCallback) {
        const allowed = await askCallback(`Allow bash command: ${command.slice(0, 100)}${command.length > 100 ? '...' : ''}?`)
        return {
          allowed,
          reason: allowed ? undefined : 'User denied bash command',
        }
      }

      return {
        allowed: false,
        reason: 'Interactive permission required but no callback provided',
      }
    },
  }
}

/**
 * Simple permission checker that allows everything (for testing)
 */
export const allowAllPermissions: PermissionChecker = {
  async check(): Promise<PermissionResult> {
    return { allowed: true }
  },
  async checkBash(): Promise<PermissionResult> {
    return { allowed: true }
  },
}

/**
 * Permission checker that denies everything (for read-only mode)
 */
export const denyAllPermissions: PermissionChecker = {
  async check(permission: PermissionType): Promise<PermissionResult> {
    if (permission === 'read') {
      return { allowed: true }
    }
    return { allowed: false, reason: 'Read-only mode' }
  },
  async checkBash(): Promise<PermissionResult> {
    return { allowed: false, reason: 'Read-only mode' }
  },
}

/**
 * Create a permission checker with fixed rules
 */
export function createFixedPermissions(rules: PermissionRule[]): PermissionChecker {
  return {
    async check(permission: PermissionType, path?: string): Promise<PermissionResult> {
      for (const rule of rules) {
        if (rule.permission === permission || rule.permission === 'all') {
          if (!rule.pattern || (path && matchPattern(path, rule.pattern))) {
            if (rule.action === 'allow') {
              return { allowed: true }
            }
            if (rule.action === 'deny') {
              return { allowed: false, reason: `Denied by rule: ${rule.pattern || rule.permission}` }
            }
          }
        }
      }
      return { allowed: false, reason: 'No matching rule' }
    },

    async checkBash(command: string): Promise<PermissionResult> {
      for (const rule of rules) {
        if (rule.permission === 'bash' || rule.permission === 'all') {
          if (rule.action === 'allow') {
            return { allowed: true }
          }
          if (rule.action === 'deny') {
            return { allowed: false, reason: 'Bash denied by rule' }
          }
        }
      }
      return { allowed: false, reason: 'No matching bash rule' }
    },
  }
}

/**
 * Simple pattern matching (supports * and **)
 */
function matchPattern(path: string, pattern: string): boolean {
  const regex = new RegExp(
    '^' +
    pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '{{DOUBLE_STAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\{\{DOUBLE_STAR\}\}/g, '.*')
    + '$',
  )
  return regex.test(path)
}

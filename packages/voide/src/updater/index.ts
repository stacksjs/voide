// Updater for Voide CLI
// Handles upgrade and uninstall operations

import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { rm, readFile, writeFile, mkdir, stat, access, constants } from 'node:fs/promises'
import { spawn, execSync } from 'node:child_process'

const VOIDE_DIR = join(homedir(), '.voide')
const VERSION_CHECK_FILE = join(VOIDE_DIR, 'last-version-check')
const CURRENT_VERSION = '0.0.1'

// npm registry URL
const NPM_REGISTRY = 'https://registry.npmjs.org'
const PACKAGE_NAME = 'voide'

export interface VersionInfo {
  current: string
  latest: string
  latestBeta?: string
  updateAvailable: boolean
  betaAvailable?: boolean
}

export interface UpdateOptions {
  version?: string
  beta?: boolean
  force?: boolean
}

export interface UninstallOptions {
  keepConfig?: boolean
  force?: boolean
}

// Get version info from npm registry
export async function checkForUpdate(): Promise<VersionInfo> {
  const current = CURRENT_VERSION

  try {
    const response = await fetch(`${NPM_REGISTRY}/${PACKAGE_NAME}`)
    if (!response.ok) {
      return { current, latest: current, updateAvailable: false }
    }

    const data = await response.json() as {
      'dist-tags': { latest: string; beta?: string }
    }

    const latest = data['dist-tags'].latest
    const latestBeta = data['dist-tags'].beta

    return {
      current,
      latest,
      latestBeta,
      updateAvailable: compareVersions(latest, current) > 0,
      betaAvailable: latestBeta ? compareVersions(latestBeta, current) > 0 : false,
    }
  }
  catch {
    return { current, latest: current, updateAvailable: false }
  }
}

// Compare semantic versions
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number)
  const partsB = b.split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    const partA = partsA[i] || 0
    const partB = partsB[i] || 0

    if (partA > partB) return 1
    if (partA < partB) return -1
  }

  return 0
}

// Check if should check for updates (once per day)
export async function shouldCheckForUpdate(): Promise<boolean> {
  try {
    const lastCheck = await readFile(VERSION_CHECK_FILE, 'utf-8')
    const lastCheckTime = parseInt(lastCheck, 10)
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000

    return now - lastCheckTime > oneDay
  }
  catch {
    return true
  }
}

// Record version check
async function recordVersionCheck(): Promise<void> {
  try {
    await mkdir(VOIDE_DIR, { recursive: true })
    await writeFile(VERSION_CHECK_FILE, Date.now().toString(), 'utf-8')
  }
  catch {
    // Ignore errors
  }
}

// Periodic update check
export async function periodicUpdateCheck(): Promise<string | null> {
  if (!(await shouldCheckForUpdate())) {
    return null
  }

  await recordVersionCheck()

  const info = await checkForUpdate()
  if (info.updateAvailable) {
    return `Update available: ${info.current} → ${info.latest}. Run 'voide upgrade' to update.`
  }

  return null
}

// Upgrade voide
export async function upgrade(options: UpdateOptions = {}): Promise<{
  success: boolean
  message: string
  from?: string
  to?: string
}> {
  const info = await checkForUpdate()

  // Determine target version
  let targetVersion: string
  if (options.version) {
    targetVersion = options.version
  }
  else if (options.beta && info.latestBeta) {
    targetVersion = info.latestBeta
  }
  else {
    targetVersion = info.latest
  }

  // Check if upgrade needed
  if (!options.force && compareVersions(targetVersion, info.current) <= 0) {
    return {
      success: true,
      message: `Already at version ${info.current}. Use --force to reinstall.`,
    }
  }

  // Determine package manager
  const packageManager = detectPackageManager()

  // Run upgrade
  try {
    const packageSpec = options.version ? `${PACKAGE_NAME}@${options.version}` : PACKAGE_NAME

    switch (packageManager) {
      case 'bun':
        execSync(`bun add -g ${packageSpec}`, { stdio: 'inherit' })
        break
      case 'npm':
        execSync(`npm install -g ${packageSpec}`, { stdio: 'inherit' })
        break
      case 'yarn':
        execSync(`yarn global add ${packageSpec}`, { stdio: 'inherit' })
        break
      case 'pnpm':
        execSync(`pnpm add -g ${packageSpec}`, { stdio: 'inherit' })
        break
    }

    return {
      success: true,
      message: `Successfully upgraded from ${info.current} to ${targetVersion}`,
      from: info.current,
      to: targetVersion,
    }
  }
  catch (error) {
    return {
      success: false,
      message: `Failed to upgrade: ${(error as Error).message}`,
    }
  }
}

// Detect which package manager installed voide
function detectPackageManager(): 'bun' | 'npm' | 'yarn' | 'pnpm' {
  try {
    // Check if bun is available (preferred)
    execSync('bun --version', { stdio: 'ignore' })
    return 'bun'
  }
  catch {
    // Fall back to npm
    return 'npm'
  }
}

// Uninstall voide
export async function uninstall(options: UninstallOptions = {}): Promise<{
  success: boolean
  message: string
  removed: string[]
}> {
  const removed: string[] = []

  try {
    // Uninstall package
    const packageManager = detectPackageManager()

    switch (packageManager) {
      case 'bun':
        execSync(`bun remove -g ${PACKAGE_NAME}`, { stdio: 'inherit' })
        break
      case 'npm':
        execSync(`npm uninstall -g ${PACKAGE_NAME}`, { stdio: 'inherit' })
        break
      case 'yarn':
        execSync(`yarn global remove ${PACKAGE_NAME}`, { stdio: 'inherit' })
        break
      case 'pnpm':
        execSync(`pnpm remove -g ${PACKAGE_NAME}`, { stdio: 'inherit' })
        break
    }
    removed.push('voide package')

    // Remove config files if requested
    if (!options.keepConfig) {
      try {
        await rm(VOIDE_DIR, { recursive: true, force: true })
        removed.push('~/.voide directory')
      }
      catch {
        // Ignore errors
      }
    }

    return {
      success: true,
      message: options.keepConfig
        ? 'Voide uninstalled. Configuration files preserved.'
        : 'Voide uninstalled completely.',
      removed,
    }
  }
  catch (error) {
    return {
      success: false,
      message: `Failed to uninstall: ${(error as Error).message}`,
      removed,
    }
  }
}

// Get installation info
export async function getInstallInfo(): Promise<{
  version: string
  installPath: string
  configPath: string
  packageManager: string
  globallyInstalled: boolean
}> {
  const packageManager = detectPackageManager()

  // Try to find install path
  let installPath = 'unknown'
  try {
    switch (packageManager) {
      case 'bun':
        installPath = execSync('bun pm ls -g | grep voide', { encoding: 'utf-8' }).trim()
        break
      case 'npm':
        installPath = execSync('npm root -g', { encoding: 'utf-8' }).trim()
        installPath = join(installPath, PACKAGE_NAME)
        break
    }
  }
  catch {
    // Ignore errors
  }

  // Check if globally installed
  let globallyInstalled = false
  try {
    await access(installPath, constants.F_OK)
    globallyInstalled = true
  }
  catch {
    // Not globally installed
  }

  return {
    version: CURRENT_VERSION,
    installPath,
    configPath: VOIDE_DIR,
    packageManager,
    globallyInstalled,
  }
}

// Format version info for display
export function formatVersionInfo(info: VersionInfo): string {
  const lines: string[] = [
    '## Version Information',
    '',
    `Current version: ${info.current}`,
    `Latest version:  ${info.latest}`,
  ]

  if (info.latestBeta) {
    lines.push(`Latest beta:     ${info.latestBeta}`)
  }

  lines.push('')

  if (info.updateAvailable) {
    lines.push(`✓ Update available! Run 'voide upgrade' to update.`)
  }
  else {
    lines.push('✓ You are running the latest version.')
  }

  return lines.join('\n')
}

// Format install info for display
export function formatInstallInfo(info: Awaited<ReturnType<typeof getInstallInfo>>): string {
  return [
    '## Installation Information',
    '',
    `Version:         ${info.version}`,
    `Install path:    ${info.installPath}`,
    `Config path:     ${info.configPath}`,
    `Package manager: ${info.packageManager}`,
    `Global install:  ${info.globallyInstalled ? 'Yes' : 'No'}`,
  ].join('\n')
}

// Self-update using bun
export async function selfUpdate(): Promise<{ success: boolean; message: string }> {
  try {
    // Use bun to update
    execSync('bun upgrade voide', { stdio: 'inherit' })

    return {
      success: true,
      message: 'Successfully updated voide',
    }
  }
  catch (error) {
    return {
      success: false,
      message: `Failed to update: ${(error as Error).message}`,
    }
  }
}

// Rollback to previous version
export async function rollback(version?: string): Promise<{ success: boolean; message: string }> {
  try {
    const targetVersion = version || await getPreviousVersion()

    if (!targetVersion) {
      return {
        success: false,
        message: 'No previous version found to rollback to',
      }
    }

    return upgrade({ version: targetVersion, force: true })
  }
  catch (error) {
    return {
      success: false,
      message: `Failed to rollback: ${(error as Error).message}`,
    }
  }
}

// Get previous installed version from cache
async function getPreviousVersion(): Promise<string | null> {
  try {
    const historyFile = join(VOIDE_DIR, 'version-history')
    const history = await readFile(historyFile, 'utf-8')
    const versions = history.split('\n').filter(Boolean)

    // Return second to last version
    if (versions.length >= 2) {
      return versions[versions.length - 2]
    }
  }
  catch {
    // No history file
  }

  return null
}

// Record version in history
export async function recordVersion(version: string): Promise<void> {
  try {
    const historyFile = join(VOIDE_DIR, 'version-history')
    await mkdir(VOIDE_DIR, { recursive: true })

    let history = ''
    try {
      history = await readFile(historyFile, 'utf-8')
    }
    catch {
      // File doesn't exist
    }

    const versions = history.split('\n').filter(Boolean)

    // Only add if different from last
    if (versions[versions.length - 1] !== version) {
      versions.push(version)
      // Keep last 10 versions
      const recent = versions.slice(-10)
      await writeFile(historyFile, recent.join('\n') + '\n', 'utf-8')
    }
  }
  catch {
    // Ignore errors
  }
}

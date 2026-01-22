// mDNS Discovery for Voide CLI
// Discovers Voide servers on the local network

import { createSocket, type Socket } from 'node:dgram'
import { networkInterfaces } from 'node:os'
import { EventEmitter } from 'node:events'

const MDNS_PORT = 5353
const MDNS_ADDRESS = '224.0.0.251'
const VOIDE_SERVICE_TYPE = '_voide._tcp.local'

export interface DiscoveredServer {
  name: string
  host: string
  port: number
  addresses: string[]
  txt: Record<string, string>
  discoveredAt: number
  lastSeen: number
}

export interface DiscoveryOptions {
  timeout?: number
  serviceType?: string
}

// Simple DNS message builder/parser for mDNS
class DnsMessage {
  private buffer: Buffer
  private offset = 0

  constructor(buffer?: Buffer) {
    this.buffer = buffer || Buffer.alloc(512)
  }

  // Build a DNS query
  static buildQuery(name: string, type: number = 255 /* ANY */): Buffer {
    const msg = new DnsMessage()

    // Header
    msg.writeUInt16(0) // ID
    msg.writeUInt16(0) // Flags (query)
    msg.writeUInt16(1) // Questions
    msg.writeUInt16(0) // Answers
    msg.writeUInt16(0) // Authority
    msg.writeUInt16(0) // Additional

    // Question
    msg.writeName(name)
    msg.writeUInt16(type) // Type
    msg.writeUInt16(1) // Class IN

    return msg.buffer.subarray(0, msg.offset)
  }

  // Parse DNS response
  static parseResponse(buffer: Buffer): {
    answers: Array<{
      name: string
      type: number
      class: number
      ttl: number
      data: Buffer
    }>
  } {
    const msg = new DnsMessage(buffer)

    // Skip header
    msg.offset = 12

    // Skip questions
    const questions = buffer.readUInt16BE(4)
    for (let i = 0; i < questions; i++) {
      msg.skipName()
      msg.offset += 4 // Type + Class
    }

    // Parse answers
    const answerCount = buffer.readUInt16BE(6)
    const answers: Array<{
      name: string
      type: number
      class: number
      ttl: number
      data: Buffer
    }> = []

    for (let i = 0; i < answerCount; i++) {
      try {
        const name = msg.readName()
        const type = msg.readUInt16()
        const cls = msg.readUInt16()
        const ttl = msg.readUInt32()
        const dataLen = msg.readUInt16()
        const data = msg.buffer.subarray(msg.offset, msg.offset + dataLen)
        msg.offset += dataLen

        answers.push({ name, type, class: cls, ttl, data })
      }
      catch {
        break
      }
    }

    return { answers }
  }

  private writeUInt16(value: number): void {
    this.buffer.writeUInt16BE(value, this.offset)
    this.offset += 2
  }

  private writeName(name: string): void {
    const parts = name.split('.')
    for (const part of parts) {
      this.buffer[this.offset++] = part.length
      this.buffer.write(part, this.offset)
      this.offset += part.length
    }
    this.buffer[this.offset++] = 0
  }

  private readUInt16(): number {
    const value = this.buffer.readUInt16BE(this.offset)
    this.offset += 2
    return value
  }

  private readUInt32(): number {
    const value = this.buffer.readUInt32BE(this.offset)
    this.offset += 4
    return value
  }

  private readName(): string {
    const parts: string[] = []
    let jumped = false
    let savedOffset = 0

    while (this.offset < this.buffer.length) {
      const len = this.buffer[this.offset]

      if (len === 0) {
        this.offset++
        break
      }

      // Compression pointer
      if ((len & 0xc0) === 0xc0) {
        if (!jumped) {
          savedOffset = this.offset + 2
        }
        this.offset = ((len & 0x3f) << 8) | this.buffer[this.offset + 1]
        jumped = true
        continue
      }

      this.offset++
      parts.push(this.buffer.toString('utf8', this.offset, this.offset + len))
      this.offset += len
    }

    if (jumped) {
      this.offset = savedOffset
    }

    return parts.join('.')
  }

  private skipName(): void {
    while (this.offset < this.buffer.length) {
      const len = this.buffer[this.offset]

      if (len === 0) {
        this.offset++
        break
      }

      if ((len & 0xc0) === 0xc0) {
        this.offset += 2
        break
      }

      this.offset += len + 1
    }
  }
}

// mDNS Discovery class
export class MdnsDiscovery extends EventEmitter {
  private socket: Socket | null = null
  private servers: Map<string, DiscoveredServer> = new Map()
  private running = false

  constructor() {
    super()
  }

  // Start discovery
  async start(options: DiscoveryOptions = {}): Promise<void> {
    if (this.running) return

    return new Promise((resolve, reject) => {
      this.socket = createSocket({ type: 'udp4', reuseAddr: true })

      this.socket.on('error', (err) => {
        this.emit('error', err)
        reject(err)
      })

      this.socket.on('message', (msg, rinfo) => {
        this.handleMessage(msg, rinfo.address)
      })

      this.socket.bind(MDNS_PORT, () => {
        try {
          this.socket!.addMembership(MDNS_ADDRESS)
          this.socket!.setMulticastTTL(255)
          this.socket!.setMulticastLoopback(true)
          this.running = true

          // Send initial query
          this.sendQuery(options.serviceType || VOIDE_SERVICE_TYPE)

          resolve()
        }
        catch (err) {
          reject(err)
        }
      })
    })
  }

  // Stop discovery
  stop(): void {
    if (!this.running) return

    this.running = false

    if (this.socket) {
      try {
        this.socket.dropMembership(MDNS_ADDRESS)
      }
      catch {
        // Ignore
      }
      this.socket.close()
      this.socket = null
    }
  }

  // Send mDNS query
  private sendQuery(serviceType: string): void {
    if (!this.socket || !this.running) return

    const query = DnsMessage.buildQuery(serviceType)

    this.socket.send(query, 0, query.length, MDNS_PORT, MDNS_ADDRESS, (err) => {
      if (err) {
        this.emit('error', err)
      }
    })
  }

  // Handle incoming message
  private handleMessage(msg: Buffer, fromAddress: string): void {
    try {
      const response = DnsMessage.parseResponse(msg)

      for (const answer of response.answers) {
        // PTR record - service instance
        if (answer.type === 12) {
          // Request more info
          this.sendQuery(answer.name)
        }

        // SRV record - service location
        if (answer.type === 33) {
          const priority = answer.data.readUInt16BE(0)
          const weight = answer.data.readUInt16BE(2)
          const port = answer.data.readUInt16BE(4)

          // Extract hostname from SRV data
          let offset = 6
          const hostParts: string[] = []
          while (offset < answer.data.length) {
            const len = answer.data[offset]
            if (len === 0) break
            hostParts.push(answer.data.toString('utf8', offset + 1, offset + 1 + len))
            offset += len + 1
          }
          const host = hostParts.join('.')

          // Create or update server
          const serverKey = `${host}:${port}`
          let server = this.servers.get(serverKey)

          if (!server) {
            server = {
              name: answer.name.replace(/\._voide\._tcp\.local$/, ''),
              host,
              port,
              addresses: [fromAddress],
              txt: {},
              discoveredAt: Date.now(),
              lastSeen: Date.now(),
            }
            this.servers.set(serverKey, server)
            this.emit('discovered', server)
          }
          else {
            server.lastSeen = Date.now()
            if (!server.addresses.includes(fromAddress)) {
              server.addresses.push(fromAddress)
            }
            this.emit('updated', server)
          }
        }

        // TXT record - additional info
        if (answer.type === 16) {
          const txt: Record<string, string> = {}
          let offset = 0

          while (offset < answer.data.length) {
            const len = answer.data[offset]
            if (len === 0) break

            const entry = answer.data.toString('utf8', offset + 1, offset + 1 + len)
            const eqIdx = entry.indexOf('=')
            if (eqIdx !== -1) {
              txt[entry.slice(0, eqIdx)] = entry.slice(eqIdx + 1)
            }
            offset += len + 1
          }

          // Update server with TXT records
          for (const [, server] of this.servers) {
            if (answer.name.includes(server.name)) {
              server.txt = { ...server.txt, ...txt }
              this.emit('updated', server)
            }
          }
        }

        // A record - IPv4 address
        if (answer.type === 1 && answer.data.length === 4) {
          const ip = `${answer.data[0]}.${answer.data[1]}.${answer.data[2]}.${answer.data[3]}`

          // Update servers with this hostname
          for (const [, server] of this.servers) {
            if (answer.name.includes(server.host) && !server.addresses.includes(ip)) {
              server.addresses.push(ip)
              this.emit('updated', server)
            }
          }
        }
      }
    }
    catch {
      // Ignore parse errors
    }
  }

  // Get all discovered servers
  getServers(): DiscoveredServer[] {
    return Array.from(this.servers.values())
  }

  // Get server by name
  getServer(name: string): DiscoveredServer | undefined {
    for (const [, server] of this.servers) {
      if (server.name === name) return server
    }
    return undefined
  }

  // Refresh discovery
  refresh(): void {
    this.sendQuery(VOIDE_SERVICE_TYPE)
  }
}

// Discover servers with timeout
export async function discoverServers(options: DiscoveryOptions = {}): Promise<DiscoveredServer[]> {
  const timeout = options.timeout || 3000
  const discovery = new MdnsDiscovery()

  return new Promise((resolve) => {
    const servers: DiscoveredServer[] = []

    discovery.on('discovered', (server) => {
      servers.push(server)
    })

    discovery.start(options)
      .then(() => {
        setTimeout(() => {
          discovery.stop()
          resolve(servers)
        }, timeout)
      })
      .catch(() => {
        resolve([])
      })
  })
}

// Announce a Voide server on the network
export async function announceServer(
  name: string,
  port: number,
  txt: Record<string, string> = {},
): Promise<{ stop: () => void }> {
  const socket = createSocket({ type: 'udp4', reuseAddr: true })

  // Get local IP addresses
  const addresses = getLocalAddresses()

  await new Promise<void>((resolve, reject) => {
    socket.bind(MDNS_PORT, () => {
      try {
        socket.addMembership(MDNS_ADDRESS)
        socket.setMulticastTTL(255)
        resolve()
      }
      catch (err) {
        reject(err)
      }
    })
  })

  // Build announcement response
  const announce = () => {
    // This is a simplified announcement - full implementation would include proper DNS response building
    // For now, we rely on responding to queries
  }

  // Initial announcement
  announce()

  // Periodic re-announcement
  const interval = setInterval(announce, 60000)

  return {
    stop: () => {
      clearInterval(interval)
      try {
        socket.dropMembership(MDNS_ADDRESS)
      }
      catch {
        // Ignore
      }
      socket.close()
    },
  }
}

// Get local IP addresses
export function getLocalAddresses(): string[] {
  const addresses: string[] = []
  const interfaces = networkInterfaces()

  for (const [, infos] of Object.entries(interfaces)) {
    if (!infos) continue

    for (const info of infos) {
      if (info.family === 'IPv4' && !info.internal) {
        addresses.push(info.address)
      }
    }
  }

  return addresses
}

// Format discovered servers for display
export function formatDiscoveredServers(servers: DiscoveredServer[]): string {
  if (servers.length === 0) {
    return 'No Voide servers found on the local network.'
  }

  const lines: string[] = ['## Discovered Voide Servers', '']

  for (const server of servers) {
    lines.push(`**${server.name}**`)
    lines.push(`  Host: ${server.host}:${server.port}`)
    lines.push(`  Addresses: ${server.addresses.join(', ')}`)

    if (Object.keys(server.txt).length > 0) {
      lines.push('  Info:')
      for (const [key, value] of Object.entries(server.txt)) {
        lines.push(`    ${key}: ${value}`)
      }
    }

    const ago = Date.now() - server.lastSeen
    lines.push(`  Last seen: ${ago < 1000 ? 'just now' : `${Math.floor(ago / 1000)}s ago`}`)
    lines.push('')
  }

  return lines.join('\n')
}

// Create singleton discovery instance
let discovery: MdnsDiscovery | null = null

export function getDiscovery(): MdnsDiscovery {
  if (!discovery) {
    discovery = new MdnsDiscovery()
  }
  return discovery
}

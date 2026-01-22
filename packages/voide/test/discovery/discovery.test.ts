// mDNS Discovery Tests

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import {
  MdnsDiscovery,
  discoverServers,
  getLocalAddresses,
  formatDiscoveredServers,
  getDiscovery,
  type DiscoveredServer,
} from '../../src/discovery'

describe('MdnsDiscovery', () => {
  let discovery: MdnsDiscovery

  beforeEach(() => {
    discovery = new MdnsDiscovery()
  })

  afterEach(() => {
    discovery.stop()
  })

  describe('constructor', () => {
    test('should create instance', () => {
      expect(discovery).toBeInstanceOf(MdnsDiscovery)
    })
  })

  describe('getServers', () => {
    test('should return empty array initially', () => {
      const servers = discovery.getServers()
      expect(servers).toEqual([])
    })
  })

  describe('getServer', () => {
    test('should return undefined for non-existent server', () => {
      const server = discovery.getServer('nonexistent')
      expect(server).toBeUndefined()
    })
  })

  describe('events', () => {
    test('should be an EventEmitter', () => {
      expect(typeof discovery.on).toBe('function')
      expect(typeof discovery.emit).toBe('function')
      expect(typeof discovery.removeListener).toBe('function')
    })

    test('should allow registering event handlers', () => {
      const handler = () => {}
      discovery.on('discovered', handler)
      discovery.on('updated', handler)
      discovery.on('error', handler)
      // Should not throw
    })
  })

  describe('start/stop', () => {
    test('should handle stop without start', () => {
      // Should not throw
      discovery.stop()
    })

    // Note: Actually starting mDNS requires network access and binding to port 5353
    // which may require elevated permissions. We test the interface but not the actual network operations.
  })
})

describe('discoverServers', () => {
  test('should return array', async () => {
    // With a very short timeout, likely returns empty but should not throw
    const servers = await discoverServers({ timeout: 100 })
    expect(Array.isArray(servers)).toBe(true)
  })

  test('should respect timeout option', async () => {
    const start = Date.now()
    await discoverServers({ timeout: 100 })
    const elapsed = Date.now() - start

    // Should complete within reasonable time of timeout
    expect(elapsed).toBeLessThan(500)
  })
})

describe('getLocalAddresses', () => {
  test('should return array of IP addresses', () => {
    const addresses = getLocalAddresses()

    expect(Array.isArray(addresses)).toBe(true)
  })

  test('should return IPv4 addresses', () => {
    const addresses = getLocalAddresses()

    for (const addr of addresses) {
      // IPv4 format: x.x.x.x
      expect(addr).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)
    }
  })

  test('should not include loopback address', () => {
    const addresses = getLocalAddresses()

    expect(addresses).not.toContain('127.0.0.1')
  })
})

describe('formatDiscoveredServers', () => {
  test('should format empty list', () => {
    const formatted = formatDiscoveredServers([])

    expect(formatted).toContain('No Voide servers found')
  })

  test('should format single server', () => {
    const servers: DiscoveredServer[] = [
      {
        name: 'test-server',
        host: 'test.local',
        port: 3000,
        addresses: ['192.168.1.100'],
        txt: {},
        discoveredAt: Date.now(),
        lastSeen: Date.now(),
      },
    ]

    const formatted = formatDiscoveredServers(servers)

    expect(formatted).toContain('test-server')
    expect(formatted).toContain('test.local')
    expect(formatted).toContain('3000')
    expect(formatted).toContain('192.168.1.100')
  })

  test('should format multiple servers', () => {
    const servers: DiscoveredServer[] = [
      {
        name: 'server-1',
        host: 'srv1.local',
        port: 3000,
        addresses: ['192.168.1.100'],
        txt: {},
        discoveredAt: Date.now(),
        lastSeen: Date.now(),
      },
      {
        name: 'server-2',
        host: 'srv2.local',
        port: 3001,
        addresses: ['192.168.1.101'],
        txt: {},
        discoveredAt: Date.now(),
        lastSeen: Date.now(),
      },
    ]

    const formatted = formatDiscoveredServers(servers)

    expect(formatted).toContain('server-1')
    expect(formatted).toContain('server-2')
    expect(formatted).toContain('Discovered Voide Servers')
  })

  test('should include TXT records', () => {
    const servers: DiscoveredServer[] = [
      {
        name: 'server',
        host: 'srv.local',
        port: 3000,
        addresses: ['192.168.1.100'],
        txt: {
          version: '1.0.0',
          model: 'claude-3',
        },
        discoveredAt: Date.now(),
        lastSeen: Date.now(),
      },
    ]

    const formatted = formatDiscoveredServers(servers)

    expect(formatted).toContain('version')
    expect(formatted).toContain('1.0.0')
    expect(formatted).toContain('model')
  })

  test('should include last seen time', () => {
    const servers: DiscoveredServer[] = [
      {
        name: 'server',
        host: 'srv.local',
        port: 3000,
        addresses: ['192.168.1.100'],
        txt: {},
        discoveredAt: Date.now(),
        lastSeen: Date.now(),
      },
    ]

    const formatted = formatDiscoveredServers(servers)

    expect(formatted).toContain('Last seen')
    expect(formatted).toContain('just now')
  })

  test('should show time ago for older servers', () => {
    const servers: DiscoveredServer[] = [
      {
        name: 'server',
        host: 'srv.local',
        port: 3000,
        addresses: ['192.168.1.100'],
        txt: {},
        discoveredAt: Date.now() - 5000,
        lastSeen: Date.now() - 5000,
      },
    ]

    const formatted = formatDiscoveredServers(servers)

    expect(formatted).toMatch(/\d+s ago/)
  })

  test('should show multiple addresses', () => {
    const servers: DiscoveredServer[] = [
      {
        name: 'server',
        host: 'srv.local',
        port: 3000,
        addresses: ['192.168.1.100', '10.0.0.5'],
        txt: {},
        discoveredAt: Date.now(),
        lastSeen: Date.now(),
      },
    ]

    const formatted = formatDiscoveredServers(servers)

    expect(formatted).toContain('192.168.1.100')
    expect(formatted).toContain('10.0.0.5')
  })
})

describe('getDiscovery', () => {
  test('should return singleton instance', () => {
    const d1 = getDiscovery()
    const d2 = getDiscovery()

    expect(d1).toBe(d2)
    expect(d1).toBeInstanceOf(MdnsDiscovery)
  })
})

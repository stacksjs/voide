/**
 * Audio Storage Composable
 * IndexedDB-based storage for audio recordings
 */

export interface AudioRecord {
  id: string
  blob: Blob
  duration: number
  transcript: string | null
  createdAt: number
  chatId: string | null
  messageId: string | null
}

export interface AudioStorageOptions {
  dbName?: string
  storeName?: string
  maxRecordings?: number // Auto-cleanup old recordings
}

export interface AudioStorageRef {
  isSupported: boolean
  save: (blob: Blob, duration: number, transcript?: string | null, chatId?: string | null, messageId?: string | null) => Promise<string>
  get: (id: string) => Promise<AudioRecord | null>
  getAll: () => Promise<AudioRecord[]>
  getByChatId: (chatId: string) => Promise<AudioRecord[]>
  delete: (id: string) => Promise<boolean>
  deleteAll: () => Promise<boolean>
  getUrl: (id: string) => Promise<string | null>
  updateTranscript: (id: string, transcript: string) => Promise<boolean>
}

const DEFAULT_DB_NAME = 'voide-audio'
const DEFAULT_STORE_NAME = 'recordings'
const DEFAULT_MAX_RECORDINGS = 100

function generateId(): string {
  return `audio_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export function useAudioStorage(options: AudioStorageOptions = {}): AudioStorageRef {
  const {
    dbName = DEFAULT_DB_NAME,
    storeName = DEFAULT_STORE_NAME,
    maxRecordings = DEFAULT_MAX_RECORDINGS
  } = options

  const isSupported = typeof window !== 'undefined' && !!window.indexedDB

  let db: IDBDatabase | null = null
  let dbPromise: Promise<IDBDatabase> | null = null

  const openDB = (): Promise<IDBDatabase> => {
    if (db) return Promise.resolve(db)
    if (dbPromise) return dbPromise

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1)

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }

      request.onsuccess = () => {
        db = request.result
        resolve(db)
      }

      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result

        if (!database.objectStoreNames.contains(storeName)) {
          const store = database.createObjectStore(storeName, { keyPath: 'id' })
          store.createIndex('createdAt', 'createdAt', { unique: false })
          store.createIndex('chatId', 'chatId', { unique: false })
        }
      }
    })

    return dbPromise
  }

  const cleanupOldRecordings = async (database: IDBDatabase) => {
    return new Promise<void>((resolve) => {
      const transaction = database.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const index = store.index('createdAt')

      const countRequest = store.count()
      countRequest.onsuccess = () => {
        const count = countRequest.result
        if (count <= maxRecordings) {
          resolve()
          return
        }

        // Delete oldest recordings
        const deleteCount = count - maxRecordings
        let deleted = 0

        const cursorRequest = index.openCursor()
        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
          if (cursor && deleted < deleteCount) {
            cursor.delete()
            deleted++
            cursor.continue()
          } else {
            resolve()
          }
        }
      }
    })
  }

  const save = async (
    blob: Blob,
    duration: number,
    transcript: string | null = null,
    chatId: string | null = null,
    messageId: string | null = null
  ): Promise<string> => {
    if (!isSupported) throw new Error('IndexedDB not supported')

    const database = await openDB()
    await cleanupOldRecordings(database)

    const id = generateId()
    const record: AudioRecord = {
      id,
      blob,
      duration,
      transcript,
      createdAt: Date.now(),
      chatId,
      messageId
    }

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.add(record)

      request.onsuccess = () => resolve(id)
      request.onerror = () => reject(new Error('Failed to save audio'))
    })
  }

  const get = async (id: string): Promise<AudioRecord | null> => {
    if (!isSupported) return null

    const database = await openDB()

    return new Promise((resolve) => {
      const transaction = database.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => resolve(null)
    })
  }

  const getAll = async (): Promise<AudioRecord[]> => {
    if (!isSupported) return []

    const database = await openDB()

    return new Promise((resolve) => {
      const transaction = database.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index('createdAt')
      const request = index.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => resolve([])
    })
  }

  const getByChatId = async (chatId: string): Promise<AudioRecord[]> => {
    if (!isSupported) return []

    const database = await openDB()

    return new Promise((resolve) => {
      const transaction = database.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index('chatId')
      const request = index.getAll(chatId)

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => resolve([])
    })
  }

  const deleteRecord = async (id: string): Promise<boolean> => {
    if (!isSupported) return false

    const database = await openDB()

    return new Promise((resolve) => {
      const transaction = database.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(id)

      request.onsuccess = () => resolve(true)
      request.onerror = () => resolve(false)
    })
  }

  const deleteAll = async (): Promise<boolean> => {
    if (!isSupported) return false

    const database = await openDB()

    return new Promise((resolve) => {
      const transaction = database.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onsuccess = () => resolve(true)
      request.onerror = () => resolve(false)
    })
  }

  const getUrl = async (id: string): Promise<string | null> => {
    const record = await get(id)
    if (!record) return null
    return URL.createObjectURL(record.blob)
  }

  const updateTranscript = async (id: string, transcript: string): Promise<boolean> => {
    if (!isSupported) return false

    const database = await openDB()
    const record = await get(id)
    if (!record) return false

    record.transcript = transcript

    return new Promise((resolve) => {
      const transaction = database.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(record)

      request.onsuccess = () => resolve(true)
      request.onerror = () => resolve(false)
    })
  }

  return {
    isSupported,
    save,
    get,
    getAll,
    getByChatId,
    delete: deleteRecord,
    deleteAll,
    getUrl,
    updateTranscript
  }
}

// Singleton instance
let audioStorageInstance: AudioStorageRef | null = null

export function getAudioStorage(options?: AudioStorageOptions): AudioStorageRef {
  if (!audioStorageInstance) {
    audioStorageInstance = useAudioStorage(options)
  }
  return audioStorageInstance
}

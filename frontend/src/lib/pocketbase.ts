import PocketBase from 'pocketbase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090')

export default pb

// Type definitions for user record
export interface User {
  id: string
  email: string
  username?: string
  name?: string
  avatar?: string
  created: string
  updated: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any // Allow additional properties from PocketBase
}

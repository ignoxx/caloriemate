import PocketBase from 'pocketbase'

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
}
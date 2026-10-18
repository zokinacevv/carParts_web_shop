import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const users = new Map()
const sessions = new Map()

export async function register(input) {
  const email = String(input.email || '').trim().toLowerCase()
  if (!email || !String(input.password || '').trim() || !String(input.firstName || '').trim()) return { error: 'firstName, email, and password are required' }
  if (users.has(email)) return { error: 'Email is already registered' }
  const passwordHash = await hashPassword(input.password)
  const user = { id: `user_${randomBytes(8).toString('hex')}`, email, firstName: input.firstName, lastName: input.lastName || '', role: 'CUSTOMER' }
  users.set(email, { ...user, passwordHash })
  return createSession(user)
}

export async function login(input) {
  const email = String(input.email || '').trim().toLowerCase()
  const record = users.get(email)
  if (!record || !(await verifyPassword(input.password || '', record.passwordHash))) return { error: 'Invalid email or password' }
  return createSession(record)
}

export function sessionFromRequest(request) {
  const value = request.headers.authorization || ''
  return value.startsWith('Bearer ') ? sessions.get(value.slice(7)) || null : null
}

export function requireRole(request, role) {
  const session = sessionFromRequest(request)
  if (!session) return { error: 'Authentication required', status: 401 }
  if (session.role !== role && session.role !== 'ADMIN') return { error: 'Insufficient permissions', status: 403 }
  return { session }
}

async function hashPassword(password) {
  const salt = randomBytes(16)
  const derived = await scrypt(String(password), salt, 64)
  return `${salt.toString('hex')}:${Buffer.from(derived).toString('hex')}`
}

async function verifyPassword(password, stored) {
  const [saltHex, hashHex] = String(stored).split(':')
  if (!saltHex || !hashHex) return false
  const derived = await scrypt(String(password), Buffer.from(saltHex, 'hex'), 64)
  const expected = Buffer.from(hashHex, 'hex')
  return expected.length === derived.length && timingSafeEqual(expected, derived)
}

function createSession(user) {
  const token = randomBytes(32).toString('hex')
  const safeUser = { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role }
  sessions.set(token, safeUser)
  return { data: { token, user: safeUser } }
}

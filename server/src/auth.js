/** PIN hashing (scrypt), family codes, and opaque device tokens (SR-BCK-02 interim). */
import { scryptSync, randomBytes, createHash, timingSafeEqual } from 'node:crypto'

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

export function hashPin(pin) {
  const salt = randomBytes(16)
  const hash = scryptSync(String(pin), salt, 32)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

export function verifyPin(pin, stored) {
  const [saltHex, hashHex] = stored.split(':')
  const hash = scryptSync(String(pin), Buffer.from(saltHex, 'hex'), 32)
  return timingSafeEqual(hash, Buffer.from(hashHex, 'hex'))
}

export function newCode(random = randomBytes) {
  const bytes = random(6)
  let code = ''
  for (const b of bytes) code += ALPHABET[b % ALPHABET.length]
  return code
}

export const newToken = () => randomBytes(24).toString('hex')

export const hashToken = (token) => createHash('sha256').update(token).digest('hex')

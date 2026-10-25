import crypto from 'crypto'
import { promisify } from 'util'

const scrypt = promisify(crypto.scrypt)

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer
  return {
    hash: derivedKey.toString('hex'),
    salt
  }
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  try {
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer
    const keyBuffer = Buffer.from(hash, 'hex')
    if (derivedKey.length !== keyBuffer.length) {
      return false
    }
    return crypto.timingSafeEqual(derivedKey, keyBuffer)
  } catch {
    return false
  }
}

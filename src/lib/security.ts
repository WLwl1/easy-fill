import type { Profile, VaultRecord } from "./types"

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const ITERATIONS = 250_000

const toBase64 = (buffer: ArrayBuffer) => {
  let binary = ""
  const bytes = new Uint8Array(buffer)
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

const fromBase64 = (value: string) => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

const deriveKey = async (password: string, salt: Uint8Array<ArrayBuffer>) => {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  )

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256"
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  )
}

export const encryptProfile = async (profile: Profile, password: string): Promise<VaultRecord> => {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const payload = encoder.encode(JSON.stringify(profile))
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, payload)

  return {
    version: 1,
    salt: toBase64(salt.buffer),
    iv: toBase64(iv.buffer),
    ciphertext: toBase64(ciphertext),
    updatedAt: new Date().toISOString()
  }
}

export const decryptProfile = async (vault: VaultRecord, password: string): Promise<Profile> => {
  try {
    const salt = new Uint8Array(fromBase64(vault.salt) as ArrayBuffer)
    const iv = new Uint8Array(fromBase64(vault.iv) as ArrayBuffer)
    const ciphertext = fromBase64(vault.ciphertext)
    const key = await deriveKey(password, salt)
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext)
    return JSON.parse(decoder.decode(decrypted)) as Profile
  } catch (error) {
    throw new Error("INVALID_PASSWORD")
  }
}

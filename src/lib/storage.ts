import { DEFAULT_AI_RECOGNITION_SETTINGS, STORAGE_KEYS } from "./constants"
import {
  storageLocalGet,
  storageLocalSet,
  storageSessionGet,
  storageSessionRemove,
  storageSessionSet
} from "./browser"
import { decryptProfile, encryptProfile } from "./security"
import type { AiRecognitionSettings, Profile, VaultRecord, VaultStatus } from "./types"

let masterPasswordCache: string | null = null

export const getVaultRecord = async () => storageLocalGet<VaultRecord>(STORAGE_KEYS.vault)

export const getVaultStatus = async (): Promise<VaultStatus> => {
  const [vault, sessionUnlocked, sessionProfile] = await Promise.all([
    getVaultRecord(),
    storageSessionGet<boolean>(STORAGE_KEYS.sessionUnlocked),
    storageSessionGet<Profile>(STORAGE_KEYS.sessionProfile)
  ])

  return {
    hasVault: Boolean(vault),
    unlocked: Boolean(sessionUnlocked && sessionProfile)
  }
}

export const unlockVault = async (password: string) => {
  const vault = await getVaultRecord()
  if (!vault) {
    throw new Error("VAULT_NOT_FOUND")
  }

  const profile = await decryptProfile(vault, password)
  masterPasswordCache = password
  await storageSessionSet(STORAGE_KEYS.sessionProfile, profile)
  await storageSessionSet(STORAGE_KEYS.sessionUnlocked, true)
  return profile
}

export const lockVault = async () => {
  masterPasswordCache = null
  await storageSessionRemove(STORAGE_KEYS.sessionProfile)
  await storageSessionRemove(STORAGE_KEYS.sessionUnlocked)
}

export const getUnlockedProfile = async (): Promise<Profile | null> => {
  const unlocked = await storageSessionGet<boolean>(STORAGE_KEYS.sessionUnlocked)
  if (!unlocked) {
    return null
  }

  return (await storageSessionGet<Profile>(STORAGE_KEYS.sessionProfile)) ?? null
}

export const saveProfileWithPassword = async (profile: Profile, password: string) => {
  const vault = await encryptProfile(profile, password)
  masterPasswordCache = password
  await storageLocalSet(STORAGE_KEYS.vault, vault)
  await storageSessionSet(STORAGE_KEYS.sessionProfile, profile)
  await storageSessionSet(STORAGE_KEYS.sessionUnlocked, true)
}

export const saveUnlockedProfile = async (profile: Profile) => {
  const password = masterPasswordCache
  if (!password) {
    throw new Error("REAUTH_REQUIRED")
  }

  await saveProfileWithPassword(profile, password)
}

export const changePassword = async (nextPassword: string) => {
  const profile = await getUnlockedProfile()
  if (!profile) {
    throw new Error("LOCKED")
  }

  await saveProfileWithPassword(profile, nextPassword)
}

export const clearVault = async () => {
  masterPasswordCache = null
  await chrome.storage.local.remove([STORAGE_KEYS.vault])
  await storageSessionRemove(STORAGE_KEYS.sessionProfile)
  await storageSessionRemove(STORAGE_KEYS.sessionUnlocked)
}

export const getAiRecognitionSettings = async (): Promise<AiRecognitionSettings> => {
  const stored = await storageLocalGet<Partial<AiRecognitionSettings>>(STORAGE_KEYS.aiSettings)

  return {
    ...DEFAULT_AI_RECOGNITION_SETTINGS,
    ...stored,
    apiKey: stored?.apiKey ?? DEFAULT_AI_RECOGNITION_SETTINGS.apiKey
  }
}

export const saveAiRecognitionSettings = async (settings: AiRecognitionSettings) => {
  const endpoint = settings.endpoint.trim()
  if (endpoint) {
    let parsedEndpoint: URL
    try {
      parsedEndpoint = new URL(endpoint)
    } catch {
      throw new Error("AI_RECOGNITION_INVALID_ENDPOINT")
    }

    if (!["http:", "https:"].includes(parsedEndpoint.protocol)) {
      throw new Error("AI_RECOGNITION_INVALID_ENDPOINT")
    }
  }

  const requestedTimeout = settings.timeoutMs ?? DEFAULT_AI_RECOGNITION_SETTINGS.timeoutMs
  await storageLocalSet<AiRecognitionSettings>(STORAGE_KEYS.aiSettings, {
    enabled: Boolean(settings.enabled),
    endpoint,
    model: settings.model.trim(),
    apiKey: settings.apiKey?.trim(),
    timeoutMs: Math.min(60_000, Math.max(1_000, requestedTimeout))
  })
}

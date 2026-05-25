import { STORAGE_KEYS } from "./constants"
import {
  storageLocalGet,
  storageLocalSet,
  storageSessionGet,
  storageSessionRemove,
  storageSessionSet
} from "./browser"
import { decryptProfile, encryptProfile } from "./security"
import type { Profile, VaultRecord, VaultStatus } from "./types"

let masterPasswordCache: string | null = null

const getSessionPassword = async () =>
  storageSessionGet<string>(STORAGE_KEYS.sessionPassword)

export const getVaultRecord = async () => storageLocalGet<VaultRecord>(STORAGE_KEYS.vault)

export const getVaultStatus = async (): Promise<VaultStatus> => {
  const [vault, sessionUnlocked] = await Promise.all([
    getVaultRecord(),
    storageSessionGet<boolean>(STORAGE_KEYS.sessionUnlocked)
  ])

  return {
    hasVault: Boolean(vault),
    unlocked: Boolean(sessionUnlocked)
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
  await storageSessionSet(STORAGE_KEYS.sessionPassword, password)
  return profile
}

export const lockVault = async () => {
  masterPasswordCache = null
  await storageSessionRemove(STORAGE_KEYS.sessionProfile)
  await storageSessionRemove(STORAGE_KEYS.sessionUnlocked)
  await storageSessionRemove(STORAGE_KEYS.sessionPassword)
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
  await storageSessionSet(STORAGE_KEYS.sessionPassword, password)
}

export const saveUnlockedProfile = async (profile: Profile) => {
  const password = masterPasswordCache ?? (await getSessionPassword())
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
  await storageSessionRemove(STORAGE_KEYS.sessionPassword)
}

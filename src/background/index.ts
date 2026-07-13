import {
  getAiRecognitionSettings,
  changePassword,
  clearVault,
  getUnlockedProfile,
  getVaultStatus,
  lockVault,
  saveAiRecognitionSettings,
  saveProfileWithPassword,
  saveUnlockedProfile,
  unlockVault
} from "../lib/storage"
import { recognizeFieldsWithApi } from "../lib/ai-recognition"
import { MessageType } from "../lib/messages"

const restrictStorageAccess = async () => {
  await Promise.allSettled([
    chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" }),
    chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" })
  ])
}

void restrictStorageAccess()

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  ;(async () => {
    try {
      const isExtensionPage = sender.url?.startsWith(chrome.runtime.getURL("")) ?? false

      switch (message?.type) {
        case MessageType.GET_VAULT_STATUS:
          sendResponse(await getVaultStatus())
          return
        case MessageType.UNLOCK_VAULT:
          sendResponse({ ok: true, profile: await unlockVault(message.password) })
          return
        case MessageType.LOCK_VAULT:
          await lockVault()
          sendResponse({ ok: true })
          return
        case MessageType.GET_PROFILE:
          sendResponse({ ok: true, profile: await getUnlockedProfile() })
          return
        case MessageType.SAVE_PROFILE:
          if (message.password) {
            await saveProfileWithPassword(message.profile, message.password)
          } else {
            await saveUnlockedProfile(message.profile)
          }
          sendResponse({ ok: true })
          return
        case MessageType.CHANGE_PASSWORD:
          await changePassword(message.password)
          sendResponse({ ok: true })
          return
        case MessageType.CLEAR_VAULT:
          await clearVault()
          sendResponse({ ok: true })
          return
        case MessageType.GET_AI_SETTINGS:
          if (!isExtensionPage) {
            sendResponse({ ok: false, error: "FORBIDDEN" })
            return
          }
          sendResponse({ ok: true, settings: await getAiRecognitionSettings() })
          return
        case MessageType.SAVE_AI_SETTINGS:
          if (!isExtensionPage) {
            sendResponse({ ok: false, error: "FORBIDDEN" })
            return
          }
          await saveAiRecognitionSettings(message.settings)
          sendResponse({ ok: true })
          return
        case MessageType.AI_MATCH_FIELDS: {
          const profile = await getUnlockedProfile()
          if (!profile) {
            sendResponse({ ok: false, matches: [], error: "LOCKED" })
            return
          }

          sendResponse({
            ok: true,
            matches: await recognizeFieldsWithApi({
              fields: message.fields ?? [],
              profile,
              settings: await getAiRecognitionSettings()
            })
          })
          return
        }
        default:
          sendResponse({ ok: false, error: "UNKNOWN_MESSAGE" })
      }
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "UNKNOWN_ERROR"
      })
    }
  })()

  return true
})

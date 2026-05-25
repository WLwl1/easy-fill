import {
  changePassword,
  clearVault,
  getUnlockedProfile,
  getVaultStatus,
  lockVault,
  saveProfileWithPassword,
  saveUnlockedProfile,
  unlockVault
} from "../lib/storage"
import { MessageType } from "../lib/messages"

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  ;(async () => {
    try {
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

export const storageLocalGet = async <T>(key: string): Promise<T | undefined> => {
  const result = await chrome.storage.local.get(key)
  return result[key] as T | undefined
}

export const storageLocalSet = async <T>(key: string, value: T) => {
  await chrome.storage.local.set({ [key]: value })
}

export const storageSessionGet = async <T>(key: string): Promise<T | undefined> => {
  const sessionStorage = chrome.storage.session
  if (!sessionStorage) {
    return undefined
  }
  const result = await sessionStorage.get(key)
  return result[key] as T | undefined
}

export const storageSessionSet = async <T>(key: string, value: T) => {
  const sessionStorage = chrome.storage.session
  if (!sessionStorage) {
    return
  }
  await sessionStorage.set({ [key]: value })
}

export const storageSessionRemove = async (key: string) => {
  const sessionStorage = chrome.storage.session
  if (!sessionStorage) {
    return
  }
  await sessionStorage.remove(key)
}

export const getActiveTab = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  return tabs[0]
}

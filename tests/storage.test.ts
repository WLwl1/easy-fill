import {
  getAiRecognitionSettings,
  getUnlockedProfile,
  saveAiRecognitionSettings,
  saveProfileWithPassword,
  saveUnlockedProfile,
  unlockVault
} from "../src/lib/storage"
import type { Profile } from "../src/lib/types"

const profile: Profile = {
  basic: { name: "张三", phone: "13800000000" },
  education: { school: "清华大学" },
  links: {},
  custom: []
}

const createStorageArea = () => {
  const values = new Map<string, unknown>()

  return {
    values,
    get: vi.fn(async (key: string) => ({ [key]: values.get(key) })),
    set: vi.fn(async (items: Record<string, unknown>) => {
      Object.entries(items).forEach(([key, value]) => values.set(key, value))
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      const list = Array.isArray(keys) ? keys : [keys]
      list.forEach((key) => values.delete(key))
    })
  }
}

describe("profile storage", () => {
  let localStorageArea: ReturnType<typeof createStorageArea>
  let sessionStorageArea: ReturnType<typeof createStorageArea>

  beforeEach(() => {
    localStorageArea = createStorageArea()
    sessionStorageArea = createStorageArea()

    vi.stubGlobal("chrome", {
      storage: {
        local: localStorageArea,
        session: sessionStorageArea
      }
    })
  })

  afterEach(async () => {
    const { lockVault } = await import("../src/lib/storage")
    await lockVault()
    vi.unstubAllGlobals()
  })

  it("keeps the master password out of extension storage", async () => {
    await saveProfileWithPassword(profile, "test-password")

    const sessionValues = Array.from(sessionStorageArea.values.values())
    expect(JSON.stringify(sessionValues)).not.toContain("test-password")
  })

  it("uses only the in-memory password cache when saving an unlocked profile", async () => {
    await saveProfileWithPassword(profile, "test-password")
    await unlockVault("test-password")

    await saveUnlockedProfile({
      ...profile,
      basic: { ...profile.basic, name: "李四" }
    })

    const unlocked = await getUnlockedProfile()
    expect(unlocked?.basic.name).toBe("李四")
    expect(JSON.stringify(Array.from(sessionStorageArea.values.values()))).not.toContain(
      "test-password"
    )
  })

  it("loads default AI settings and persists normalized updates", async () => {
    const defaults = await getAiRecognitionSettings()
    expect(defaults.enabled).toBe(false)
    expect(defaults.endpoint).toContain("/chat/completions")

    await saveAiRecognitionSettings({
      enabled: true,
      endpoint: " https://example.test/v1/chat/completions ",
      model: " test-model ",
      apiKey: " test-key ",
      timeoutMs: 5000
    })

    const saved = await getAiRecognitionSettings()
    expect(saved.enabled).toBe(true)
    expect(saved.endpoint).toBe("https://example.test/v1/chat/completions")
    expect(saved.model).toBe("test-model")
    expect(saved.apiKey).toBe("test-key")
    expect(saved.timeoutMs).toBe(5000)
  })

  it("rejects unsafe endpoints and clamps API timeouts", async () => {
    await expect(
      saveAiRecognitionSettings({
        enabled: true,
        endpoint: "file:///tmp/api",
        model: "test-model",
        timeoutMs: 1
      })
    ).rejects.toThrow("AI_RECOGNITION_INVALID_ENDPOINT")

    await saveAiRecognitionSettings({
      enabled: true,
      endpoint: "http://localhost:11434/v1/chat/completions",
      model: "test-model",
      timeoutMs: 1
    })

    expect((await getAiRecognitionSettings()).timeoutMs).toBe(1000)
  })
})

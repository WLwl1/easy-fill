import { decryptProfile, encryptProfile } from "../src/lib/security"
import type { Profile } from "../src/lib/types"

const profile: Profile = {
  basic: { name: "张三", phone: "13800000000", address: "北京市海淀区" },
  education: { school: "某大学", major: "计算机科学" },
  links: { github: "https://github.com/example" },
  custom: []
}

describe("vault encryption", () => {
  it("encrypts and decrypts profile", async () => {
    const vault = await encryptProfile(profile, "test-password")
    const decrypted = await decryptProfile(vault, "test-password")
    expect(decrypted.basic.name).toBe("张三")
    expect(decrypted.basic.address).toBe("北京市海淀区")
  })

  it("rejects invalid passwords", async () => {
    const vault = await encryptProfile(profile, "test-password")
    await expect(decryptProfile(vault, "wrong-password")).rejects.toThrow("INVALID_PASSWORD")
  })
})

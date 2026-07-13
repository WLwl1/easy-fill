import { isMutationOwnedBy } from "../src/lib/mutations"

describe("mutation filtering", () => {
  it("ignores mutations produced by the extension overlay", async () => {
    const overlay = document.createElement("div")
    document.body.appendChild(overlay)

    const records: MutationRecord[] = []
    const observer = new MutationObserver((mutations) => records.push(...mutations))
    observer.observe(document.body, { childList: true, subtree: true })

    overlay.appendChild(document.createElement("button"))
    await Promise.resolve()
    observer.disconnect()

    expect(records).toHaveLength(1)
    expect(isMutationOwnedBy(records[0], overlay)).toBe(true)
  })

  it("keeps page mutations eligible for rescanning", async () => {
    const overlay = document.createElement("div")
    const page = document.createElement("main")
    document.body.replaceChildren(overlay, page)

    const records: MutationRecord[] = []
    const observer = new MutationObserver((mutations) => records.push(...mutations))
    observer.observe(document.body, { childList: true, subtree: true })

    page.appendChild(document.createElement("input"))
    await Promise.resolve()
    observer.disconnect()

    expect(records).toHaveLength(1)
    expect(isMutationOwnedBy(records[0], overlay)).toBe(false)
  })
})

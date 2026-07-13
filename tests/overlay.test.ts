import { createPrivateOverlayRoot } from "../src/lib/overlay"

describe("private overlay", () => {
  it("does not expose profile previews through the page DOM", () => {
    const { host, root } = createPrivateOverlayRoot(document, "easy-fill-overlay")
    root.textContent = "secret@example.com"
    document.body.appendChild(host)

    const pageVisibleHost = document.querySelector<HTMLElement>("#easy-fill-overlay")!
    expect(pageVisibleHost.shadowRoot).toBeNull()
    expect(pageVisibleHost.textContent).not.toContain("secret@example.com")
    expect(root.textContent).toContain("secret@example.com")
  })
})

export const createPrivateOverlayRoot = (documentNode: Document, id: string) => {
  const host = documentNode.createElement("div")
  host.id = id

  // A closed shadow root keeps profile previews out of the page's readable DOM.
  const root = host.attachShadow({ mode: "closed" })
  return { host, root }
}

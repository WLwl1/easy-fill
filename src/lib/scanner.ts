import { BLOCKED_FIELD_ALIASES } from "./constants"
import { includesAlias } from "./normalize"
import type { FieldCandidate } from "./types"

const escapeSelector = (value: string) => {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value)
  }

  return value.replace(/(["\\])/g, "\\$1")
}

const getDocumentWindow = (documentNode: Document) => documentNode.defaultView ?? window

const collectDocuments = (root: Document = document, visited = new Set<Document>()) => {
  if (visited.has(root)) {
    return []
  }

  visited.add(root)
  const documents = [root]
  const frames = Array.from(root.querySelectorAll("iframe"))

  frames.forEach((frame) => {
    try {
      const frameDocument = frame.contentDocument
      if (frameDocument) {
        documents.push(...collectDocuments(frameDocument, visited))
      }
    } catch {
      // Cross-origin iframes are intentionally skipped.
    }
  })

  return documents
}

const isElementVisible = (element: HTMLElement) => {
  const style = getDocumentWindow(element.ownerDocument).getComputedStyle(element)
  return style.display !== "none" && style.visibility !== "hidden"
}

const findLabelText = (element: HTMLElement) => {
  const documentNode = element.ownerDocument
  const inputId = element.getAttribute("id")
  if (inputId) {
    const label = documentNode.querySelector(`label[for="${escapeSelector(inputId)}"]`)
    if (label?.textContent?.trim()) {
      return label.textContent.trim()
    }
  }

  const labelledBy = element.getAttribute("aria-labelledby")
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => documentNode.getElementById(id)?.textContent?.trim())
      .filter(Boolean)
      .join(" ")

    if (text) {
      return text
    }
  }

  const wrappingLabel = element.closest("label")
  if (wrappingLabel?.textContent?.trim()) {
    return wrappingLabel.textContent.trim()
  }

  return undefined
}

const nearestText = (element: HTMLElement) => {
  const texts = new Set<string>()
  const candidates = [
    element.previousElementSibling,
    element.parentElement?.previousElementSibling,
    element.closest("td")?.previousElementSibling,
    element.closest("tr")?.querySelector("th"),
    element.closest("fieldset")?.querySelector("legend")
  ]

  candidates.forEach((node) => {
    const text = node?.textContent?.trim()
    if (text) {
      texts.add(text)
    }
  })

  return Array.from(texts)
}

const findSectionTitle = (element: HTMLElement) => {
  const section = element.closest("section, fieldset, form, .form-section, .form-item, .ant-form-item, .el-form-item")
  if (!section) {
    return undefined
  }

  const heading = section.querySelector("h1, h2, h3, h4, legend, .title, .section-title")
  return heading?.textContent?.trim()
}

const isReadonlyInteractiveField = (
  element: HTMLInputElement | HTMLTextAreaElement
) => {
  const signals = [
    element.getAttribute("role"),
    element.getAttribute("aria-haspopup"),
    element.getAttribute("aria-label"),
    element.getAttribute("placeholder"),
    element.getAttribute("name"),
    element.getAttribute("id"),
    element.className,
    element.parentElement?.className,
    findLabelText(element),
    ...nearestText(element)
  ]
    .filter(Boolean)
    .join(" ")

  const inputType = element instanceof HTMLInputElement ? (element.type || "text").toLowerCase() : "text"
  const role = element.getAttribute("role")?.toLowerCase()
  const hasPopup = element.getAttribute("aria-haspopup")?.toLowerCase()

  return (
    ["date", "datetime-local", "month", "time", "week"].includes(inputType) ||
    role === "combobox" ||
    ["listbox", "dialog", "grid", "tree"].includes(hasPopup ?? "") ||
    element.hasAttribute("aria-expanded") ||
    /select|dropdown|picker|date|time|calendar|cascader/i.test(signals)
  )
}

const shouldIgnoreField = (element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => {
  if (element instanceof HTMLInputElement) {
    const type = (element.type || "text").toLowerCase()
    if (["hidden", "password", "file", "checkbox", "radio", "submit", "button"].includes(type)) {
      return true
    }
  }

  if (element.disabled) {
    return true
  }

  if (
    (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) &&
    element.readOnly &&
    !isReadonlyInteractiveField(element)
  ) {
    return true
  }

  if (!isElementVisible(element)) {
    return true
  }

  const signals = [
    element.getAttribute("name"),
    element.getAttribute("id"),
    element.getAttribute("placeholder"),
    element.getAttribute("aria-label"),
    findLabelText(element),
    ...nearestText(element)
  ]

  return signals.some((signal) =>
    BLOCKED_FIELD_ALIASES.some((alias) => includesAlias(signal ?? "", alias))
  )
}

export const scanFields = (root: Document = document): FieldCandidate[] => {
  return collectDocuments(root).flatMap((documentNode, documentIndex) => {
    const elements = Array.from(
      documentNode.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        "input, textarea, select"
      )
    )

    return elements
      .filter((element) => !shouldIgnoreField(element))
      .map((element, index) => {
        const fieldId = element.dataset.easyFillId || `ef-field-${documentIndex + 1}-${index + 1}`
        element.dataset.easyFillId = fieldId

        return {
          id: fieldId,
          tagName: element.tagName.toLowerCase() as FieldCandidate["tagName"],
          inputType: element instanceof HTMLInputElement ? element.type || "text" : undefined,
          labelText: findLabelText(element),
          placeholder: element.getAttribute("placeholder") ?? undefined,
          nameAttr: element.getAttribute("name") ?? undefined,
          idAttr: element.getAttribute("id") ?? undefined,
          ariaLabel: element.getAttribute("aria-label") ?? undefined,
          nearbyText: nearestText(element),
          sectionTitle: findSectionTitle(element),
          options:
            element instanceof HTMLSelectElement
              ? Array.from(element.options).map((option) => option.textContent?.trim() ?? "")
              : undefined,
          required: element.required
        }
      })
  })
}

export const getElementByFieldId = (fieldId: string, root: Document = document) => {
  for (const documentNode of collectDocuments(root)) {
    const found = documentNode.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      `[data-easy-fill-id="${escapeSelector(fieldId)}"]`
    )

    if (found) {
      return found
    }
  }

  return null
}

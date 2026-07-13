import { BLOCKED_FIELD_ALIASES } from "./constants"
import { includesAlias } from "./normalize"
import type { FieldCandidate } from "./types"

const escapeSelector = (value: string) => {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value)
  }

  return value.replace(/(["\\])/g, "\\$1")
}

const fieldIdPrefix = `ef-${Date.now().toString(36)}-${Math.random()
  .toString(36)
  .slice(2, 8)}`
const fieldIds = new WeakMap<HTMLElement, string>()
let nextFieldId = 0

const getOrCreateFieldId = (element: HTMLElement) => {
  let fieldId = fieldIds.get(element)
  if (!fieldId) {
    nextFieldId += 1
    fieldId = `${fieldIdPrefix}-${nextFieldId}`
    fieldIds.set(element, fieldId)
  }

  // Never trust a page-provided data attribute: duplicate IDs can target the wrong field.
  element.dataset.easyFillId = fieldId
  return fieldId
}

const getDocumentWindow = (documentNode: Document) => documentNode.defaultView ?? window

const FORM_ITEM_SELECTOR = [
  ".ant-form-item",
  ".el-form-item",
  ".arco-form-item",
  ".ivu-form-item",
  ".t-form__item",
  ".semi-form-field",
  ".form-item",
  ".form-group",
  ".field"
].join(", ")

const FORM_LABEL_SELECTOR = [
  ".ant-form-item-label label",
  ".el-form-item__label",
  ".arco-form-label-item",
  ".ivu-form-item-label",
  ".t-form__label",
  ".semi-form-field-label",
  ".form-label",
  ".control-label"
].join(", ")

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

const collectFieldRoots = (root: Document) => {
  const roots: Array<Document | ShadowRoot> = [root]

  for (let index = 0; index < roots.length; index += 1) {
    const currentRoot = roots[index]
    currentRoot.querySelectorAll<HTMLElement>("*").forEach((element) => {
      if (element.shadowRoot && !roots.includes(element.shadowRoot)) {
        roots.push(element.shadowRoot)
      }
    })
  }

  return roots
}

const isElementVisible = (element: HTMLElement) => {
  const view = getDocumentWindow(element.ownerDocument)
  let current: HTMLElement | null = element

  while (current) {
    const style = view.getComputedStyle(current)
    if (
      current.hidden ||
      current.getAttribute("aria-hidden") === "true" ||
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    ) {
      return false
    }

    const root = current.getRootNode()
    current =
      current.parentElement ??
      ("host" in root && root.host instanceof view.HTMLElement ? root.host : null)
  }

  return true
}

const findLabelText = (element: HTMLElement) => {
  const documentNode = element.ownerDocument
  const rootNode = element.getRootNode()
  const queryRoot: ParentNode =
    "querySelector" in rootNode ? (rootNode as ParentNode) : documentNode
  const inputId = element.getAttribute("id")
  if (inputId) {
    const label = queryRoot.querySelector(`label[for="${escapeSelector(inputId)}"]`)
    if (label?.textContent?.trim()) {
      return label.textContent.trim()
    }
  }

  const labelledBy = element.getAttribute("aria-labelledby")
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => queryRoot.querySelector(`#${escapeSelector(id)}`)?.textContent?.trim())
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

  const formItem = element.closest(FORM_ITEM_SELECTOR)
  const componentLabel = formItem?.querySelector(FORM_LABEL_SELECTOR)
  const componentLabelText = componentLabel?.textContent?.trim()
  if (componentLabelText) {
    return componentLabelText
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
    element.closest("fieldset")?.querySelector("legend"),
    element.closest(FORM_ITEM_SELECTOR)?.querySelector(FORM_LABEL_SELECTOR)
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

  const inputType =
    element.tagName.toLowerCase() === "input"
      ? ((element as HTMLInputElement).type || "text").toLowerCase()
      : "text"
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
  if (element.tagName.toLowerCase() === "input") {
    const type = ((element as HTMLInputElement).type || "text").toLowerCase()
    if (["hidden", "password", "file", "checkbox", "radio", "submit", "button"].includes(type)) {
      return true
    }
  }

  if (element.disabled) {
    return true
  }

  if (
    element.tagName.toLowerCase() !== "select" &&
    (element as HTMLInputElement | HTMLTextAreaElement).readOnly &&
    !isReadonlyInteractiveField(element as HTMLInputElement | HTMLTextAreaElement)
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
    const elements = collectFieldRoots(documentNode).flatMap((fieldRoot) =>
      Array.from(
        fieldRoot.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
          "input, textarea, select"
        )
      )
    )

    return elements
      .filter((element) => !shouldIgnoreField(element))
      .map((element, index) => {
        const fieldId = getOrCreateFieldId(element)

        return {
          id: fieldId,
          tagName: element.tagName.toLowerCase() as FieldCandidate["tagName"],
          inputType:
            element.tagName.toLowerCase() === "input"
              ? (element as HTMLInputElement).type || "text"
              : undefined,
          labelText: findLabelText(element),
          placeholder: element.getAttribute("placeholder") ?? undefined,
          nameAttr: element.getAttribute("name") ?? undefined,
          idAttr: element.getAttribute("id") ?? undefined,
          ariaLabel: element.getAttribute("aria-label") ?? undefined,
          nearbyText: nearestText(element),
          sectionTitle: findSectionTitle(element),
          options:
            element.tagName.toLowerCase() === "select"
              ? Array.from((element as HTMLSelectElement).options).map(
                  (option) => option.textContent?.trim() ?? ""
                )
              : undefined,
          required: element.required
        }
      })
  })
}

export const getElementByFieldId = (fieldId: string, root: Document = document) => {
  for (const documentNode of collectDocuments(root)) {
    for (const fieldRoot of collectFieldRoots(documentNode)) {
      const found = fieldRoot.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        `[data-easy-fill-id="${escapeSelector(fieldId)}"]`
      )

      if (found) {
        return found
      }
    }
  }

  return null
}

import type { BulkFillSummary, FieldMatchView } from "./types"
import { getElementByFieldId } from "./scanner"

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const getElementWindow = (element: Element) => element.ownerDocument.defaultView ?? window

const dispatchPointerClick = (element: HTMLElement) => {
  const view = getElementWindow(element)
  element.dispatchEvent(new view.MouseEvent("mousedown", { bubbles: true }))
  element.dispatchEvent(new view.MouseEvent("mouseup", { bubbles: true }))
  element.dispatchEvent(new view.MouseEvent("click", { bubbles: true }))
}

const dispatchValueEvents = (element: Element) => {
  const view = getElementWindow(element)
  const beforeInputEvent =
    typeof view.InputEvent === "function"
      ? new view.InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: null
        })
      : new view.Event("beforeinput", { bubbles: true, cancelable: true })

  element.dispatchEvent(beforeInputEvent)
  element.dispatchEvent(new view.Event("input", { bubbles: true }))
  element.dispatchEvent(new view.KeyboardEvent("keyup", { bubbles: true, key: "Enter" }))
  element.dispatchEvent(new view.Event("change", { bubbles: true }))
  element.dispatchEvent(new view.Event("blur", { bubbles: true }))
}

const dispatchSearchInputEvents = (element: Element) => {
  const view = getElementWindow(element)
  const beforeInputEvent =
    typeof view.InputEvent === "function"
      ? new view.InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: null
        })
      : new view.Event("beforeinput", { bubbles: true, cancelable: true })

  element.dispatchEvent(beforeInputEvent)
  element.dispatchEvent(new view.Event("input", { bubbles: true }))
  element.dispatchEvent(new view.KeyboardEvent("keyup", { bubbles: true, key: "Enter" }))
}

const getPrototypeValueSetter = (element: HTMLInputElement | HTMLTextAreaElement) => {
  const view = element.ownerDocument.defaultView ?? window
  const prototype =
    element.tagName.toLowerCase() === "textarea"
      ? view.HTMLTextAreaElement.prototype
      : view.HTMLInputElement.prototype

  return Object.getOwnPropertyDescriptor(prototype, "value")?.set
}

const isVisible = (element: Element) => {
  const view = getElementWindow(element)
  if (!(element instanceof view.HTMLElement)) {
    return false
  }

  const style = view.getComputedStyle(element)
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0"
}

const normalizeOptionText = (value: string) =>
  value.trim().replace(/\s+/g, "").toLowerCase()

const normalizeDateSource = (value: string) =>
  value
    .trim()
    .replace(/[年/.]/g, "-")
    .replace(/月/g, "-")
    .replace(/日/g, "")
    .replace(/\s+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

const parseDateParts = (value: string) => {
  const normalized = normalizeDateSource(value)
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!match) {
    return null
  }

  const [, year, monthRaw, dayRaw] = match
  return {
    year,
    month: monthRaw.padStart(2, "0"),
    day: dayRaw.padStart(2, "0")
  }
}

const buildDateVariants = (value: string) => {
  const parts = parseDateParts(value)
  if (!parts) {
    return [value.trim()]
  }

  const { year, month, day } = parts

  return Array.from(
    new Set([
      `${year}-${month}-${day}`,
      `${year}-${Number(month)}-${Number(day)}`,
      `${year}/${month}/${day}`,
      `${year}/${Number(month)}/${Number(day)}`,
      `${year}.${month}.${day}`,
      `${year}年${Number(month)}月${Number(day)}日`
    ])
  )
}

const isDateLikeField = (element: HTMLInputElement | HTMLTextAreaElement) => {
  const inputType =
    element.tagName.toLowerCase() === "input" ? (element.type || "text").toLowerCase() : "text"
  const signals = [
    element.getAttribute("role"),
    element.getAttribute("aria-label"),
    element.getAttribute("aria-haspopup"),
    element.getAttribute("placeholder"),
    element.getAttribute("name"),
    element.getAttribute("id"),
    element.className,
    element.parentElement?.className
  ]
    .filter(Boolean)
    .join(" ")

  return (
    ["date", "datetime-local", "month", "time", "week"].includes(inputType) ||
    /date|calendar|birthday|birth|日期|时间|年月|日历/i.test(signals)
  )
}

const isCustomSelectLike = (element: HTMLInputElement | HTMLTextAreaElement) => {
  const role = element.getAttribute("role")?.toLowerCase()
  const hasPopup = element.getAttribute("aria-haspopup")?.toLowerCase()
  const className = `${element.className} ${element.parentElement?.className ?? ""}`

  return (
    role === "combobox" ||
    hasPopup === "listbox" ||
    element.hasAttribute("aria-expanded") ||
    /select|dropdown|picker|cascader/i.test(className)
  )
}

const clickTargetForCustomSelect = (element: HTMLInputElement | HTMLTextAreaElement) =>
  element.closest<HTMLElement>(
    ".el-select, .ant-select, .arco-select, .ivu-select, .t-select, [role='combobox']"
  ) ?? element

const findCustomSelectSearchInput = (element: HTMLInputElement | HTMLTextAreaElement) => {
  const clickTarget = clickTargetForCustomSelect(element)
  return (
    clickTarget.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      "input:not([type='hidden']), textarea"
    ) ?? element
  )
}

const findCustomOption = (documentNode: Document, value: string) => {
  const normalizedValue = normalizeOptionText(value)
  const selectors = [
    "[role='option']",
    ".el-select-dropdown__item",
    ".ant-select-item-option",
    ".ant-select-item-option-content",
    ".ivu-select-item",
    ".arco-select-option",
    ".t-select-option",
    ".dropdown-item",
    ".select-option"
  ]

  const candidates = Array.from(
    documentNode.querySelectorAll<HTMLElement>(selectors.join(","))
  ).filter(isVisible)

  const exactMatch = candidates.find((candidate) => {
    const text = normalizeOptionText(candidate.textContent ?? "")
    return text === normalizedValue
  })

  if (exactMatch) {
    return exactMatch.closest<HTMLElement>(".ant-select-item-option") ?? exactMatch
  }

  return candidates.find((candidate) => {
    const text = normalizeOptionText(candidate.textContent ?? "")
    return Boolean(text) && (text.includes(normalizedValue) || normalizedValue.includes(text))
  })
}

const attemptCustomOptionSelection = async (
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
) => {
  if (!isCustomSelectLike(element)) {
    return false
  }

  const clickTarget = clickTargetForCustomSelect(element)
  clickTarget.focus()
  dispatchPointerClick(clickTarget)

  const selectVisibleOption = async (delays: number[]) => {
    for (const delay of delays) {
      if (delay > 0) {
        await wait(delay)
      }

      const option = findCustomOption(element.ownerDocument, value)
      if (!option) {
        continue
      }

      option.scrollIntoView?.({ block: "nearest" })
      dispatchPointerClick(option)
      await wait(30)
      return true
    }

    return false
  }

  if (await selectVisibleOption([0, 60, 160])) {
    return true
  }

  const searchInput = findCustomSelectSearchInput(element)
  const setter = getPrototypeValueSetter(searchInput)
  searchInput.focus()
  setter?.call(searchInput, value)
  if (searchInput.value !== value) {
    searchInput.value = value
  }
  searchInput.setAttribute("value", value)
  dispatchSearchInputEvents(searchInput)
  searchInput.dispatchEvent(
    new (getElementWindow(searchInput).KeyboardEvent)("keydown", {
      bubbles: true,
      key: "Enter"
    })
  )

  for (const delay of [80, 180, 320]) {
    if (delay > 0) {
      await wait(delay)
    }

    const option = findCustomOption(element.ownerDocument, value)
    if (!option) {
      continue
    }

    option.scrollIntoView?.({ block: "nearest" })
    dispatchPointerClick(option)
    await wait(30)
    return true
  }

  return false
}

const isCalendarCellEnabled = (element: HTMLElement) => {
  const className = element.className.toLowerCase()
  const ariaDisabled = element.getAttribute("aria-disabled")?.toLowerCase()

  return !(
    className.includes("disabled") ||
    className.includes("prev") ||
    className.includes("next") ||
    className.includes("outside") ||
    ariaDisabled === "true"
  )
}

const findCalendarDayCandidate = (documentNode: Document, day: string) => {
  const targetDay = String(Number(day))
  const selectors = [
    "[role='gridcell']",
    ".el-date-table td",
    ".el-date-table-cell",
    ".ant-picker-cell",
    ".ant-picker-cell-inner",
    ".arco-picker-cell",
    ".arco-picker-date-value",
    ".t-date-picker__cell",
    ".ivu-date-picker-cells-cell",
    ".calendar-day",
    ".date-cell"
  ]

  const candidates = Array.from(
    documentNode.querySelectorAll<HTMLElement>(selectors.join(","))
  ).filter((candidate) => isVisible(candidate) && isCalendarCellEnabled(candidate))

  return candidates.find((candidate) => {
    const text = candidate.textContent?.trim()
    return text === targetDay
  })
}

const attemptCalendarDayCommit = async (
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
) => {
  const parts = parseDateParts(value)
  if (!parts) {
    return false
  }

  for (const delay of [0, 80, 180]) {
    if (delay > 0) {
      await wait(delay)
    }

    const dayCell = findCalendarDayCandidate(element.ownerDocument, parts.day)
    if (!dayCell) {
      continue
    }

    dayCell.scrollIntoView?.({ block: "nearest" })
    dispatchPointerClick(dayCell)
    await wait(40)
    return true
  }

  return false
}

const attemptDateLikeFill = async (
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
) => {
  if (!isDateLikeField(element)) {
    return false
  }

  const setter = getPrototypeValueSetter(element)
  const previousReadonly = element.readOnly
  const previousAriaReadonly = element.getAttribute("aria-readonly")

  element.focus()
  dispatchPointerClick(element)

  if (previousReadonly) {
    element.readOnly = false
  }
  element.removeAttribute("readonly")
  element.removeAttribute("aria-readonly")

  try {
    for (const variant of buildDateVariants(value)) {
      setter?.call(element, variant)
      if (element.value !== variant) {
        element.value = variant
      }
      element.setAttribute("value", variant)
      dispatchValueEvents(element)
      await wait(20)

      const clickedDay = await attemptCalendarDayCommit(element, variant)
      if (clickedDay) {
        dispatchValueEvents(element)
        await wait(20)
      }

      if (normalizeDateSource(element.value) === normalizeDateSource(variant)) {
        return true
      }
    }
  } finally {
    element.readOnly = previousReadonly
    if (previousReadonly) {
      element.setAttribute("readonly", "")
    } else {
      element.removeAttribute("readonly")
    }

    if (previousAriaReadonly === null) {
      element.removeAttribute("aria-readonly")
    } else {
      element.setAttribute("aria-readonly", previousAriaReadonly)
    }
  }

  return false
}

export const fillElementValue = async (fieldId: string, value: string) => {
  const element = getElementByFieldId(fieldId)
  if (!element) {
    return false
  }

  if (element.tagName.toLowerCase() === "select") {
    const select = element as HTMLSelectElement
    const normalizedValue = value.trim().toLowerCase()
    const matchingOption = Array.from(select.options).find((option) => {
      const optionText = option.textContent?.trim().toLowerCase()
      return option.value.toLowerCase() === normalizedValue || optionText === normalizedValue
    })

    if (!matchingOption) {
      return false
    }

    select.value = matchingOption.value
    dispatchValueEvents(select)
    return true
  }

  const textElement = element as HTMLInputElement | HTMLTextAreaElement
  const normalizedValue = value ?? ""

  if (await attemptDateLikeFill(textElement, normalizedValue)) {
    return true
  }

  if (await attemptCustomOptionSelection(textElement, normalizedValue)) {
    return true
  }

  const setter = getPrototypeValueSetter(textElement)
  textElement.focus()
  textElement.click()
  setter?.call(textElement, normalizedValue)
  if (textElement.value !== normalizedValue) {
    textElement.value = normalizedValue
  }
  textElement.setAttribute("value", normalizedValue)
  dispatchValueEvents(textElement)
  return textElement.value === normalizedValue
}

export const fillRecommendedMatches = async (
  matches: FieldMatchView[]
): Promise<BulkFillSummary> => {
  let filledCount = 0
  let skippedCount = 0

  for (const { match } of matches) {
    if (!match.matchedProfilePath || !match.valuePreview) {
      skippedCount += 1
      continue
    }

    if (match.requiresConfirmation) {
      skippedCount += 1
      continue
    }

    if (await fillElementValue(match.fieldId, match.valuePreview)) {
      filledCount += 1
    } else {
      skippedCount += 1
    }
  }

  return {
    filledCount,
    skippedCount
  }
}

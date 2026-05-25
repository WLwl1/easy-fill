import { fillElementValue, fillRecommendedMatches } from "./lib/fill"
import { matchFields } from "./lib/matcher"
import { MessageType } from "./lib/messages"
import { scanFields } from "./lib/scanner"
import type { FieldMatchView, Profile, ScanResponse, VaultStatus } from "./lib/types"

export const config = {
  matches: ["<all_urls>"],
  run_at: "document_idle"
}

let latestMatches: FieldMatchView[] = []
let overlayRoot: HTMLDivElement | null = null
let rescanTimer: number | null = null
let observerStarted = false
let scanVersion = 0
let overlayCollapsed = false

const queryProfile = async (): Promise<Profile | null> => {
  const response = await chrome.runtime.sendMessage({ type: MessageType.GET_PROFILE })
  return response?.profile ?? null
}

const queryVaultStatus = async (): Promise<VaultStatus> =>
  chrome.runtime.sendMessage({ type: MessageType.GET_VAULT_STATUS })

const buildScanResponse = async (): Promise<ScanResponse> => {
  const currentVersion = ++scanVersion
  const vaultStatus = await queryVaultStatus()
  const fields = scanFields(document)

  if (!vaultStatus.unlocked) {
    latestMatches = []
    renderOverlay({ totalFields: fields.length, matches: [], locked: true })
    return { ok: true, locked: true, matches: [], totalFields: fields.length }
  }

  const profile = await queryProfile()
  if (!profile) {
    latestMatches = []
    return { ok: false, locked: true, matches: [], totalFields: fields.length }
  }

  const matches = matchFields(fields, profile)
    .map((match) => ({
      field: fields.find((field) => field.id === match.fieldId)!,
      match
    }))
    .filter((item) => item.match.matchedProfilePath)
    .sort((a, b) => b.match.confidence - a.match.confidence)

  if (currentVersion !== scanVersion) {
    return {
      ok: true,
      locked: false,
      matches: latestMatches,
      totalFields: fields.length
    }
  }

  latestMatches = matches
  renderOverlay({ totalFields: fields.length, matches, locked: false })

  return {
    ok: true,
    locked: false,
    matches,
    totalFields: fields.length
  }
}

const scheduleRescan = (delay = 250) => {
  if (rescanTimer !== null) {
    window.clearTimeout(rescanTimer)
  }

  rescanTimer = window.setTimeout(() => {
    rescanTimer = null
    void buildScanResponse()
  }, delay)
}

const startAutoRescan = () => {
  if (observerStarted) {
    return
  }

  observerStarted = true
  const observer = new MutationObserver((mutations) => {
    const shouldRescan = mutations.some(
      (mutation) =>
        mutation.type === "childList" ||
        (mutation.type === "attributes" &&
          mutation.target instanceof HTMLElement &&
          ["style", "class", "open", "hidden", "aria-hidden"].includes(
            mutation.attributeName ?? ""
          ))
    )

    if (shouldRescan) {
      scheduleRescan()
    }
  })

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["style", "class", "open", "hidden", "aria-hidden"]
  })

  window.addEventListener("focus", () => scheduleRescan(100))
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      scheduleRescan(100)
    }
  })
}

const ensureOverlayRoot = () => {
  if (overlayRoot?.isConnected) {
    return overlayRoot
  }

  overlayRoot = document.createElement("div")
  overlayRoot.id = "easy-fill-overlay"
  Object.assign(overlayRoot.style, {
    position: "fixed",
    right: "12px",
    bottom: "12px",
    width: "280px",
    maxHeight: "48vh",
    overflow: "auto",
    zIndex: "2147483646",
    background: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.18)",
    fontFamily: "system-ui, sans-serif",
    color: "#111827"
  })
  document.body.appendChild(overlayRoot)
  return overlayRoot
}

const labelForField = (view: FieldMatchView) =>
  view.field.labelText ||
  view.field.placeholder ||
  view.field.nameAttr ||
  view.field.idAttr ||
  `字段 ${view.field.id}`

const createButton = (
  text: string,
  onClick: () => void,
  tone: "primary" | "secondary" | "warning" = "secondary"
) => {
  const button = document.createElement("button")
  button.type = "button"
  button.textContent = text
  button.onclick = onClick
  Object.assign(button.style, {
    border: "none",
    borderRadius: "6px",
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: "12px",
    background:
      tone === "primary" ? "#2563eb" : tone === "warning" ? "#f59e0b" : "#e5e7eb",
    color: tone === "primary" ? "#ffffff" : "#111827"
  })
  return button
}

const createIconButton = (text: string, onClick: () => void) => {
  const button = document.createElement("button")
  button.type = "button"
  button.textContent = text
  button.onclick = onClick
  Object.assign(button.style, {
    border: "none",
    borderRadius: "6px",
    minWidth: "40px",
    height: "28px",
    cursor: "pointer",
    fontSize: "12px",
    lineHeight: "28px",
    background: "#e5e7eb",
    color: "#111827",
    padding: "0 8px"
  })
  return button
}

const renderOverlay = ({
  totalFields,
  matches,
  locked
}: {
  totalFields: number
  matches: FieldMatchView[]
  locked: boolean
}) => {
  const root = ensureOverlayRoot()
  root.innerHTML = ""

  const header = document.createElement("div")
  Object.assign(header.style, {
    padding: "10px 12px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px"
  })

  const title = document.createElement("div")
  title.innerHTML = `<strong>Easy Fill</strong><div style="font-size:12px;color:#6b7280;margin-top:4px;">扫描到 ${totalFields} 个可填写字段</div>`
  header.appendChild(title)

  const headerActions = document.createElement("div")
  Object.assign(headerActions.style, {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexShrink: "0"
  })

  if (!locked && matches.length > 0 && !overlayCollapsed) {
    headerActions.appendChild(
      createButton(
        "一键填充",
        async () => {
          const summary = await fillRecommendedMatches(matches)
          alert(`已填充 ${summary.filledCount} 项，跳过 ${summary.skippedCount} 项。`)
        },
        "primary"
      )
    )
  }

  headerActions.appendChild(
    createIconButton(overlayCollapsed ? "展开" : "收起", () => {
      overlayCollapsed = !overlayCollapsed
      renderOverlay({ totalFields, matches, locked })
    })
  )

  header.appendChild(headerActions)
  root.appendChild(header)

  const body = document.createElement("div")
  Object.assign(body.style, {
    padding: overlayCollapsed ? "0" : "8px",
    display: overlayCollapsed ? "none" : "block"
  })

  if (locked) {
    const info = document.createElement("div")
    Object.assign(info.style, {
      fontSize: "13px",
      color: "#4b5563",
      lineHeight: "1.5",
      padding: "6px"
    })
    info.textContent = "资料库当前已锁定。请先在扩展设置页解锁，再返回页面获取填充建议。"
    body.appendChild(info)
    root.appendChild(body)
    return
  }

  if (matches.length === 0) {
    const empty = document.createElement("div")
    Object.assign(empty.style, {
      fontSize: "13px",
      color: "#4b5563",
      lineHeight: "1.5",
      padding: "6px"
    })
    empty.textContent = "当前页面还没有可匹配的字段。"
    body.appendChild(empty)
    root.appendChild(body)
    return
  }

  matches.slice(0, 5).forEach((view) => {
    const row = document.createElement("div")
    Object.assign(row.style, {
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      padding: "9px",
      marginBottom: "8px"
    })

    const titleRow = document.createElement("div")
    titleRow.style.display = "flex"
    titleRow.style.justifyContent = "space-between"
    titleRow.style.gap = "8px"
    titleRow.style.alignItems = "center"

    const label = document.createElement("div")
    label.style.fontSize = "13px"
    label.style.fontWeight = "600"
    label.textContent = labelForField(view)
    titleRow.appendChild(label)

    const badge = document.createElement("span")
    badge.textContent = `${Math.round(view.match.confidence * 100)}%`
    Object.assign(badge.style, {
      fontSize: "11px",
      padding: "2px 6px",
      borderRadius: "999px",
      background: "#dbeafe",
      color: "#1f2937"
    })
    titleRow.appendChild(badge)
    row.appendChild(titleRow)

    const preview = document.createElement("div")
    preview.style.fontSize = "12px"
    preview.style.color = "#4b5563"
    preview.style.marginTop = "6px"
    preview.style.wordBreak = "break-all"
    preview.textContent = view.match.valuePreview ?? "无候选值"
    row.appendChild(preview)

    const reasons = document.createElement("div")
    reasons.style.fontSize = "11px"
    reasons.style.color = "#6b7280"
    reasons.style.marginTop = "6px"
    reasons.style.wordBreak = "break-word"
    reasons.textContent = view.match.reason[0] ?? "规则匹配"
    row.appendChild(reasons)

    const actions = document.createElement("div")
    Object.assign(actions.style, {
      display: "flex",
      gap: "8px",
      marginTop: "10px"
    })

    actions.appendChild(
      createButton("定位", () => {
        document
          .querySelector<HTMLElement>(`[data-easy-fill-id="${view.field.id}"]`)
          ?.scrollIntoView({
            behavior: "smooth",
            block: "center"
          })
      })
    )

    actions.appendChild(
      createButton(
        view.match.requiresConfirmation ? "手动确认填充" : "填充",
        () => {
          if (!view.match.valuePreview) {
            return
          }

          void fillElementValue(view.field.id, view.match.valuePreview)
        },
        view.match.requiresConfirmation ? "warning" : "primary"
      )
    )

    row.appendChild(actions)
    body.appendChild(row)
  })

  if (matches.length > 5) {
    const more = document.createElement("div")
    Object.assign(more.style, {
      fontSize: "11px",
      color: "#6b7280",
      padding: "4px 6px 0"
    })
    more.textContent = `还有 ${matches.length - 5} 个候选字段，请在扩展弹窗里查看完整列表。`
    body.appendChild(more)
  }

  root.appendChild(body)
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  ;(async () => {
    switch (message?.type) {
      case MessageType.PAGE_SCAN_AND_MATCH:
        sendResponse(await buildScanResponse())
        return
      case MessageType.PAGE_FILL_FIELD: {
        const target = latestMatches.find((item) => item.field.id === message.fieldId)
        if (!target?.match.valuePreview) {
          sendResponse({ ok: false })
          return
        }
        const filled = await fillElementValue(target.field.id, target.match.valuePreview)
        sendResponse({ ok: filled })
        return
      }
      case MessageType.PAGE_FILL_RECOMMENDED:
        sendResponse({ ok: true, summary: await fillRecommendedMatches(latestMatches) })
        return
      default:
        sendResponse({ ok: false, error: "UNKNOWN_MESSAGE" })
    }
  })()

  return true
})

startAutoRescan()
void buildScanResponse()

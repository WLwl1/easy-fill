import { type CSSProperties, useEffect, useMemo, useState } from "react"
import { getActiveTab } from "../lib/browser"
import { MessageType } from "../lib/messages"
import type { BulkFillSummary, FieldMatchView, ScanResponse, VaultStatus } from "../lib/types"

const sectionStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 12,
  background: "#ffffff"
}

function IndexPopup() {
  const [status, setStatus] = useState<VaultStatus | null>(null)
  const [scan, setScan] = useState<ScanResponse | null>(null)
  const [message, setMessage] = useState("")
  const recommendedCount = useMemo(
    () => scan?.matches.filter((item) => !item.match.requiresConfirmation).length ?? 0,
    [scan]
  )

  const refresh = async () => {
    const nextStatus = (await chrome.runtime.sendMessage({
      type: MessageType.GET_VAULT_STATUS
    })) as VaultStatus
    setStatus(nextStatus)

    const tab = await getActiveTab()
    if (!tab?.id) {
      setScan(null)
      return
    }

    try {
      const result = (await chrome.tabs.sendMessage(tab.id, {
        type: MessageType.PAGE_SCAN_AND_MATCH
      })) as ScanResponse
      setScan(result)
    } catch {
      setScan(null)
      setMessage("当前页面还没有注入内容脚本，刷新页面后再试。")
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const fillRecommended = async () => {
    const tab = await getActiveTab()
    if (!tab?.id) {
      return
    }

    const response = (await chrome.tabs.sendMessage(tab.id, {
      type: MessageType.PAGE_FILL_RECOMMENDED
    })) as { ok: boolean; summary: BulkFillSummary }

    if (response?.ok) {
      setMessage(`已填充 ${response.summary.filledCount} 项，跳过 ${response.summary.skippedCount} 项。`)
      await refresh()
    }
  }

  const fillSingle = async (item: FieldMatchView) => {
    const tab = await getActiveTab()
    if (!tab?.id) {
      return
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: MessageType.PAGE_FILL_FIELD,
      fieldId: item.field.id
    })

    setMessage(
      response?.ok
        ? `已填充：${item.field.labelText ?? item.field.placeholder ?? item.field.id}`
        : "该字段填充失败。"
    )
    await refresh()
  }

  return (
    <div
      style={{
        width: 360,
        minHeight: 480,
        background: "#f8fafc",
        color: "#111827",
        padding: 16,
        fontFamily: "system-ui, sans-serif"
      }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Easy Fill</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>面向中文表单的自动填充助手</div>
        </div>
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          style={{
            border: "none",
            background: "#e2e8f0",
            borderRadius: 6,
            padding: "8px 10px",
            cursor: "pointer"
          }}>
          设置
        </button>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <div style={sectionStyle}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>状态</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: "#334155" }}>
            <div>资料库：{status?.hasVault ? (status.unlocked ? "已解锁" : "已锁定") : "未初始化"}</div>
            <div>页面字段：{scan?.totalFields ?? 0}</div>
            <div>可直接一键填充：{recommendedCount}</div>
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>页面建议</div>
            <button
              onClick={() => void refresh()}
              style={{
                border: "none",
                background: "#e2e8f0",
                borderRadius: 6,
                padding: "7px 10px",
                cursor: "pointer"
              }}>
              刷新
            </button>
          </div>

          {status && !status.unlocked ? (
            <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
              先在设置页解锁资料库，页面扫描和匹配才会生效。
            </div>
          ) : scan?.matches?.length ? (
            <>
              <button
                onClick={() => void fillRecommended()}
                style={{
                  width: "100%",
                  border: "none",
                  background: "#2563eb",
                  color: "#ffffff",
                  borderRadius: 6,
                  padding: "10px 12px",
                  cursor: "pointer",
                  marginBottom: 12
                }}>
                一键填充高置信度字段
              </button>

              <div style={{ display: "grid", gap: 8, maxHeight: 260, overflow: "auto" }}>
                {scan.matches.map((item) => (
                  <div
                    key={item.field.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: 10,
                      background: "#f8fafc"
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {item.field.labelText || item.field.placeholder || item.field.nameAttr || item.field.id}
                      </div>
                      <div style={{ fontSize: 11, color: "#475569" }}>
                        {Math.round(item.match.confidence * 100)}%
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>{item.match.valuePreview}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>
                      {item.match.source === "api" ? "API 智能识别" : "规则匹配"}：
                      {item.match.reason[0] ?? "命中字段"}
                    </div>
                    <button
                      onClick={() => void fillSingle(item)}
                      style={{
                        marginTop: 8,
                        width: "100%",
                        border: "none",
                        background: item.match.requiresConfirmation ? "#f59e0b" : "#0f172a",
                        color: "#ffffff",
                        borderRadius: 6,
                        padding: "8px 10px",
                        cursor: "pointer"
                      }}>
                      {item.match.requiresConfirmation ? "手动确认填充" : "填充"}
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
              当前页面没有识别到可匹配字段，或者需要先刷新页面。
            </div>
          )}
        </div>

        {message ? (
          <div
            style={{
              ...sectionStyle,
              fontSize: 12,
              color: "#475569",
              lineHeight: 1.5
            }}>
            {message}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default IndexPopup

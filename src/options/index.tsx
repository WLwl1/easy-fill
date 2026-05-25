import { type CSSProperties, useEffect, useState } from "react"
import { EMPTY_PROFILE } from "../lib/constants"
import { MessageType } from "../lib/messages"
import { cloneProfile, profileHasAnyValue } from "../lib/profile"
import type { Profile, VaultStatus } from "../lib/types"

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  margin: 0,
  padding: "24px",
  background: "#f8fafc",
  color: "#111827",
  fontFamily: "system-ui, sans-serif"
}

const cardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: 24
}

const sectionGridStyle: CSSProperties = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  alignItems: "start"
}

const metaGridStyle: CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "minmax(0, 1fr) 320px",
  alignItems: "start"
}

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 13,
  minWidth: 0
}

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  padding: "10px 12px",
  fontSize: 14,
  minWidth: 0
}

function Field({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string
  value?: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label style={fieldStyle}>
      <span>{label}</span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        style={inputStyle}
      />
    </label>
  )
}

function OptionsPage() {
  const [status, setStatus] = useState<VaultStatus | null>(null)
  const [profile, setProfile] = useState<Profile>(cloneProfile(EMPTY_PROFILE))
  const [password, setPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [message, setMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const canEditProfile = !status?.hasVault || Boolean(status?.unlocked)

  const refresh = async () => {
    const vaultStatus = (await chrome.runtime.sendMessage({
      type: MessageType.GET_VAULT_STATUS
    })) as VaultStatus
    setStatus(vaultStatus)

    if (vaultStatus.unlocked) {
      const profileResponse = await chrome.runtime.sendMessage({
        type: MessageType.GET_PROFILE
      })
      setProfile(cloneProfile(profileResponse.profile ?? EMPTY_PROFILE))
    } else {
      setProfile(cloneProfile(EMPTY_PROFILE))
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const updateProfile = (updater: (draft: Profile) => void) => {
    setProfile((current) => {
      const draft = cloneProfile(current)
      updater(draft)
      return draft
    })
  }

  const flushActiveInput = async () => {
    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement) {
      activeElement.blur()
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(() => resolve(), 0)
    })
  }

  const saveProfile = async () => {
    if (isSaving) {
      return
    }

    setIsSaving(true)
    await flushActiveInput()

    if (!profileHasAnyValue(profile)) {
      setMessage("先填一些常用资料再保存。")
      setIsSaving(false)
      return
    }

    const response = await chrome.runtime.sendMessage({
      type: MessageType.SAVE_PROFILE,
      profile,
      password: status?.hasVault ? undefined : password
    })

    if (!response?.ok) {
      setMessage(
        response?.error === "REAUTH_REQUIRED"
          ? "当前登录会话失效了，请先重新解锁资料库再保存。"
          : `保存失败：${response?.error ?? "未知错误"}`
      )
      setIsSaving(false)
      return
    }

    const verify = await chrome.runtime.sendMessage({
      type: MessageType.GET_PROFILE
    })

    if (!verify?.ok || !verify?.profile) {
      setMessage("保存后校验失败，请重新解锁后再试一次。")
      setIsSaving(false)
      return
    }

    setProfile(cloneProfile(verify.profile))
    setPassword("")
    setStatus({
      hasVault: true,
      unlocked: true
    })
    setMessage("资料已保存。刷新页面后仍会保留。")
    setIsSaving(false)
  }

  const unlock = async () => {
    const response = await chrome.runtime.sendMessage({
      type: MessageType.UNLOCK_VAULT,
      password
    })

    if (!response?.ok) {
      setMessage("解锁失败，请检查主密码。")
      return
    }

    setPassword("")
    setMessage("资料库已解锁。")
    await refresh()
  }

  const changeVaultPassword = async () => {
    if (!newPassword.trim()) {
      setMessage("请输入新的主密码。")
      return
    }

    const response = await chrome.runtime.sendMessage({
      type: MessageType.CHANGE_PASSWORD,
      password: newPassword
    })

    if (!response?.ok) {
      setMessage("修改主密码失败，请先确认资料库已解锁。")
      return
    }

    setNewPassword("")
    setMessage("主密码已更新。")
  }

  const addCustomField = () => {
    updateProfile((draft) => {
      draft.custom.push({
        key: `custom_${draft.custom.length + 1}`,
        label: "自定义字段",
        value: "",
        aliases: []
      })
    })
  }

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 1360, margin: "0 auto", display: "grid", gap: 16 }}>
        <div style={metaGridStyle}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>Easy Fill 设置</h1>
            <p style={{ margin: "8px 0 0", color: "#475569" }}>
              保存常用资料，按页面字段生成可确认的填充建议。
            </p>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>状态</div>
            <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
              <div>资料库：{status?.hasVault ? (status.unlocked ? "已解锁" : "已锁定") : "未初始化"}</div>
              <div>数据位置：仅浏览器本地</div>
            </div>
          </div>
        </div>

        {!status?.hasVault ? (
          <div style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>初始化资料库</h2>
            <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.6 }}>
              第一次使用需要设置主密码。资料会加密后保存在浏览器本地。
            </p>
            <div style={{ maxWidth: 360 }}>
              <Field label="主密码" value={password} onChange={setPassword} type="password" />
            </div>
          </div>
        ) : null}

        {status?.hasVault && !status.unlocked ? (
          <div style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>解锁资料库</h2>
            <div style={{ maxWidth: 360 }}>
              <Field label="主密码" value={password} onChange={setPassword} type="password" />
            </div>
            <button
              onClick={() => void unlock()}
              style={{
                marginTop: 12,
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                borderRadius: 6,
                padding: "10px 14px",
                cursor: "pointer"
              }}>
              解锁
            </button>
          </div>
        ) : null}

        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              gap: 16
            }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>资料编辑</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {message ? (
                <div style={{ fontSize: 13, color: "#475569" }}>{message}</div>
              ) : null}
              <button
                onClick={() => void saveProfile()}
                disabled={isSaving || !canEditProfile || (!status?.hasVault && !password.trim())}
                style={{
                  border: "none",
                  background: "#0f172a",
                  color: "#ffffff",
                  borderRadius: 6,
                  padding: "10px 16px",
                  cursor: isSaving ? "wait" : "pointer",
                  opacity:
                    !isSaving && canEditProfile && (status?.hasVault || password.trim()) ? 1 : 0.5
                }}>
                {isSaving ? "保存中..." : "保存资料"}
              </button>
            </div>
          </div>

          {canEditProfile ? (
            <div style={{ display: "grid", gap: 24 }}>
              <section>
                <h3 style={{ marginTop: 0, fontSize: 16, marginBottom: 12 }}>基础信息</h3>
                <div style={sectionGridStyle}>
                  <Field label="姓名" value={profile.basic.name} onChange={(value) => updateProfile((draft) => { draft.basic.name = value })} />
                  <Field label="手机号" value={profile.basic.phone} onChange={(value) => updateProfile((draft) => { draft.basic.phone = value })} />
                  <Field label="邮箱" value={profile.basic.email} onChange={(value) => updateProfile((draft) => { draft.basic.email = value })} />
                  <Field label="微信号" value={profile.basic.wechat} onChange={(value) => updateProfile((draft) => { draft.basic.wechat = value })} />
                  <Field label="出生日期" value={profile.basic.birthDate} onChange={(value) => updateProfile((draft) => { draft.basic.birthDate = value })} />
                  <Field label="性别" value={profile.basic.gender} onChange={(value) => updateProfile((draft) => { draft.basic.gender = value })} />
                  <Field label="住址" value={profile.basic.address} onChange={(value) => updateProfile((draft) => { draft.basic.address = value })} />
                </div>
              </section>

              <section>
                <h3 style={{ marginTop: 0, fontSize: 16, marginBottom: 12 }}>教育信息</h3>
                <div style={sectionGridStyle}>
                  <Field label="学校" value={profile.education.school} onChange={(value) => updateProfile((draft) => { draft.education.school = value })} />
                  <Field label="学院" value={profile.education.college} onChange={(value) => updateProfile((draft) => { draft.education.college = value })} />
                  <Field label="专业" value={profile.education.major} onChange={(value) => updateProfile((draft) => { draft.education.major = value })} />
                  <Field label="学历/学位" value={profile.education.degree} onChange={(value) => updateProfile((draft) => { draft.education.degree = value })} />
                  <Field label="年级" value={profile.education.grade} onChange={(value) => updateProfile((draft) => { draft.education.grade = value })} />
                  <Field label="学号" value={profile.education.studentId} onChange={(value) => updateProfile((draft) => { draft.education.studentId = value })} />
                  <Field label="绩点" value={profile.education.gpa} onChange={(value) => updateProfile((draft) => { draft.education.gpa = value })} />
                  <Field label="排名" value={profile.education.rank} onChange={(value) => updateProfile((draft) => { draft.education.rank = value })} />
                </div>
              </section>

              <section>
                <h3 style={{ marginTop: 0, fontSize: 16, marginBottom: 12 }}>链接信息</h3>
                <div style={sectionGridStyle}>
                  <Field label="GitHub" value={profile.links.github} onChange={(value) => updateProfile((draft) => { draft.links.github = value })} />
                  <Field label="个人主页" value={profile.links.homepage} onChange={(value) => updateProfile((draft) => { draft.links.homepage = value })} />
                  <Field label="LinkedIn" value={profile.links.linkedin} onChange={(value) => updateProfile((draft) => { draft.links.linkedin = value })} />
                </div>
              </section>

              <section>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                    gap: 16
                  }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>自定义字段</h3>
                  <button
                    onClick={addCustomField}
                    style={{
                      border: "none",
                      background: "#e2e8f0",
                      borderRadius: 6,
                      padding: "8px 10px",
                      cursor: "pointer"
                    }}>
                    添加字段
                  </button>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  {profile.custom.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#64748b" }}>还没有自定义字段。</div>
                  ) : (
                    profile.custom.map((item, index) => (
                      <div key={item.key} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
                        <div style={sectionGridStyle}>
                          <Field label="字段 key" value={item.key} onChange={(value) => updateProfile((draft) => { draft.custom[index].key = value })} />
                          <Field label="显示名称" value={item.label} onChange={(value) => updateProfile((draft) => { draft.custom[index].label = value })} />
                          <Field label="值" value={item.value} onChange={(value) => updateProfile((draft) => { draft.custom[index].value = value })} />
                          <Field
                            label="别名（逗号分隔）"
                            value={(item.aliases ?? []).join(", ")}
                            onChange={(value) =>
                              updateProfile((draft) => {
                                draft.custom[index].aliases = value
                                  .split(",")
                                  .map((part) => part.trim())
                                  .filter(Boolean)
                              })
                            }
                          />
                        </div>

                        <button
                          onClick={() =>
                            updateProfile((draft) => {
                              draft.custom.splice(index, 1)
                            })
                          }
                          style={{
                            marginTop: 10,
                            border: "none",
                            background: "#fee2e2",
                            color: "#991b1b",
                            borderRadius: 6,
                            padding: "8px 10px",
                            cursor: "pointer"
                          }}>
                          删除字段
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          ) : (
            <div
              style={{
                border: "1px dashed #cbd5e1",
                borderRadius: 8,
                padding: 16,
                color: "#475569",
                fontSize: 14,
                lineHeight: 1.7
              }}>
              资料库当前处于锁定状态。先解锁，再编辑和保存资料，避免输入内容在解锁后被已保存的数据覆盖。
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>安全</h2>
          <div style={{ display: "grid", gap: 16, maxWidth: 520 }}>
            {status?.unlocked ? (
              <>
                <div style={{ maxWidth: 360 }}>
                  <Field label="新的主密码" value={newPassword} onChange={setNewPassword} type="password" />
                  <button
                    onClick={() => void changeVaultPassword()}
                    style={{
                      marginTop: 12,
                      border: "none",
                      background: "#0f172a",
                      color: "#ffffff",
                      borderRadius: 6,
                      padding: "10px 14px",
                      cursor: "pointer"
                    }}>
                    更新主密码
                  </button>
                </div>

                <button
                  onClick={async () => {
                    await chrome.runtime.sendMessage({ type: MessageType.LOCK_VAULT })
                    setMessage("资料库已锁定。")
                    await refresh()
                  }}
                  style={{
                    border: "none",
                    background: "#e2e8f0",
                    borderRadius: 6,
                    padding: "10px 14px",
                    cursor: "pointer",
                    width: "fit-content"
                  }}>
                  立即锁定
                </button>
              </>
            ) : null}

            <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.7 }}>
              高风险字段如密码、验证码、支付信息仍然不会参与自动匹配和自动填充。
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default OptionsPage

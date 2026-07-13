export type Profile = {
  basic: {
    name?: string
    phone?: string
    email?: string
    wechat?: string
    birthDate?: string
    gender?: string
    address?: string
  }
  education: {
    school?: string
    college?: string
    major?: string
    degree?: string
    grade?: string
    studentId?: string
    gpa?: string
    rank?: string
  }
  links: {
    github?: string
    homepage?: string
    linkedin?: string
  }
  custom: Array<{
    key: string
    label: string
    value: string
    aliases?: string[]
  }>
}

export type VaultRecord = {
  version: 1
  salt: string
  iv: string
  ciphertext: string
  updatedAt: string
}

export type VaultStatus = {
  hasVault: boolean
  unlocked: boolean
}

export type AiRecognitionSettings = {
  enabled: boolean
  endpoint: string
  model: string
  apiKey?: string
  timeoutMs?: number
}

export type FieldCandidate = {
  id: string
  tagName: "input" | "textarea" | "select"
  inputType?: string
  labelText?: string
  placeholder?: string
  nameAttr?: string
  idAttr?: string
  ariaLabel?: string
  nearbyText?: string[]
  sectionTitle?: string
  options?: string[]
  required?: boolean
}

export type MatchResult = {
  fieldId: string
  matchedProfilePath?: string
  confidence: number
  reason: string[]
  valuePreview?: string
  requiresConfirmation: boolean
  source?: "rules" | "api"
}

export type FieldMatchView = {
  field: FieldCandidate
  match: MatchResult
}

export type ScanResponse = {
  ok: boolean
  locked: boolean
  matches: FieldMatchView[]
  totalFields: number
}

export type FillRequest = {
  fieldId: string
}

export type BulkFillSummary = {
  filledCount: number
  skippedCount: number
}

export type FieldDefinition = {
  path: string
  label: string
  aliases: string[]
  highRisk?: boolean
  typeHints?: string[]
  sectionHints?: string[]
  optionHints?: string[]
}

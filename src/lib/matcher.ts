import { FIELD_DEFINITIONS } from "./constants"
import { includesAlias, normalizeText } from "./normalize"
import { getProfileValue } from "./profile"
import type { FieldCandidate, FieldDefinition, MatchResult, Profile } from "./types"

const signalWeights = {
  labelText: 50,
  placeholder: 35,
  nameAttr: 30,
  idAttr: 24,
  ariaLabel: 40,
  nearbyText: 14,
  sectionTitle: 10
} as const

const SELF_PROFILE_PATHS = new Set([
  "basic.name",
  "basic.phone",
  "basic.email",
  "basic.wechat",
  "basic.address"
])

const THIRD_PARTY_CONTEXT_ALIASES = [
  "紧急联系人",
  "联系人姓名",
  "联系人电话",
  "父亲",
  "母亲",
  "父母",
  "家长",
  "监护人",
  "推荐人",
  "介绍人",
  "担保人",
  "contact person",
  "emergency contact",
  "parent",
  "guardian",
  "referee",
  "reference"
]

export const buildFieldDefinitions = (profile: Profile): FieldDefinition[] => [
  ...FIELD_DEFINITIONS,
  ...profile.custom.map((item) => ({
    path: `custom:${item.key}`,
    label: item.label,
    aliases: [item.label, item.key, ...(item.aliases ?? [])]
  }))
]

const fieldSignals = (field: FieldCandidate) =>
  [
    field.labelText,
    field.placeholder,
    field.nameAttr,
    field.idAttr,
    field.ariaLabel,
    field.sectionTitle,
    ...(field.nearbyText ?? [])
  ].filter(Boolean) as string[]

export const isThirdPartyContext = (field: FieldCandidate) =>
  fieldSignals(field).some((signal) =>
    THIRD_PARTY_CONTEXT_ALIASES.some((alias) => includesAlias(signal, alias))
  )

export const requiresManualConfirmation = (
  field: FieldCandidate,
  matchedProfilePath: string | undefined,
  confidence: number
) =>
  !matchedProfilePath ||
  confidence < 0.72 ||
  (SELF_PROFILE_PATHS.has(matchedProfilePath) && isThirdPartyContext(field))

export const buildMatchResult = ({
  field,
  profile,
  matchedProfilePath,
  confidence,
  reason,
  source = "rules"
}: {
  field: FieldCandidate
  profile: Profile
  matchedProfilePath?: string
  confidence: number
  reason: string[]
  source?: MatchResult["source"]
}): MatchResult => ({
  fieldId: field.id,
  matchedProfilePath,
  confidence,
  reason,
  valuePreview: matchedProfilePath ? getProfileValue(profile, matchedProfilePath) : undefined,
  requiresConfirmation: requiresManualConfirmation(field, matchedProfilePath, confidence),
  source
})

const scoreDefinition = (field: FieldCandidate, definition: FieldDefinition) => {
  let score = 0
  const reason: string[] = []
  const sources: Array<[keyof typeof signalWeights, string | string[] | undefined]> = [
    ["labelText", field.labelText],
    ["placeholder", field.placeholder],
    ["nameAttr", field.nameAttr],
    ["idAttr", field.idAttr],
    ["ariaLabel", field.ariaLabel],
    ["nearbyText", field.nearbyText],
    ["sectionTitle", field.sectionTitle]
  ]

  sources.forEach(([source, value]) => {
    const values = Array.isArray(value) ? value : [value]
    values.filter(Boolean).forEach((entry) => {
      definition.aliases.forEach((alias) => {
        if (includesAlias(entry ?? "", alias)) {
          score += signalWeights[source]
          reason.push(`${source} 命中 "${alias}"`)
        }
      })
    })
  })

  if (definition.typeHints?.includes(normalizeText(field.inputType))) {
    score += 12
    reason.push(`输入类型匹配 ${field.inputType}`)
  }

  const optionHintHits =
    definition.optionHints?.filter((hint) =>
      field.options?.some((option) => includesAlias(option, hint))
    ) ?? []

  if (optionHintHits.length > 0) {
    score += Math.min(24, optionHintHits.length * 8)
    reason.push(`选项包含 ${optionHintHits.slice(0, 3).join("、")}`)
  }

  if (
    definition.sectionHints?.some(
      (hint) =>
        includesAlias(field.sectionTitle ?? "", hint) ||
        field.nearbyText?.some((text) => includesAlias(text, hint))
    )
  ) {
    score += 8
    reason.push("区块上下文支持该字段")
  }

  if (SELF_PROFILE_PATHS.has(definition.path) && isThirdPartyContext(field)) {
    score = Math.min(score, 60)
    reason.push("疑似第三方联系人字段，需要手动确认")
  }

  return { score, reason }
}

export const matchFields = (fields: FieldCandidate[], profile: Profile): MatchResult[] => {
  const definitions = buildFieldDefinitions(profile)

  return fields.map((field) => {
    let bestDefinition: FieldDefinition | undefined
    let bestScore = 0
    let bestReason: string[] = []

    definitions.forEach((definition) => {
      const value = getProfileValue(profile, definition.path)
      if (!value) {
        return
      }

      const { score, reason } = scoreDefinition(field, definition)
      if (score > bestScore) {
        bestScore = score
        bestDefinition = definition
        bestReason = reason
      }
    })

    const confidence = Math.min(1, bestScore / 100)
    return buildMatchResult({
      field,
      profile,
      matchedProfilePath: bestDefinition?.path,
      confidence,
      reason: bestReason,
      source: "rules"
    })
  })
}

export const getRecommendedMatches = (matches: MatchResult[]) =>
  matches.filter(
    (match) =>
      Boolean(match.matchedProfilePath) &&
      match.confidence >= 0.72 &&
      !match.requiresConfirmation
  )

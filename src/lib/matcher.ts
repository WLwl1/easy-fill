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

const buildDefinitions = (profile: Profile): FieldDefinition[] => [
  ...FIELD_DEFINITIONS,
  ...profile.custom.map((item) => ({
    path: `custom:${item.key}`,
    label: item.label,
    aliases: [item.label, item.key, ...(item.aliases ?? [])]
  }))
]

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

  return { score, reason }
}

export const matchFields = (fields: FieldCandidate[], profile: Profile): MatchResult[] => {
  const definitions = buildDefinitions(profile)

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
    const valuePreview = bestDefinition
      ? getProfileValue(profile, bestDefinition.path)
      : undefined

    return {
      fieldId: field.id,
      matchedProfilePath: bestDefinition?.path,
      confidence,
      reason: bestReason,
      valuePreview,
      requiresConfirmation: !bestDefinition || confidence < 0.72
    }
  })
}

export const getRecommendedMatches = (matches: MatchResult[]) =>
  matches.filter(
    (match) =>
      Boolean(match.matchedProfilePath) &&
      match.confidence >= 0.72 &&
      !match.requiresConfirmation
  )

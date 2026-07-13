import { buildFieldDefinitions, buildMatchResult } from "./matcher"
import { getProfileValue } from "./profile"
import type {
  AiRecognitionSettings,
  FieldCandidate,
  FieldDefinition,
  MatchResult,
  Profile
} from "./types"

type ApiSuggestion = {
  fieldId: string
  path: string
  confidence: unknown
  reason?: string
}

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

const clampConfidence = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(parsed)) {
    return 0
  }

  return Math.max(0, Math.min(1, parsed))
}

const MAX_FIELDS_PER_REQUEST = 100
const MAX_SIGNAL_LENGTH = 240
const MAX_REASON_LENGTH = 160

const compactText = (value: string | undefined, maxLength = MAX_SIGNAL_LENGTH) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, maxLength) : undefined
}

const selectableDefinitions = (profile: Profile): FieldDefinition[] =>
  buildFieldDefinitions(profile).filter((definition) =>
    Boolean(getProfileValue(profile, definition.path))
  )

const compactField = (field: FieldCandidate) => ({
  id: field.id,
  tagName: field.tagName,
  inputType: field.inputType,
  labelText: compactText(field.labelText),
  placeholder: compactText(field.placeholder),
  nameAttr: compactText(field.nameAttr),
  idAttr: compactText(field.idAttr),
  ariaLabel: compactText(field.ariaLabel),
  nearbyText: field.nearbyText
    ?.map((text) => compactText(text))
    .filter(Boolean)
    .slice(0, 4),
  sectionTitle: compactText(field.sectionTitle),
  options: field.options
    ?.map((option) => compactText(option, 120))
    .filter(Boolean)
    .slice(0, 20),
  required: field.required
})

export const buildAiRecognitionRequest = (fields: FieldCandidate[], profile: Profile) => {
  const definitions = selectableDefinitions(profile).map((definition) => ({
    path: definition.path,
    label: definition.label,
    aliases: definition.aliases,
    typeHints: definition.typeHints,
    sectionHints: definition.sectionHints,
    optionHints: definition.optionHints
  }))

  return {
    instructions:
      "Match browser form fields to the best available profile field path. Return only JSON with a matches array. Never invent paths outside allowedProfileFields. Use null by omitting a field when unsure. Do not ask for or infer profile values.",
    allowedProfileFields: definitions,
    fields: fields.slice(0, MAX_FIELDS_PER_REQUEST).map(compactField),
    responseShape: {
      matches: [
        {
          fieldId: "field id from fields",
          path: "one path from allowedProfileFields",
          confidence: "number from 0 to 1",
          reason: "short explanation"
        }
      ]
    }
  }
}

const parseJsonObject = (content: string): { matches?: unknown[] } | null => {
  const trimmed = content.trim()
  const extracted = trimmed.match(/\{[\s\S]*\}/)?.[0]

  for (const candidate of new Set([trimmed, extracted].filter(Boolean) as string[])) {
    try {
      const parsed = JSON.parse(candidate) as unknown
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as { matches?: unknown[] }
      }
    } catch {
      // Try the extracted JSON object before treating the response as invalid.
    }
  }

  return null
}

const isApiSuggestion = (value: unknown): value is ApiSuggestion =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as ApiSuggestion).fieldId === "string" &&
      typeof (value as ApiSuggestion).path === "string"
  )

export const parseAiRecognitionResponse = (
  response: ChatCompletionResponse,
  fields: FieldCandidate[],
  profile: Profile
): MatchResult[] => {
  const content = response.choices?.[0]?.message?.content
  if (!content) {
    return []
  }

  const allowedPaths = new Set(selectableDefinitions(profile).map((definition) => definition.path))
  const fieldsById = new Map(fields.map((field) => [field.id, field]))
  const parsed = parseJsonObject(content)
  const suggestions = Array.isArray(parsed?.matches) ? parsed.matches : []
  const matchesByFieldId = new Map<string, MatchResult>()

  suggestions.filter(isApiSuggestion).forEach((suggestion) => {
    const field = fieldsById.get(suggestion.fieldId)
    if (!field || !allowedPaths.has(suggestion.path)) {
      return
    }

    const confidence = clampConfidence(suggestion.confidence)
    if (confidence <= 0) {
      return
    }

    const match = buildMatchResult({
      field,
      profile,
      matchedProfilePath: suggestion.path,
      confidence,
      reason: [compactText(suggestion.reason, MAX_REASON_LENGTH) || "API 智能识别"],
      source: "api"
    })

    const existing = matchesByFieldId.get(match.fieldId)
    if (!existing || match.confidence > existing.confidence) {
      matchesByFieldId.set(match.fieldId, match)
    }
  })

  return Array.from(matchesByFieldId.values())
}

export const mergeApiMatches = (
  ruleMatches: MatchResult[],
  apiMatches: MatchResult[]
): MatchResult[] => {
  const apiByFieldId = new Map(apiMatches.map((match) => [match.fieldId, match]))

  return ruleMatches.map((ruleMatch) => {
    const apiMatch = apiByFieldId.get(ruleMatch.fieldId)
    if (!apiMatch?.matchedProfilePath) {
      return ruleMatch
    }

    if (!ruleMatch.matchedProfilePath) {
      return apiMatch
    }

    if (
      apiMatch.matchedProfilePath === ruleMatch.matchedProfilePath &&
      apiMatch.confidence > ruleMatch.confidence
    ) {
      return apiMatch
    }

    if (ruleMatch.requiresConfirmation && apiMatch.confidence >= 0.72) {
      return apiMatch
    }

    if (apiMatch.confidence >= ruleMatch.confidence + 0.12) {
      return apiMatch
    }

    return ruleMatch
  })
}

export const recognizeFieldsWithApi = async ({
  fields,
  profile,
  settings
}: {
  fields: FieldCandidate[]
  profile: Profile
  settings: AiRecognitionSettings
}): Promise<MatchResult[]> => {
  if (
    !settings.enabled ||
    !settings.endpoint.trim() ||
    !settings.model.trim() ||
    fields.length === 0
  ) {
    return []
  }

  const controller = new AbortController()
  const requestedTimeout = settings.timeoutMs ?? 8000
  const timeoutMs = Math.min(60_000, Math.max(1_000, requestedTimeout))
  const timeoutId = setTimeout(
    () => controller.abort(),
    timeoutMs
  )

  try {
    const endpoint = new URL(settings.endpoint)
    if (!["http:", "https:"].includes(endpoint.protocol)) {
      throw new Error("AI_RECOGNITION_INVALID_ENDPOINT")
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    }
    if (settings.apiKey?.trim()) {
      headers.Authorization = `Bearer ${settings.apiKey.trim()}`
    }

    const response = await fetch(settings.endpoint, {
      method: "POST",
      signal: controller.signal,
      headers,
      body: JSON.stringify({
        model: settings.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You classify form fields for a browser autofill extension. Return strict JSON only."
          },
          {
            role: "user",
            content: JSON.stringify(
              buildAiRecognitionRequest(fields.slice(0, MAX_FIELDS_PER_REQUEST), profile)
            )
          }
        ]
      })
    })

    if (!response.ok) {
      throw new Error(`AI_RECOGNITION_HTTP_${response.status}`)
    }

    return parseAiRecognitionResponse(await response.json(), fields, profile)
  } finally {
    clearTimeout(timeoutId)
  }
}

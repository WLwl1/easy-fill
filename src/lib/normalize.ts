export const normalizeText = (value?: string) =>
  (value ?? "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-/:]+/g, " ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()

export const tokenize = (value?: string) =>
  normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)

export const includesAlias = (haystack: string, alias: string) => {
  const normalizedHaystack = normalizeText(haystack)
  const normalizedAlias = normalizeText(alias)

  if (!normalizedHaystack || !normalizedAlias) {
    return false
  }

  return normalizedHaystack.includes(normalizedAlias)
}

import { EMPTY_PROFILE } from "./constants"
import type { Profile } from "./types"

export const cloneProfile = (profile?: Profile): Profile =>
  profile
    ? JSON.parse(JSON.stringify(profile))
    : JSON.parse(JSON.stringify(EMPTY_PROFILE))

export const getProfileValue = (profile: Profile, path: string): string | undefined => {
  if (path.startsWith("custom:")) {
    const key = path.slice("custom:".length)
    return profile.custom.find((item) => item.key === key)?.value
  }

  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part]
    }

    return undefined
  }, profile) as string | undefined
}

export const setProfileValue = (profile: Profile, path: string, value: string) => {
  const parts = path.split(".")
  let cursor: Record<string, unknown> = profile as unknown as Record<string, unknown>

  parts.slice(0, -1).forEach((part) => {
    const next = cursor[part]
    if (!next || typeof next !== "object") {
      cursor[part] = {}
    }
    cursor = cursor[part] as Record<string, unknown>
  })

  cursor[parts[parts.length - 1]] = value
}

export const profileHasAnyValue = (profile: Profile): boolean => {
  const flat = [
    ...Object.values(profile.basic),
    ...Object.values(profile.education),
    ...Object.values(profile.links),
    ...profile.custom.map((item) => item.value)
  ]

  return flat.some((value) => Boolean(value && value.toString().trim()))
}

import {
  buildAiRecognitionRequest,
  mergeApiMatches,
  parseAiRecognitionResponse,
  recognizeFieldsWithApi
} from "../src/lib/ai-recognition"
import { matchFields } from "../src/lib/matcher"
import type { FieldCandidate, Profile } from "../src/lib/types"

const profile: Profile = {
  basic: {
    name: "张三",
    phone: "13800000000",
    email: "secret@example.com"
  },
  education: {
    school: "清华大学",
    major: "软件工程"
  },
  links: {},
  custom: []
}

describe("AI recognition", () => {
  it("builds requests without profile values", () => {
    const fields: FieldCandidate[] = [
      {
        id: "field-1",
        tagName: "input",
        labelText: "申请人",
        placeholder: "请输入姓名"
      }
    ]

    const request = buildAiRecognitionRequest(fields, profile)
    const serialized = JSON.stringify(request)

    expect(serialized).toContain("basic.name")
    expect(serialized).toContain("申请人")
    expect(serialized).not.toContain("张三")
    expect(serialized).not.toContain("13800000000")
    expect(serialized).not.toContain("secret@example.com")
  })

  it("parses API suggestions through the local field-path allowlist", () => {
    const fields: FieldCandidate[] = [
      {
        id: "field-school",
        tagName: "input",
        labelText: "就读院校"
      }
    ]

    const matches = parseAiRecognitionResponse(
      {
        choices: [
          {
            message: {
              content: JSON.stringify({
                matches: [
                  {
                    fieldId: "field-school",
                    path: "education.school",
                    confidence: 0.91,
                    reason: "语义匹配院校"
                  },
                  {
                    fieldId: "field-school",
                    path: "basic.password",
                    confidence: 0.99,
                    reason: "非法路径"
                  }
                ]
              })
            }
          }
        ]
      },
      fields,
      profile
    )

    expect(matches).toHaveLength(1)
    expect(matches[0].matchedProfilePath).toBe("education.school")
    expect(matches[0].valuePreview).toBe("清华大学")
    expect(matches[0].source).toBe("api")
  })

  it("ignores malformed and duplicate API suggestions safely", () => {
    const fields: FieldCandidate[] = [
      { id: "field-school", tagName: "input", labelText: "就读院校" }
    ]

    expect(
      parseAiRecognitionResponse(
        { choices: [{ message: { content: "not valid json" } }] },
        fields,
        profile
      )
    ).toEqual([])

    const matches = parseAiRecognitionResponse(
      {
        choices: [
          {
            message: {
              content: JSON.stringify({
                matches: [
                  null,
                  { fieldId: "field-school", path: "education.school", confidence: 0.6 },
                  { fieldId: "field-school", path: "education.school", confidence: 0.9 }
                ]
              })
            }
          }
        ]
      },
      fields,
      profile
    )

    expect(matches).toHaveLength(1)
    expect(matches[0].confidence).toBe(0.9)
  })

  it("bounds untrusted page metadata sent to the API", () => {
    const fields: FieldCandidate[] = Array.from({ length: 120 }, (_, index) => ({
      id: `field-${index}`,
      tagName: "input",
      labelText: "x".repeat(500)
    }))

    const request = buildAiRecognitionRequest(fields, profile)
    expect(request.fields).toHaveLength(100)
    expect(request.fields[0].labelText).toHaveLength(240)
  })

  it("lets high-confidence API matches replace uncertain rule matches", () => {
    const fields: FieldCandidate[] = [
      {
        id: "field-school",
        tagName: "input",
        labelText: "就读院校"
      }
    ]
    const ruleMatches = matchFields(fields, profile)
    const apiMatches = parseAiRecognitionResponse(
      {
        choices: [
          {
            message: {
              content: JSON.stringify({
                matches: [
                  {
                    fieldId: "field-school",
                    path: "education.school",
                    confidence: 0.92,
                    reason: "API 识别为学校"
                  }
                ]
              })
            }
          }
        ]
      },
      fields,
      profile
    )

    const [merged] = mergeApiMatches(ruleMatches, apiMatches)

    expect(ruleMatches[0].requiresConfirmation).toBe(true)
    expect(merged.source).toBe("api")
    expect(merged.requiresConfirmation).toBe(false)
  })

  it("posts OpenAI-compatible requests without leaking profile values", async () => {
    const fields: FieldCandidate[] = [
      {
        id: "field-school",
        tagName: "input",
        labelText: "就读院校"
      }
    ]
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = String(init?.body)
      expect(body).toContain("education.school")
      expect(body).not.toContain("张三")
      expect(body).not.toContain("13800000000")
      expect(body).not.toContain("secret@example.com")

      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  matches: [
                    {
                      fieldId: "field-school",
                      path: "education.school",
                      confidence: 0.9,
                      reason: "API 识别为学校"
                    }
                  ]
                })
              }
            }
          ]
        })
      } as Response
    })
    vi.stubGlobal("fetch", fetchMock)

    const matches = await recognizeFieldsWithApi({
      fields,
      profile,
      settings: {
        enabled: true,
        endpoint: "https://example.test/v1/chat/completions",
        model: "test-model",
        apiKey: "test-key",
        timeoutMs: 1000
      }
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(matches[0].matchedProfilePath).toBe("education.school")

    vi.unstubAllGlobals()
  })
})

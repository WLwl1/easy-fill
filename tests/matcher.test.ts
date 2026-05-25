import { matchFields } from "../src/lib/matcher"
import type { FieldCandidate, Profile } from "../src/lib/types"

const profile: Profile = {
  basic: {
    name: "张三",
    phone: "13800000000",
    email: "test@example.com"
  },
  education: {
    school: "清华大学",
    college: "计算机学院",
    major: "软件工程",
    gpa: "3.9"
  },
  links: {},
  custom: [
    {
      key: "research_interest",
      label: "研究方向",
      value: "系统安全",
      aliases: ["研究兴趣", "方向"]
    }
  ]
}

describe("field matching", () => {
  it("matches common internship fields", () => {
    const fields: FieldCandidate[] = [
      {
        id: "field-name",
        tagName: "input",
        labelText: "姓名"
      },
      {
        id: "field-phone",
        tagName: "input",
        placeholder: "请输入联系电话",
        inputType: "tel"
      },
      {
        id: "field-school",
        tagName: "input",
        labelText: "本科院校"
      }
    ]

    const matches = matchFields(fields, profile)
    expect(matches[0].matchedProfilePath).toBe("basic.name")
    expect(matches[1].matchedProfilePath).toBe("basic.phone")
    expect(matches[2].matchedProfilePath).toBe("education.school")
  })

  it("matches custom field aliases", () => {
    const fields: FieldCandidate[] = [
      {
        id: "field-custom",
        tagName: "textarea",
        labelText: "研究兴趣"
      }
    ]

    const matches = matchFields(fields, profile)
    expect(matches[0].matchedProfilePath).toBe("custom:research_interest")
    expect(matches[0].valuePreview).toBe("系统安全")
  })
})

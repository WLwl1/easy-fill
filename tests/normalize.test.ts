import { includesAlias, normalizeText, tokenize } from "../src/lib/normalize"

describe("normalize helpers", () => {
  it("normalizes camelCase and separators", () => {
    expect(normalizeText("student_ID-Number")).toBe("student id number")
  })

  it("tokenizes multilingual text", () => {
    expect(tokenize("联系电话 phone")).toEqual(["联系电话", "phone"])
  })

  it("matches aliases after normalization", () => {
    expect(includesAlias("Applicant Phone Number", "phone")).toBe(true)
  })
})

import { fillElementValue, fillRecommendedMatches } from "../src/lib/fill"
import { scanFields } from "../src/lib/scanner"

describe("scanner and fill", () => {
  it("finds standard labeled inputs and ignores password fields", () => {
    document.body.innerHTML = `
      <form>
        <label for="name">姓名</label>
        <input id="name" placeholder="请输入姓名" />
        <label for="pwd">密码</label>
        <input id="pwd" type="password" />
      </form>
    `

    const fields = scanFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].labelText).toBe("姓名")
  })

  it("keeps field IDs stable and unique when dynamic fields are inserted", () => {
    document.body.innerHTML = `
      <input name="first" data-easy-fill-id="page-controlled" />
      <input name="second" data-easy-fill-id="page-controlled" />
    `

    const firstScan = scanFields(document)
    const inserted = document.createElement("input")
    inserted.name = "inserted"
    document.body.prepend(inserted)
    const secondScan = scanFields(document)

    expect(new Set(firstScan.map((field) => field.id)).size).toBe(2)
    expect(secondScan.find((field) => field.nameAttr === "first")?.id).toBe(firstScan[0].id)
    expect(secondScan.find((field) => field.nameAttr === "second")?.id).toBe(firstScan[1].id)
    expect(new Set(secondScan.map((field) => field.id)).size).toBe(3)
    expect(secondScan.some((field) => field.id === "page-controlled")).toBe(false)
  })

  it("finds inputs labelled by aria-labelledby", () => {
    document.body.innerHTML = `
      <form>
        <span id="email-label">电子邮箱</span>
        <input aria-labelledby="email-label" />
      </form>
    `

    const fields = scanFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].labelText).toBe("电子邮箱")
  })

  it("finds labels from component library form items", () => {
    document.body.innerHTML = `
      <form>
        <div class="ant-form-item">
          <div class="ant-form-item-label">
            <label title="毕业院校">毕业院校</label>
          </div>
          <div class="ant-form-item-control">
            <input id="school" />
          </div>
        </div>
      </form>
    `

    const fields = scanFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].labelText).toBe("毕业院校")
  })

  it("fills input values and dispatches events", async () => {
    document.body.innerHTML = `
      <label for="school">学校</label>
      <input id="school" />
    `
    const input = document.querySelector("input")!
    let inputEventCount = 0
    input.addEventListener("input", () => {
      inputEventCount += 1
    })

    const [field] = scanFields(document)
    const result = await fillElementValue(field.id, "北京大学")
    expect(result).toBe(true)
    expect(input.value).toBe("北京大学")
    expect(inputEventCount).toBe(1)
  })

  it("fills select elements by label text", async () => {
    document.body.innerHTML = `
      <label for="degree">学历</label>
      <select id="degree">
        <option value="">请选择</option>
        <option value="undergraduate">本科</option>
      </select>
    `

    const [field] = scanFields(document)
    const result = await fillElementValue(field.id, "本科")
    const select = document.querySelector("select")!
    expect(result).toBe(true)
    expect(select.value).toBe("undergraduate")
  })

  it("reports failed fills as skipped", async () => {
    document.body.innerHTML = `
      <label for="degree">学历</label>
      <select id="degree"><option value="undergraduate">本科</option></select>
    `
    const [field] = scanFields(document)

    const summary = await fillRecommendedMatches([
      {
        field,
        match: {
          fieldId: field.id,
          matchedProfilePath: "education.degree",
          confidence: 1,
          reason: [],
          valuePreview: "博士",
          requiresConfirmation: false
        }
      }
    ])

    expect(summary).toEqual({ filledCount: 0, skippedCount: 1 })
  })

  it("scans same-origin iframe fields", () => {
    document.body.innerHTML = `<iframe id="child-frame"></iframe>`
    const frame = document.querySelector("iframe")!
    const frameDocument = frame.contentDocument!

    frameDocument.open()
    frameDocument.write(`
      <form>
        <label for="major">专业</label>
        <input id="major" placeholder="请输入专业" />
      </form>
    `)
    frameDocument.close()

    const fields = scanFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].labelText).toBe("专业")
  })

  it("scans and fills fields inside open shadow roots", async () => {
    document.body.innerHTML = `<div id="host"></div>`
    const host = document.querySelector<HTMLElement>("#host")!
    const shadowRoot = host.attachShadow({ mode: "open" })
    shadowRoot.innerHTML = `
      <label for="github">GitHub</label>
      <input id="github" type="url" />
    `

    const fields = scanFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].labelText).toBe("GitHub")

    const result = await fillElementValue(fields[0].id, "https://github.com/example")
    const input = shadowRoot.querySelector<HTMLInputElement>("#github")!

    expect(result).toBe(true)
    expect(input.value).toBe("https://github.com/example")
  })

  it("keeps readonly combobox-style inputs for scanning", () => {
    document.body.innerHTML = `
      <label for="gender">性别</label>
      <input
        id="gender"
        readonly
        role="combobox"
        aria-haspopup="listbox"
        class="select-trigger"
      />
    `

    const fields = scanFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].labelText).toBe("性别")
  })

  it("keeps readonly date-picker style inputs for scanning", () => {
    document.body.innerHTML = `
      <label for="birthDate">出生日期</label>
      <input
        id="birthDate"
        readonly
        placeholder="请选择日期"
        class="date-picker-input"
      />
    `

    const fields = scanFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].labelText).toBe("出生日期")
  })

  it("fills same-origin iframe inputs", async () => {
    document.body.innerHTML = `<iframe id="child-frame"></iframe>`
    const frame = document.querySelector("iframe")!
    const frameDocument = frame.contentDocument!

    frameDocument.open()
    frameDocument.write(`
      <form>
        <label for="name">姓名</label>
        <input id="name" />
      </form>
    `)
    frameDocument.close()

    const [field] = scanFields(document)
    const frameInput = frameDocument.querySelector("input")!
    const result = await fillElementValue(field.id, "汪龙")

    expect(result).toBe(true)
    expect(frameInput.value).toBe("汪龙")
  })

  it("fills readonly date-picker style inputs", async () => {
    document.body.innerHTML = `
      <label for="birthDate">出生日期</label>
      <input
        id="birthDate"
        readonly
        aria-readonly="true"
        placeholder="请选择日期"
        class="date-picker-input"
      />
    `

    const input = document.querySelector<HTMLInputElement>("#birthDate")!
    let changed = 0
    input.addEventListener("change", () => {
      changed += 1
    })

    const [field] = scanFields(document)
    const result = await fillElementValue(field.id, "2004-4-13")

    expect(result).toBe(true)
    expect(input.value).toBe("2004-04-13")
    expect(changed).toBeGreaterThan(0)
    expect(input.readOnly).toBe(true)
    expect(input.getAttribute("aria-readonly")).toBe("true")
  })

  it("accepts Chinese date strings for date-like inputs", async () => {
    document.body.innerHTML = `
      <label for="birthday">出生日期</label>
      <input id="birthday" class="calendar-input" />
    `

    const [field] = scanFields(document)
    const input = document.querySelector<HTMLInputElement>("#birthday")!
    const result = await fillElementValue(field.id, "2004年4月13日")

    expect(result).toBe(true)
    expect(input.value).toBe("2004-04-13")
  })

  it("commits date selection by clicking a visible calendar day", async () => {
    document.body.innerHTML = `
      <div class="date-picker">
        <label for="birthDate">出生日期</label>
        <input
          id="birthDate"
          readonly
          aria-readonly="true"
          class="date-picker-input"
          placeholder="请选择日期"
        />
        <div id="calendar" style="display:none;">
          <div class="calendar-day">12</div>
          <div class="calendar-day">13</div>
          <div class="calendar-day">14</div>
        </div>
      </div>
    `

    const input = document.querySelector<HTMLInputElement>("#birthDate")!
    const calendar = document.querySelector<HTMLElement>("#calendar")!
    input.addEventListener("click", () => {
      calendar.style.display = "block"
    })

    document.querySelectorAll<HTMLElement>(".calendar-day").forEach((cell) => {
      cell.addEventListener("click", () => {
        input.value = "2004-04-13"
        calendar.style.display = "none"
      })
    })

    const [field] = scanFields(document)
    const result = await fillElementValue(field.id, "2004-04-13")

    expect(result).toBe(true)
    expect(input.value).toBe("2004-04-13")
    expect(calendar.style.display).toBe("none")
  })

  it("selects custom dropdown options by clicking visible choices", async () => {
    document.body.innerHTML = `
      <div class="custom-select">
        <label for="gender">性别</label>
        <input id="gender" role="combobox" aria-haspopup="listbox" />
        <div id="menu" style="display:none;">
          <div role="option" data-value="男">男</div>
          <div role="option" data-value="女">女</div>
        </div>
      </div>
    `

    const input = document.querySelector<HTMLInputElement>("#gender")!
    const menu = document.querySelector<HTMLElement>("#menu")!
    input.addEventListener("click", () => {
      menu.style.display = "block"
    })

    document.querySelectorAll<HTMLElement>("[role='option']").forEach((option) => {
      option.addEventListener("click", () => {
        input.value = option.dataset.value ?? ""
        menu.style.display = "none"
      })
    })

    const [field] = scanFields(document)
    const result = await fillElementValue(field.id, "男")

    expect(result).toBe(true)
    expect(input.value).toBe("男")
    expect(menu.style.display).toBe("none")
  })

  it("searches custom dropdowns before selecting remote options", async () => {
    document.body.innerHTML = `
      <div class="ant-select ant-select-show-search">
        <label for="school">学校</label>
        <input id="school" role="combobox" aria-haspopup="listbox" />
      </div>
      <div id="menu" style="display:none;"></div>
    `

    const input = document.querySelector<HTMLInputElement>("#school")!
    const menu = document.querySelector<HTMLElement>("#menu")!
    input.addEventListener("input", () => {
      if (input.value === "清华大学") {
        menu.style.display = "block"
        menu.innerHTML = `
          <div class="ant-select-item-option" role="option">
            <div class="ant-select-item-option-content">清华大学</div>
          </div>
        `
      }
    })
    menu.addEventListener("click", (event) => {
      const option = (event.target as HTMLElement).closest<HTMLElement>("[role='option']")
      if (!option) {
        return
      }

      input.value = option.textContent?.trim() ?? ""
      menu.style.display = "none"
    })

    const [field] = scanFields(document)
    const result = await fillElementValue(field.id, "清华大学")

    expect(result).toBe(true)
    expect(input.value).toBe("清华大学")
    expect(menu.style.display).toBe("none")
  })
})

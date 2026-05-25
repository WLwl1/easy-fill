import type { FieldDefinition, Profile } from "./types"

export const STORAGE_KEYS = {
  vault: "easy-fill:vault",
  sessionProfile: "easy-fill:session-profile",
  sessionUnlocked: "easy-fill:session-unlocked",
  sessionPassword: "easy-fill:session-password"
} as const

export const EMPTY_PROFILE: Profile = {
  basic: {},
  education: {},
  links: {},
  custom: []
}

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    path: "basic.name",
    label: "姓名",
    aliases: ["姓名", "名字", "真实姓名", "申请人姓名", "name", "full name", "fullname"]
  },
  {
    path: "basic.phone",
    label: "手机号",
    aliases: ["手机号", "手机", "电话", "联系电话", "联系电话号码", "mobile", "phone", "tel"],
    typeHints: ["tel"]
  },
  {
    path: "basic.email",
    label: "邮箱",
    aliases: ["邮箱", "电子邮箱", "邮件", "email", "e-mail", "mail"],
    typeHints: ["email"]
  },
  {
    path: "basic.wechat",
    label: "微信",
    aliases: ["微信", "微信号", "wechat", "weixin"]
  },
  {
    path: "basic.birthDate",
    label: "出生日期",
    aliases: ["出生日期", "生日", "出生年月", "birth date", "birthday"],
    typeHints: ["date"]
  },
  {
    path: "basic.gender",
    label: "性别",
    aliases: ["性别", "gender", "sex"]
  },
  {
    path: "basic.address",
    label: "住址",
    aliases: ["住址", "通讯地址", "家庭住址", "地址", "address", "location"]
  },
  {
    path: "education.school",
    label: "学校",
    aliases: ["学校", "本科院校", "毕业院校", "所在学校", "university", "school"],
    sectionHints: ["教育", "学校", "院校"]
  },
  {
    path: "education.college",
    label: "学院",
    aliases: ["学院", "院系", "college", "faculty", "department"],
    sectionHints: ["教育", "院系"]
  },
  {
    path: "education.major",
    label: "专业",
    aliases: ["专业", "专业名称", "major", "subject"],
    sectionHints: ["教育", "院系"]
  },
  {
    path: "education.degree",
    label: "学历",
    aliases: ["学历", "学位", "degree", "education level"]
  },
  {
    path: "education.grade",
    label: "年级",
    aliases: ["年级", "grade", "class year", "入学年份"]
  },
  {
    path: "education.studentId",
    label: "学号",
    aliases: ["学号", "student id", "student number"]
  },
  {
    path: "education.gpa",
    label: "绩点",
    aliases: ["绩点", "gpa", "平均绩点"],
    sectionHints: ["教育", "成绩"]
  },
  {
    path: "education.rank",
    label: "排名",
    aliases: ["排名", "专业排名", "rank", "ranking"],
    sectionHints: ["教育", "成绩"]
  },
  {
    path: "links.github",
    label: "GitHub",
    aliases: ["github", "代码仓库", "开源主页"],
    typeHints: ["url"]
  },
  {
    path: "links.homepage",
    label: "个人主页",
    aliases: ["个人主页", "主页", "homepage", "portfolio", "website"],
    typeHints: ["url"]
  },
  {
    path: "links.linkedin",
    label: "LinkedIn",
    aliases: ["linkedin", "领英"],
    typeHints: ["url"]
  }
]

export const BLOCKED_FIELD_ALIASES = [
  "密码",
  "password",
  "验证码",
  "captcha",
  "校验码",
  "verification code",
  "otp",
  "银行卡",
  "bank card",
  "cvv",
  "支付",
  "payment"
]

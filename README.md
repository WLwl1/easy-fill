# Easy Fill

<p align="center">
  <strong>zh_CN 简体中文</strong> ·
  <a href="readme/README.en.md">en English</a> ·
  <a href="readme/README.ja.md">ja 日本語</a>
</p>

<p align="center">
  <a href="https://github.com/WLwl1/easy-fill/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/WLwl1/easy-fill/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-green.svg"></a>
  <a href="#安装"><img alt="Chrome and Edge" src="https://img.shields.io/badge/browser-Chrome%20%7C%20Edge-blue"></a>
</p>

![Easy Fill 使用截图](assets/demo-screenshot.png)

Easy Fill 是一个面向中文申请表的隐私优先浏览器扩展。它帮学生和求职者把姓名、电话、邮箱、学校、学院、专业、GPA、排名等高频资料保存在本地，在实习申请、保研/考研材料、奖学金系统、校园门户里自动识别字段并一键填写。

核心卖点很直接：中文申请表 + 本地隐私 + 默认本地规则识别；也可显式开启 OpenAI-compatible API 智能识别。

## 适合谁

- 正在批量填写实习、校招、奖学金、夏令营、推免、研究生申请表的学生
- 经常遇到中文字段、动态弹窗、日期选择器、自定义下拉框的用户
- 希望自动填表，但不想把个人资料上传到云端的人
- 想贡献中文表单字段别名、真实站点兼容性和浏览器扩展能力的开发者

## 功能亮点

- 本地资料库，使用主密码加密保存
- 无账号、无项目后端、无遥测；API 智能识别默认关闭
- 支持动态页面、弹窗、同源 iframe
- 支持文本框、`select`、自定义下拉、日期类输入
- 使用可解释的规则匹配；可选 API 智能识别只发送字段元数据和可用字段名称，不发送已保存资料值
- 自动跳过密码、验证码、银行卡、CVV、支付等高风险字段

## 安装

| 渠道 | 状态 | 链接 |
| --- | --- | --- |
| Chrome Web Store | 准备上架 | 待发布后替换为商店链接 |
| Microsoft Edge Add-ons | 准备上架 | 待发布后替换为商店链接 |
| 本地开发安装 | 可用 | 见下方步骤 |

本地安装：

```bash
npm install
npm run build
```

然后打开 `chrome://extensions` 或 `edge://extensions`，开启 Developer Mode，点击 "Load unpacked"，选择 `build/chrome-mv3-prod`。

## 在线 Demo

- [打开 demo 表单](docs/demo.html)
- 先在扩展设置页保存一份测试资料
- 打开 demo 表单后点击 Easy Fill 弹窗，即可扫描并填写中文申请字段

Demo 页面只包含本地静态表单，不收集任何信息。

## 开发

```bash
npm install
npm run dev
```

常用命令：

```bash
npm run typecheck
npm test
npm run build
```

## 工作原理

Easy Fill 当前不使用大模型。匹配流程是：

1. 扫描页面中的 `input`、`textarea`、`select`
2. 提取 label、placeholder、name、id、aria-label、附近文本和区块标题
3. 与资料字段别名进行规则匹配和加权评分
4. 对高置信度字段一键填写，对低置信度字段保留人工确认

这种方式速度快、成本低、可解释，也更适合处理隐私资料。

## 项目结构

```text
src/
  background/    extension background worker
  content.ts     page scanning and overlay UI
  lib/           matching, scanning, filling, storage, security
  options/       profile vault editor
  popup/         extension popup
tests/           unit and integration tests
docs/            demo pages and project documentation assets
readme/          localized README files
```

## 贡献

欢迎贡献，尤其适合从这些方向开始：

- 增加中文字段别名
- 补充真实学校系统、招聘系统、奖学金系统兼容性
- 改进 Ant Design、Element Plus 等控件填写能力
- 增加测试和 demo 用例
- 改进 README、截图、上架文档和新手体验

更多计划见 [ROADMAP.md](ROADMAP.md)，贡献指南见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

MIT. See [LICENSE](LICENSE).

# Easy Fill

<p align="center">
  zh_CN <a href="README.md">简体中文</a> ·
  en <a href="README.en.md">English</a> ·
  ja <strong>日本語</strong>
</p>

<p align="center">
  <a href="https://github.com/WLwl1/easy-fill/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/WLwl1/easy-fill/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-green.svg"></a>
  <a href="#インストール"><img alt="Chrome and Edge" src="https://img.shields.io/badge/browser-Chrome%20%7C%20Edge-blue"></a>
</p>

![Easy Fill デモスクリーンショット](assets/demo-screenshot.png)

Easy Fill は、中国語の申請フォーム向けに作られたプライバシー重視のブラウザ拡張機能です。学生や求職者が名前、電話番号、メール、学校、学部、専攻、GPA、順位などのよく使うプロフィール情報をローカルに保存し、フォーム項目を検出して、ルールベースのマッチングでワンクリック入力できるようにします。

中心となる価値はシンプルです：中国語申請フォーム、ローカルプライバシー、AI 依存なし、バックエンドなし。

## 対象ユーザー

- インターン、奨学金、大学院、推薦、学内ポータルなどのフォームを繰り返し入力する学生
- 中国語ラベル、動的モーダル、日付ピッカー、カスタムドロップダウンに悩むユーザー
- 個人情報をクラウドへアップロードせずに自動入力したい人
- ブラウザ拡張、フォーム理解、プライバシー重視ツールに関心のある開発者

## 特長

- マスターパスワードで保護されたローカル暗号化プロフィール保管庫
- アカウント、バックエンド、テレメトリ、AI API 呼び出しなし
- 動的ページ、モーダル、同一オリジン iframe に対応
- テキスト入力、ネイティブ select、カスタムドロップダウン、日付系入力に対応
- ブラックボックスモデルではなく、説明可能なルールベースマッチング
- パスワード、認証コード、銀行カード、CVV、支払い情報などの高リスク項目を無視

## インストール

| チャンネル | 状態 | リンク |
| --- | --- | --- |
| Chrome Web Store | 公開準備中 | 公開後にストアリンクへ差し替え |
| Microsoft Edge Add-ons | 公開準備中 | 公開後にストアリンクへ差し替え |
| ローカル開発インストール | 利用可能 | 以下の手順を参照 |

ローカルインストール：

```bash
npm install
npm run build
```

`chrome://extensions` または `edge://extensions` を開き、Developer Mode を有効にして、"Load unpacked" をクリックし、`build/chrome-mv3-prod` を選択します。

## デモ

- [デモフォームを開く](docs/demo.html)
- 拡張機能のオプションページでテスト用プロフィールを保存します
- デモページで Easy Fill のポップアップを開くと、中国語申請フォームの項目をスキャンして入力できます

デモページは静的ページで、情報を収集しません。

## 開発

```bash
npm install
npm run dev
```

よく使うコマンド：

```bash
npm run typecheck
npm test
npm run build
```

## マッチングの仕組み

Easy Fill は大規模言語モデルを使用しません。現在のマッチング手順は次の通りです：

1. `input`、`textarea`、`select` をスキャンする
2. label、placeholder、name、id、aria-label、近くのテキスト、セクション文脈を抽出する
3. それらのシグナルをプロフィール項目の別名と重み付きルールで比較する
4. 高信頼度の項目を入力し、不確かな項目は確認可能な状態にする

この方式により、高速、ローカル、予測可能、低コストで動作します。

## 技術スタック

- TypeScript
- React
- Plasmo
- Vitest

## ロードマップ

[ROADMAP.md](ROADMAP.md) を参照してください。

## ライセンス

MIT. See [LICENSE](LICENSE).

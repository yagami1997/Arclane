# Repository Tools

バージョン作成日時: 2026年4月2日 13:30 JST
最終更新日時: 2026年8月31日 JST

Language:

- [English](./README.md)
- 日本語

## 概要

`tools/` ディレクトリは、リポジトリ全体を支える運用補助ツールと保守向けユーティリティのための層です。

これは ruleset の主線や互換公開面と並ぶ別の役割を持ちます。目的は、リポジトリ全体の運用、保守、検証、デプロイ、障害時対応を支える補助コンポーネントを整理して置くことです。

## スコープ

`tools/` には、次のようなリポジトリ級の補助要素を配置します。

- 緊急時のネットワークユーティリティ
- デプロイ補助
- 検証や監査のためのツール
- 生成・保守スクリプト
- 移行補助ツール
- ruleset 主線に置くべきではない運用支援コンポーネント

## ここに置くもの

次のいずれかに当てはまるものは `tools/` に置くのが適切です。

- ruleset 自体ではなく、リポジトリ運用を支援するもの
- 一回限りの実験ではなく、再利用されるユーティリティであるもの
- フォールバック、障害復旧、検証、デプロイの価値を持つもの
- 独立したツールモジュールとして保守した方が分かりやすいもの

## ここに置かないもの

次のものは原則として `tools/` に置きません。

- `neorulset26/` に属する主線 ruleset ファイル
- root や `ruleset/` に残す必要がある互換公開パス
- 運用上の意味が明確でない単発実験
- 継続保守しない一時的な scratch ファイル

## 現在のツール

### Real IP Module Builder

パス:

- [`realip/`](./realip/)

ドキュメント:

- [`realip/README.md`](./realip/README.md)

この依存関係のないPythonユーティリティは、分類されたReal IPホストカタログを
検証し、macOSおよびiOS/iPadOS向けSurgeモジュールに同一の
`always-real-ip`値を生成します。重複、不正なトークン、および危険な広域
ワイルドカードを拒否します。さらに、platform 識別子、許可された
section、`DIRECT` のみの module routing、および iOS/iPadOS 版に macOS 固有の
process rule が入っていないことを検証します。

同じディレクトリの [`check-openclaw.mjs`](./realip/check-openclaw.mjs) は、
インストール済み OpenClaw の SSRF runtime を使う手動実行の Node.js 診断です。
公開ホスト3件の DNS、認証情報を送信しないカタログ GET 2件、ネットワーク通信を
行わない拒否確認9件を検証します。Surge や OpenClaw の設定を変更せず、
モジュールの通常動作にも不要です。
[互換性ガイド](../docs/guides/openclaw-fake-ip-compatibility.md)を参照してください。

### DoH Fallback Worker

バージョン: 4.0.0 · 作成日時: 2026年4月2日 13:30 JST · **更新日時: 2026年7月25日**

パス:

- [`doh-fallback-worker/`](./doh-fallback-worker/)

英語版ドキュメント:

- [`doh-fallback-worker/README.md`](./doh-fallback-worker/README.md)

Cloudflare Workers 向けのセルフホスト DoH ゲートウェイ参照実装。パブリックパス `/dns-query` はデフォルト無効で、明示的に有効化した場合は保守的な単一 upstream profile を使用します。Bearer 認証または互換パス `/dns-query/<token>` は KV から独立した profile と private rule set を読み込みます。

現在の v4 は private profile 向けの検証付き hedged request、transaction ID と
残余 TTL の cache correctness、RFC 2308 negative caching、isolate 内
singleflight、hot-only prefetch、request bounds、local response synthesis、
stale-if-error を備えます。文書では placeholder のみを使用し、メンテナーが
運用する resolver domain や private deployment identifier は公開しません。

### edge204 — CF エッジ 204 プローブ

バージョン: 1.1.0 · 作成日時: 2026年4月7日 15:10 JST · 更新日時: 2026年7月27日 JST

パス:

- [`edge204/`](./edge204/)

英語版ドキュメント:

- [`edge204/README.md`](./edge204/README.md)

このツールは、Surge および Clash/mihomo のプロキシノード遅延測定用に CF エッジから純粋な HTTP 204 レスポンスを返す Cloudflare Worker です。プロキシノード出口から最寄りの CF PoP までの RTT を測定し、上流へのリクエストは一切発生しません。測定対象は実際の宛先ではなく Cloudflare までの経路であるため、ツール側の README に手法上の死角を明記しています。この数値でノードを順位付けする前に必ず参照してください。

## 保守方針

- 各ツールはできるだけ自己完結させる。
- 各ツールに専用 README を持たせる。
- 小さく、監査しやすく、目的が明確な単位を優先する。
- 継続的な保守価値があるものだけを `tools/` に追加する。

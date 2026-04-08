# doh-fallback-worker

Cloudflare Workers 上に構築したプライベート DoH ゲートウェイです。

- **パブリックパス** `/dns-query` — 高性能な公開 DoH。標準的な DoH クライアントであれば誰でも利用可能
- **プライベートパス** `/dns-query/<token>` — KV に保存されたトークン別プロファイルとプライベートルールを読み込み

Language: [English](./README.md) / 日本語

## 機能一覧

| # | 機能 |
|---|------|
| 1 | トークンルーティング — 各トークンは KV に保存された独立した解決プロファイルに対応 |
| 2 | プライベートルールマッチング — 完全一致・サフィックス一致で、アップストリームを使わずローカルで応答 |
| 3 | ローカル DNS 応答合成 — Worker 内部でバイナリ的に正確な DNS 応答を生成 |
| 4 | 正規化キャッシュキー — セマンティックキーにより、transaction ID の変化によるキャッシュ断片化を解消 |
| 5 | 複数アップストリームレース — CF / Google / Quad9 / Ali に並列問い合わせし、最初の応答を採用 |
| 6 | 残余 TTL キャッシュ — クライアントには元の TTL ではなく、実際の残余 TTL を返す |
| 7 | バックグラウンドプリフェッチ — 残余 TTL が 25% を切った時点で静かに更新 |
| 8 | ECS 対応キャッシュ分離 — ECS あり・なしのクエリに別々のキャッシュエントリを使用 |
| 9 | Stale-if-error — 全アップストリーム失敗時、設定ウィンドウ内であれば stale キャッシュを返却 |

## 事前準備

- [Node.js](https://nodejs.org) 18 以降
- [Cloudflare アカウント](https://dash.cloudflare.com/sign-up)（無料プランで十分）

Wrangler をグローバルインストールします。

```bash
npm install -g wrangler
```

Cloudflare にログインします。

```bash
wrangler login
```

ブラウザが開き、認証画面が表示されます。承認して完了です。

---

## ローカル開発・動作確認

デプロイ前にローカルで Worker を起動して動作を確認できます。
`wrangler dev` は KV バインディングを含めて Cloudflare エッジの挙動を再現します。

### 1. ローカルサーバーを起動する

```bash
cd tools/doh-fallback-worker
wrangler dev
```

デフォルトで `http://localhost:8787` が起動します。

### 2. パブリックパスを確認する（トークンなし）

```bash
# google.com の A レコードを GET で問い合わせ
curl -s "http://localhost:8787/dns-query?dns=AAABAAABAAAAAAAAA3d3dwZnb29nbGUDY29tAAABAAE=" | xxd | head
```

バイナリ DNS レスポンスが返ります。  
1 回目のリクエスト: レスポンスヘッダーに `x-cache: MISS`  
2 回目の同一リクエスト: `x-cache: HIT`

### 3. ローカル KV にテスト用エントリを追加する

`wrangler dev` 中の KV 操作はローカルストアに書き込まれ、本番には影響しません。

別のターミナルで以下を実行します。

```bash
# テスト用トークンのプロファイルを書き込む
wrangler kv key put --binding DOH_KV \
  "profile:test-token-1234" \
  '{"name":"local-test","upstreams":["cf","google","quad9"],"cachePolicy":{"minTtl":60,"maxTtl":86400,"defaultTtl":300,"prefetchRatio":0.75,"staleIfErrorWindow":120}}' \
  --local

# 同じトークンのルールを書き込む
wrangler kv key put --binding DOH_KV \
  "rules:test-token-1234" \
  '{"privateRules":[{"match":"exact","domain":"test.internal","type":"A","answers":["127.0.0.1"],"ttl":60}]}' \
  --local
```

### 4. プライベートパスを確認する

```bash
# test.internal を問い合わせ — アップストリームを使わず 127.0.0.1 が合成されて返る
curl -sv "http://localhost:8787/dns-query/test-token-1234?dns=AAABAAABAAAAAAAABHRlc3QIaW50ZXJuYWwAAAEAAQ=="
```

### 5. エラーケースを確認する

```bash
# 無効なトークン — 403 が返ること
curl -sv "http://localhost:8787/dns-query/invalid-token" 2>&1 | grep "< HTTP"

# dns パラメータなし — 400 が返ること
curl -sv "http://localhost:8787/dns-query" 2>&1 | grep "< HTTP"
```

---

## 本番デプロイ手順

### ステップ 1 — KV ネームスペースを作成する

```bash
wrangler kv namespace create DOH_KV
```

出力から ID を確認します。

```
✅ Created namespace "DOH_KV" with ID "abc123..."
```

`wrangler.toml` のプレースホルダーをこの ID で置き換えます。

```toml
[[kv_namespaces]]
binding = "DOH_KV"
id      = "abc123..."
```

### ステップ 2 — Worker をデプロイする

```bash
wrangler deploy
```

成功すると Worker の URL が表示されます。

```
https://doh-fallback-worker.<あなたのアカウント>.workers.dev
```

この時点でパブリックパス `/dns-query` がすでに使用可能です。

### ステップ 3 — トークンを生成する

```bash
uuidgen
# 例: ef7e6132-75b6-400e-8fec-0e61f7b44f8e
```

このトークンは非公開で管理してください。プライベートルールへのアクセスキーです。

### ステップ 4 — プロファイルとルールを KV に書き込む

**プロファイルを書き込む:**

```bash
wrangler kv key put --binding DOH_KV \
  "profile:ef7e6132-75b6-400e-8fec-0e61f7b44f8e" \
  '{"name":"personal","upstreams":["cf","google","quad9"],"cachePolicy":{"minTtl":60,"maxTtl":86400,"defaultTtl":300,"prefetchRatio":0.75,"staleIfErrorWindow":120}}'
```

**`rules.json` を用意し**（フォーマットは後述）、KV に反映します。

```bash
wrangler kv key put --binding DOH_KV \
  "rules:ef7e6132-75b6-400e-8fec-0e61f7b44f8e" \
  --path rules.json
```

### ステップ 5 — 動作確認

```bash
# パブリックパス
curl -s "https://doh-fallback-worker.<あなたのアカウント>.workers.dev/dns-query?dns=AAABAAABAAAAAAAAA3d3dwZnb29nbGUDY29tAAABAAE="

# プライベートパス
curl -sv "https://doh-fallback-worker.<あなたのアカウント>.workers.dev/dns-query/ef7e6132-75b6-400e-8fec-0e61f7b44f8e?dns=..."
```

1 回目: `x-cache: MISS`、2 回目の同一クエリ: `x-cache: HIT` であれば正常です。

---

## プライベートルールの管理

ルールは KV に保存され、Worker を再デプロイせずに即時反映されます。

### ルール形式（`rules.json`）

```json
{
  "privateRules": [
    {
      "match": "suffix",
      "domain": "ads.example.com",
      "type": "A",
      "answers": ["0.0.0.0"],
      "ttl": 300
    },
    {
      "match": "exact",
      "domain": "nas.home",
      "type": "A",
      "answers": ["192.168.1.10"],
      "ttl": 60
    },
    {
      "match": "suffix",
      "domain": "internal.example.com",
      "type": "AAAA",
      "answers": ["::1"],
      "ttl": 60
    }
  ]
}
```

| フィールド | 値 |
|-----------|-----|
| `match` | `exact` — 完全一致のみ / `suffix` — ドメインおよびすべてのサブドメインに一致 |
| `type` | `A`, `AAAA`, `CNAME` |
| `answers` | IP アドレスまたは CNAME ターゲット名の配列 |

ドメインをブロックするには `answers` を `["0.0.0.0"]` に設定します。

### ルールの更新・削除

```bash
# ルールを更新する（KV cacheTtl 内、デフォルト 300 秒以内に反映）
wrangler kv key put --binding DOH_KV "rules:<token>" --path rules.json

# 現在のルールを確認する
wrangler kv key get --binding DOH_KV "rules:<token>"

# トークンを削除する
wrangler kv key delete --binding DOH_KV "profile:<token>"
wrangler kv key delete --binding DOH_KV "rules:<token>"
```

### プロファイル形式リファレンス

```json
{
  "name": "personal",
  "upstreams": ["cf", "google", "quad9"],
  "cachePolicy": {
    "minTtl": 60,
    "maxTtl": 86400,
    "defaultTtl": 300,
    "prefetchRatio": 0.75,
    "staleIfErrorWindow": 120
  }
}
```

使用可能なアップストリームキー: `cf`, `google`, `quad9`, `ali`

---

## クライアント設定

**Surge**

```ini
[Proxy]
DOH-Public  = https://doh-fallback-worker.<あなたのアカウント>.workers.dev/dns-query
DOH-Private = https://doh-fallback-worker.<あなたのアカウント>.workers.dev/dns-query/<token>
```

**Clash**

```yaml
dns:
  nameserver:
    - "https://doh-fallback-worker.<あなたのアカウント>.workers.dev/dns-query/ef7e6132-75b6-400e-8fec-0e61f7b44f8e"
```

---

## セキュリティ

- 不明なトークンは常に `403` を返す — デフォルトプロファイルへのフォールバックなし
- トークンとルールは KV にのみ保存され、ソースコードには含まれない
- このリポジトリにはプライベートトークン、キー、ルール一覧を含まない

## 動作リファレンス

| 状況 | レスポンス |
|------|-----------|
| 不明なトークン | 403 |
| 不正な DNS クエリ | 400 |
| プライベートルール一致 | 合成応答（アップストリームへの問い合わせなし） |
| HTTPS / SVCB クエリ | アップストリームにそのまま転送 |
| フレッシュなキャッシュヒット | 200、`x-cache: HIT`、残余 TTL |
| 全アップストリーム失敗 + stale キャッシュあり | 200、`x-cache: STALE` |
| 全アップストリーム失敗 + キャッシュなし | 502 |

## ファイル構成

| ファイル | 説明 |
|---------|------|
| `worker.js` | Cloudflare Worker 実装本体 |
| `wrangler.toml` | Wrangler デプロイ設定 |
| `README.md` | 英語版ドキュメント |
| `README.ja.md` | このファイル |

## 更新履歴

### 2026年4月8日 — 9:29 PM PDT — v4 メジャーアップグレード

汎用 DoH リバースプロキシから、トークン対応のプライベート DoH ゲートウェイへ全面刷新。

**新機能**
- トークンルーティング: `/dns-query/<token>` で Cloudflare KV から独立したプロファイルとルールセットを読み込む
- プライベートルールマッチング: 完全一致・サフィックス一致によりアップストリームを使わずローカルで応答
- ローカル DNS 応答合成: Worker 内部で A / AAAA / CNAME レコードをバイナリ的に正確に生成
- 正規化セマンティックキャッシュキー: DNS transaction ID の変化によるキャッシュ断片化を解消
- 残余 TTL キャッシュ: 正確な `Age` ヘッダーとともに実際の残余 TTL をクライアントへ返却
- Stale-if-error: 全アップストリーム失敗時、設定ウィンドウ内であれば stale キャッシュを返却
- KV によるプロファイル・ルール管理: 再デプロイなしでルールを更新可能
- 再現性のあるデプロイのための `wrangler.toml` を追加

**バグ修正**
- RFC 8484 準拠の GET リクエストにおける base64url パディング欠落の修正（一部 DoH クライアントは `=` を省略して送信する）

**後方互換性**
- `/dns-query`（トークンなし）は既存クライアントに対して v3 と同一の動作を維持

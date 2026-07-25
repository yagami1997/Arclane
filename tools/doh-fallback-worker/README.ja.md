# doh-fallback-worker

Cloudflare Workers 向けのセルフホスト DoH ゲートウェイ参照実装です。

- **パブリックパス** `/dns-query` — デフォルト無効。公開リゾルバを意図する場合のみ明示的に有効化
- **推奨プライベート認証** `Authorization: Bearer <token>` — URL にトークンを含めない方式
- **互換プライベートパス** `/dns-query/<token>` — カスタムヘッダー非対応クライアント向け

Language: [English](./README.md) / 日本語

このリポジトリが公開するのはソースコードと汎用的なデプロイ例だけです。
メンテナーが運用する resolver hostname は公開も推奨もしません。

## 機能一覧

| # | 機能 |
|---|------|
| 1 | トークンルーティング — 各トークンは KV に保存された独立した解決プロファイルに対応 |
| 2 | プライベートルールマッチング — 完全一致・サフィックス一致で、アップストリームを使わずローカルで応答 |
| 3 | ローカル DNS 応答合成 — Worker 内部でバイナリ的に正確な DNS 応答を生成 |
| 4 | 正規化キャッシュキー — セマンティックキーにより、transaction ID の変化によるキャッシュ断片化を解消 |
| 5 | 検証付き hedged request — 不正・エラー DNS 応答を拒否し、必要時だけバックアップを開始 |
| 6 | 残余 TTL キャッシュ — transaction ID を復元し、DNS RR 内の TTL を実際に減算 |
| 7 | ホット項目限定 Prefetch — age 85%、TTL 60 秒以上、直近 2 hit 以上で更新 |
| 8 | 安全なキャッシュ分離 — ECS・未知 EDNS は cache を迂回し、DO/RD/AD/CD/revision をキー化 |
| 9 | Stale-if-error — stale 応答のクライアント TTL は 15 秒に制限 |
| 10 | リクエスト上限 — DNS メッセージを 4 KiB に制限し、不正な name/section を拒否 |
| 11 | isolate 内 singleflight — 同時 MISS と prefetch が 1 回の上流問い合わせを共有 |
| 12 | 軽量プロファイルキャッシュ — 有効な private profile を isolate 内で 120 秒保持 |

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

最初に wire-format のユニットテストを実行します。

```bash
node --test worker.test.mjs
```

### 1. ローカルサーバーを起動する

```bash
cd tools/doh-fallback-worker
wrangler dev
```

デフォルトで `http://localhost:8787` が起動します。
パブリックパスのローカルテスト時のみ
`wrangler dev --var ALLOW_PUBLIC_DOH:true` で起動してください。

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
  '{"name":"local-test","revision":1,"upstreams":["cf","google","quad9"],"hedgeDelays":[0,35,80],"cachePolicy":{"minTtl":0,"maxTtl":86400,"defaultTtl":300,"prefetchRatio":0.85,"staleIfErrorWindow":120}}' \
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

ローカル用テンプレートをコピーし、Git 管理しない設定ファイル側でこの ID に置き換えます。

```bash
cp wrangler.toml.example wrangler.toml
```

```toml
[[kv_namespaces]]
binding = "DOH_KV"
id      = "abc123..."
```

`wrangler.toml` は Git で無視されるため、実際の Cloudflare リソース ID を
リポジトリに入れずに運用できます。

### ステップ 2 — Worker をデプロイする

```bash
wrangler deploy
```

成功すると Worker の URL が表示されます。

```
https://<your-worker-domain>
```

`ALLOW_PUBLIC_DOH=true` を設定しない限り、パブリックパスは無効のままです。
個人用デプロイでは無効のままにしてください。

### ステップ 3 — トークンを生成する

```bash
openssl rand -hex 32
# 64 桁のランダムな 16 進文字列（256 bit）
```

このトークンは非公開で管理してください。プライベートルールへのアクセスキーです。

### ステップ 4 — プロファイルとルールを KV に書き込む

**プロファイルを書き込む:**

```bash
wrangler kv key put --binding DOH_KV \
  "profile:<token>" \
  '{"name":"personal","revision":1,"upstreams":["cf","google","quad9"],"hedgeDelays":[0,35,80],"cachePolicy":{"minTtl":0,"maxTtl":86400,"defaultTtl":300,"prefetchRatio":0.85,"staleIfErrorWindow":120}}'
```

**`rules.json` を用意し**（フォーマットは後述）、KV に反映します。

```bash
wrangler kv key put --binding DOH_KV \
  "rules:<token>" \
  --path rules.json
```

### ステップ 5 — 動作確認

```bash
# 推奨: Bearer ヘッダー
curl -sv -H "Authorization: Bearer <token>" \
  "https://<your-worker-domain>/dns-query?dns=..."

# カスタムヘッダー非対応クライアント向け互換パス
curl -sv "https://<your-worker-domain>/dns-query/<token>?dns=..."
```

1 回目: `x-cache: MISS`、2 回目の同一クエリ: `x-cache: HIT` であれば正常です。

---

## プライベートルールの管理

ルールは KV に保存され、Worker の再デプロイは不要です。KV エッジキャッシュ
（最大 300 秒）が切れた後に反映され、通常 DNS キャッシュより先に評価されます。

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
  "revision": 1,
  "upstreams": ["cf", "google", "quad9"],
  "hedgeDelays": [0, 35, 80],
  "cachePolicy": {
    "minTtl": 0,
    "maxTtl": 86400,
    "defaultTtl": 300,
    "prefetchRatio": 0.85,
    "staleIfErrorWindow": 120
  }
}
```

使用可能なアップストリームキー: `cf`, `google`, `quad9`

`hedgeDelays` は `upstreams` に対応する絶対開始遅延です。デフォルトでは
Cloudflare を即時、Google を 35 ms、Quad9 を 80 ms で開始します。公開
プロファイルは Cloudflare のみを使用します。

Prefetch は isolate 内の best-effort 処理で、TTL 60 秒以上かつ 5 分以内に
2 回以上ヒットした項目だけが対象です。foreground MISS と同じ singleflight
を共有します。有効な KV profile は最大 120 秒、有界メモリキャッシュに保持し、
不明な token は保持しません。

アップストリームやプロファイルの意味を変更し、旧キャッシュを再利用したくない
場合は `revision` を増やしてください。`minTtl` のデフォルトは `0` で、権威 TTL
を不当に引き上げません。NXDOMAIN/NODATA は RFC 2308 に従って SOA から TTL を
計算します。Authority SOA がない negative response は cache せず、
CNAME chain が NODATA で終了する場合も SOA 由来の negative TTL を使用します。

### トークンのローテーションとログ

新しいランダムトークンとプロファイルを作成し、クライアントを切り替えてから旧
トークンの 2 つの KV キーを削除します。Worker 自身はトークンをログ出力しません。
ただし URL パス形式は Cloudflare のリクエストログ、履歴、スクリーンショット等に
残る可能性があるため、対応クライアントでは Bearer ヘッダーを使用してください。

### 公開エンドポイントとレート制限

`ALLOW_PUBLIC_DOH=true` を意図的に設定する場合は、Cloudflare Rate Limiting/WAF を
デプロイ側で設定してください。isolate 内メモリカウンターは分散レート制限として
信頼できません。

---

## クライアント設定

**Surge**

```ini
[Proxy]
# ALLOW_PUBLIC_DOH=true の場合のみ:
DOH-Public  = https://<your-worker-domain>/dns-query
DOH-Private = https://<your-worker-domain>/dns-query/<token>
```

**Clash**

```yaml
dns:
  nameserver:
    - "https://<your-worker-domain>/dns-query/<token>"
```

---

## セキュリティ

- パブリック DoH はデフォルト無効。正しい DNS request で不明な token は `403`
- トークンとルールは KV にのみ保存され、ソースコードには含まれない
- このリポジトリにはプライベートトークン、キー、ルール一覧を含まない
- ドキュメントと例では必ず placeholder を使用する。実際の resolver hostname、
  Workers.dev account subdomain、custom route、token、KV namespace ID、account ID
  を commit しない

## 運用上の境界

- 公開アクセスは `ALLOW_PUBLIC_DOH=true` による明示的なデプロイ選択であり、
  ソースのデフォルトは fail-closed。
- 組み込み public profile は単一 upstream を使用し、private profile では
  configurable hedged upstream を利用可能。
- Singleflight、hot-entry tracking、profile memory cache は isolate 内の
  best-effort 機能であり、グローバルには協調しない。
- Abuse control と分散 rate limiting は Cloudflare のデプロイ層で設定する。
- KV 更新は設定した KV cache TTL に従って edge へ反映される。

## 動作リファレンス

| 状況 | レスポンス |
|------|-----------|
| 正しい DNS request + 不明な token | 403 |
| 不正な DNS クエリ | 400 |
| プライベートルール一致 | 合成応答（アップストリームへの問い合わせなし） |
| HTTPS / SVCB クエリ | アップストリームにそのまま転送 |
| フレッシュなキャッシュヒット | 200、`x-cache: HIT`、現在の ID と減算済み RR TTL |
| 全アップストリーム失敗 + stale キャッシュあり | 200、`x-cache: STALE`、RR TTL 最大 15 秒 |
| 全アップストリーム失敗 + キャッシュなし | 502 |

## ファイル構成

| ファイル | 説明 |
|---------|------|
| `worker.js` | Cloudflare Worker 実装本体 |
| `worker.test.mjs` | 依存パッケージ不要の wire-format・request-flow テスト |
| `wrangler.toml.example` | Wrangler デプロイ用テンプレート |
| `README.md` | 英語版ドキュメント |
| `README.ja.md` | このファイル |

## 開発履歴

### 2026年7月25日 — キャッシュ整合性・防御・リクエスト調度

**DNS・キャッシュ整合性**

- キャッシュ応答で現在の transaction ID と Question byte を復元。
- Answer / Authority / Additional の通常 RR TTL を cache age 分減算し、
  OPT metadata は TTL として変更しない。
- stale 応答の通常 RR TTL を最大 15 秒に制限。
- NXDOMAIN と NODATA は Authority SOA から RFC 2308 TTL を計算。SOA がない
  negative response は cache しない。
- cache key は `v3`。各 component を独立 encode し、profile revision、
  DO、RD、AD、CD を含む。ECS と未表現 EDNS は cache を迂回。

**検証・調度**

- DNS message、Question、ID、QR、RCODE、Content-Type、OPT を検証してから
  upstream 応答を採用。
- private profile は絶対 hedge delay を設定可能。デフォルトは
  `[0, 35, 80]` ms。
- 同時 MISS と prefetch は isolate 内 singleflight を共有し、各 client の
  DNS identity は個別に復元。
- Prefetch は TTL 60 秒以上、cache age 85%、5 分以内 2 hit 以上が条件。

**セキュリティ・運用変更**

- Public DoH はデフォルト無効。明示的に有効化した場合も Cloudflare 単独。
- POST body は 4 KiB、request URL は 8 KiB に制限。
- Bearer 認証を推奨し、token path は client 互換性のため維持。同じ制限
  charset を適用。
- 有効な private profile は isolate 内で 120 秒、最大 64 件保持。不明 token
  は保持しない。

**ドキュメントと公開時のプライバシー**

- 実装 invariant、運用上の制限、検証手順を保守対象の README に統合。
- 採用した監査指摘を実装とテストへ反映したため、一時的な監査引き継ぎ文書を削除。
- デプロイ先の例を `<your-worker-domain>` placeholder に統一。
- メンテナーが運用する domain、account subdomain、route、resource ID、token
  その他の private deployment 情報を公開文書へ記載しない方針を明文化。

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
- ローカル配備用テンプレートとして `wrangler.toml.example` を追加

**バグ修正**
- RFC 8484 準拠の GET リクエストにおける base64url パディング欠落の修正（一部 DoH クライアントは `=` を省略して送信する）

**過去の互換性に関する注記**

- v4 公開当初は token なし `/dns-query` の従来動作を維持していました。
  2026年7月25日の hardening で意図的に変更され、現在は
  `ALLOW_PUBLIC_DOH=true` の場合だけ公開されます。

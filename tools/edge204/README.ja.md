# edge204 — CF エッジ 204 プローブ

バージョン作成日時: 2026年4月7日 15:10 JST
バージョン更新日時: 2026年8月18日 JST

Language:

- [English](./README.md)
- 日本語

## 概要

このディレクトリには、Cloudflare エッジから直接純粋な HTTP 204 レスポンスを返す Cloudflare Worker が含まれています。上流へのリクエストは一切発生せず、TLS オーバーヘッドもありません。

主な用途は Surge および Clash/mihomo におけるプロキシノードの遅延測定です。`url-test` または `fallback` グループのヘルスチェック先として設定すると、上流サーバーの遅延を含まない、プロキシノードから最寄りの Cloudflare PoP までの RTT をクライアントに提供します。

この数値でノードを順位付けする前に、[このプローブで分からないこと](#このプローブで分からないこと)を必ず読んでください。測定手法には実際の死角があります。

## Worker の機能

[`worker.js`](./worker.js) は 5 つのケースを処理します。

| パス | メソッド | ステータス | 用途 |
|---|---|---|---|
| `/generate_204` | GET / HEAD | 204 | メインプローブエンドポイント |
| `/204` | GET / HEAD | 204 | メインプローブの別名 |
| `/ping` | GET / HEAD | 200 JSON | 死活確認、デプロイ済みバージョンを返す |
| `/trace` | GET / HEAD | 200 テキスト | CF PoP 診断情報（クライアント IP は `TRACE_KEY` が必要） |
| その他のパス | GET / HEAD | 404 | |
| 任意のパス | POST など | 405 | |

末尾のスラッシュは正規化されるため、`/generate_204/` は `/generate_204` と同じ挙動になります。

すべてのレスポンスに `Cache-Control: no-store` を付与しています。これは省略できません。RFC 9110 は `204` をヒューリスティックにキャッシュ可能なステータスコードとして挙げているため、このヘッダーがないと中間キャッシュが古い 204 を返すことが許容され、遅延測定値がゼロに潰れてしまいます。

## 設計方針

Worker は意図的に最小構成にしています。

- `fetch()` 呼び出しなし。すべてのレスポンスはエッジで直接生成します。上流リクエスト、オリジンサーバー、エッジを超えるラウンドトリップは一切ありません。
- ステートフルなバインディングなし。KV、D1、R2、Durable Objects は使用しません。オプションの `TRACE_KEY` は isolate 起動時に解決される単なる環境変数の文字列であり、I/O コストはなく、Worker をステートフルにもしません。
- プローブ用パスにアクセス制御なし。レート制限は Worker コードではなく、ゾーンの WAF レイヤーで処理します。
- CORS ヘッダーなし。Surge も Clash もブラウザではありません。
- 単一の `fetch` ハンドラーをエクスポートする ES Module 構文を使用します。

`/generate_204` はホットパスであり、その状態を維持しなければなりません。メソッド判定、パス照合、レスポンス返却のみ。ネットワーク、ストレージ、リクエストボディに触れる処理を追加してはいけません。

## なぜ HTTPS ではなく HTTP を使うのか

「TLS 握手が測定値を汚染し、ノードの順位付けを誤らせる」という主張が一般的ですが、この主張は聞こえほど強くありません。本当の理由を正確に述べておきます。

コネクションがコールドな状態では、TLS 1.3 は TCP 握手に加えておよそ 1 往復分を追加します。これは同じ RTT のほぼ比例的なスケーリングであり、健全な回線ではすべてのノードの数値を同程度の係数で押し上げるだけで、**それ自体が順位を入れ替えることはありません**。

プレーン HTTP を選ぶ実際の理由は次の 2 点です。

- **変数が少ない。** セッション再開や 0-RTT はノードごとに利用可否が異なるため、TLS のコストは比較対象全体に一様に適用されません。
- **測定時間が短い。** 飛行時間が短いほど、1 サンプル内で一時的なジッターに晒される時間も短くなります。

逆方向の正直な注意点もあります。

- パケットロスの多い回線や MTU に制約のある回線では、追加の握手が**非線形に**増幅されます。これは実際に TLS で使うことになる回線についての本物のシグナルであり、HTTP プローブはそれを隠してしまいます。ここで良好に見えるノードが実運用では劣ることがあります。

多くの解説記事が引用する「50〜150ms」という数字を鵜呑みにしないでください。同じカスタムドメインはコード変更なしで HTTPS も提供するため、自分で差分を測定できます。

```bash
# ノード経由、プレーン HTTP
for i in 1 2 3 4 5; do
  curl -o /dev/null -s -w "%{time_total}\n" \
    -x http://<NodeHost>:<Port> http://probe.example.com/generate_204
done

# 同じノード、同じパス、TLS あり
for i in 1 2 3 4 5; do
  curl -o /dev/null -s -w "%{time_total}\n" \
    -x http://<NodeHost>:<Port> https://probe.example.com/generate_204
done
```

両者が同じ順位を示すなら、HTTP プローブが買っているのは正確さではなく安定性です。両者が食い違うなら、実際のトラフィックを説明しているのは HTTPS 側の数値です。

内部で `http://` リクエストを HTTPS にアップグレードするノードは、遅延数値が膨らんで表示されます。`/trace` を使って実際に何が Worker に到達したかを確認してください。

## このプローブで分からないこと

以下は手法上の限界であり、Worker のバグではありません。

**1. Anycast によるバイアス。** このプローブが測定するのは `クライアント → プロキシノード → Cloudflare Anycast エッジ` という特定の経路であり、ノードの総合的なインターネット品質ではありません。この経路のうち二箇所は中立ではありません。遠端では、Cloudflare とのピアリングが良好な事業者や、出口が Cloudflare に隣接したネットワークにある事業者が、一般的なルーティング品質以上に good なスコアを出します。つまりこの数値でノードを順位付けすることは、Cloudflare への近さで順位付けすることと同義です。近端では、クライアントからノードまでの区間がすべての測定値に含まれるため、同じノードでもクライアント側の回線事業者が変われば同じ数値にはなりません。判定ではなく、ひとつのシグナルとして扱ってください。

**2. 比較が成立するのは、往復回数が同じエンドポイント同士だけです。** これはノードの劣化とまったく同じ見え方をするため、最も誤解を招きやすい失敗モードです。

プローブの測定値はおおよそ `往復回数 × 最も弱い区間の RTT` です。TLS ハンドシェイク、キャッシュされていない DNS 解決、リダイレクト——往復を一つ増やすものは、良好な回線ではほぼ無視できる一方、劣悪な回線では非常に高くつき、パケットロスがあると非線形に増幅されます。したがって、TTL の短い自前ホスト名を `www.gstatic.com` のように広くキャッシュされたエンドポイントと比較すると、両方の宛先がまったく健全であっても、クライアント側の回線が悪いだけで 100 ms 遅く見えることがあります。

一方のエンドポイントの経路が劣化していると結論づける前に、二つのプローブが本当に比較可能かを確認してください。

- **プロトコルを揃える。** 両方プレーン HTTP か、両方 HTTPS か。`http://` の URL が HTTPS にアップグレードされていないことを `curl -sv` で確認してください（[ステップ 3](#ステップ-3-ゾーンの-ssltls-設定を確認)）。
- **解決コストを揃える。** TTL の短いホスト名は測定間隔ごとに再解決されますが、TTL の長いものはされません。その差はそのまま測定値に乗ります。
- **スループットと突き合わせる。** RTT に依存する測定値と帯域は独立しています。204 が遅いのにダウンロード速度が正常なら、原因はノードではなく往復回数です。

**3. ポート 80 はクリーンな経路ではない。** プレーン HTTP は、一部の上流において透過プロキシによる傍受や注入の対象になります。さらに重要な点として、多くのプロキシ設定は `:80` と `:443` を異なる出口経路に振り分けます。その場合、測定した経路と実際に使う経路は別物です。前者は `/trace` の `colo` で判明しますが、後者を検出する唯一の方法は上記の HTTPS との比較です。

**4. 単一障害点。** このホスト名を向いているグループはすべて同時に落ちます。ゾーン、カスタムドメイン、あるいは自作の WAF ルールに問題が起きると、クライアントは**すべての**ノードをタイムアウト扱いにし、精度ではなく接続性そのものを失います。グローバルなフォールバックは、自分が運用しておらず、かつ**障害ドメインが異なる**エンドポイントに向けておいてください。

```ini
[General]
proxy-test-url = http://www.gstatic.com/generate_204
```

ここで `cp.cloudflare.com` を選びたくなりますが、それは誤りです。運用主体こそ自分の Worker とは別ですが、同じ AS13335、同じ Anycast ファブリック、同じエッジインフラの上にあります。これは障害ドメインの分離になっていません。Google のエンドポイントはセーフティネットを別の ASN・別の運用主体に置きます。それこそがセーフティネットを持つ理由そのものです。

代替エンドポイントには二つの条件があります。

- **プレーン HTTP のままにする**（プローブと揃える）。ハンドシェイクコストの異なるフォールバックは、それが支えている測定値と比較可能ではありません（上記の限界 2 を参照）。
- **ノードプールに中国本土の出口や汚染された DNS が含まれる場合**、`www.gstatic.com` は到達不能となり、健全なノードを死亡扱いにする可能性があります。その場合は `http://captive.apple.com` を使ってください。Apple、AS714 であり、ASN をまたぐ分離としては同様に有効です。

制御された測定値が欲しいグループにこのプローブを使い、サードパーティの URL をセーフティネットとして残します。

## 前提条件

- [Node.js](https://nodejs.org) 18 以降
- [Cloudflare アカウント](https://dash.cloudflare.com/sign-up)（無料プランで十分）

Wrangler をグローバルにインストールします。

```bash
npm install -g wrangler
```

Cloudflare にログインします。

```bash
wrangler login
```

いずれも Step 1 の CLI デプロイ手順でのみ必要です。何もインストールしたくない場合は、同じ Step 1 のダッシュボード手順を使えばどちらも不要です。

## ローカル検証

デプロイ前にテストスイートを実行します。

```bash
cd tools/edge204
node --test worker.test.mjs
```

ルーティング、末尾スラッシュの正規化、メソッドガード、レスポンスヘッダー、`TRACE_KEY` の 4 状態すべてを検証します。ネットワークアクセスも Cloudflare アカウントも不要です。

手動で Worker を動かす場合：

```bash
wrangler dev --var TRACE_KEY:devkey
```

`wrangler dev` では `request.cf` が空になるため、ローカルの `/trace` は Cloudflare 由来のフィールドをすべて `unknown` として返します。これは想定どおりの挙動であり、[動作確認](#動作確認)のキャッシュ検証をデプロイ済みの Worker に対してしか実施できない理由でもあります。

## デプロイ手順

### Step 1: Worker をデプロイする

ローカル用テンプレートをコピーします。`wrangler.toml` は Git の追跡対象外なので、そこに加えた変更はリポジトリに入りません。

```bash
cd tools/edge204
cp wrangler.toml.example wrangler.toml
wrangler deploy
```

この Worker は KV、D1、R2、Durable Objects のいずれのリソースも宣言しないため、コピーしたテンプレートは通常そのままで動きます。`routes` を意図的に宣言していない点については Step 2 を参照してください。

<details>
<summary>ダッシュボードを使う代替手順（Node.js 不要）</summary>

1. Cloudflare ダッシュボードにサインインします。
2. **Workers & Pages** を開きます。
3. **Create Worker** をクリックします。
4. 名前を `edge204` にします。
5. デフォルトのスクリプトを [`worker.js`](./worker.js) の内容に置き換えます。
6. **Deploy** をクリックします。

トレードオフ：ダッシュボードは作成時点の `compatibility_date` を暗黙的に固定しますが、その値はこのリポジトリのどこにも現れません。つまりデプロイされた成果物が、読めるソースだけでは完全に記述されなくなります。長期的に保守するつもりなら CLI 手順を推奨します。

</details>

### Step 2: カスタムドメインをバインドする

1. デプロイ済みの `edge204` Worker を開きます。
2. **Settings → Domains & Routes → Add Custom Domain** に進みます。
3. `probe.example.com` を入力します。
4. Cloudflare がゾーンに CNAME レコードを自動作成します。
5. ドメインのステータスが **Active** になるまで待ちます（通常 1 分以内）。

この作業はダッシュボードで一度だけ行います。`wrangler.toml.example` は意図的に `routes` を宣言していないため、以降の `wrangler deploy` はスクリプトのみを更新し、ゾーンの DNS レコードには一切触れません。

### Step 3: ゾーンの SSL/TLS 設定を確認する

対象ゾーンの **SSL/TLS** で以下を確認します。

| 設定項目 | 必要な状態 |
|---|---|
| 常に HTTPS を使用 | オフ |
| 日和見的暗号化 | オフ |
| HSTS | 無効 |

これらの設定により、HTTP リクエストが Worker に到達する前に HTTPS にアップグレードされるのを防ぎます。

### Step 4: WAF レート制限ルールを追加する

対象ゾーンの **Security → WAF → Rate Limiting Rules** でルールを 1 つ作成します。

| 項目 | 値 |
|---|---|
| 条件 | ホスト名が `probe.example.com` と一致 |
| しきい値 | IP ごとに 10 秒あたり 60 リクエスト |
| アクション | ブロック（429 を返す） |

しきい値は間隔ではなく**ピーク**に合わせて設定してください。300 秒間隔は些細な負荷ですが、GUI クライアントはユーザーが「一括テスト」を実行するたびに全ノードを同時にスイープします。制限に到達するのはそのバーストです。

### Step 5（任意）: `TRACE_KEY` を設定する

値をローカルで生成します。

```bash
openssl rand -hex 8
```

平文の変数としてではなく、また `wrangler.toml` に書くのでもなく、暗号化された Secret として保存します。

```bash
wrangler secret put TRACE_KEY
```

Secret はデプロイをまたいで保持されるため、設定は一度だけで済みます。ダッシュボードで行う場合は **Settings → Variables and Secrets → Add** で、平文の変数ではなく **Secret** を選択してください。

挙動：

| `TRACE_KEY` の状態 | `/trace` の出力 |
|---|---|
| 未設定 | `colo`、`country`、`city`、`asn`、`ray`、`ts` — クライアント IP なし |
| 設定済み、`?k=` が無いか誤り | 同上 — クライアント IP なし、エラーも返さない |
| 設定済み、`?k=` が正しい | 上記に加えて `ip=` |

誤ったキーはエラーを返さず静かに機能低下するため、キーが存在すること自体をスキャナーに悟らせません。

**これは認証ではありません。** 経路全体がプレーンな HTTP であるため、キーはトラフィックを観測できる者には見えています。これが守るのはリクエストクォータと自分の出口 IP であり、ホスト名を見つけた日和見的なスキャナーが対象です。セキュリティ境界として扱わないでください。

## 動作確認

カスタムドメインが有効になったら以下を確認します。

```bash
# メインプローブ：204 が返り、301 リダイレクトがないこと
curl -si http://probe.example.com/generate_204 | head -3

# Cache-Control ヘッダーが存在すること
curl -si http://probe.example.com/generate_204 | grep -i cache-control

# 中間キャッシュがないこと：cf-ray が毎回変化し、Age ヘッダーが無いこと
curl -sI http://probe.example.com/generate_204 | grep -iE 'cf-ray|^age:'
curl -sI http://probe.example.com/generate_204 | grep -iE 'cf-ray|^age:'

# デプロイ済みバージョン
curl -s http://probe.example.com/ping

# 末尾スラッシュとメソッドガード
curl -so /dev/null -w '%{http_code}\n' http://probe.example.com/generate_204/
curl -so /dev/null -w '%{http_code}\n' -X POST http://probe.example.com/generate_204

# PoP 診断
curl -s http://probe.example.com/trace
curl -s 'http://probe.example.com/trace?k=<TRACE_KEY>'
```

期待される結果：`204`、`204`、`405`、そして毎回変化する `cf-ray` と `Age` ヘッダーの不在。

> 本ドキュメントの旧版では、2 回の `/ping` 呼び出しで `ts` を比較することをキャッシュ無しの証明として提案していました。このテストは不健全です。Workers のクロックは I/O が無い限り進まないため、タイムスタンプが同一でも何も証明しません。`cf-ray` と `Age` の不在を使ってください。

有効なキーを付けてプロキシノード経由で `/trace` を呼び出したときの期待される出力：

```
colo=NRT
country=JP
city=Tokyo
asn=2516
ray=8a1b2c3d4e5f6a7b-NRT
ip=<プロキシ出口 IP>
ts=<ミリ秒タイムスタンプ>
```

有効なキーが無い場合は `ip` の行が無くなるだけで、他はすべて同一です。

`asn` は **Cloudflare から見たリクエストの発信元 ASN**、つまりプロキシノードの出口ネットワークです（上の例の `2516` は KDDI）。Cloudflare 自身の ASN ではありません。ここに `asn=13335` が出る場合、リクエストはノードから直接ではなく Cloudflare 網内の何かを経由して Worker に到達しており、その測定値は意図した経路を表していません。

`colo` がそのプロキシノードに期待した都市でない場合、ノードの出口が別の CF PoP を経由してルーティングされています。その場合の高遅延はルーティングの問題であり、ノード自体の障害ではありません。

## Surge 設定

### url-test ポリシーグループ

```ini
[Proxy Group]
Auto = url-test, Node-US-1, Node-US-2, Node-JP-1, Node-HK-1, \
  url=http://probe.example.com/generate_204, \
  interval=300, \
  tolerance=50
```

### fallback ポリシーグループ

```ini
[Proxy Group]
Fallback = fallback, Node-US-1, Node-US-2, Node-JP-1, \
  url=http://probe.example.com/generate_204, \
  interval=300
```

| パラメータ | 値 | 説明 |
|---|---|---|
| `url` | `http://probe.example.com/generate_204` | HTTP、TLS オーバーヘッドなし |
| `interval` | `300` | 300 秒ごとに再測定 |
| `tolerance` | `50` | 50ms 以内の差ではノードを切り替えない |

## Clash / mihomo 設定

### グループ単位のヘルスチェック

```yaml
proxy-groups:
  - name: Auto
    type: url-test
    url: http://probe.example.com/generate_204
    interval: 300
    tolerance: 50
    expected-status: 204
    proxies:
      - Node-US-1
      - Node-JP-1
```

### プロバイダ単位のヘルスチェック

```yaml
proxy-providers:
  Airport:
    type: http
    url: "https://example.com/subscribe"
    path: ./providers/airport.yaml
    interval: 3600
    health-check:
      enable: true
      url: http://probe.example.com/generate_204
      interval: 600
      expected-status: 204
```

知っておくべき点が 4 つあります。

- **`expected-status: 204` は明示的に書く。** デフォルトの受理挙動が自分の想定どおりだと期待せず、契約を明記してください。
- **同じノードに対してグループ単位とプロバイダ単位のヘルスチェックを両方設定しない。** 両者は独立に動作するため、得られる情報は増えないままリクエスト量だけが倍になります。どちらか一方の層を選んでください。
- **`unified-delay: true` は握手を 2 回行い 1 回目を破棄します。** これは握手コストを正規化するための機能です。有効にする場合、プレーン HTTP を使う理由の多くはすでにクライアント側で処理されており、HTTPS プローブのほうが誠実な選択になります。
- **GUI クライアント（Clash Verge など）は手動テストで全ノードを同時にスイープします。** WAF のしきい値が耐えるべきなのは `interval` ではなくこのピークです。

## 予期しない高遅延ノードの調査

```bash
# 問題のあるプロキシノード経由でリクエストをルーティングする
curl -x http://<NodeHost>:<Port> 'http://probe.example.com/trace?k=<TRACE_KEY>'
```

`colo` がノードの所在地から遠い PoP を示している場合、遅延はルーティングの問題です。`colo` が正しい場合、問題はそのノードと近隣の CF PoP 間のリンクにあります。

`colo` が正しいのに遅延が高いままなら、[なぜ HTTPS ではなく HTTP を使うのか](#なぜ-https-ではなく-http-を使うのか)の HTTP 対 HTTPS 比較を実行してください。差が大きい場合は、遅い回線ではなくパケットロスの多い回線を示唆します。

同じノード経由でサードパーティの 204 は正常なのに**このプローブに対してだけ**遅い場合、ノードを疑うのをやめ、まず往復回数が揃っているかを確認してください。

```bash
# http:// の URL がアップグレードされていないか。TLS や 301 の行が出れば、それが答え。
curl -sv -o /dev/null http://probe.example.com/generate_204 2>&1 \
  | grep -iE 'ALPN|TLS|HTTP/|301|Location'

# 同じノード、同じプロトコルで両エンドポイントを比較し、時間の内訳を見る
for u in http://probe.example.com/generate_204 http://www.gstatic.com/generate_204; do
  echo "== $u"
  for i in 1 2 3 4 5; do
    curl -x http://<NodeHost>:<Port> -o /dev/null -s \
      -w 'conn=%{time_connect} tls=%{time_appconnect} total=%{time_total}\n' "$u"
  done
done
```

プレーン `http://` の URL で `tls` が 0 でない場合、ゾーンまたはノードがリクエストをアップグレードしており、このプローブが払わないよう設計された往復が一つ増えています。両エンドポイントがここでは横並びなのにクライアント側では差が出る場合、その余分な往復は DNS に費やされています——[このプローブで分からないこと](#このプローブで分からないこと)の限界 2 を参照してください。

## ファイル構成

- [`worker.js`](./worker.js): Cloudflare Worker 実装
- [`worker.test.mjs`](./worker.test.mjs): テストスイート。`node --test worker.test.mjs` で実行
- [`wrangler.toml.example`](./wrangler.toml.example): デプロイ用テンプレート。`wrangler.toml` にコピーして使用（Git 追跡対象外）
- [`README.md`](./README.md): 本ドキュメントの英語版
- [`dev-plan.md`](./dev-plan.md): 開発計画とアーキテクチャノート

# Arclane — Routing Configuration Architecture Reference

> **Purpose**: This document defines the policy group architecture, classification logic, naming conventions, and directory structure for the `neorulset26` configuration mainline. It is a research and maintenance reference, not a deployment manual.
> Do **not** modify the policy group names or ordering without updating this document first.

---

## Architectural Overview

This document describes the routing policy architecture studied and maintained in this repository. The design consolidates a complex policy surface into a structured, maintainable set of 23 routing groups, organized by traffic characteristic rather than by individual service name.

The design goals are:

- **Fewer groups, clearer purpose** — reduced from 29 to 23 policy groups
- **Traffic-characteristic-based assignment** — each group is assigned a routing path based on its specific traffic requirement (latency / regional availability / stability / direct)
- **Regional streaming separation** — streaming groups are split by regional availability requirement, not by individual service name
- **Platform-level granularity** — major internet platforms (Google, Microsoft, Apple, ByteDance, etc.) remain as independent groups
- **Consolidation where appropriate** — miHoYo traffic is merged into Domestic; IM apps are consolidated into a single Messenger group
- **Separation of concerns** — configuration artifacts, modules, and documentation are maintained in clearly separated directory trees

---

## Policy Group Architecture

### Ordering Principle

Groups are ordered in the following logical sequence:

```
Fallback / Infrastructure
→ AI Services
→ Big Tech (Google / Microsoft / Apple / Scholar)
→ Finance
→ Crypto
→ YouTube (standalone, latency-sensitive)
→ Streaming (by regional availability requirement)
→ Messaging & Social
→ Custom / Branded Lists
→ Utilities
```

---

## Policy Group Reference (23 Groups)

### Section 1 — Fallback & Infrastructure

| # | Group Name | Rule Files | Routing Characteristic | Notes |
|---|------------|------------|------------------------|-------|
| 1 | **Proxy** | ruleset/Proxy.list | Balanced — stable, adequate throughput | Default outbound path. Used by unmatched traffic. |
| 2 | **Domestic** | ruleset/Domestic.list, ruleset/Domestic IPs.list, ruleset/Special.list, ruleset/miHoYo.list | Direct | All mainland China traffic. miHoYo rules are merged here (Genshin, Honkai, ZZZ — CN server users route direct). |
| 3 | **Others** | — | Balanced | Catch-all for unclassified traffic. Can share the Proxy path or be assigned a separate route. |

---

### Section 2 — AI Services

| # | Group Name | Rule Files | Routing Characteristic | Notes |
|---|------------|------------|------------------------|-------|
| 4 | **AI Suite** | openai.list | Low latency + stable | Covers OpenAI (ChatGPT, API), Claude, Midjourney, Perplexity, Grok, and other non-Google AI services. Apple Intelligence + ChatGPT integration is maintained in ai.list with a validated minimal domain pair. |

---

### Section 3 — Big Tech Platforms

| # | Group Name | Rule Files | Routing Characteristic | Notes |
|---|------------|------------|------------------------|-------|
| 5 | **Google** | google.list, ruleset/Google FCM.list | Low latency | Covers Google Search, Gmail, Drive, Docs, Maps, Play, Photos, Calendar, Translate, Firebase, Gemini, Google AI Studio, and all google.* TLDs. FCM is included. YouTube is handled separately. Keep Gemini with Google by default to avoid cross-region session mismatch. |
| 6 | **Microsoft** | ruleset/Microsoft.list | Low latency | Covers Office 365, Azure, Bing, OneDrive, Xbox, Teams, GitHub (if not in Common). |
| 7 | **Apple** | ruleset/Apple.list, ruleset/Special.list (Apple CDN portion) | Direct | Apple APIs, iCloud, App Store, TestFlight, Maps. Direct is preferred for optimal CDN performance. |
| 8 | **Scholar** | scholar.list | Stable | Academic databases, research journals, GitHub, jsDelivr, ProtonMail, Zoho, and academic institutions. Placed directly after Apple in the group order. |

---

### Section 4 — Finance

| # | Group Name | Rule Files | Routing Characteristic | Notes |
|---|------------|------------|------------------------|-------|
| 9 | **PayPal** | paypal.list | Low-risk IP path — residential or ISP | Covers PayPal, Venmo, Cashapp, Zelle, Stripe, major US banks, and brokerage accounts. Financial services typically require consistent, low-risk IP path characteristics to maintain normal account functionality. Datacenter or shared IP paths are generally unsuitable for this category. |

---

### Section 5 — Crypto

| # | Group Name | Rule Files | Routing Characteristic | Notes |
|---|------------|------------|------------------------|-------|
| 10 | **Crypto** | crypto.list | Low-risk IP preferred, or balanced | Covers exchanges, DeFi protocols, wallets (MetaMask, TokenPocket), NFT platforms, and blockchain infrastructure. Financial interactions (login, KYC) may require consistent, low-risk IP path characteristics. General browsing can use the standard balanced path. |

---

### Section 6 — YouTube (Standalone)

| # | Group Name | Rule Files | Routing Characteristic | Notes |
|---|------------|------------|------------------------|-------|
| 11 | **YouTube** | ruleset/Media/YouTube.list, ruleset/Media/YouTube Music.list | Low latency | YouTube and YouTube Music. Separated from the streaming pool because it is latency-sensitive rather than regionally restricted in the same way as other streaming services. |

---

### Section 7 — Streaming (by Regional Availability Requirement)

Streaming services are grouped by their **regional availability requirement**, not by individual service name. This allows each regional group to be configured with the most appropriate routing path for that geography.

| # | Group Name | Rule Files (assigned to this group) | Routing Characteristic | Notes |
|---|------------|--------------------------------------|------------------------|-------|
| 12 | **Streaming-US** | ruleset/Media/Disney Plus.list, ruleset/Media/Max.list, ruleset/Media/Hulu.list, ruleset/Media/Spotify.list, ruleset/Media/Discovery Plus.list, ruleset/Media/Amazon.list, ruleset/Media/Fox Now.list, ruleset/Media/Fox+.list, ruleset/Media/ABC.list, ruleset/Media/PBS.list, ruleset/Media/Pandora.list, ruleset/Media/Soundcloud.list, ruleset/Media/DAZN.list (US region), Streaming-US.list (supplemental) | US-region compatible path | US-region streaming: Disney+, Max (HBO), Hulu, Spotify, Discovery+, Amazon Prime, Peacock, Paramount+, DAZN US, etc. |
| 13 | **Streaming-JP** | ruleset/Media/Netflix.list, ruleset/Media/Apple TV.list, ruleset/Media/Abema TV.list, ruleset/Media/DMM.list, ruleset/Media/Niconico.list, ruleset/Media/Hulu Japan.list, ruleset/Media/Japonx.list, ruleset/Media/F1 TV.list, Streaming-JP.list (supplemental) | JP-region compatible path, stable IP characteristics preferred | Japan-region streaming: Netflix (JP catalog), Abema, DMM, Niconico, Hulu Japan, U-NEXT, FOD, TVer, etc. Stable IP characteristics are preferred for regional availability. |
| 14 | **Streaming-TW** | ruleset/Media/KKTV.list, ruleset/Media/KKBOX.list, ruleset/Media/Line TV.list, ruleset/Media/Bahamut.list, ruleset/Media/MOO.list, Streaming-TW.list (supplemental) | TW-region compatible path | Taiwan-region streaming: KKTV, KKBOX, Line TV, Bahamut, MOO, 4GTV, LiTV, etc. |
| 15 | **Streaming-HK** | ruleset/Media/ViuTV.list, ruleset/Media/myTV SUPER.list, ruleset/Media/encoreTVB.list, ruleset/Media/WeTV.list | HK-region compatible path | Hong Kong streaming: ViuTV, myTV SUPER, TVB, WeTV HK. |
| 16 | **CN Mainland TV** | ruleset/Media/Bilibili.list, ruleset/Media/IQIYI.list, ruleset/Media/Youku.list, ruleset/Media/Tencent Video.list, ruleset/Media/Letv.list, ruleset/Media/IQ.list, ruleset/Media/Netease Music.list, Streaming-CN.list (supplemental) | Direct or Domestic | Mainland China streaming platforms: Bilibili, iQIYI, Youku, Tencent Video, Mango TV, Sohu Video, etc. Direct routing yields best CDN performance. |

> **Note on Global TV**: If you maintain a "Global TV" category for streaming services not covered by the regional groups above, assign it to **Streaming-US** as a default, or create a separate **Streaming-Global** group configured for the relevant region.

---

### Section 8 — Messaging & Social

| # | Group Name | Rule Files | Routing Characteristic | Notes |
|---|------------|------------|------------------------|-------|
| 17 | **Messenger** | messenger.list | Stable | Consolidated IM group. Covers: Discord, Telegram, WhatsApp, Signal, Line, Slack, Element/Matrix, Viber, Zalo, Keybase, Mattermost, Session, Threema, Wire, Rocket.Chat. These services do not require specific regional availability — a stable routing path is sufficient. |
| 18 | **Social** | socialsite.list | Stable | Domestic and international social platforms: Weibo, Zhihu, Douban, Xiaohongshu, Tieba, Reddit, Truth Social, etc. |
| 19 | **Bytedance** | bytedance.list | Stable | ByteDance ecosystem: Douyin, TikTok (CN), Toutiao, Xigua, Ixigua, Lark, etc. Stable routing with low jitter is preferred to avoid upload and playback interruptions. |
| 20 | **TikTok** | ruleset/TikTok.list | Stable | International TikTok. Kept separate from Bytedance because TikTok international uses different CDN and server routing. |

---

### Section 9 — Custom Lists

| # | Group Name | Rule Files | Routing Characteristic | Notes |
|---|------------|------------|------------------------|-------|
| 21 | **Common** | common.list | Balanced | Custom curated list: GitHub, jsDelivr, ProtonMail, Zoho, GoDaddy, IP tools, Cloudflare Pages, financial tools, travel, weather, benchmarking tools, etc. |
| 22 | **HULO** | hulo.list | Direct | Xiaohongshu, Zhihu — Chinese community platforms that perform best on direct connection. Direct routing is intentional. |

---

### Section 10 — Utilities

| # | Group Name | Rule Files | Routing Characteristic | Notes |
|---|------------|------------|------------------------|-------|
| 23 | **Speedtest** | ruleset/Speedtest.list | Fixed single path | Route speedtest traffic to a fixed, dedicated path for reproducible benchmarks. Do not use latency-test-based auto-selection groups here — that would invalidate test results. |

> **Steam** note: Steam was previously in the group list. Recommendation is to merge Steam rules (`ruleset/Steam.list`) into **Proxy** or assign to a dedicated **Steam** group. Include or exclude based on configuration preference.

---

## Routing Characteristic Summary

| Policy Group | Routing Characteristic |
|--------------|------------------------|
| Proxy / Others | Balanced — stable, adequate throughput |
| AI Suite | Low latency + stable |
| Google | Low latency |
| Microsoft | Low latency |
| Apple | Direct |
| Scholar | Stable |
| PayPal | Low-risk IP path — residential or ISP |
| Crypto | Low-risk IP preferred, or balanced |
| YouTube | Low latency |
| Streaming-US | US-region compatible path |
| Streaming-JP | JP-region compatible path, stable IP preferred |
| Streaming-TW | TW-region compatible path |
| Streaming-HK | HK-region compatible path |
| CN Mainland TV | Direct |
| Messenger | Stable |
| Social | Stable |
| Bytedance | Stable |
| TikTok | Stable |
| Common | Balanced |
| HULO | Direct |
| Speedtest | Fixed single path |

---

## Directory Structure

```
neorulset26/
├── ENGINEERING_GUIDE.md          ← This file
│
├── rules/                        ← Self-built configuration artifacts (maintained by owner)
│   ├── ai.list                   ← AI Suite (OpenAI, Claude, etc.)
│   ├── google.list               ← Google services incl. Gemini (excl. YouTube / FCM)
│   ├── common.list               ← Custom curated services
│   ├── scholar.list              ← Academic resources
│   ├── paypal.list               ← Finance (PayPal, banks, brokers)
│   ├── crypto.list               ← Crypto exchanges and infrastructure
│   ├── bytedance.list            ← ByteDance ecosystem
│   ├── socialsite.list           ← Social platforms
│   ├── messenger.list            ← IM apps (Discord, Telegram, WhatsApp, etc.)
│   ├── hulo.list                 ← Xiaohongshu, Zhihu (Direct)
│   └── discord.list              ← (Legacy, superseded by messenger.list)
│
└── ruleset/                      ← General-purpose configuration artifacts
    ├── AdBlock.list
    ├── Apple.list
    ├── Domestic.list
    ├── Domestic IPs.list
    ├── Google FCM.list
    ├── HTTPDNS.list
    ├── Microsoft.list
    ├── Proxy.list
    ├── Special.list
    ├── Speedtest.list
    ├── Steam.list
    ├── Telegram.list
    ├── TikTok.list
    │
    └── Media/
        ├── Streaming-US.list     ← Supplemental US streaming (Peacock, Paramount+, etc.)
        ├── Streaming-JP.list     ← Supplemental JP streaming (U-NEXT, FOD, TVer, etc.)
        ├── Streaming-TW.list     ← Supplemental TW streaming (4GTV, LiTV, etc.)
        ├── Streaming-CN.list     ← CN mainland streaming (Mango TV, Sohu, etc.)
        │
        ├── Netflix.list
        ├── Disney Plus.list
        ├── YouTube.list
        ├── YouTube Music.list
        ├── Max.list
        ├── Spotify.list
        ├── Hulu.list
        ├── Hulu Japan.list
        ├── Amazon.list
        ├── Apple TV.list
        ├── Apple Music.list
        ├── Apple News.list
        ├── Abema TV.list
        ├── BBC iPlayer.list
        ├── Bahamut.list
        ├── Bilibili.list
        ├── DAZN.list
        ├── Discovery Plus.list
        ├── DMM.list
        ├── encoreTVB.list
        ├── F1 TV.list
        ├── Fox Now.list
        ├── Fox+.list
        ├── IQ.list
        ├── IQIYI.list
        ├── JOOX.list
        ├── Japonx.list
        ├── KKBOX.list
        ├── KKTV.list
        ├── Letv.list
        ├── Line TV.list
        ├── MOO.list
        ├── myTV SUPER.list
        ├── Netease Music.list
        ├── Niconico.list
        ├── Pandora.list
        ├── PBS.list
        ├── Pornhub.list
        ├── Soundcloud.list
        ├── Tencent Video.list
        ├── ViuTV.list
        ├── WeTV.list
        ├── Youku.list
        └── ABC.list
```

---

## Policy Group Order (Quick Reference)

```
01  Proxy               — Default outbound path
02  Domestic            — CN direct (incl. miHoYo)
03  Others              — Catch-all fallback
04  AI Suite            — OpenAI, Claude, Gemini, etc.
05  Google              — All Google services (excl. YouTube)
06  Microsoft           — Office 365, Azure, Bing, etc.
07  Apple               — Apple ecosystem (Direct)
08  Scholar             — Academic & research resources
09  PayPal              — Finance (low-risk IP path)
10  Crypto              — Exchanges & infrastructure
11  YouTube             — YouTube + YouTube Music (low latency)
12  Streaming-US        — US-region streaming: Disney+, Max, Hulu, Spotify, etc.
13  Streaming-JP        — JP-region streaming: Netflix JP, Abema, DMM, etc.
14  Streaming-TW        — TW-region streaming: KKTV, KKBOX, Line TV, etc.
15  Streaming-HK        — HK-region streaming: ViuTV, myTV SUPER, TVB, etc.
16  CN Mainland TV      — CN streaming: iQIYI, Youku, Bilibili, etc. (Direct)
17  Messenger           — IM apps: Discord, Telegram, WhatsApp, Signal, etc.
18  Social              — Social platforms: Weibo, Reddit, Zhihu, etc.
19  Bytedance           — ByteDance: Douyin, Toutiao, Lark, etc.
20  TikTok              — TikTok International
21  Common              — Custom curated services
22  HULO                — CN community platforms (Direct)
23  Speedtest           — Network benchmarking (fixed path)
```

---

## Architecture Notes

1. **miHoYo**: The `ruleset/miHoYo.list` file is merged into `ruleset/Domestic.list`. The separate miHoYo group is removed. Assign `ruleset/miHoYo.list` (or the merged Domestic.list) to the Domestic policy.

2. **Discord / Telegram**: These legacy standalone list files remain in the repository for backwards compatibility. In the current architecture, both are covered by the **Messenger** group. `messenger.list` supersedes them as the primary classification file.

3. **Google FCM**: Remains as `ruleset/Google FCM.list` and is classified under the **Google** group alongside `google.list`.

4. **Gemini classification**: Keep Gemini, Google AI Studio, and related Google AI properties in `google.list` by default rather than splitting them into `ai.list`. These properties share Google account, session, static asset, and risk infrastructure. Splitting them across different routing paths can cause region mismatch, authentication instability, or broken sessions.

5. **Streaming supplemental files**: `Streaming-US.list`, `Streaming-JP.list`, `Streaming-TW.list`, `Streaming-CN.list` are supplemental files in `neorulset26/ruleset/Media/`. They extend coverage beyond the existing per-service files.

6. **Policy group architecture**: Each of the 23 groups above represents a routing classification. Internal sub-groups used only for path selection do not need to be exposed as top-level visible policy groups.

7. **Latency-based path selection**: Auto-selection based on latency testing is appropriate for general-purpose groups. It is not appropriate for benchmarking groups (Speedtest), where a fixed path is required for reproducible results.

8. **Apple Intelligence + ChatGPT (validated minimal domain set)**: For configurations targeting Apple Intelligence availability in constrained network environments, the following domain pair in `rules/ai.list` has been validated as the minimal required set: `DOMAIN,apple-relay.apple.com` and `DOMAIN,gspe1-ssl.ls.apple.com`. Do not expand this set unless a specific regression is confirmed.

---

## Scope and Responsibility

This document describes the routing classification architecture studied and maintained in this repository. It is shared as a research and maintenance reference.

The configuration artifacts in `neorulset26/` are text files. How they are used, by whom, in what software, under what network conditions, and in which jurisdictions is entirely the responsibility of the individual who chooses to review or adapt them. No warranty is made that any configuration artifact will successfully reach, stabilize access to, or improve access to any third-party service. See `docs/legal/LEGAL.md` for the full responsibility boundary statement.

---

*Last updated: April 2026*
*Repository: github.com/yagami1997/Arclane*

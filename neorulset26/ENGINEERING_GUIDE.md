# Surge Ruleset 2026 — Engineering Guide

> **Purpose**: This document defines the complete architecture for the `neorulset26` ruleset rebuild.  
> It covers the strategy group hierarchy, ordering, naming conventions, node assignment philosophy, and rule file structure.  
> Do **not** modify the strategy group names or order without updating this document first.

---

## Project Overview

This is a ground-up reconstruction of the Surge Pro 6 ruleset configuration.  
The design goals are:

- **Fewer groups, clearer purpose** — reduced from 29 to 23 strategy groups
- **Demand-driven node assignment** — each group is assigned nodes based on its specific requirement (speed / unlock / clean IP / stability)
- **Regional streaming separation** — streaming groups are split by unlock region, not by individual service
- **Platform-level granularity** — major internet platforms (Google, Microsoft, Apple, Bytedance, etc.) remain as independent groups
- **No miHoYo overhead** — merged into Domestic (Direct)
- **Messenger consolidation** — Discord, Telegram, WhatsApp, Signal, Line, Slack and more collapsed into one group

---

## Strategy Group Architecture

### Ordering Principle

Groups are ordered in the following logical sequence:

```
Fallback / Infrastructure
→ AI
→ Big Tech (Google / Microsoft / Apple / Scholar)
→ Finance
→ Crypto
→ YouTube (standalone, latency-sensitive)
→ Streaming (by unlock region)
→ Messaging & Social
→ Custom / Branded Lists
→ Utilities
```

---

## Strategy Group Reference (23 Groups)

### Section 1 — Fallback & Infrastructure

| # | Group Name | Rule Files | Node Requirement | Notes |
|---|------------|------------|-----------------|-------|
| 1 | **Proxy** | ruleset/Proxy.list | Balanced — stable, decent speed | Default outbound proxy. Used by unmatched proxy traffic. Recommended: Flower JP Premium2 or equivalent balanced node. |
| 2 | **Domestic** | ruleset/Domestic.list, ruleset/Domestic IPs.list, ruleset/Special.list, ruleset/miHoYo.list | Direct | All mainland China traffic. miHoYo rules are merged here (Genshin, Honkai, ZZZ — CN server users go direct). |
| 3 | **Others** | — | Balanced | Catch-all for unclassified proxy traffic. Can share Proxy node or be assigned separately. |

---

### Section 2 — AI Services

| # | Group Name | Rule Files | Node Requirement | Notes |
|---|------------|------------|-----------------|-------|
| 4 | **AI Suite** | openai.list | Fast + stable | Covers OpenAI (ChatGPT, API), Claude, Gemini, Midjourney, Perplexity, Grok, and 50+ AI services. Prioritize low-latency JP or US nodes. Prefer IMM JP or Flower JP. |

---

### Section 3 — Big Tech Platforms

| # | Group Name | Rule Files | Node Requirement | Notes |
|---|------------|------------|-----------------|-------|
| 5 | **Google** | google.list, ruleset/Google FCM.list | Fast — low latency | Covers Google Search, Gmail, Drive, Docs, Maps, Play, Photos, Calendar, Translate, Firebase, and all google.* TLDs. FCM is included. YouTube is handled separately. Recommended: IMM JP (17–21ms) or Dog JP. |
| 6 | **Microsoft** | ruleset/Microsoft.list | Fast — low latency | Covers Office 365, Azure, Bing, OneDrive, Xbox, Teams, GitHub (if not in Common). Recommended: IMM JP or Dog JP. |
| 7 | **Apple** | ruleset/Apple.list, ruleset/Special.list (Apple CDN portion) | Direct | Apple APIs, iCloud, App Store, TestFlight, Maps. Generally direct is preferred for optimal CDN performance. |
| 8 | **Scholar** | scholar.list | Fast or stable | Academic databases, research journals, GitHub, jsDelivr, ProtonMail, Zoho, and academic institutions. Placed directly after Apple in the group order. Recommended: IMM JP or Flower JP. |

---

### Section 4 — Finance

| # | Group Name | Rule Files | Node Requirement | Notes |
|---|------------|------------|-----------------|-------|
| 9 | **PayPal** | paypal.list | Clean IP — ISP only | Covers PayPal, Venmo, Cashapp, Zelle, Stripe, major US banks, brokerage accounts. **ISP lines only** (12 ISP nodes). Never route through datacenter or shared proxies. Clean residential/ISP IP is mandatory to avoid fraud detection and account freezes. |

---

### Section 5 — Crypto

| # | Group Name | Rule Files | Node Requirement | Notes |
|---|------------|------------|-----------------|-------|
| 10 | **Crypto** | crypto.list | Clean IP preferred or Proxy | Covers 100+ exchanges, DeFi protocols, wallets (MetaMask, TokenPocket), NFT platforms, blockchain infrastructure. For exchange logins/KYC: route via ISP or Flower clean nodes. For general browsing: Proxy is acceptable. |

---

### Section 6 — YouTube (Standalone)

| # | Group Name | Rule Files | Node Requirement | Notes |
|---|------------|------------|-----------------|-------|
| 11 | **YouTube** | ruleset/Media/YouTube.list, ruleset/Media/YouTube Music.list | Fast + low latency | YouTube and YouTube Music. Separated from streaming pool because it is latency-sensitive (not primarily unlock-sensitive). Recommended: Flower JP Exp1 or IMM JP. Avoid OIX due to instability. |

---

### Section 7 — Streaming (by Unlock Region)

Streaming services are grouped by their **unlock region requirement**, not by individual service name.  
This allows each regional group to be assigned the best unlock node for that geography.

| # | Group Name | Rule Files (assigned to this group) | Node Requirement | Notes |
|---|------------|--------------------------------------|-----------------|-------|
| 12 | **Streaming-US** | ruleset/Media/Disney Plus.list, ruleset/Media/Max.list, ruleset/Media/Hulu.list, ruleset/Media/Spotify.list, ruleset/Media/Discovery Plus.list, ruleset/Media/Amazon.list, ruleset/Media/Fox Now.list, ruleset/Media/Fox+.list, ruleset/Media/ABC.list, ruleset/Media/PBS.list, ruleset/Media/Pandora.list, ruleset/Media/Soundcloud.list, ruleset/Media/DAZN.list (US region), Streaming-US.list (supplemental) | US node — unlock capable | All US-region streaming: Disney+, Max (HBO), Hulu, Spotify, Discovery+, Amazon Prime, Peacock, Paramount+, DAZN US, etc. Recommended: OIX US GIA2 or Flower US (if available). |
| 13 | **Streaming-JP** | ruleset/Media/Netflix.list, ruleset/Media/Apple TV.list, ruleset/Media/Abema TV.list, ruleset/Media/DMM.list, ruleset/Media/Niconico.list, ruleset/Media/Hulu Japan.list, ruleset/Media/Japonx.list, ruleset/Media/F1 TV.list, Streaming-JP.list (supplemental) | JP node — clean IP preferred | All Japan-region streaming: Netflix (JP unlock), Abema, DMM, Niconico, Hulu Japan, U-NEXT, FOD, TVer, etc. Clean IP is preferred for unlock reliability. Recommended: Flower JP Premium2 or Premium3. Avoid IMM/Dog for unlock-sensitive services. |
| 14 | **Streaming-TW** | ruleset/Media/KKTV.list, ruleset/Media/KKBOX.list, ruleset/Media/Line TV.list, ruleset/Media/Bahamut.list, ruleset/Media/MOO.list, Streaming-TW.list (supplemental) | TW node | Taiwan-region streaming: KKTV, KKBOX, Line TV, Bahamut, MOO, 4GTV, LiTV, etc. Recommended: OIX TW Premium3. |
| 15 | **Streaming-HK** | ruleset/Media/ViuTV.list, ruleset/Media/myTV SUPER.list, ruleset/Media/encoreTVB.list, ruleset/Media/WeTV.list | HK node | Hong Kong streaming: ViuTV, myTV SUPER, TVB, WeTV HK. Recommended: IMM HK06 or OIX HK. |
| 16 | **CN Mainland TV** | ruleset/Media/Bilibili.list, ruleset/Media/IQIYI.list, ruleset/Media/Youku.list, ruleset/Media/Tencent Video.list, ruleset/Media/Letv.list, ruleset/Media/IQ.list, ruleset/Media/Netease Music.list, Streaming-CN.list (supplemental) | Direct or Domestic | Mainland China streaming platforms: Bilibili, iQIYI, Youku, Tencent Video, Mango TV, Sohu Video, etc. Route to Direct for best CDN performance. |

> **Note on Global TV**: If you maintain a "Global TV" category (non-US/JP/TW/HK streaming),  
> assign it to **Streaming-US** as a default, or create a separate **Streaming-Global** group  
> backed by a US node or whichever node covers the specific service.

---

### Section 8 — Messaging & Social

| # | Group Name | Rule Files | Node Requirement | Notes |
|---|------------|------------|-----------------|-------|
| 17 | **Messenger** | messenger.list | Stable JP | Consolidated IM group. Covers: Discord, Telegram, WhatsApp, Signal, Line, Slack, Element/Matrix, Viber, Zalo, Keybase, Mattermost, Session, Threema, Wire, Rocket.Chat. These apps do not require specific unlock regions — just a stable proxy. Recommended: Flower JP Premium2. |
| 18 | **Social** | socialsite.list | Stable — clean preferred | Domestic and international social platforms: Weibo, Zhihu, Douban, Xiaohongshu, Tieba, Reddit, Truth Social, etc. Recommended: Flower JP Premium2 (consistent with Bytedance for session stability). |
| 19 | **Bytedance** | bytedance.list | Stable — clean preferred | ByteDance ecosystem: Douyin, TikTok (CN), Toutiao, Xigua, Ixigua, Lark, etc. Requires stable proxy with low jitter to avoid upload/playback interruptions. Recommended: Flower JP Premium2. |
| 20 | **TikTok** | ruleset/TikTok.list | Stable JP | International TikTok. Kept separate from Bytedance because TikTok international has different CDN and server routing. Recommended: Flower JP or OIX JP. |

---

### Section 9 — Custom Lists

| # | Group Name | Rule Files | Node Requirement | Notes |
|---|------------|------------|-----------------|-------|
| 21 | **Common** | common.list | Balanced — HK preferred | Custom curated list: GitHub, jsDelivr, ProtonMail, Zoho, GoDaddy, IP tools, Cloudflare Pages, Claw.cloud, financial tools, travel, weather, benchmarking tools, etc. Currently: OIX AC16 (HK). Can use any balanced HK/JP node. |
| 22 | **HULO** | hulo.list | Direct | Xiaohongshu, Zhihu — Chinese community platforms that perform best on direct connection. Direct is intentional. |

---

### Section 10 — Utilities

| # | Group Name | Rule Files | Node Requirement | Notes |
|---|------------|------------|-----------------|-------|
| 23 | **Speedtest** | ruleset/Speedtest.list | Dedicated fixed node | Route speedtest traffic to a specific fixed node for reproducible benchmarks. Do not use Auto-UrlTest or load-balanced groups here — that would invalidate test results. Recommended: OIX JP Premium7 (fixed). |

> **Steam** note: Steam was previously in the group list. Recommendation is to merge Steam rules  
> (`ruleset/Steam.list`) into **Proxy** or assign to a dedicated **Steam** group using HK node  
> for better download speeds. Include or exclude based on personal preference.

---

## Node Assignment Summary

| Strategy Group | Recommended Node Type | Provider Suggestion |
|----------------|----------------------|---------------------|
| Proxy / Others | Balanced | Flower JP Premium2 |
| AI Suite | Fast + stable | IMM JP or Flower JP |
| Google | Fast (low latency) | IMM JP (17–21ms) |
| Microsoft | Fast (low latency) | IMM JP or Dog JP |
| Apple | Direct | — |
| Scholar | Fast or stable | IMM JP or Flower JP |
| PayPal | Clean IP — ISP only | 12× ISP nodes |
| Crypto | Clean preferred | ISP or Flower JP Pre2 |
| YouTube | Fast + low latency | Flower JP Exp1 or IMM JP |
| Streaming-US | US unlock capable | OIX US GIA2 |
| Streaming-JP | JP unlock, clean IP | Flower JP Premium2 |
| Streaming-TW | TW unlock | OIX TW Premium3 |
| Streaming-HK | HK unlock | IMM HK06 |
| CN Mainland TV | Direct | — |
| Messenger | Stable JP | Flower JP Premium2 |
| Social | Stable, clean preferred | Flower JP Premium2 |
| Bytedance | Stable, clean preferred | Flower JP Premium2 |
| TikTok | Stable JP | Flower JP or OIX JP |
| Common | Balanced HK/JP | OIX AC16 (HK) |
| HULO | Direct | — |
| Speedtest | Fixed single node | OIX JP Premium7 |

---

## Node Provider Characteristics (Reference)

| Provider | Strength | Weakness | Best Use Case |
|----------|----------|----------|---------------|
| **OIX** | High volume, many regions | Unstable in 2025–2026, IP not clean | Volume-heavy, non-critical (Proxy/Others/TW/US streaming) |
| **IMM (IMMtel)** | Extremely low latency (JP: 17–21ms) | Limited traffic quota, dirty IP | Latency-critical: Google, Microsoft, YouTube, AI |
| **Dog (SSRDOG)** | Cost-effective, enough volume, fast | Dirty IP | Speed-secondary backup: Common, Proxy fallback |
| **Flower (花云)** | Balanced, some nodes very clean (JP Pre2) | Mid-range latency (JP: 119–191ms) | Unlock-sensitive streaming (JP), Finance backup, Stable groups |
| **ISP** | Cleanest IP (residential/ISP) | No streaming unlock | Finance only (PayPal, banking) |

---

## Directory Structure Plan

```
neorulset26/
├── ENGINEERING_GUIDE.md          ← This file
│
├── rules/                        ← Self-built rules (maintained by owner)
│   ├── ai.list                   ← AI Suite (OpenAI, Claude, Gemini, etc.)
│   ├── google.list               ← Google services (excl. YouTube / FCM)
│   ├── common.list               ← Custom curated services
│   ├── scholar.list              ← Academic resources
│   ├── paypal.list               ← Finance (PayPal, banks, brokers)
│   ├── crypto.list               ← Crypto exchanges and DeFi
│   ├── bytedance.list            ← ByteDance ecosystem
│   ├── socialsite.list           ← Social platforms
│   ├── messenger.list            ← IM apps (Discord, Telegram, WhatsApp, etc.)
│   ├── hulo.list                 ← Xiaohongshu, Zhihu (Direct)
│   └── discord.list              ← (Legacy, superseded by messenger.list)
│
└── ruleset/                      ← General-purpose rulesets (ported from dler)
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
        ├── Streaming-US.list     ← NEW: Supplemental US streaming (Peacock, Paramount+, etc.)
        ├── Streaming-JP.list     ← NEW: Supplemental JP streaming (U-NEXT, FOD, TVer, etc.)
        ├── Streaming-TW.list     ← NEW: Supplemental TW streaming (4GTV, LiTV, etc.)
        ├── Streaming-CN.list     ← NEW: CN mainland streaming (Mango TV, Sohu, etc.)
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

## Final Strategy Group Order (Quick Reference)

```
01  Proxy               — Default outbound proxy
02  Domestic            — CN direct (incl. miHoYo)
03  Others              — Catch-all proxy fallback
04  AI Suite            — OpenAI, Claude, Gemini, etc.
05  Google              — All Google services (excl. YouTube)
06  Microsoft           — Office 365, Azure, Bing, etc.
07  Apple               — Apple ecosystem (Direct)
08  Scholar             — Academic & research resources
09  PayPal              — Finance (ISP only)
10  Crypto              — Exchanges & DeFi
11  YouTube             — YouTube + YouTube Music (fast lane)
12  Streaming-US        — US streaming: Disney+, Max, Hulu, Spotify, etc.
13  Streaming-JP        — JP streaming: Netflix JP, Abema, DMM, etc.
14  Streaming-TW        — TW streaming: KKTV, KKBOX, Line TV, etc.
15  Streaming-HK        — HK streaming: ViuTV, myTV SUPER, TVB, etc.
16  CN Mainland TV      — CN streaming: iQIYI, Youku, Bilibili, etc. (Direct)
17  Messenger           — IM apps: Discord, Telegram, WhatsApp, Signal, etc.
18  Social              — Social platforms: Weibo, Reddit, Zhihu, etc.
19  Bytedance           — ByteDance: Douyin, Toutiao, Lark, etc.
20  TikTok              — TikTok International
21  Common              — Custom curated services
22  HULO                — CN community platforms (Direct)
23  Speedtest           — Network benchmarking (fixed node)
```

---

## Implementation Notes

1. **Rule file location**: All `.list` files are referenced via raw GitHub URLs from `yagami1997/surgemac`. Ensure every new file is committed to the repository before adding it to Surge configuration.

2. **miHoYo**: The `ruleset/miHoYo.list` file will be merged into `ruleset/Domestic.list`. The separate miHoYo strategy group is removed. In Surge, assign `ruleset/miHoYo.list` (or the merged Domestic.list) to the **Domestic** policy.

3. **Discord / Telegram**: These legacy standalone lists remain in the repository for backwards compatibility. In the new configuration, both point to the **Messenger** strategy group. `messenger.list` supersedes them as the primary rule file.

4. **Google FCM**: Remains as `ruleset/Google FCM.list` and is assigned to the **Google** strategy group alongside `google.list`.

5. **Streaming supplemental files**: `Streaming-US.list`, `Streaming-JP.list`, `Streaming-TW.list`, `Streaming-CN.list` are new files to be created in `neorulset26/ruleset/Media/`. They add coverage beyond the existing per-service files.

6. **Node assignment in Surge**: The `[Proxy Group]` section in your Surge config should define each of the 23 groups above. The node pools for Speed / Unlock / Finance / Stable do not need to be exposed as visible strategy groups — they can be hidden sub-groups (`hidden = true`) used only internally.

7. **Auto-UrlTest**: Keep `Auto-UrlTest` as a utility sub-group for latency-based auto-selection within a provider. Do not expose it as a top-level outbound strategy group.

---

*Last updated: February 2026*  
*Maintained by: MUMU — github.com/yagami1997/surgemac*

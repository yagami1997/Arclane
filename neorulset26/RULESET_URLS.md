# Arclane — Configuration Artifact URL Reference

> **Purpose**: This document lists the raw artifact URLs organized by policy group for the `neorulset26` configuration mainline. It is a reference for understanding file organization and classification structure.
> Base path: `https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26`
>
> How any of these artifacts is used, in what software, under what conditions, and in which jurisdiction is the sole responsibility of the individual reviewing or adapting them. See `docs/legal/LEGAL.md` for the full responsibility boundary statement.

---

## Strategy Group Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OUTBOUND TRAFFIC                                    │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
          ┌────────────────────────▼────────────────────────┐
          │              [Rule Matching Engine]              │
          │         (processes rules top → bottom)          │
          └─────────────────────────────────────────────────┘
                                   │
   ┌───────────────────────────────┼────────────────────────────────────┐
   │                               │                                    │
   ▼                               ▼                                    ▼
REJECT                          DIRECT                              PROXY GROUPS
   │                               │                                    │
   ├─ AdBlock                      ├─ Domestic ──── Domestic.list       │
   └─ HTTPDNS                      │                Domestic IPs.list   │
                                   │                Special.list        │
                                   │                miHoYo (merged)     │
                                   │                                    │
                                   ├─ Apple ─────── Apple.list          │
                                   ├─ CN Mainland ── Bilibili           │
                                   │   TV           IQIYI / Youku       │
                                   │                Tencent / Letv      │
                                   │                IQ / Netease        │
                                   │                JOOX / CN-Suppl.    │
                                   └─ HULO ─────── hulo.list            │
                                                                        │
                    ┌───────────────────────────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────────────────────────────────────────────┐
         │                    23 PROXY STRATEGY GROUPS                  │
         └──────────────────────────────────────────────────────────────┘
                    │
    ┌───────────────┼──────────────────────────────────┐
    │               │                                  │
    ▼               ▼                                  ▼
FALLBACK         BIG TECH                           FINANCE
────────         ────────                           ───────
01 Proxy         04 AI Suite  ── ai.list            09 PayPal ── paypal.list
03 Others        05 Google    ── google.list
                              ── Google FCM.list
                 06 Microsoft ── Microsoft.list     10 Crypto ── crypto.list
                 07 Apple     ── Apple.list
                              [Direct]
                 08 Scholar   ── scholar.list

    ▼               ▼                                  ▼
YOUTUBE          STREAMING                          SOCIAL & MESSAGING
───────          ─────────                          ──────────────────
11 YouTube       12 Streaming-US                    17 Messenger ── messenger.list
   ── YouTube       Disney+ / Max / Hulu               (Discord + Telegram
   ── YT Music      Spotify / Discovery+                WhatsApp / Signal
   [Fast lane]      Amazon / Fox / ABC                  Line / Slack / etc.)
                    PBS / Pandora / Soundcloud
                    DAZN / Streaming-US.list        18 Social ── socialsite.list

                 13 Streaming-JP                    19 Bytedance ── bytedance.list
                    Netflix / Apple TV
                    Abema / DMM                     20 TikTok ── TikTok.list
                    Niconico / Hulu JP
                    Japonx / F1 TV
                    Streaming-JP.list

                 14 Streaming-TW
                    KKTV / KKBOX
                    Line TV / Bahamut
                    MOO / Streaming-TW.list

                 15 Streaming-HK
                    ViuTV / myTV SUPER
                    encoreTVB / WeTV

    ▼               ▼                                  ▼
CUSTOM           UTILITIES
──────           ─────────
21 Common ────── common.list
22 HULO ──────── hulo.list [Direct]
                 23 Speedtest ── Speedtest.list
                                 [Fixed node]
```

---

## Routing Characteristic Summary

| Policy Group | Routing Characteristic |
|--------------|------------------------|
| Proxy / Others | Balanced |
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

## Pre-flight: Special Policies (REJECT / DIRECT)

These rule sets use fixed policies, not proxy groups.

```
# Block ads and tracking
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/AdBlock.list,REJECT

# Block HTTPDNS (DNS hijack prevention)
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/HTTPDNS.list,REJECT
```

---

## 01 · Proxy
**Policy**: `Proxy`  
**Routing**: Balanced

```
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Proxy.list,Proxy
```

---

## 02 · Domestic
**Policy**: `Domestic`  
**Node**: Direct

```
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Domestic.list,Domestic
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Domestic%20IPs.list,Domestic
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Special.list,Domestic
```

---

## 03 · Others
**Policy**: `Others`  
**Routing**: Balanced

```
# No dedicated rule file — catch-all in [Rule] section:
# FINAL,Others
```

---

## 04 · AI Suite
**Policy**: `AI Suite`  
**Routing**: Low latency + stable

```
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/rules/ai.list,AI Suite
```

---

## 05 · Google
**Policy**: `Google`  
**Routing**: Low latency

```
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/rules/google.list,Google
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Google%20FCM.list,Google
```

---

## 06 · Microsoft
**Policy**: `Microsoft`  
**Routing**: Low latency

```
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Microsoft.list,Microsoft
```

---

## 07 · Apple
**Policy**: `Apple`  
**Node**: Direct

```
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Apple.list,Apple
```

---

## 08 · Scholar
**Policy**: `Scholar`  
**Routing**: Stable

```
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/rules/scholar.list,Scholar
```

---

## 09 · PayPal
**Policy**: `PayPal`  
**Routing**: Low-risk IP path — residential or ISP characteristics required

```
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/rules/paypal.list,PayPal
```

---

## 10 · Crypto
**Policy**: `Crypto`  
**Routing**: Low-risk IP path preferred for financial interactions; balanced path acceptable for general browsing

```
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/rules/crypto.list,Crypto
```

---

## 11 · YouTube
**Policy**: `YouTube`  
**Routing**: Low latency

```
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/YouTube.list,YouTube
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/YouTube%20Music.list,YouTube
```

---

## 12 · Streaming-US
**Policy**: `Streaming-US`  
**Routing**: US-region compatible path  
**Services**: Disney+, Max, Hulu, Spotify, Discovery+, Amazon, Fox, ABC, PBS, Pandora, Soundcloud, DAZN, Peacock, Paramount+, Crunchyroll, Fubo, Sling, Tubi, Pluto TV, etc.

```
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Disney%20Plus.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Max.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Hulu.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Spotify.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Discovery%20Plus.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Amazon.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Fox%20Now.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Fox%2B.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/ABC.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/PBS.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Pandora.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Soundcloud.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/DAZN.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Streaming-US.list,Streaming-US
```

---

## 13 · Streaming-JP
**Policy**: `Streaming-JP`  
**Routing**: JP-region compatible path, stable IP characteristics preferred  
**Services**: Netflix JP, Apple TV, Abema, DMM, Niconico, Hulu Japan, Japonx, F1 TV, U-NEXT, TVer, FOD, Lemino, Paravi, etc.

```
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Netflix.list,Streaming-JP
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Apple%20TV.list,Streaming-JP
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Abema%20TV.list,Streaming-JP
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/DMM.list,Streaming-JP
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Niconico.list,Streaming-JP
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Hulu%20Japan.list,Streaming-JP
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Japonx.list,Streaming-JP
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/F1%20TV.list,Streaming-JP
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Streaming-JP.list,Streaming-JP
```

---

## 14 · Streaming-TW
**Policy**: `Streaming-TW`  
**Routing**: TW-region compatible path  
**Services**: KKTV, KKBOX, Line TV, Bahamut, MOO, 4GTV, LiTV, CatchPlay, PTS+, major TW stations, etc.

```
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/KKTV.list,Streaming-TW
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/KKBOX.list,Streaming-TW
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Line%20TV.list,Streaming-TW
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Bahamut.list,Streaming-TW
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/MOO.list,Streaming-TW
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Streaming-TW.list,Streaming-TW
```

---

## 15 · Streaming-HK
**Policy**: `Streaming-HK`  
**Routing**: HK-region compatible path  
**Services**: ViuTV, myTV SUPER, TVB (encoreTVB), WeTV HK

```
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/ViuTV.list,Streaming-HK
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/myTV%20SUPER.list,Streaming-HK
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/encoreTVB.list,Streaming-HK
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/WeTV.list,Streaming-HK
```

---

## 16 · CN Mainland TV
**Policy**: `CN Mainland TV`  
**Node**: Direct (Domestic)  
**Services**: Bilibili, iQIYI, Youku, Tencent Video, Letv, IQ, Netease Music, JOOX, Mango TV, Sohu, CCTV, Migu, etc.

```
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Bilibili.list,CN Mainland TV
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/IQIYI.list,CN Mainland TV
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Youku.list,CN Mainland TV
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Tencent%20Video.list,CN Mainland TV
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Letv.list,CN Mainland TV
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/IQ.list,CN Mainland TV
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Netease%20Music.list,CN Mainland TV
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/JOOX.list,CN Mainland TV
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Streaming-CN.list,CN Mainland TV
```

---

## 17 · Messenger
**Policy**: `Messenger`  
**Routing**: Stable  
**Services**: Discord, Telegram, WhatsApp, Signal, Line, Slack, Element, Viber, Zalo, Keybase, Mattermost, Session, Threema, Wire, Rocket.Chat

```
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/rules/messenger.list,Messenger
```

---

## 18 · Social
**Policy**: `Social`  
**Routing**: Stable

```
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/rules/socialsite.list,Social
```

---

## 19 · Bytedance
**Policy**: `Bytedance`  
**Routing**: Stable

```
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/rules/bytedance.list,Bytedance
```

---

## 20 · TikTok
**Policy**: `TikTok`  
**Routing**: Stable

```
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/TikTok.list,TikTok
```

---

## 21 · Common
**Policy**: `Common`  
**Routing**: Balanced

```
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/rules/common.list,Common
```

---

## 22 · HULO
**Policy**: `HULO`  
**Node**: Direct

```
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/rules/hulo.list,HULO
```

---

## 23 · Speedtest
**Policy**: `Speedtest`  
**Routing**: Fixed single path (do not use latency-test-based auto-selection — results would not be reproducible)

```
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Speedtest.list,Speedtest
```

---

## Appendix A — Unused / Optional Rule Files

These files exist in the repo but are not assigned to any of the 23 groups above.  
Assign them as needed based on your config requirements.

| File | Suggested Policy | Notes |
|------|-----------------|-------|
| `ruleset/Steam.list` | `Proxy` or `Streaming-HK` | Game platform; HK node for best download speed |
| `ruleset/Telegram.list` | `Messenger` | Legacy file; superseded by `rules/messenger.list` |
| `ruleset/miHoYo.list` | `Domestic` | Legacy file; domains merged into `ruleset/Domestic.list` |
| `ruleset/Media/Apple Music.list` | `Apple` or `Streaming-JP` | Assign to Apple (Direct) or JP if region-locked |
| `ruleset/Media/Apple News.list` | `Apple` or `Streaming-US` | Region-locked to US/UK/AU |
| `ruleset/Media/BBC iPlayer.list` | `Streaming-UK` (if exists) or `Proxy` | UK region only |
| `ruleset/Media/Pornhub.list` | `Proxy` | Assign to any proxy group |

---

## Appendix B — Complete Rule Loading Order (Reference Template)

The following block shows the complete rule-set loading order used in this configuration architecture. It is provided as a structural reference showing the priority design rationale.

Policy group names in any actual configuration must match exactly what is defined in the corresponding proxy group section.

Priority design rationale:
- Tier 1 (single rules) fires before any RULE-SET — catches hand-written overrides instantly.
- Tier 2 (REJECT) runs early so ad/DNS-leak domains are always blocked regardless of later routing rules.
- Tier 3 (your 5 custom groups) overrides all pre-built rule-sets below, eliminating any overlap conflict.
- Tier 9 (Proxy.list) acts as international catchall, placed late so it never steals traffic from explicit groups.
- Tier 10 (Domestic) is the final direct-connect safety net — lowest RULE-SET priority.

```
# ════════════════════════════════════════════════════════════
# TIER 1 — Single custom rules  (absolute highest priority)
# Add per-domain / per-process / per-IP overrides here.
# Examples:
#   DOMAIN,specific.internal.example.com,Direct
#   PROCESS-NAME,YourApp,Proxy
#   IP-CIDR,192.168.0.0/16,Direct,no-resolve
# ════════════════════════════════════════════════════════════

# ════════════════════════════════════════════════════════════
# TIER 2 — Pre-flight REJECT
# Must run before any proxy routing to ensure ad/DNS-leak
# domains are always dropped, even if they appear in later sets.
# ════════════════════════════════════════════════════════════
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/AdBlock.list,REJECT
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/HTTPDNS.list,REJECT

# ════════════════════════════════════════════════════════════
# TIER 3 — Your fully custom groups  (override everything below)
# PayPal / Common / Social / Bytedance / HULO
# These files are hand-authored; their policy decisions are final.
# ════════════════════════════════════════════════════════════
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/rules/paypal.list,PayPal
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/rules/common.list,Common
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/rules/socialsite.list,Social
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/rules/bytedance.list,Bytedance
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/rules/hulo.list,HULO

# ════════════════════════════════════════════════════════════
# TIER 4 — AI + Big Tech
# ════════════════════════════════════════════════════════════
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/rules/ai.list,AI Suite
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/rules/google.list,Google
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Google%20FCM.list,Google
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Microsoft.list,Microsoft
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Apple.list,Apple
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/rules/scholar.list,Scholar

# ════════════════════════════════════════════════════════════
# TIER 5 — Crypto & Finance
# ════════════════════════════════════════════════════════════
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/rules/crypto.list,Crypto

# ════════════════════════════════════════════════════════════
# TIER 6 — YouTube (standalone, latency priority)
# ════════════════════════════════════════════════════════════
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/YouTube.list,YouTube
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/YouTube%20Music.list,YouTube

# ════════════════════════════════════════════════════════════
# TIER 7 — Streaming (by region)
# ════════════════════════════════════════════════════════════

# ── Streaming-JP ─────────────────────────────────────────────
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Netflix.list,Streaming-JP
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Apple%20TV.list,Streaming-JP
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Abema%20TV.list,Streaming-JP
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/DMM.list,Streaming-JP
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Niconico.list,Streaming-JP
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Hulu%20Japan.list,Streaming-JP
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Japonx.list,Streaming-JP
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/F1%20TV.list,Streaming-JP
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Streaming-JP.list,Streaming-JP

# ── Streaming-US ─────────────────────────────────────────────
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Disney%20Plus.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Max.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Hulu.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Spotify.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Discovery%20Plus.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Amazon.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Fox%20Now.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Fox%2B.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/ABC.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/PBS.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Pandora.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Soundcloud.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/DAZN.list,Streaming-US
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Streaming-US.list,Streaming-US

# ── Streaming-TW ─────────────────────────────────────────────
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/KKTV.list,Streaming-TW
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/KKBOX.list,Streaming-TW
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Line%20TV.list,Streaming-TW
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Bahamut.list,Streaming-TW
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/MOO.list,Streaming-TW
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Streaming-TW.list,Streaming-TW

# ── Streaming-HK ─────────────────────────────────────────────
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/ViuTV.list,Streaming-HK
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/myTV%20SUPER.list,Streaming-HK
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/encoreTVB.list,Streaming-HK
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/WeTV.list,Streaming-HK

# ── CN Mainland TV ───────────────────────────────────────────
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Bilibili.list,CN Mainland TV
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/IQIYI.list,CN Mainland TV
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Youku.list,CN Mainland TV
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Tencent%20Video.list,CN Mainland TV
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Letv.list,CN Mainland TV
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/IQ.list,CN Mainland TV
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Netease%20Music.list,CN Mainland TV
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/JOOX.list,CN Mainland TV
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Media/Streaming-CN.list,CN Mainland TV

# ════════════════════════════════════════════════════════════
# TIER 8 — Messenger + TikTok
# ════════════════════════════════════════════════════════════
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/rules/messenger.list,Messenger
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/TikTok.list,TikTok

# ════════════════════════════════════════════════════════════
# TIER 9 — Speedtest
# ════════════════════════════════════════════════════════════
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Speedtest.list,Speedtest

# ════════════════════════════════════════════════════════════
# TIER 10 — Proxy  (international catchall — placed late intentionally)
# Catches remaining international traffic not matched by any
# specific group above. Placed after custom groups to avoid
# stealing traffic from explicit routing decisions.
# ════════════════════════════════════════════════════════════
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Proxy.list,Proxy

# ════════════════════════════════════════════════════════════
# TIER 11 — Domestic  (final direct-connect safety net)
# Lowest RULE-SET priority. Only handles CN traffic not already
# matched by the custom groups above (Social/Bytedance/HULO).
# ════════════════════════════════════════════════════════════
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Domestic.list,Domestic
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Domestic%20IPs.list,Domestic
RULE-SET,https://raw.githubusercontent.com/yagami1997/Arclane/main/neorulset26/ruleset/Special.list,Domestic

# ════════════════════════════════════════════════════════════
# FINAL fallback
# ════════════════════════════════════════════════════════════
GEOIP,CN,Domestic
FINAL,Others
```

---

*Last updated: April 2026 — Arclane configuration artifact reference*

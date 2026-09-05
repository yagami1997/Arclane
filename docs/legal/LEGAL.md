# Legal Boundary Statement

*Last updated: September 4, 2026 (PDT); technical tool scope updated.
Jurisdiction summaries were not re-reviewed in this revision.*

## 1. Project Characterization

Arclane is a third-party research repository containing text-based network routing configuration artifacts, Surge-compatible module files, architecture documentation, migration references, and small self-hosted operational utilities. It is distributed as a collection of text files and source code.

Arclane is designed around the following model:

- published artifacts include text configuration, documentation, and executable helper source code
- the repository does not operate, broker, or host any proxy server, VPN endpoint, network relay, or managed access infrastructure
- no user accounts, subscription services, or managed connectivity products are offered
- the repository is maintained by a single author for personal configuration research and documentation purposes
- some artifacts are compatible with Surge; that compatibility is a technical property of the file format, not a service relationship or product affiliation

The legal position of the Arclane maintainer should therefore be understood as that of a configuration research author, not a service operator. The maintainer publishes text artifacts. What any individual does with those artifacts — including how they configure, deploy, or adapt them — is the sole responsibility of that individual.

## 2. Configuration Author, Not Service Operator

The Arclane project author publishes routing configuration artifacts, documentation, and reference implementations. The project author does not, by that act alone, operate proxy infrastructure, provide network access services, manage user routing behavior, control downstream deployments, or determine what any user accesses through their own independently configured software.

This distinction matters. Across major jurisdictions, liability analysis frequently turns on who actually operates the service, controls the infrastructure, receives user traffic, and determines access outcomes. For Arclane, those functions belong entirely to the individual user who chooses to configure and operate their own routing software. They do not belong to the upstream configuration research author.

`Surge` and `Surge Pro` are trademarks of Nssurge Inc. Arclane is an independent third-party project and has no official relationship with, endorsement from, sponsorship by, or cooperation with Nssurge Inc. All other product names, service names, and trademarks referenced in this repository remain the property of their respective owners and are used solely for descriptive identification or configuration categorization. Such references do not imply partnership, endorsement, authorization, or commercial association.

## 3. User Responsibility and Compliance Boundary

If you review, adapt, import, deploy, or use any artifact from this repository, you are responsible for independently evaluating and satisfying the legal obligations that apply in your jurisdiction and under the platform terms governing the services you interact with.

That responsibility may include:

- confirming that your use of routing configuration software is lawful in your jurisdiction
- complying with the terms of service, developer agreements, API policies, and acceptable-use rules of any third-party platform whose domains appear in these configuration files
- satisfying applicable data-protection, cybersecurity, telecommunications, and sector-specific obligations
- conducting your own legal and security review before deploying any reference tool in a production or enterprise environment
- obtaining independent legal counsel where uncertainty remains

Users are also responsible for the technical consequences of importing or
updating configuration artifacts. Before use, review the exact rules and DNS
behavior, preserve a recoverable profile backup, confirm that the artifact is
appropriate for the target platform, and maintain a tested rollback path.
Remote publication through a raw-file URL does not make an artifact a managed
service and does not guarantee continued availability, integrity, compatibility,
or notice of future changes.

The inclusion of a domain in a configuration file does not grant permission to access, route, mirror, test, or use the associated service in any particular way. It does not authorize conduct that may breach platform rules, contractual restrictions, geographic controls, or applicable law.

## 4. Jurisdictional Compliance Notice

### United States

Users must independently evaluate whether their review, adaptation, import, deployment, or use of repository materials complies with applicable federal and state law.

Relevant frameworks may include:

- The **Computer Fraud and Abuse Act (CFAA)**: users must not use routing configuration to facilitate unauthorized access to computer systems, networks, or accounts, or to circumvent technical access controls in ways that create CFAA exposure.
- **Copyright law and the Digital Millennium Copyright Act (DMCA)**: routing configuration that interacts with content platforms may implicate copyright and technological protection measure rules depending on how it is used.
- **Export Administration Regulations (EAR) and OFAC sanctions**: users operating in sanctioned jurisdictions, or routing traffic in ways that may implicate export-control or sanctions frameworks, must independently assess compliance before use.
- **Sector-specific obligations**: users in regulated industries (financial services, healthcare, education, government) must assess whether their use of network routing tools satisfies applicable sector rules and security requirements.

Users must independently confirm compliance and consult qualified legal counsel in their jurisdiction if uncertainty remains.

### European Union

Users must independently evaluate whether their review, adaptation, import, deployment, or use of repository materials complies with applicable European Union law and the implementing laws of relevant member states.

Relevant frameworks may include:

- The **Digital Services Act (DSA)**: where a user or organization deploys or operates services that interact with repository artifacts in a way that constitutes regulated intermediary activity, applicable DSA obligations — including notice handling, illegal-content response, and platform accountability rules — may apply to that operator.
- The **General Data Protection Regulation (GDPR)**: users who process personal data through routing configurations, including IP-level traffic data, must independently assess their obligations as controller or processor, including lawful basis, data minimization, security, and cross-border transfer requirements.
- **NIS2 Directive and national implementing law**: Directive (EU) 2022/2555 is implemented through member-state law, and transposition status and requirements differ by jurisdiction. Potentially covered entities must assess the law applicable where they operate rather than assuming that a repository artifact determines their status or obligations.
- **ePrivacy rules**: configurations that interact with communications metadata may implicate applicable ePrivacy obligations depending on deployment context.

Users must independently confirm compliance and consult qualified legal counsel in their jurisdiction if uncertainty remains.

### People's Republic of China

Users must independently evaluate whether their review, adaptation, import, deployment, or use of repository materials complies with applicable law and regulation in the People's Republic of China.

Relevant frameworks may include:

- The **Cybersecurity Law of the People's Republic of China (网络安全法)**, as amended on October 28, 2025 and effective from January 1, 2026: network operators and users of network tools must assess compliance with the current security, data, and infrastructure obligations applicable to their own role and deployment.
- The **Data Security Law (数据安全法)** and the **Personal Information Protection Law (个人信息保护法)**: users who handle data through configured routing environments must independently assess classification, protection, and cross-border transfer obligations applicable to their context.
- **Telecommunications regulations and internet service rules**: the use of routing software and self-hosted network tools may be subject to licensing, approval, or operational requirements under applicable telecommunications administration rules, including the **Measures for the Administration of Internet Information Services (互联网信息服务管理办法)** and related implementing regulations.
- **Network routing and cross-border traffic**: the legal status of network routing configurations that affect cross-border traffic is subject to administrative interpretation and enforcement discretion. Any claimed safe-harbor position is conditional rather than automatic. It may be weakened or lost where a user has actual knowledge of unlawful use, materially participates in prohibited conduct, or otherwise falls outside the limits of passive personal configuration.

Users must independently confirm compliance and consult qualified legal counsel in their jurisdiction if uncertainty remains.

### Japan

Users must independently evaluate whether their review, adaptation, import, deployment, or use of repository materials complies with applicable Japanese law.

Relevant frameworks may include:

- The **Information Distribution Platform Act (情報流通プラットフォーム対処法)**, the amended framework effective from April 1, 2025: where a user separately operates a covered large-scale platform, applicable transparency, response, removal-policy, or sender-information disclosure duties may apply to that operator. Publication of this repository alone is not represented as creating that status.
- The **Unauthorized Computer Access Law (不正アクセス行為の禁止等に関する法律)**: users must not use routing configuration to facilitate unauthorized access to computer systems or to circumvent access controls in ways that create exposure under this law.
- The **Act on Protection of Personal Information (個人情報の保護に関する法律, APPI)**: users who handle personal information through configured routing environments must independently assess applicable protection and handling obligations.
- **Telecommunications Business Act (電気通信事業法)**: users operating self-hosted network services or relays in Japan should assess whether applicable telecommunications business registration or notification obligations may apply.

Users must independently confirm compliance and consult qualified legal counsel in their jurisdiction if uncertainty remains.

### Other Jurisdictions

Users in all other jurisdictions are responsible for independently evaluating whether their review, adaptation, import, deployment, or use of repository materials complies with applicable local law. Relevant frameworks may include network-tool restrictions, privacy and data-protection rules, import or export controls, sanctions regimes, telecommunications licensing requirements, and laws affecting platform access, content routing, or self-hosted infrastructure. Users must independently confirm compliance and consult qualified legal counsel if uncertainty remains.

## 5. Reasonable Due Diligence by the Project Author

Arclane is maintained with design and documentation choices intended to reflect reasonable diligence by the project author:

- the repository is positioned as a configuration research project, not as a proxy service, managed access product, or network infrastructure offering
- published configuration and helper source code do not include a bundled VPN/proxy client, managed relay infrastructure, or subscription access service
- the documentation does not provide instructions optimized for any specific unlawful use case
- provider-specific operational recommendations have been deliberately excluded from public documentation to avoid constituting a deployment guide for any commercial proxy service
- the repository has substantial lawful uses, including personal network configuration management, routing architecture research, DNS and privacy configuration study, and configuration migration and maintenance work
- the project can receive repository-level notices about the source project itself, but that does not make the maintainer an operator of any third-party routing deployment

These factors do not eliminate all legal risk, but they reflect an intentional effort to position Arclane as a research and documentation repository rather than a service designed to facilitate unlawful network access.

## 6. No Warranty / Limitation of Liability

In addition to the disclaimer contained in the MIT License, the following project-specific limitations apply:

- all configuration artifacts, documentation, modules, and reference tools are provided on an "as is" and "as available" basis
- no warranty is made regarding accuracy, completeness, timeliness, fitness for a particular purpose, legal sufficiency, security posture, operational safety, or continued availability
- third-party services may change infrastructure, domain patterns, regional enforcement, traffic controls, risk systems, account policies, or compatibility behavior at any time, and this repository has no duty to maintain continued usefulness against those changes
- no representation is made that any configuration artifact will successfully access, preserve access to, improve access to, or stabilize any particular service or function
- no responsibility is accepted for account restrictions, service interruption, data loss, enforcement actions, internal policy violations, reputational damage, financial loss, regulatory consequences, or legal claims arising from review, adaptation, redistribution, deployment, or use of repository materials
- reference tools under `tools/` are not production assurances; anyone deploying them is solely responsible for platform terms, lawful operation, abuse prevention, security hardening, monitoring, incident response, and downstream effects

## 7. Intended Use

The opt-in OpenClaw compatibility probe is source code run by the user. It
queries public hostnames and requests public catalogs; destination services
and resolvers can observe ordinary network metadata. It does not read user
configuration or submit credentials. Its simulated private-address tests do
not connect to private systems. Passing the probe is a bounded technical
observation, not a security certification, service-availability guarantee, or
authorization to access other systems. Details are maintained in the
[usage notice](../guides/usage-and-safety.md) and
[compatibility guide](../guides/openclaw-fake-ip-compatibility.md).

This repository is intended for:

- personal routing configuration management and comparison
- research into routing policy structure, classification, and maintenance methods
- education regarding text-based network configuration design
- study of migration, naming, categorization, and documentation practices
- privacy-oriented DNS and self-hosted reference architecture research

This repository is not intended for:

- unauthorized access to computer systems, networks, or accounts
- bypassing access controls or territorial restrictions in violation of applicable law
- use without independent legal, security, and policy review in regulated or managed environments
- commercial redistribution, bundling, hosting, resale, or managed-service use without separate review of applicable legal, contractual, and compliance obligations

## 8. No Legal Advice

This document is provided for project-positioning and general risk-allocation purposes only. It is not legal advice, not a regulatory opinion, and not a guarantee of compliance in any jurisdiction.

Before adapting, deploying, or using repository materials in a context with legal uncertainty — including regulated industries, cross-border environments, or jurisdictions with sensitive network-tool restrictions — users should consult qualified local counsel.

## 9. Source Currency

The jurisdiction summaries above are deliberately high-level and non-exhaustive.
They may become outdated as statutes, implementing rules, enforcement practice,
sanctions programs, platform terms, and official interpretations change. Useful
official starting points reviewed for this revision include:

- [China's National People's Congress notice on the 2025 Cybersecurity Law amendment](https://www.npc.gov.cn/npc/c2/c30834/202510/t20251028_449076.html)
- [Cybersecurity Administration of China publication of the amended Cybersecurity Law](https://www.cac.gov.cn/2025-12/29/c_1768735112911946.htm)
- [EUR-Lex text of Directive (EU) 2022/2555](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A32022L2555)
- [European Commission NIS2 transposition status](https://digital-strategy.ec.europa.eu/en/policies/nis-transposition)
- [Japanese government overview of the Information Distribution Platform Act](https://www.bunka.go.jp/seisaku/bunkashingikai/chosakuken/seisaku/r06_04/pdf/94158101_01.pdf)

These links are references, not a substitute for checking the law and official
guidance applicable at the time and place of use.

## 10. Copyright

Copyright © 2023–2026 YAGAMI. All rights reserved except as granted by the MIT License included in this repository.

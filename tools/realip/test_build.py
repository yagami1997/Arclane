"""Tests for the Real IP module builder."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import build


class LoadHostsTests(unittest.TestCase):
    def write_catalog(self, text: str) -> Path:
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        path = Path(directory.name) / "realip.list"
        path.write_text(text, encoding="utf-8")
        return path

    def test_load_hosts_preserves_order_and_ignores_comments(self) -> None:
        path = self.write_catalog("# Category\nexample.com\n*.example.net\n")
        self.assertEqual(build.load_hosts(path), ["example.com", "*.example.net"])

    def test_load_hosts_rejects_case_insensitive_duplicates(self) -> None:
        path = self.write_catalog("Example.com\nexample.COM\n")
        with self.assertRaisesRegex(build.CatalogError, "Duplicate host token"):
            build.load_hosts(path)

    def test_load_hosts_rejects_unsafe_wildcards(self) -> None:
        path = self.write_catalog("*.com\n")
        with self.assertRaisesRegex(build.CatalogError, "Unsafe wildcard"):
            build.load_hosts(path)


class ModuleSafetyTests(unittest.TestCase):
    def module_text(self, system: str, rule: str = "DOMAIN,example.com,DIRECT") -> str:
        ruleset = "[Ruleset FeishuSharedInfra]\nDOMAIN-SUFFIX,example.net\n" if system == "mac" else ""
        process_rules = (
            "AND,((PROCESS-NAME,/Applications/Lark.app/),(RULE-SET,FeishuSharedInfra)),DIRECT\n"
            "AND,((PROCESS-NAME,/Applications/Feishu.app/),(RULE-SET,FeishuSharedInfra)),DIRECT\n"
            if system == "mac"
            else ""
        )
        return (
            "#!name=Real IP\n"
            "#!desc=Description\n"
            f"#!system={system}\n"
            "# 🏷️ Version: 2.1.0\n"
            "# 📅 Updated: 2026-08-31 PDT (America/Los_Angeles)\n"
            "[General]\n"
            "always-real-ip = %APPEND% example.com\n"
            f"{ruleset}"
            "[Rule]\n"
            f"{process_rules}"
            f"{rule}\n"
        )

    def test_valid_platform_modules(self) -> None:
        for system in ("mac", "ios"):
            build.validate_module(Path(f"{system}.sgmodule"), self.module_text(system), system)

    def test_ios_rejects_process_rules(self) -> None:
        text = self.module_text("ios", "PROCESS-NAME,Example,DIRECT")
        with self.assertRaisesRegex(build.CatalogError, "PROCESS-NAME"):
            build.validate_module(Path("ios.sgmodule"), text, "ios")

    def test_rejects_non_direct_routing(self) -> None:
        text = self.module_text("mac", "DOMAIN,example.com,Proxy")
        with self.assertRaisesRegex(build.CatalogError, "Non-DIRECT"):
            build.validate_module(Path("mac.sgmodule"), text, "mac")

    def test_rejects_unexpected_sections(self) -> None:
        text = self.module_text("ios") + "[MITM]\nhostname = example.com\n"
        with self.assertRaisesRegex(build.CatalogError, "Unexpected module sections"):
            build.validate_module(Path("ios.sgmodule"), text, "ios")


if __name__ == "__main__":
    unittest.main()

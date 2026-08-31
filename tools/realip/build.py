#!/usr/bin/env python3
"""Build and validate the Real IP Surge modules from the canonical host list."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
HOST_CATALOG = REPOSITORY_ROOT / "neorulset26/modules/realip.list"
MODULE_VERSION = "2.1.0"
MODULE_UPDATED = "2026-08-31 PDT"
MODULE_UPDATED_LONG = "2026-08-31 PDT (America/Los_Angeles)"
MODULE_TARGETS = (
    (REPOSITORY_ROOT / "neorulset26/modules/realip.sgmodule", "mac"),
    (REPOSITORY_ROOT / "neorulset26/modules/realip-ios.sgmodule", "ios"),
)
VALUE_PREFIX = "always-real-ip = %APPEND% "
TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_*?.-]+$")
SECTION_PATTERN = re.compile(r"^\[[^]]+\]$")
ALLOWED_SECTIONS = {
    "mac": {"[General]", "[Ruleset FeishuSharedInfra]", "[Rule]"},
    "ios": {"[General]", "[Rule]"},
}
UNSAFE_TOKENS = {
    "*",
    "*.*",
    "*.com",
    "*.net",
    "*.org",
    "*.cn",
    "*.io",
    "*.co",
}


class CatalogError(ValueError):
    """Raised when the canonical host catalog is invalid."""


def load_hosts(path: Path) -> list[str]:
    hosts: list[str] = []
    seen: dict[str, int] = {}

    for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        token = raw_line.strip()
        if not token or token.startswith("#"):
            continue
        if token in UNSAFE_TOKENS:
            raise CatalogError(f"Unsafe wildcard at {path}:{line_number}: {token}")
        if not TOKEN_PATTERN.fullmatch(token):
            raise CatalogError(f"Invalid host token at {path}:{line_number}: {token}")

        normalized = token.casefold()
        if normalized in seen:
            raise CatalogError(
                f"Duplicate host token at {path}:{line_number}: {token} "
                f"(first seen on line {seen[normalized]})"
            )
        seen[normalized] = line_number
        hosts.append(token)

    if not hosts:
        raise CatalogError(f"Host catalog is empty: {path}")
    return hosts


def update_metadata(lines: list[str]) -> None:
    desc_matches = [index for index, line in enumerate(lines) if line.startswith("#!desc=")]
    version_matches = [index for index, line in enumerate(lines) if line.startswith("# 🏷️ Version:")]
    updated_matches = [index for index, line in enumerate(lines) if line.startswith("# 📅 Updated:")]
    if len(desc_matches) != 1 or len(version_matches) != 1 or len(updated_matches) != 1:
        raise CatalogError("Expected exactly one description, version, and update header")

    desc_index = desc_matches[0]
    updated_desc, replacements = re.subn(
        r"｜v[^|｜]+｜更新: [^|｜]+$",
        f"｜v{MODULE_VERSION}｜更新: {MODULE_UPDATED}",
        lines[desc_index],
    )
    if replacements != 1:
        raise CatalogError("Module description is missing the managed version suffix")
    lines[desc_index] = updated_desc
    lines[version_matches[0]] = f"# 🏷️ Version: {MODULE_VERSION}"
    lines[updated_matches[0]] = f"# 📅 Updated: {MODULE_UPDATED_LONG}"


def validate_module(path: Path, text: str, expected_system: str) -> None:
    lines = text.splitlines()
    systems = [line.removeprefix("#!system=") for line in lines if line.startswith("#!system=")]
    if systems != [expected_system]:
        raise CatalogError(
            f"Expected #!system={expected_system} in {path}, found {systems or 'none'}"
        )

    section_lines = [line for line in lines if SECTION_PATTERN.fullmatch(line)]
    sections = set(section_lines)
    duplicates = sorted(section for section in sections if section_lines.count(section) > 1)
    unexpected = sections - ALLOWED_SECTIONS[expected_system]
    missing = ALLOWED_SECTIONS[expected_system] - sections
    if unexpected or missing or duplicates:
        raise CatalogError(
            f"Unexpected module sections in {path}: missing={sorted(missing)}, "
            f"unexpected={sorted(unexpected)}, duplicates={duplicates}"
        )

    active_lines = [line.strip() for line in lines if line.strip() and not line.startswith("#")]
    if any(line.startswith("FINAL,") for line in active_lines):
        raise CatalogError(f"FINAL rule is not allowed in compatibility module: {path}")

    in_rule = False
    for line in lines:
        if SECTION_PATTERN.fullmatch(line):
            in_rule = line == "[Rule]"
            continue
        stripped = line.strip()
        if in_rule and stripped and not stripped.startswith("#") and ",DIRECT" not in stripped:
            raise CatalogError(f"Non-DIRECT routing rule in {path}: {stripped}")

    if expected_system == "ios" and any("PROCESS-NAME" in line for line in active_lines):
        raise CatalogError(f"PROCESS-NAME is not allowed in iOS module: {path}")
    if expected_system == "mac":
        required_process_paths = (
            "/Applications/Lark.app/",
            "/Applications/Feishu.app/",
        )
        for process_path in required_process_paths:
            matches = [
                line
                for line in active_lines
                if "PROCESS-NAME" in line
                and process_path in line
                and "RULE-SET,FeishuSharedInfra" in line
            ]
            if len(matches) != 1:
                raise CatalogError(
                    f"Expected one scoped Feishu process rule for {process_path} in {path}"
                )


def render_module(
    path: Path, generated_line: str, expected_system: str, check_only: bool
) -> bool:
    original = path.read_text(encoding="utf-8")
    lines = original.splitlines()
    update_metadata(lines)
    matches = [index for index, line in enumerate(lines) if line.startswith("always-real-ip =")]
    if len(matches) != 1:
        raise CatalogError(
            f"Expected exactly one always-real-ip field in {path}, found {len(matches)}"
        )

    lines[matches[0]] = generated_line
    rendered = "\n".join(lines) + "\n"
    validate_module(path, rendered, expected_system)
    changed = rendered != original

    if check_only:
        if changed:
            raise CatalogError(f"Generated module is stale: {path}")
    elif changed:
        path.write_text(rendered, encoding="utf-8")
    return changed


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build Real IP Surge modules from the canonical categorized host catalog."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate that committed modules match the canonical catalog without writing files.",
    )
    args = parser.parse_args()

    try:
        hosts = load_hosts(HOST_CATALOG)
        generated_line = VALUE_PREFIX + ", ".join(hosts)
        changed = [
            render_module(path, generated_line, system, args.check)
            for path, system in MODULE_TARGETS
        ]
    except (CatalogError, OSError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    action = "validated" if args.check else "generated"
    changed_count = sum(changed)
    print(
        f"{action}: {len(hosts)} unique host tokens, "
        f"{len(MODULE_TARGETS)} modules, {changed_count} changed"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

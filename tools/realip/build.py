#!/usr/bin/env python3
"""Build and validate the Real IP Surge modules from the canonical host list."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
HOST_CATALOG = REPOSITORY_ROOT / "neorulset26/modules/realip.list"
MODULE_PATHS = (
    REPOSITORY_ROOT / "neorulset26/modules/realip.sgmodule",
    REPOSITORY_ROOT / "neorulset26/modules/realip-ios.sgmodule",
)
VALUE_PREFIX = "always-real-ip = %APPEND% "
TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_*?.-]+$")
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


def render_module(path: Path, generated_line: str, check_only: bool) -> bool:
    original = path.read_text(encoding="utf-8")
    lines = original.splitlines()
    matches = [index for index, line in enumerate(lines) if line.startswith("always-real-ip =")]
    if len(matches) != 1:
        raise CatalogError(
            f"Expected exactly one always-real-ip field in {path}, found {len(matches)}"
        )

    lines[matches[0]] = generated_line
    rendered = "\n".join(lines) + "\n"
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
        changed = [render_module(path, generated_line, args.check) for path in MODULE_PATHS]
    except (CatalogError, OSError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    action = "validated" if args.check else "generated"
    changed_count = sum(changed)
    print(
        f"{action}: {len(hosts)} unique host tokens, "
        f"{len(MODULE_PATHS)} modules, {changed_count} changed"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

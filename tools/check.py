#!/usr/bin/env python3
"""Read-only repository checks. Python and Node standard libraries only."""
import collections
import ipaddress
import pathlib
import re
import subprocess
import sys
from urllib.parse import unquote, urlsplit

ROOT = pathlib.Path(__file__).resolve().parents[1]


def main():
    files = subprocess.check_output(
        ['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
        cwd=ROOT).decode().split('\0')
    files = sorted(set(f for f in files if f and (ROOT / f).is_file()))
    errors = []
    ownership = collections.defaultdict(set)
    total = 0
    types = {'DOMAIN', 'DOMAIN-SUFFIX', 'DOMAIN-KEYWORD', 'IP-CIDR',
             'IP-CIDR6', 'PROCESS-NAME', 'USER-AGENT', 'URL-REGEX'}
    for filename in files:
        path = ROOT / filename
        if filename.endswith('.list') and '/modules/' not in filename:
            seen = set()
            for number, line in enumerate(path.read_text().splitlines(), 1):
                line = line.strip()
                if not line or line.startswith(('#', '//', ';')):
                    continue
                total += 1
                parts = [part.strip() for part in line.split(',')]
                key = tuple(parts[:2])
                location = f'{filename}:{number}'
                if len(parts) < 2 or parts[0] not in types or not parts[1]:
                    errors.append(f'{location}: unsupported or incomplete rule')
                    continue
                if key in seen:
                    errors.append(f'{location}: duplicate rule key')
                seen.add(key)
                ownership[key].add(filename)
                if parts[0] in ('IP-CIDR', 'IP-CIDR6'):
                    try:
                        network = ipaddress.ip_network(parts[1], strict=True)
                        expected = 6 if parts[0] == 'IP-CIDR6' else 4
                        if network.version != expected:
                            raise ValueError('address family mismatch')
                    except ValueError as error:
                        errors.append(f'{location}: {error}')
        if filename.endswith('.md'):
            # Check local file targets, not remote availability or heading anchors.
            for match in re.finditer(r'\]\((<[^>]+>|[^)]+)\)', path.read_text()):
                target = match[1].strip().strip('<>')
                parsed = urlsplit(target)
                if parsed.scheme or parsed.netloc or not parsed.path:
                    continue
                if not (path.parent / unquote(parsed.path)).exists():
                    errors.append(f'{filename}: missing relative link {target}')
    overlaps = sum(len(owners) > 1 for owners in ownership.values())
    print(f'Rules: {total}; cross-file overlapping keys: {overlaps} (informational)', flush=True)
    for error in errors:
        print(error, file=sys.stderr)
    if errors:
        return 1
    commands = [
        [sys.executable, 'tools/realip/build.py', '--check'],
        [sys.executable, 'tools/realip/test_build.py'],
        ['node', '--test', 'tools/edge204/worker.test.mjs',
         'tools/doh-fallback-worker/worker.test.mjs'],
        ['git', 'diff', '--check'],
    ]
    for command in commands:
        subprocess.run(command, cwd=ROOT, check=True, timeout=120)
    print('Repository checks passed. Live routing and device tests remain separate.')
    return 0


if __name__ == '__main__':
    sys.exit(main())

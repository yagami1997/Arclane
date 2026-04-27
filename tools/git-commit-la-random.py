#!/usr/bin/env python3
"""Run git commit with a randomized Los Angeles working-hours timestamp."""

from __future__ import annotations

import os
import random
import subprocess
import sys
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo


LA_TZ = ZoneInfo("America/Los_Angeles")
WORK_START = time(8, 0, 0)
WORK_END_SECONDS = (22 * 60 * 60) + (59 * 60) + 59


def random_la_timestamp(now: datetime) -> str:
    now = now.astimezone(LA_TZ)
    today = now.date()
    now_seconds = (now.hour * 60 * 60) + (now.minute * 60) + now.second
    start_seconds = (WORK_START.hour * 60 * 60) + (WORK_START.minute * 60) + WORK_START.second

    if now_seconds < start_seconds:
        target_date = today - timedelta(days=1)
        latest_second = WORK_END_SECONDS
    elif now_seconds > WORK_END_SECONDS:
        target_date = today
        latest_second = WORK_END_SECONDS
    else:
        target_date = today
        latest_second = now_seconds

    chosen_second = random.randint(start_seconds, latest_second)
    chosen = datetime.combine(target_date, time(), tzinfo=LA_TZ) + timedelta(seconds=chosen_second)
    return chosen.isoformat(timespec="seconds")


def main() -> int:
    if not sys.argv[1:]:
        print("usage: git commit-la [git commit arguments...]", file=sys.stderr)
        return 2

    commit_date = random_la_timestamp(datetime.now(tz=LA_TZ))
    env = os.environ.copy()
    env["GIT_AUTHOR_DATE"] = commit_date
    env["GIT_COMMITTER_DATE"] = commit_date

    print(f"Using LA commit timestamp: {commit_date}", file=sys.stderr)
    return subprocess.call(["git", "commit", *sys.argv[1:]], env=env)


if __name__ == "__main__":
    raise SystemExit(main())

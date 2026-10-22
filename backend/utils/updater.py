"""Self-update helpers: check the tracked git branch for new commits and pull them.

Restarting is handled by deploy.py, which watches for RESTART_FLAG_FILE while
the production server runs and re-executes itself (reinstall, migrate, rebuild,
relaunch) when the file appears.
"""

import os
import subprocess

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
RESTART_FLAG_FILE = os.path.join(BACKEND_DIR, ".restart-requested")

# Set by deploy.py on the server process so the app knows a supervisor will
# rebuild and relaunch it after an update.
SUPERVISED_ENV_VAR = "AERIE_UPDATE_SUPERVISED"
# Also set by deploy.py, unique per server launch. Clients compare it before and
# after an update to tell when the relaunched server is answering.
SERVER_INSTANCE_ENV_VAR = "AERIE_SERVER_INSTANCE"

GIT_TIMEOUT_SECONDS = 120


class UpdateError(Exception):
    """Raised when a git operation needed for updating fails."""


def _git(*args: str, timeout: int = GIT_TIMEOUT_SECONDS) -> str:
    """Run a git command in the project root and return stripped stdout."""
    env = os.environ.copy()
    # Never block a web request waiting for credentials.
    env["GIT_TERMINAL_PROMPT"] = "0"
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=PROJECT_ROOT,
            env=env,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as e:
        raise UpdateError(f"git {args[0]} failed: {e}") from e

    if result.returncode != 0:
        message = result.stderr.strip() or result.stdout.strip()
        raise UpdateError(f"git {args[0]} failed: {message}")
    return result.stdout.strip()


def _get_upstream() -> str | None:
    """Return the upstream ref (e.g. origin/main) of the current branch, if any."""
    try:
        return _git("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}")
    except UpdateError:
        return None


def _list_commits(revision_range: str) -> list[dict]:
    output = _git("log", "--format=%h%x09%an%x09%s", revision_range)
    commits = []
    for line in output.splitlines():
        short_hash, author, subject = line.split("\t", 2)
        commits.append({"hash": short_hash, "author": author, "subject": subject})
    return commits


def can_restart() -> bool:
    """Whether a supervisor (deploy.py) will relaunch the server after an update."""
    return os.environ.get(SUPERVISED_ENV_VAR) == "1"


def get_update_status() -> dict:
    """Describe whether self-update is available for this installation."""
    upstream = _get_upstream()
    if upstream is None:
        return {"enabled": False}

    return {
        "enabled": True,
        "branch": _git("rev-parse", "--abbrev-ref", "HEAD"),
        "upstream": upstream,
        "commit": _git("rev-parse", "--short", "HEAD"),
        "can_restart": can_restart(),
        "server_instance": os.environ.get(SERVER_INSTANCE_ENV_VAR),
    }


def check_for_updates() -> dict:
    """Fetch the upstream branch and list commits not yet pulled."""
    status = get_update_status()
    if not status["enabled"]:
        raise UpdateError("Backend is not in a git repository tracking a remote branch")

    remote = status["upstream"].split("/", 1)[0]
    _git("fetch", "--quiet", remote)

    return {
        **status,
        "latest_commit": _git("rev-parse", "--short", "@{u}"),
        "commits": _list_commits("HEAD..@{u}"),
    }


def pull_updates() -> dict:
    """Fast-forward the current branch to its upstream.

    Returns:
        dict: The commit before and after the pull.
    """
    if _get_upstream() is None:
        raise UpdateError("Backend is not in a git repository tracking a remote branch")

    previous_commit = _git("rev-parse", "--short", "HEAD")
    _git("pull", "--ff-only")
    return {
        "previous_commit": previous_commit,
        "commit": _git("rev-parse", "--short", "HEAD"),
    }


def request_restart() -> None:
    """Ask deploy.py to rebuild and relaunch the application."""
    with open(RESTART_FLAG_FILE, "w") as f:
        f.write("restart\n")

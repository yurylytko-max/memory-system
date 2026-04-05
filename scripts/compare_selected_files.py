import hashlib
import json
import os
import sys


REPO = "/Users/user/Documents/memory-system"


def blob_sha(path: str) -> str:
    with open(os.path.join(REPO, path), "rb") as fh:
        data = fh.read()
    return hashlib.sha1((f"blob {len(data)}\0").encode() + data).hexdigest()


def main() -> int:
    if len(sys.argv) < 3:
        raise SystemExit("usage: compare_selected_files.py <tree-json> <path> [<path> ...]")

    with open(sys.argv[1], "r", encoding="utf-8") as fh:
        tree = json.load(fh)["tree"]

    remote = {item["path"]: item["sha"] for item in tree if item.get("type") == "blob"}

    for path in sys.argv[2:]:
        if not os.path.exists(os.path.join(REPO, path)):
            print(f"D {path}")
            continue
        local_sha = blob_sha(path)
        remote_sha = remote.get(path)
        if remote_sha is None:
            print(f"A {path}")
        elif remote_sha != local_sha:
            print(f"M {path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

import json
import os
import sys


REPO = "/Users/user/Documents/memory-system"


def main() -> int:
    if len(sys.argv) < 3:
        raise SystemExit("usage: build_github_tree_payload.py <base_tree_sha> <path> [<path> ...]")

    base_tree = sys.argv[1]
    paths = sys.argv[2:]
    tree = []

    for rel_path in paths:
      full_path = os.path.join(REPO, rel_path)
      with open(full_path, "r", encoding="utf-8") as fh:
        tree.append(
          {
            "path": rel_path,
            "mode": "100644",
            "type": "blob",
            "content": fh.read(),
          }
        )

    print(json.dumps({"base_tree": base_tree, "tree": tree}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

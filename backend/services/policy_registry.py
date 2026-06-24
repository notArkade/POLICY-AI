import json
from datetime import datetime, timezone
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
REGISTRY_PATH = BASE_DIR / "vectordb" / "policies.json"


def _read_registry():
    if not REGISTRY_PATH.exists():
        return []

    with REGISTRY_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def _write_registry(policies):
    REGISTRY_PATH.parent.mkdir(parents=True, exist_ok=True)
    with REGISTRY_PATH.open("w", encoding="utf-8") as file:
        json.dump(policies, file, indent=2)


def add_policy(policy):
    policies = _read_registry()
    record = {
        **policy,
        "upload_date": datetime.now(timezone.utc).isoformat(),
    }
    policies.insert(0, record)
    _write_registry(policies)
    return record


def list_policies():
    return _read_registry()


def get_policy(policy_id):
    for policy in _read_registry():
        if policy["id"] == policy_id:
            return policy
    return None


def delete_policy(policy_id):
    policies = _read_registry()
    next_policies = [policy for policy in policies if policy["id"] != policy_id]
    _write_registry(next_policies)
    return len(next_policies) != len(policies)

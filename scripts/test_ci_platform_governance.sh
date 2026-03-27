#!/usr/bin/env bash
set -euo pipefail

python3 scripts/check_ci_governance_policy.py
python3 scripts/check_ci_supply_chain_policy.py
python3 scripts/check_ci_runner_drift.py --mode report
bash scripts/test_ci_disaster_drill.sh

echo "all ci platform governance cases passed"

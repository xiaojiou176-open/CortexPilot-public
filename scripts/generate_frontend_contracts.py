#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OPENAPI_PATH = ROOT / "docs" / "api" / "openapi.cortexpilot.json"
CONTRACT_DIR = ROOT / "packages" / "frontend-api-contract"
GENERATED_DIR = CONTRACT_DIR / "generated"


def _load_contract_extension() -> dict:
    payload = json.loads(OPENAPI_PATH.read_text(encoding="utf-8"))
    ext = payload.get("x-cortexpilot-frontend-contract")
    if not isinstance(ext, dict):
        raise SystemExit(f"missing x-cortexpilot-frontend-contract in {OPENAPI_PATH}")
    return ext


def _json_js(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


def _tuple_union(values: list[str]) -> tuple[str, str]:
    tuple_literal = ", ".join(f'"{item}"' for item in values)
    union_literal = " | ".join(f'"{item}"' for item in values)
    return tuple_literal, union_literal


def build_index_js(ext: dict) -> str:
    ui_flow = ext["uiFlow"]
    return f"""// GENERATED FILE. DO NOT EDIT.
// Source: docs/api/openapi.cortexpilot.json

export const FRONTEND_API_CONTRACT = { _json_js({
    "defaultApiBase": ext["defaultApiBase"],
    "envKeys": ext["envKeys"],
    "headers": ext["headers"],
    "network": ext["network"],
    "query": ext["query"],
    "paths": ext["paths"],
}) };

export const PM_SESSION_SORT_OPTIONS = { _json_js(ext["pmSessionSortOptions"]) };

function normalizeToken(value, defaultToken) {{
  const token = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (token) return token;
  return defaultToken ? defaultToken.trim().toLowerCase() : "";
}}

export function mapBadgeByToken(token, mapping, fallback, defaultToken) {{
  const normalized = normalizeToken(token, defaultToken);
  if (normalized && Object.prototype.hasOwnProperty.call(mapping, normalized)) {{
    return mapping[normalized];
  }}
  return fallback;
}}

export * from "./ui-flow.js";
"""


def build_index_cjs(ext: dict) -> str:
    return f"""// GENERATED FILE. DO NOT EDIT.
// Source: docs/api/openapi.cortexpilot.json

"use strict";

const uiFlow = require("./ui-flow.cjs");

const FRONTEND_API_CONTRACT = { _json_js({
    "defaultApiBase": ext["defaultApiBase"],
    "envKeys": ext["envKeys"],
    "headers": ext["headers"],
    "network": ext["network"],
    "query": ext["query"],
    "paths": ext["paths"],
}) };

const PM_SESSION_SORT_OPTIONS = { _json_js(ext["pmSessionSortOptions"]) };

function normalizeToken(value, defaultToken) {{
  const token = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (token) return token;
  return defaultToken ? defaultToken.trim().toLowerCase() : "";
}}

function mapBadgeByToken(token, mapping, fallback, defaultToken) {{
  const normalized = normalizeToken(token, defaultToken);
  if (normalized && Object.prototype.hasOwnProperty.call(mapping, normalized)) {{
    return mapping[normalized];
  }}
  return fallback;
}}

module.exports = {{
  FRONTEND_API_CONTRACT,
  PM_SESSION_SORT_OPTIONS,
  mapBadgeByToken,
  ...uiFlow,
}};
"""


def build_index_dts(ext: dict) -> str:
    sort_tuple, sort_union = _tuple_union(ext["pmSessionSortOptions"])
    return f"""// GENERATED FILE. DO NOT EDIT.
// Source: docs/api/openapi.cortexpilot.json

export declare const FRONTEND_API_CONTRACT: {{
  readonly defaultApiBase: "{ext["defaultApiBase"]}";
  readonly envKeys: readonly [
    {", ".join(f'"{item}"' for item in ext["envKeys"])}
  ];
  readonly headers: {{
    readonly requestId: "{ext["headers"]["requestId"]}";
    readonly traceId: "{ext["headers"]["traceId"]}";
    readonly traceparent: "{ext["headers"]["traceparent"]}";
    readonly runId: "{ext["headers"]["runId"]}";
  }};
  readonly network: {{
    readonly fetchCredentials: "{ext["network"]["fetchCredentials"]}";
    readonly eventSourceWithCredentials: {str(ext["network"]["eventSourceWithCredentials"]).lower()};
  }};
  readonly query: {{
    readonly status: "{ext["query"]["status"]}";
    readonly statusArray: "{ext["query"]["statusArray"]}";
    readonly types: "{ext["query"]["types"]}";
    readonly typesArray: "{ext["query"]["typesArray"]}";
    readonly runIds: "{ext["query"]["runIds"]}";
    readonly runIdsArray: "{ext["query"]["runIdsArray"]}";
  }};
  readonly paths: {{
    readonly commandTowerOverview: "{ext["paths"]["commandTowerOverview"]}";
    readonly commandTowerAlerts: "{ext["paths"]["commandTowerAlerts"]}";
    readonly pmSessions: "{ext["paths"]["pmSessions"]}";
    readonly pmSessionMessages: "{ext["paths"]["pmSessionMessages"]}";
  }};
}};
export declare const PM_SESSION_SORT_OPTIONS: readonly [{sort_tuple}];
export type PmSessionSort = {sort_union};
export type BadgeTone = "running" | "warning" | "completed" | "critical";
export type BadgePresentation = {{
  tone: BadgeTone;
  label: string;
}};
export declare function mapBadgeByToken(
  token: string | undefined | null,
  mapping: Readonly<Record<string, BadgePresentation>>,
  fallback: BadgePresentation,
  defaultToken?: string,
): BadgePresentation;
export type FrontendApiContract = typeof FRONTEND_API_CONTRACT;
export {{
  PM_JOURNEY_STAGES,
  COMMAND_TOWER_PRIORITY_LANES,
  DESKTOP_WORK_MODES,
}} from "./ui-flow";
export type {{
  PmJourneyStage,
  PmJourneyContext,
  CommandTowerPriorityLane,
  DesktopWorkMode,
}} from "./ui-flow";
"""


def build_ui_flow_js(ext: dict) -> str:
    ui_flow = ext["uiFlow"]
    return f"""// GENERATED FILE. DO NOT EDIT.
// Source: docs/api/openapi.cortexpilot.json

export const PM_JOURNEY_STAGES = { _json_js(ui_flow["pmJourneyStages"]) };
export const COMMAND_TOWER_PRIORITY_LANES = { _json_js(ui_flow["commandTowerPriorityLanes"]) };
export const DESKTOP_WORK_MODES = { _json_js(ui_flow["desktopWorkModes"]) };
"""


def build_ui_flow_cjs(ext: dict) -> str:
    ui_flow = ext["uiFlow"]
    return f"""// GENERATED FILE. DO NOT EDIT.
// Source: docs/api/openapi.cortexpilot.json

"use strict";

const PM_JOURNEY_STAGES = { _json_js(ui_flow["pmJourneyStages"]) };
const COMMAND_TOWER_PRIORITY_LANES = { _json_js(ui_flow["commandTowerPriorityLanes"]) };
const DESKTOP_WORK_MODES = { _json_js(ui_flow["desktopWorkModes"]) };

module.exports = {{
  PM_JOURNEY_STAGES,
  COMMAND_TOWER_PRIORITY_LANES,
  DESKTOP_WORK_MODES,
}};
"""


def build_ui_flow_dts(ext: dict) -> str:
    ui_flow = ext["uiFlow"]
    stages_tuple, stages_union = _tuple_union(ui_flow["pmJourneyStages"])
    lanes_tuple, lanes_union = _tuple_union(ui_flow["commandTowerPriorityLanes"])
    modes_tuple, modes_union = _tuple_union(ui_flow["desktopWorkModes"])
    return f"""// GENERATED FILE. DO NOT EDIT.
// Source: docs/api/openapi.cortexpilot.json

export declare const PM_JOURNEY_STAGES: readonly [{stages_tuple}];
export type PmJourneyStage = {stages_union};

export type PmJourneyContext = {{
  stage: PmJourneyStage;
  reason: string;
  primaryAction: string;
  secondaryActions: string[];
}};

export declare const COMMAND_TOWER_PRIORITY_LANES: readonly [{lanes_tuple}];
export type CommandTowerPriorityLane = {lanes_union};

export declare const DESKTOP_WORK_MODES: readonly [{modes_tuple}];
export type DesktopWorkMode = {modes_union};
"""


def main() -> int:
    ext = _load_contract_extension()
    outputs = {
        GENERATED_DIR / "index.js": build_index_js(ext),
        GENERATED_DIR / "index.cjs": build_index_cjs(ext),
        GENERATED_DIR / "index.d.ts": build_index_dts(ext),
        GENERATED_DIR / "ui-flow.js": build_ui_flow_js(ext),
        GENERATED_DIR / "ui-flow.cjs": build_ui_flow_cjs(ext),
        GENERATED_DIR / "ui-flow.d.ts": build_ui_flow_dts(ext),
    }
    for path, content in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    print("generated frontend api contract artifacts from docs/api/openapi.cortexpilot.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

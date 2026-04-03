import { pathToFileURL } from "node:url";

import { createControlPlaneStarter, createDashboardApiClient } from "../index.js";

function cleanText(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function buildPreviewPayload({
  systemPromptRef = "",
  skillsBundleRef = "",
  mcpBundleRef = "",
  runner = "",
  provider = "",
  model = "",
} = {}) {
  const cleanedSystemPromptRef = cleanText(systemPromptRef);
  const cleanedSkillsBundleRef = cleanText(skillsBundleRef);
  const cleanedMcpBundleRef = cleanText(mcpBundleRef);
  const cleanedRunner = cleanText(runner);
  const cleanedProvider = cleanText(provider);
  const cleanedModel = cleanText(model);

  const hasPreviewValues =
    cleanedSystemPromptRef ||
    cleanedSkillsBundleRef ||
    cleanedMcpBundleRef ||
    cleanedRunner ||
    cleanedProvider ||
    cleanedModel;
  if (!hasPreviewValues) {
    return null;
  }

  return {
    system_prompt_ref: cleanedSystemPromptRef || null,
    skills_bundle_ref: cleanedSkillsBundleRef || null,
    mcp_bundle_ref: cleanedMcpBundleRef || null,
    runtime_binding: {
      runner: cleanedRunner || null,
      provider: cleanedProvider || null,
      model: cleanedModel || null,
    },
  };
}

export async function runControlPlaneStarterExample({
  baseUrl = "http://127.0.0.1:10000",
  role = "WORKER",
  previewPayload = null,
  shouldApply = false,
  resolveToken,
  mutationRole = "TECH_LEAD",
  fetchImpl,
} = {}) {
  const normalizedRole = cleanText(role) || "WORKER";
  const normalizedMutationRole = cleanText(mutationRole);
  const client = createDashboardApiClient({
    baseUrl,
    fetchImpl,
    resolveToken,
    resolveMutationRole: normalizedMutationRole
      ? () => normalizedMutationRole
      : () => undefined,
  });
  const starter = createControlPlaneStarter(client);
  const bootstrap = await starter.fetchBootstrap({ role: normalizedRole });
  const preview = previewPayload
    ? await starter.previewRoleDefaults(normalizedRole, previewPayload)
    : null;
  if (shouldApply && !previewPayload) {
    throw new TypeError(
      "control_plane_starter.local requires preview payload values before apply is enabled.",
    );
  }
  const applied =
    shouldApply && previewPayload
      ? await starter.applyRoleDefaults(normalizedRole, previewPayload)
      : null;
  return {
    role: normalizedRole,
    baseUrl,
    bootstrap,
    preview,
    applied,
    boundary: {
      starter_surface: "repo-owned-control-plane-starter",
      mcp_boundary: "read-only",
      execution_authority: "task_contract",
      apply_supported_via_client: true,
      note: "This starter defaults to bootstrap + preview. Apply only runs when the caller opts in and the same operator policy allows repo-owned default changes.",
    },
  };
}

function isDirectRun() {
  const currentArg = process.argv[1];
  if (!currentArg) {
    return false;
  }
  return import.meta.url === pathToFileURL(currentArg).href;
}

function parseCliArgs(argv = process.argv.slice(2)) {
  const options = {
    baseUrl: "http://127.0.0.1:10000",
    role: "WORKER",
    mutationRole: "TECH_LEAD",
    token: "",
    previewRunner: "",
    previewProvider: "",
    previewModel: "",
    previewSystemPromptRef: "",
    previewSkillsBundleRef: "",
    previewMcpBundleRef: "",
    apply: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];
    if (current === "--apply") {
      options.apply = true;
      continue;
    }
    if (!current.startsWith("--")) {
      continue;
    }
    const [rawKey, inlineValue] = current.slice(2).split("=", 2);
    const value = inlineValue ?? next ?? "";
    const consumeNext = inlineValue === undefined;
    switch (rawKey) {
      case "base-url":
        options.baseUrl = value;
        break;
      case "role":
        options.role = value;
        break;
      case "mutation-role":
        options.mutationRole = value;
        break;
      case "token":
        options.token = value;
        break;
      case "preview-runner":
        options.previewRunner = value;
        break;
      case "preview-provider":
        options.previewProvider = value;
        break;
      case "preview-model":
        options.previewModel = value;
        break;
      case "preview-system-prompt-ref":
        options.previewSystemPromptRef = value;
        break;
      case "preview-skills-bundle-ref":
        options.previewSkillsBundleRef = value;
        break;
      case "preview-mcp-bundle-ref":
        options.previewMcpBundleRef = value;
        break;
      default:
        break;
    }
    if (consumeNext) {
      index += 1;
    }
  }
  return options;
}

if (isDirectRun()) {
  const cli = parseCliArgs();
  const result = await runControlPlaneStarterExample({
    baseUrl: cleanText(cli.baseUrl) || "http://127.0.0.1:10000",
    role: cleanText(cli.role) || "WORKER",
    previewPayload: buildPreviewPayload({
      systemPromptRef: cli.previewSystemPromptRef,
      skillsBundleRef: cli.previewSkillsBundleRef,
      mcpBundleRef: cli.previewMcpBundleRef,
      runner: cli.previewRunner,
      provider: cli.previewProvider,
      model: cli.previewModel,
    }),
    shouldApply: cli.apply,
    resolveToken: () => cleanText(cli.token) || cleanText(process.env.CORTEXPILOT_API_TOKEN) || undefined,
    mutationRole: cleanText(cli.mutationRole) || "TECH_LEAD",
  });
  console.log(JSON.stringify(result, null, 2));
}

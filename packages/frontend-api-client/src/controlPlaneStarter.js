function assertFrontendApiClient(client) {
  if (!client || typeof client !== "object") {
    throw new TypeError("Control plane starter requires a frontend API client instance.");
  }
  const requiredMethods = [
    "fetchCommandTowerOverview",
    "fetchAgents",
    "fetchContracts",
    "fetchRoleConfig",
    "previewRoleConfig",
    "applyRoleConfig",
  ];
  for (const method of requiredMethods) {
    if (typeof client[method] !== "function") {
      throw new TypeError(`Control plane starter requires client.${method}().`);
    }
  }
}

function normalizeRole(role) {
  return typeof role === "string" ? role.trim() : "";
}

export function createControlPlaneStarter(client) {
  assertFrontendApiClient(client);

  async function fetchBootstrap(options = {}) {
    const normalizedRole = normalizeRole(options.role);
    const [overview, agents, contracts, roleConfig] = await Promise.all([
      client.fetchCommandTowerOverview(options.requestOptions),
      client.fetchAgents(),
      client.fetchContracts(),
      normalizedRole ? client.fetchRoleConfig(normalizedRole) : Promise.resolve(null),
    ]);
    return {
      overview,
      agents,
      contracts,
      roleConfig,
      role: normalizedRole || null,
    };
  }

  async function fetchRoleWorkspace(role) {
    const normalizedRole = normalizeRole(role);
    if (!normalizedRole) {
      throw new TypeError("Control plane starter requires a non-empty role.");
    }
    const [agents, contracts, roleConfig] = await Promise.all([
      client.fetchAgents(),
      client.fetchContracts(),
      client.fetchRoleConfig(normalizedRole),
    ]);
    return {
      role: normalizedRole,
      agents,
      contracts,
      roleConfig,
    };
  }

  return {
    fetchBootstrap,
    fetchRoleWorkspace,
    previewRoleDefaults(role, payload = {}) {
      return client.previewRoleConfig(normalizeRole(role), payload);
    },
    applyRoleDefaults(role, payload = {}) {
      return client.applyRoleConfig(normalizeRole(role), payload);
    },
  };
}

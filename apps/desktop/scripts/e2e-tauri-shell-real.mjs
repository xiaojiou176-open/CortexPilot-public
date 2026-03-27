import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import net from "node:net";

const desktopDir = resolve(process.cwd());
const repoRoot = resolve(desktopDir, "..", "..");
const outputDir = resolve(repoRoot, ".runtime-cache", "test_output", "desktop_trust");
mkdirSync(outputDir, { recursive: true });

const reportPath = resolve(outputDir, "tauri_shell_real.json");
const screenshotPath = resolve(outputDir, "tauri_shell_real.png");
const apiLogPath = resolve(outputDir, "tauri_shell_real_api.log");
const tauriLogPath = resolve(outputDir, "tauri_shell_real_tauri.log");

function resolvePythonBin() {
  const candidates = [
    String(process.env.CORTEXPILOT_PYTHON || "").trim(),
    resolve(repoRoot, ".runtime-cache", "cache", "toolchains", "python", "current", "bin", "python"),
    resolve(repoRoot, ".venv", "bin", "python"),
  ].filter(Boolean);
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`python runtime not found; checked: ${candidates.join(", ")}`);
  }
  return found;
}

function isPortAvailable(port) {
  return new Promise((resolveCheck) => {
    const server = net.createServer();
    server.once("error", () => resolveCheck(false));
    server.once("listening", () => {
      server.close(() => resolveCheck(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function findAvailablePort(startPort = 10000, maxProbe = 100) {
  for (let port = startPort; port < startPort + maxProbe; port += 1) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`no available port found in range ${startPort}-${startPort + maxProbe - 1}`);
}

function waitForHttpReady(url, timeoutMs = 60000, expectedStatuses = [200], headers = {}) {
  const start = Date.now();
  return new Promise((resolveWait, rejectWait) => {
    const probe = async () => {
      try {
        const res = await fetch(url, { headers });
        if (expectedStatuses.includes(res.status)) {
          resolveWait(true);
          return;
        }
      } catch {
        // retry
      }
      if (Date.now() - start > timeoutMs) {
        rejectWait(new Error(`server not ready: ${url}`));
        return;
      }
      setTimeout(probe, 500);
    };
    void probe();
  });
}

async function waitFor(checkFn, timeoutMs = 15000, intervalMs = 400) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const value = await checkFn();
      if (value) return true;
    } catch {
      // retry
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, intervalMs));
  }
  return false;
}

function runCommand(cmd, args, options = {}) {
  return new Promise((resolveRun) => {
    const child = spawn(cmd, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      resolveRun({ code: code ?? 1, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

async function getPidsByPort(port) {
  const result = await runCommand("lsof", ["-ti", `tcp:${port}`]);
  if (result.code !== 0) return [];
  return String(result.stdout || "")
    .split("\n")
    .map((line) => Number.parseInt(line.trim(), 10))
    .filter((pid) => Number.isInteger(pid) && pid > 0);
}

async function waitForPortClosed(port, timeoutMs = 6000, intervalMs = 300) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const pids = await getPidsByPort(port);
    if (pids.length === 0) return true;
    await new Promise((resolveWait) => setTimeout(resolveWait, intervalMs));
  }
  return false;
}

async function killPids(pids, signal) {
  for (const pid of pids) {
    try {
      process.kill(pid, signal);
    } catch {
      // ignore dead/inaccessible process
    }
  }
}

async function forceKillPortOwners(port) {
  const pids = await getPidsByPort(port);
  if (pids.length === 0) return { cleaned: true, remainingPids: [] };
  await killPids(pids, "SIGTERM");
  await new Promise((resolveWait) => setTimeout(resolveWait, 800));
  let remaining = await getPidsByPort(port);
  if (remaining.length > 0) {
    await killPids(remaining, "SIGKILL");
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
    remaining = await getPidsByPort(port);
  }
  return { cleaned: remaining.length === 0, remainingPids: remaining };
}

async function cleanupStaleRepoDesktopVite() {
  const ps = await runCommand("ps", ["-Ao", "pid=,command="]);
  if (ps.code !== 0) return { cleaned: true, killedPids: [], detail: ps.stderr || "ps failed" };
  const lines = String(ps.stdout || "").split("\n");
  const killedPids = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(\d+)\s+(.+)$/);
    if (!match) continue;
    const pid = Number.parseInt(match[1], 10);
    const command = match[2];
    const isRepoDesktopVite =
      command.includes("/apps/desktop/node_modules/.bin/vite")
      && command.includes("--host 127.0.0.1")
      && command.includes("--port ");
    const isRepoDesktopNative = command.includes("/apps/desktop/src-tauri/target/debug/cortexpilot-desktop")
      || command.includes("target/debug/cortexpilot-desktop");
    if (!isRepoDesktopVite && !isRepoDesktopNative) continue;
    try {
      process.kill(pid, "SIGTERM");
      killedPids.push(pid);
    } catch {
      // ignore stale pid
    }
  }
  if (killedPids.length > 0) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 900));
  }
  return { cleaned: true, killedPids, detail: "ok" };
}

async function detectNativeWindow() {
  const listScript = [
    'tell application "System Events"',
    "set outNames to {}",
    'repeat with p in (every process whose background only is false)',
    "set end of outNames to (name of p as text)",
    "end repeat",
    "return outNames",
    "end tell",
  ];
  const namesResult = await runCommand("osascript", listScript.flatMap((line) => ["-e", line]));
  if (namesResult.code !== 0) {
    return {
      pass: false,
      foundProcess: false,
      windowCount: 0,
      processNames: [],
      matchedNames: [],
      detail: namesResult.stderr || namesResult.stdout || "osascript failed",
    };
  }
  const processNames = String(namesResult.stdout || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  const matchedNames = processNames.filter((name) => /cortexpilot|tauri/i.test(name));

  let windowCount = 0;
  for (const name of matchedNames) {
    const countScript = [
      'tell application "System Events"',
      `try`,
      `return count of windows of process ${JSON.stringify(name)} as text`,
      `on error`,
      `return "0"`,
      `end try`,
      "end tell",
    ];
    const countResult = await runCommand("osascript", countScript.flatMap((line) => ["-e", line]));
    const candidateCount = Number.parseInt(String(countResult.stdout || "0").trim(), 10) || 0;
    if (candidateCount > windowCount) windowCount = candidateCount;
  }
  const foundProcess = matchedNames.length > 0;
  const hasVisibleWindow = windowCount > 0;
  return {
    pass: foundProcess && hasVisibleWindow,
    foundProcess,
    hasVisibleWindow,
    windowCount,
    processNames: processNames.slice(0, 40),
    matchedNames,
    detail: "ok",
  };
}

async function detectCortexPilotDesktopRuntimeProcess() {
  const ps = await runCommand("ps", ["-Ao", "pid=,command="]);
  if (ps.code !== 0) {
    return { found: false, pids: [], commands: [], detail: ps.stderr || "ps failed" };
  }
  const lines = String(ps.stdout || "").split("\n");
  const hits = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(\d+)\s+(.+)$/);
    if (!match) continue;
    const pid = Number.parseInt(match[1], 10);
    const command = match[2];
    const isCortexPilotDesktopRuntime =
      command.includes("/apps/desktop/src-tauri/target/debug/cortexpilot-desktop")
      || /(^|\s)target\/debug\/cortexpilot-desktop(\s|$)/.test(command);
    if (!isCortexPilotDesktopRuntime) continue;
    hits.push({ pid, command });
  }
  return {
    found: hits.length > 0,
    pids: hits.map((item) => item.pid),
    commands: hits.map((item) => item.command),
    detail: "ok",
  };
}

async function stopProcess(child, timeoutMs = 8000) {
  if (!child) return;
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  if (typeof child.pid === "number" && child.pid > 0) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      // process group may not exist in all environments
    }
  }
  const exited = await new Promise((resolveExit) => {
    const timer = setTimeout(() => resolveExit(false), timeoutMs);
    child.once("close", () => {
      clearTimeout(timer);
      resolveExit(true);
    });
  });
  if (!exited && child.exitCode === null) {
    child.kill("SIGKILL");
    if (typeof child.pid === "number" && child.pid > 0) {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        // process group may not exist in all environments
      }
    }
    await new Promise((resolveExit) => {
      const timer = setTimeout(() => resolveExit(false), 3000);
      child.once("close", () => {
        clearTimeout(timer);
        resolveExit(true);
      });
    });
  }
}

async function run() {
  const requestedApiPort = Number.parseInt(String(process.env.CORTEXPILOT_E2E_API_PORT || ""), 10);
  const requestedTauriPort = Number.parseInt(String(process.env.CORTEXPILOT_E2E_TAURI_PORT || ""), 10);
  const apiPort = Number.isFinite(requestedApiPort) && requestedApiPort > 0
    ? requestedApiPort
    : await findAvailablePort(18700, 120);
  const tauriPort = Number.isFinite(requestedTauriPort) && requestedTauriPort > 0
    ? requestedTauriPort
    : await findAvailablePort(1430, 120);
  const apiBase = `http://127.0.0.1:${apiPort}`;
  const tauriWebBase = `http://127.0.0.1:${tauriPort}`;
  const apiToken = String(process.env.CORTEXPILOT_API_TOKEN || "cortexpilot-dev-token").trim();

  const report = {
    scenario: "tauri real shell e2e",
    started_at: new Date().toISOString(),
    mode: "tauri-real-shell",
    api_base_url: apiBase,
    tauri_dev_url: tauriWebBase,
    checks: [],
    screenshot_path: screenshotPath,
    api_log_path: apiLogPath,
    tauri_log_path: tauriLogPath,
    status: "failed",
    error: "",
  };

  const staleCleanup = await cleanupStaleRepoDesktopVite();
  report.checks.push({
    name: "preflight should cleanup stale desktop vite processes",
    expected: true,
    actual: staleCleanup.cleaned,
    pass: staleCleanup.cleaned === true,
    detail: staleCleanup,
  });

  const pythonBin = resolvePythonBin();
  const tauriConfig = JSON.stringify({
    build: {
      beforeDevCommand: `npm run dev -- --host 127.0.0.1 --port ${tauriPort}`,
      devUrl: `http://localhost:${tauriPort}`,
    },
  });

  const apiServer = spawn(
    pythonBin,
    ["-m", "cortexpilot_orch.cli", "serve", "--host", "127.0.0.1", "--port", String(apiPort)],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        PYTHONPATH: "apps/orchestrator/src",
        CORTEXPILOT_API_AUTH_REQUIRED: "true",
        CORTEXPILOT_API_TOKEN: apiToken,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let apiLog = "";
  apiServer.stdout.on("data", (chunk) => {
    apiLog += chunk.toString();
  });
  apiServer.stderr.on("data", (chunk) => {
    apiLog += chunk.toString();
  });

  const tauriProc = spawn(
    "npm",
    ["run", "tauri:dev", "--", "--config", tauriConfig],
    {
      cwd: desktopDir,
      detached: true,
      env: {
        ...process.env,
        VITE_CORTEXPILOT_API_BASE: apiBase,
        VITE_CORTEXPILOT_API_TOKEN: apiToken,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let tauriLog = "";
  tauriProc.stdout.on("data", (chunk) => {
    tauriLog += chunk.toString();
  });
  tauriProc.stderr.on("data", (chunk) => {
    tauriLog += chunk.toString();
  });

  try {
    await waitForHttpReady(
      `${apiBase}/api/intakes`,
      60000,
      [200],
      apiToken ? { Authorization: `Bearer ${apiToken}` } : {},
    );
    report.checks.push({
      name: "api should be ready",
      expected: true,
      actual: true,
      pass: true,
    });

    await waitForHttpReady(tauriWebBase, 90000, [200]);
    report.checks.push({
      name: "tauri embedded webview dev url should be reachable",
      expected: true,
      actual: true,
      pass: true,
    });

    const windowProbe = await detectNativeWindow();
    const tauriRuntimeStarted = /target\/debug\/cortexpilot-desktop/.test(tauriLog);
    const tauriRuntimeReady = tauriRuntimeStarted
      || await waitFor(async () => /target\/debug\/cortexpilot-desktop/.test(tauriLog), 30000, 500);
    const runtimeProcessProbe = await detectCortexPilotDesktopRuntimeProcess();
    const runtimeEvidencePass = Boolean(tauriRuntimeReady && runtimeProcessProbe.found === true);
    report.checks.push({
      name: "native tauri shell should be active (runtime+process strong evidence)",
      expected: true,
      actual: runtimeEvidencePass,
      pass: runtimeEvidencePass === true,
      detail: {
        ...(windowProbe || {}),
        pass: runtimeEvidencePass,
        tauriRuntimeStarted: tauriRuntimeReady,
        runtimeProcessProbe,
        windowCountDiagnostic: Number.isFinite(windowProbe?.windowCount) ? windowProbe.windowCount : 0,
        strictRule: "pass only when tauri runtime log observed AND runtime process exists; window metrics are diagnostic only",
      },
    });

    const screenResult = await runCommand("screencapture", ["-x", screenshotPath]);
    report.checks.push({
      name: "desktop screenshot should be captured",
      expected: 0,
      actual: screenResult.code,
      pass: screenResult.code === 0,
    });

    report.status = report.checks.every((c) => c.pass) ? "passed" : "failed";
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
  } finally {
    await stopProcess(tauriProc, 12000);
    await stopProcess(apiServer, 5000);
    const portReleased = await waitForPortClosed(tauriPort, 5000, 250);
    let cleanupDetail = { cleaned: portReleased, remainingPids: [] };
    if (!portReleased) {
      cleanupDetail = await forceKillPortOwners(tauriPort);
    }
    report.checks.push({
      name: "cleanup should release tauri dev port",
      expected: true,
      actual: cleanupDetail.cleaned,
      pass: cleanupDetail.cleaned === true,
      detail: cleanupDetail,
    });
    report.status = report.checks.every((c) => c.pass) ? "passed" : "failed";
    if (report.status !== "passed" && !report.error) {
      report.error = "one or more tauri shell checks failed";
    }
    report.finished_at = new Date().toISOString();
    writeFileSync(apiLogPath, apiLog, "utf8");
    writeFileSync(tauriLogPath, tauriLog, "utf8");
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }

  if (report.status !== "passed") {
    throw new Error(report.error || "one or more tauri shell checks failed");
  }
}

run().catch((error) => {
  console.error(
    "desktop tauri real shell e2e failed:",
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});

import { fireEvent, render, screen, within } from "@testing-library/react";
import { waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import * as desktopUi from "./lib/desktopUi";

vi.mock("@xyflow/react", () => {
  return {
    ReactFlow: ({ nodes, onNodeClick, children }: any) => (
      <div aria-label="mock-react-flow">
        {nodes.map((node: any) => (
          <button
            key={node.id}
            type="button"
            onClick={() => onNodeClick?.({} as never, node)}
          >
            {node.data?.label || node.id}
          </button>
        ))}
        {children}
      </div>
    ),
    MiniMap: () => <div data-testid="flow-minimap" />,
    Controls: () => <div data-testid="flow-controls" />,
    Background: () => <div data-testid="flow-background" />
  };
});

let fetchMock: ReturnType<typeof vi.fn>;

describe("Desktop command center shell", { timeout: 15000 }, () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true
    });
    fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (raw.includes("/api/command-tower/overview")) {
        return new Response(
          JSON.stringify({ total_sessions: 12, active_sessions: 4, failed_ratio: 0.08, blocked_sessions: 1 }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (raw.includes("/api/pm/sessions?") && init?.method !== "POST") {
        return new Response(
          JSON.stringify([
            { pm_session_id: "pm-live-1", status: "running", current_step: "reviewer" },
            { pm_session_id: "pm-live-2", status: "blocked", current_step: "worker" }
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (raw.includes("/api/command-tower/alerts")) {
        return new Response(JSON.stringify({ alerts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions/") && raw.includes("/messages") && init?.method === "POST") {
        return new Response(JSON.stringify({ pm_session_id: "pm-local", message: "TL 已拆解并派发执行。" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response("{}", { status: 404, headers: { "Content-Type": "application/json" } });
    });

    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function expectActiveSession(sessionId: string) {
    await waitFor(() => {
      expect(screen.getByLabelText("会话工具栏")).toHaveTextContent(`会话 ${sessionId}`);
    });
  }

  async function navigateToPmEntry(user?: ReturnType<typeof userEvent.setup>) {
    const pmEntry = await screen.findByRole("button", { name: "PM 入口" });
    if (user) {
      await user.click(pmEntry);
    } else {
      fireEvent.click(pmEntry);
    }
    await screen.findByLabelText("对话面板");
  }

  function expectTopbarTitle(title: string) {
    const topbar = document.querySelector(".topbar-title");
    expect(topbar).not.toBeNull();
    expect(topbar).toHaveTextContent(title);
  }

  async function startGeneration(user: ReturnType<typeof userEvent.setup>, content: string) {
    await user.type(screen.getByLabelText("继续对话"), content);
    await user.click(screen.getByRole("button", { name: "发送消息" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "停止生成" })).toBeEnabled();
    });
  }

  async function switchSessionWithHotkey(sessionKey: "1" | "2", sessionId: string) {
    fireEvent.keyDown(window, { key: sessionKey, metaKey: true });
    try {
      await expectActiveSession(sessionId);
    } catch {
      fireEvent.keyDown(window, { key: sessionKey, ctrlKey: true });
      await expectActiveSession(sessionId);
    }
  }

  it("renders workspace selector + chat + command chain", async () => {
    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);

    expect(screen.getByRole("main", { name: "CortexPilot Command Tower 桌面指挥台" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "跳到主内容" })).toHaveAttribute("href", "#desktop-main-content");
    expect(screen.getByLabelText("对话面板")).toBeInTheDocument();
    expect(screen.getByLabelText("会话工具栏")).toBeInTheDocument();
    expect(screen.getByLabelText("会话消息")).toBeInTheDocument();
    expect(await screen.findByText("活跃会话")).toBeInTheDocument();
    const chainPanels = await screen.findAllByLabelText("Command Chain 面板");
    expect(chainPanels.length).toBeGreaterThan(0);
  });

  it("sends message and renders delegation status", async () => {
    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);
    await expectActiveSession("pm-live-1");

    await user.type(screen.getByLabelText("继续对话"), "请修复桌面端 UI 协议偏差");
    await user.click(screen.getByRole("button", { name: "发送消息" }));

    expect(await screen.findByText("委派至 Tech Lead")).toBeInTheDocument();
    expect(await screen.findByText("TL 已拆解并派发执行。")).toBeInTheDocument();

    const messageCall = fetchMock.mock.calls.find(([input, init]) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      return raw.includes("/api/pm/sessions/") && raw.includes("/messages") && init?.method === "POST";
    });
    expect(messageCall?.[1]).toMatchObject({ method: "POST" });
    const payload = JSON.parse(String(messageCall?.[1]?.body || "{}")) as Record<string, unknown>;
    expect(payload.message).toBe("请修复桌面端 UI 协议偏差");
    expect(payload.content).toBeUndefined();
  });

  it("prevents duplicate send on rapid double click", async () => {
    const user = userEvent.setup();
    fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (raw.includes("/api/command-tower/overview")) {
        return new Response(
          JSON.stringify({ total_sessions: 12, active_sessions: 4, failed_ratio: 0.08, blocked_sessions: 1 }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (raw.includes("/api/pm/sessions?") && init?.method !== "POST") {
        return new Response(
          JSON.stringify([{ pm_session_id: "pm-live-1", status: "running", current_step: "reviewer" }]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (raw.includes("/api/command-tower/alerts")) {
        return new Response(JSON.stringify({ alerts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions/") && raw.includes("/messages") && init?.method === "POST") {
        return await new Promise<Response>((resolve) => {
          setTimeout(() => {
            resolve(
              new Response(JSON.stringify({ pm_session_id: "pm-live-1", message: "TL 已拆解并派发执行。" }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              })
            );
          }, 30);
        });
      }
      return new Response("{}", { status: 404, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await navigateToPmEntry(user);
    await expectActiveSession("pm-live-1");

    await user.type(screen.getByLabelText("继续对话"), "please run once");
    await user.dblClick(screen.getByRole("button", { name: "发送消息" }));

    expect(await screen.findByText("TL 已拆解并派发执行。")).toBeInTheDocument();
    const messageCalls = fetchMock.mock.calls.filter(([request, init]) => {
      const raw = typeof request === "string" ? request : request instanceof URL ? request.toString() : request.url;
      return raw.includes("/api/pm/sessions/") && raw.includes("/messages") && init?.method === "POST";
    });
    expect(messageCalls).toHaveLength(1);
  });

  it("supports starter prompt chips for empty session", async () => {
    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);
    await expectActiveSession("pm-live-1");

    const starter = await screen.findByRole("button", {
      name: "帮我梳理这个需求的执行计划，并给出验收标准。"
    });
    await user.click(starter);

    const input = screen.getByLabelText("继续对话") as HTMLTextAreaElement;
    expect(input.value).toBe("帮我梳理这个需求的执行计划，并给出验收标准。");
  });

  it("supports workspace and branch cycle controls", async () => {
    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);

    const workspaceBtn = screen.getByRole("button", { name: "切换工作区" });
    const branchBtn = screen.getByRole("button", { name: "切换分支" });
    const branchBefore = branchBtn.textContent || "";
    await user.click(workspaceBtn);
    expect(branchBtn.textContent).not.toBe(branchBefore);

    const branchAfterWorkspace = branchBtn.textContent || "";
    await user.click(branchBtn);
    expect(branchBtn.textContent).not.toBe(branchAfterWorkspace);
  });

  it("shows explicit disabled reason before sending", async () => {
    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);
    await expectActiveSession("pm-live-1");

    expect(screen.getByText("请先输入消息，再发送。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发送消息" })).toBeDisabled();
  });

  it("does not send when Enter is pressed during IME composing", async () => {
    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);
    await expectActiveSession("pm-live-1");

    const input = screen.getByLabelText("继续对话");
    fireEvent.change(input, { target: { value: "ime composing draft" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false, isComposing: true });

    const messageCalls = fetchMock.mock.calls.filter(([request, init]) => {
      const raw = typeof request === "string" ? request : request instanceof URL ? request.toString() : request.url;
      return raw.includes("/api/pm/sessions/") && raw.includes("/messages") && init?.method === "POST";
    });
    expect(messageCalls).toHaveLength(0);
  });

  it("keeps chat semantics consistent when backend send fails", async () => {
    const user = userEvent.setup();
    fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (raw.includes("/api/command-tower/overview")) {
        return new Response(JSON.stringify({ total_sessions: 12, active_sessions: 4, failed_ratio: 0.08, blocked_sessions: 1 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions?") && init?.method !== "POST") {
        return new Response(JSON.stringify([{ pm_session_id: "pm-live-1", status: "running", current_step: "reviewer" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/command-tower/alerts")) {
        return new Response(JSON.stringify({ alerts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions/") && raw.includes("/messages") && init?.method === "POST") {
        return new Response(JSON.stringify({ error: "failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response("{}", { status: 404, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await navigateToPmEntry(user);
    await expectActiveSession("pm-live-1");
    await user.type(screen.getByLabelText("继续对话"), "backend failure");
    await user.click(screen.getByRole("button", { name: "发送消息" }));

    expect(await screen.findByText("后端消息通道暂不可用，我已切换本地安全回退模式。")).toBeInTheDocument();
    expect(screen.queryByText("委派至 Tech Lead")).not.toBeInTheDocument();
  });

  it.each([
    { status: 401, body: { detail: { reason: "token expired" } }, expected: "后端消息通道异常：权限或认证异常，请确认登录状态。" },
    { status: 422, body: { detail: { reason: "invalid payload" } }, expected: "后端消息通道异常" },
    { status: 503, body: { detail: { reason: "upstream unavailable" } }, expected: "后端消息通道异常：服务暂时不可用，请稍后重试。" },
  ])(
    "folds backend failure into same fallback bubble but keeps mapped detail (status=$status)",
    async ({ status, body, expected }) => {
      const user = userEvent.setup();
      fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (raw.includes("/api/command-tower/overview")) {
          return new Response(JSON.stringify({ total_sessions: 12, active_sessions: 4, failed_ratio: 0.08, blocked_sessions: 1 }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
        if (raw.includes("/api/pm/sessions?") && init?.method !== "POST") {
          return new Response(JSON.stringify([{ pm_session_id: "pm-live-1", status: "running", current_step: "reviewer" }]), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
        if (raw.includes("/api/command-tower/alerts")) {
          return new Response(JSON.stringify({ alerts: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
        if (raw.includes("/api/pm/sessions/") && raw.includes("/messages") && init?.method === "POST") {
          return new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response("{}", { status: 404, headers: { "Content-Type": "application/json" } });
      });
      vi.stubGlobal("fetch", fetchMock);

      render(<App />);
      await navigateToPmEntry(user);
      await expectActiveSession("pm-live-1");
      await user.type(screen.getByLabelText("继续对话"), `backend failure ${status}`);
      await user.click(screen.getByRole("button", { name: "发送消息" }));

      expect(await screen.findByText("后端消息通道暂不可用，我已切换本地安全回退模式。")).toBeInTheDocument();
      expect(await screen.findByText(expected)).toBeInTheDocument();
    }
  );

  it.each([
    {
      title: "Error.name=TimeoutError",
      errorFactory: () => {
        const error = new Error("timeout");
        error.name = "TimeoutError";
        return error;
      }
    },
    {
      title: "timeout marker in message",
      errorFactory: () => new Error("request failed: timeout while waiting upstream")
    }
  ])("classifies timeout request failure branch via $title", async ({ errorFactory }) => {
    const user = userEvent.setup();
    fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (raw.includes("/api/command-tower/overview")) {
        return new Response(JSON.stringify({ total_sessions: 12, active_sessions: 4, failed_ratio: 0.08, blocked_sessions: 1 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions?") && init?.method !== "POST") {
        return new Response(JSON.stringify([{ pm_session_id: "pm-live-1", status: "running", current_step: "reviewer" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/command-tower/alerts")) {
        return new Response(JSON.stringify({ alerts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions/") && raw.includes("/messages") && init?.method === "POST") {
        throw errorFactory();
      }
      return new Response("{}", { status: 404, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await navigateToPmEntry(user);
    await expectActiveSession("pm-live-1");
    await user.type(screen.getByLabelText("继续对话"), `timeout branch ${Date.now()}`);
    await user.click(screen.getByRole("button", { name: "发送消息" }));

    expect(await screen.findByText("后端消息通道暂不可用，我已切换本地安全回退模式。")).toBeInTheDocument();
    expect(await screen.findByText(/消息发送超时/)).toBeInTheDocument();
  });

  it("supports Cmd/Ctrl+\\ layout toggle", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await navigateToPmEntry(user);

    const panel = container.querySelector(".main-panel");
    expect(panel?.className).toContain("mode-dialog");

    await user.keyboard("{Meta>}\\{/Meta}");
    if (!panel?.className.includes("mode-split")) {
      await user.keyboard("{Control>}\\{/Control}");
    }
    expect(panel?.className).toContain("mode-split");
  });

  it("expands chain panel from focus peek button", async () => {
    const user = userEvent.setup();
    const nextLayoutModeSpy = vi.spyOn(desktopUi, "nextLayoutMode").mockReturnValue("focus");
    const { container } = render(<App />);
    await navigateToPmEntry(user);

    await user.keyboard("{Meta>}\\{/Meta}");
    const expandChainButton = await screen.findByRole("button", { name: "展开 Command Chain" });
    await user.click(expandChainButton);

    const panel = container.querySelector(".main-panel");
    expect(panel?.className).toContain("mode-split");
    nextLayoutModeSpy.mockRestore();
  });

  it("supports Cmd/Ctrl+Shift+D chain popout shortcut", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.keyboard("{Meta>}{Shift>}d{/Shift}{/Meta}");
    if ((window.open as unknown as { mock?: { calls: unknown[][] } }).mock?.calls.length === 0) {
      await user.keyboard("{Control>}{Shift>}d{/Shift}{/Control}");
    }
    expect(window.open).toHaveBeenCalled();
  });

  it("allows selecting decision card option", async () => {
    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);

    expect(await screen.findByText("决策：本次执行模式")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "选择" })[0]);

    expect(await screen.findByText(/已收到你的决策/)).toBeInTheDocument();
  });

  it("does not show blocking pending-decision hint on first entry", async () => {
    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);

    const input = await screen.findByLabelText("继续对话");
    expect(input).toHaveAttribute("placeholder", "审核后告诉 PM：接受并合并，或继续修改。");
    expect(screen.queryByText("先完成上面的决策卡片，或继续补充你的约束...")).not.toBeInTheDocument();
  });

  it("marks bootstrap decision as selected by default", async () => {
    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);

    expect(await screen.findByText("决策：本次执行模式")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "已选择" })).toBeInTheDocument();
  });

  it("stops generation when stop button is clicked", async () => {
    const user = userEvent.setup();

    fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (raw.includes("/api/command-tower/overview")) {
        return new Response(JSON.stringify({ total_sessions: 1, active_sessions: 1, failed_ratio: 0, blocked_sessions: 0 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions?") && init?.method !== "POST") {
        return new Response(JSON.stringify([{ pm_session_id: "pm-local", status: "running", current_step: "pm" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/command-tower/alerts")) {
        return new Response(JSON.stringify({ alerts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions/") && raw.includes("/messages") && init?.method === "POST") {
        return await new Promise<Response>((_resolve, reject) => {
          const signal = init.signal;
          signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      }
      return new Response("{}", { status: 404, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await navigateToPmEntry(user);
    await expectActiveSession("pm-local");
    await user.type(screen.getByLabelText("继续对话"), "请开始执行");
    await user.click(screen.getByRole("button", { name: "发送消息" }));

    const stopButton = screen.getByRole("button", { name: "停止生成" });
    expect(stopButton).toBeEnabled();
    await user.click(stopButton);

    expect(await screen.findByText("已停止当前生成，现有上下文保留，你可以继续下达新指令。")).toBeInTheDocument();
    expect(screen.queryByText("后端消息通道暂不可用，我已切换本地安全回退模式。")).not.toBeInTheDocument();
  });

  it("keeps newer generation state when an older aborted request settles later", async () => {
    const user = userEvent.setup();
    let messageCallCount = 0;

    fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (raw.includes("/api/command-tower/overview")) {
        return new Response(JSON.stringify({ total_sessions: 1, active_sessions: 1, failed_ratio: 0, blocked_sessions: 0 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions?") && init?.method !== "POST") {
        return new Response(JSON.stringify([{ pm_session_id: "pm-local", status: "running", current_step: "pm" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/command-tower/alerts")) {
        return new Response(JSON.stringify({ alerts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions/") && raw.includes("/messages") && init?.method === "POST") {
        messageCallCount += 1;
        const signal = init.signal;
        if (messageCallCount === 1) {
          return await new Promise<Response>((_resolve, reject) => {
            signal?.addEventListener("abort", () => {
              setTimeout(() => reject(new DOMException("Aborted", "AbortError")), 80);
            }, { once: true });
          });
        }
        return await new Promise<Response>((_resolve, reject) => {
          signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          }, { once: true });
        });
      }
      return new Response("{}", { status: 404, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await navigateToPmEntry(user);
    await expectActiveSession("pm-local");

    await user.type(screen.getByLabelText("继续对话"), "first request");
    await user.click(screen.getByRole("button", { name: "发送消息" }));
    await user.click(screen.getByRole("button", { name: "停止生成" }));

    await user.type(screen.getByLabelText("继续对话"), "second request");
    await user.click(screen.getByRole("button", { name: "发送消息" }));
    await new Promise((resolve) => setTimeout(resolve, 120));

    expect(screen.getByRole("button", { name: "停止生成" })).toBeEnabled();
    expect(screen.getByText("请先停止当前生成，或等待完成后再发送。")).toBeInTheDocument();
  });

  it("writes stop message into the original generation session", async () => {
    const user = userEvent.setup();
    fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (raw.includes("/api/command-tower/overview")) {
        return new Response(JSON.stringify({ total_sessions: 2, active_sessions: 2, failed_ratio: 0, blocked_sessions: 0 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions?") && init?.method !== "POST") {
        return new Response(JSON.stringify([
          { pm_session_id: "pm-live-1", status: "running", current_step: "pm" },
          { pm_session_id: "pm-live-2", status: "running", current_step: "tl" }
        ]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/command-tower/alerts")) {
        return new Response(JSON.stringify({ alerts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions/") && raw.includes("/messages") && init?.method === "POST") {
        return await new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          }, { once: true });
        });
      }
      return new Response("{}", { status: 404, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await navigateToPmEntry(user);
    await expectActiveSession("pm-live-1");
    await startGeneration(user, "long request");
    await switchSessionWithHotkey("2", "pm-live-2");
    await user.click(screen.getByRole("button", { name: "停止生成" }));
    expect(screen.queryByText("已停止当前生成，现有上下文保留，你可以继续下达新指令。")).not.toBeInTheDocument();

    await switchSessionWithHotkey("1", "pm-live-1");
    expect(await screen.findByText("已停止当前生成，现有上下文保留，你可以继续下达新指令。")).toBeInTheDocument();
  });

  it("classifies AbortError as neutral cancel message", async () => {
    const user = userEvent.setup();
    fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (raw.includes("/api/command-tower/overview")) {
        return new Response(JSON.stringify({ total_sessions: 1, active_sessions: 1, failed_ratio: 0, blocked_sessions: 0 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions?") && init?.method !== "POST") {
        return new Response(JSON.stringify([{ pm_session_id: "pm-local", status: "running", current_step: "pm" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/command-tower/alerts")) {
        return new Response(JSON.stringify({ alerts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions/") && raw.includes("/messages") && init?.method === "POST") {
        throw new DOMException("Aborted", "AbortError");
      }
      return new Response("{}", { status: 404, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await navigateToPmEntry(user);
    await expectActiveSession("pm-local");
    await user.type(screen.getByLabelText("继续对话"), "请开始执行");
    await user.click(screen.getByRole("button", { name: "发送消息" }));

    expect(await screen.findByText("本次消息发送已取消。你可以直接继续输入新的指令。")).toBeInTheDocument();
    expect(screen.queryByText("后端消息通道暂不可用，我已切换本地安全回退模式。")).not.toBeInTheDocument();
  });

  it("ignores Alt hotkeys while input is focused", async () => {
    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);
    await expectActiveSession("pm-live-1");

    const input = screen.getByLabelText("继续对话");
    input.focus();
    await user.keyboard("{Alt>}d{/Alt}");

    expect(screen.getByLabelText("上下文抽屉")).toBeInTheDocument();
  });

  it("keeps page-level Alt+Shift shortcuts on command tower without triggering app-level Alt routing", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "指挥塔" }));
    const commandTowerHeadings = await screen.findAllByRole("heading", { name: "指挥塔" });
    expect(commandTowerHeadings.length).toBeGreaterThan(0);
    expect(await screen.findByRole("button", { name: "暂停自动更新" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "l", altKey: true, shiftKey: true });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "恢复自动更新" })).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("对话面板")).not.toBeInTheDocument();
  });

  it("keeps ct-session-detail Alt shortcuts page-scoped without jumping back to PM", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "指挥塔" }));
    await user.click(await screen.findByRole("button", { name: "继续处理" }));
    expect(await screen.findByRole("heading", { name: "会话透视" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "暂停实时" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "l", altKey: true });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "恢复实时" })).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("对话面板")).not.toBeInTheDocument();
  });

  it("renders command chain legend and allows clicking node anchor", async () => {
    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);

    expect(screen.getByText("Command Chain")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("正在初始化 Chain 引擎...")).not.toBeInTheDocument();
    }, { timeout: 8000 });
    const chainPanel = await screen.findByLabelText("Command Chain 面板");
    const pmNode = await within(chainPanel).findByRole("button", { name: /^PM$/i }, { timeout: 3000 });
    await user.click(pmNode);
    expect(screen.getByLabelText("会话消息")).toBeInTheDocument();
  });

  it("restores recoverable draft from localStorage", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "cortexpilot.desktop.draft:cortexpilot-main:pm-live-1",
      "这是未提交的草稿"
    );
    render(<App />);
    await navigateToPmEntry(user);

    expect(await screen.findByText("检测到未提交草稿，是否恢复？")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "恢复草稿" }));

    const input = screen.getByLabelText("继续对话") as HTMLTextAreaElement;
    expect(input.value).toBe("这是未提交的草稿");
    expect(screen.queryByText("检测到未提交草稿，是否恢复？")).not.toBeInTheDocument();
  });

  it("discards recoverable draft and removes prompt", async () => {
    const user = userEvent.setup();
    const draftKey = "cortexpilot.desktop.draft:cortexpilot-main:pm-live-1";
    window.localStorage.setItem(draftKey, "待丢弃草稿");
    render(<App />);
    await navigateToPmEntry(user);

    expect(await screen.findByText("检测到未提交草稿，是否恢复？")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "丢弃草稿" }));

    expect(window.localStorage.getItem(draftKey)).toBeNull();
    expect(screen.queryByText("检测到未提交草稿，是否恢复？")).not.toBeInTheDocument();
  });

  it("shows onboarding banner once and allows dismiss", async () => {
    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);

    expect(await screen.findByText(/首次使用按 3 步走/)).toBeInTheDocument();
    expect(screen.getByText(/先创建会话/)).toBeInTheDocument();
    expect(screen.getByText("当前阶段：待发送首条需求")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "第1步：先发一句需求" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "我已了解" }));

    expect(window.localStorage.getItem("cortexpilot.desktop.onboarding.dismissed")).toBe("1");
    expect(screen.queryByText(/首次使用按 3 步走/)).not.toBeInTheDocument();
  });

  it("advances first-run CTA from first prompt to /run template", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "PM 入口" }));
    await expectActiveSession("pm-live-1");

    await user.click(await screen.findByRole("button", { name: "第1步：先发一句需求" }));
    const input = screen.getByLabelText("继续对话") as HTMLTextAreaElement;
    expect(input.value).toBe("objective: 在 apps/desktop/src 完成一个 3 分钟内可验收的首次任务。\nallowed_paths: [\"apps/desktop/src\"]");

    await user.click(screen.getByRole("button", { name: "发送消息" }));
    expect(await screen.findByText("委派至 Tech Lead")).toBeInTheDocument();
    expect(screen.getByText("当前阶段：可输入 /run")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "第2步：输入 /run 开始执行" }));
    expect(input.value).toBe("/run");
  });

  it("renders Command Tower three primary actions", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "指挥塔" }));
    await screen.findByText("Desktop 聚焦执行动作与异常裁决；治理分析默认转到 Web 深度视图。");

    expect(screen.getByRole("button", { name: "更新进展" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "暂停自动更新" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "继续处理" })).toBeInTheDocument();
  });

  it("covers sidebar governance routes and keeps topbar title in sync", async () => {
    const user = userEvent.setup();
    render(<App />);

    const routeCases = [
      { nav: "运行记录", title: "运行记录" },
      { nav: "工作流", title: "工作流" },
      { nav: "事件流", title: "事件流" },
      { nav: "合约", title: "合约" },
      { nav: "评审", title: "评审" },
      { nav: "测试", title: "测试" },
      { nav: "策略", title: "策略" },
      { nav: "代理", title: "代理" },
      { nav: "锁管理", title: "锁管理" },
      { nav: "工作树", title: "工作树" },
    ] as const;

    for (const routeCase of routeCases) {
      await user.click(screen.getByRole("button", { name: routeCase.nav }));
      await waitFor(() => {
        expectTopbarTitle(routeCase.title);
      });
    }
  });

  it("navigates from command tower to session detail route", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "指挥塔" }));
    await user.click(await screen.findByRole("button", { name: "继续处理" }));

    await waitFor(() => {
      expectTopbarTitle("会话透视");
    });
  });

  it("navigates from runs list to run detail route", async () => {
    fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (raw.includes("/api/command-tower/overview")) {
        return new Response(JSON.stringify({ total_sessions: 12, active_sessions: 4, failed_ratio: 0.08, blocked_sessions: 1 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions?") && init?.method !== "POST") {
        return new Response(JSON.stringify([{ pm_session_id: "pm-live-1", status: "running", current_step: "reviewer" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/command-tower/alerts")) {
        return new Response(JSON.stringify({ alerts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/runs") && !raw.includes("/events") && init?.method !== "POST") {
        return new Response(JSON.stringify([
          {
            run_id: "run-detail-target-001",
            task_id: "task-1",
            status: "running",
            created_at: new Date().toISOString(),
            outcome_type: "running",
            failure_class: null,
            failure_code: null,
            owner_agent_id: "TL",
            owner_role: "TECH_LEAD"
          }
        ]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response("{}", { status: 404, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "运行记录" }));
    await user.click(await screen.findByRole("button", { name: "run-detail-t" }));
    await waitFor(() => {
      expectTopbarTitle("运行详情");
    });
  });

  it("navigates from workflows list to workflow detail route", async () => {
    fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (raw.includes("/api/command-tower/overview")) {
        return new Response(JSON.stringify({ total_sessions: 12, active_sessions: 4, failed_ratio: 0.08, blocked_sessions: 1 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions?") && init?.method !== "POST") {
        return new Response(JSON.stringify([{ pm_session_id: "pm-live-1", status: "running", current_step: "reviewer" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/command-tower/alerts")) {
        return new Response(JSON.stringify({ alerts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/workflows") && !raw.includes("/api/workflows/") && init?.method !== "POST") {
        return new Response(JSON.stringify([
          { workflow_id: "wf-target-001", status: "running", namespace: "default", runs: [] }
        ]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response("{}", { status: 404, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "工作流" }));
    await user.click(await screen.findByRole("button", { name: "wf-target-001" }));
    await waitFor(() => {
      expectTopbarTitle("工作流详情");
    });
  });

  it("toggles sound reminder state", async () => {
    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);

    const button = await screen.findByRole("button", { name: "声音提醒：开启" });
    await user.click(button);
    expect(screen.getByRole("button", { name: "声音提醒：关闭" })).toBeInTheDocument();
  });

  it("keeps input enabled but disables send when there is no backend session", async () => {
    fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (raw.includes("/api/command-tower/overview")) {
        return new Response(JSON.stringify({ total_sessions: 0, active_sessions: 0, failed_ratio: 0, blocked_sessions: 0 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions?") && init?.method !== "POST") {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/command-tower/alerts")) {
        return new Response(JSON.stringify({ alerts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response("{}", { status: 404, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await navigateToPmEntry();
    const input = await screen.findByLabelText("继续对话");
    expect(input).toBeEnabled();
    expect(screen.getByRole("button", { name: "端内创建首会话" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开 Dashboard /pm 手动创建" })).toBeInTheDocument();
    expect(screen.getByText("请先点击“端内创建首会话”；若失败请点击“打开 Dashboard /pm 手动创建”。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发送消息" })).toBeDisabled();
  });

  it("creates first session in-app with minimal intake schema", async () => {
    let intakeCreated = false;
    fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (raw.includes("/api/command-tower/overview")) {
        return new Response(JSON.stringify({ total_sessions: 0, active_sessions: 0, failed_ratio: 0, blocked_sessions: 0 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions?") && init?.method !== "POST") {
        return new Response(JSON.stringify(intakeCreated ? [{ pm_session_id: "pm-first-1", status: "active" }] : []), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/command-tower/alerts")) {
        return new Response(JSON.stringify({ alerts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/intake") && init?.method === "POST") {
        intakeCreated = true;
        return new Response(JSON.stringify({ intake_id: "pm-first-1", status: "NEEDS_INPUT", questions: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response("{}", { status: 404, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);

    await user.click(await screen.findByRole("button", { name: "端内创建首会话" }));

    await waitFor(() => {
      expect(screen.getByLabelText("会话工具栏")).toHaveTextContent("会话 pm-first-1");
    });
    const intakeCall = fetchMock.mock.calls.find(([request, init]) => {
      const raw = typeof request === "string" ? request : request instanceof URL ? request.toString() : request.url;
      return raw.includes("/api/pm/intake") && init?.method === "POST";
    });
    expect(intakeCall?.[1]).toMatchObject({ method: "POST" });
    const payload = JSON.parse(String(intakeCall?.[1]?.body ?? "{}")) as Record<string, unknown>;
    expect(payload.objective).toEqual(expect.any(String));
    expect(payload.allowed_paths).toEqual(["apps/desktop/src"]);
  });

  it("shows actionable fallback CTA when in-app first-session creation fails", async () => {
    fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (raw.includes("/api/command-tower/overview")) {
        return new Response(JSON.stringify({ total_sessions: 0, active_sessions: 0, failed_ratio: 0, blocked_sessions: 0 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions?") && init?.method !== "POST") {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/command-tower/alerts")) {
        return new Response(JSON.stringify({ alerts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/intake") && init?.method === "POST") {
        return new Response(JSON.stringify({ detail: { reason: "bad payload" } }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response("{}", { status: 404, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);

    await user.click(await screen.findByRole("button", { name: "端内创建首会话" }));
    const fallbackHints = await screen.findAllByText(/请点击“打开 Dashboard \/pm 手动创建”/);
    expect(fallbackHints.length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "打开 Dashboard /pm 手动创建" }));
    expect(window.open).toHaveBeenCalledWith(expect.stringContaining("/pm"), "_blank", "noopener,noreferrer");
  });

  it("shows fallback guidance when intake id is missing after in-app first-session creation", async () => {
    fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (raw.includes("/api/command-tower/overview")) {
        return new Response(JSON.stringify({ total_sessions: 0, active_sessions: 0, failed_ratio: 0, blocked_sessions: 0 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions?") && init?.method !== "POST") {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/command-tower/alerts")) {
        return new Response(JSON.stringify({ alerts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/intake") && init?.method === "POST") {
        return new Response(JSON.stringify({ intake_id: "   " }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response("{}", { status: 404, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);
    await user.click(await screen.findByRole("button", { name: "端内创建首会话" }));

    const fallbackHints = await screen.findAllByText(/请点击“打开 Dashboard \/pm 手动创建”/);
    expect(fallbackHints.length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "发送消息" })).toBeDisabled();
  });

  it("keeps composer maxLength aligned with send limit", async () => {
    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);
    const input = await screen.findByLabelText("继续对话");
    expect(input).toHaveAttribute("maxLength", "4000");
  });

  it("clears active session when backend session list becomes empty", async () => {
    let sessionCalls = 0;
    fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (raw.includes("/api/command-tower/overview")) {
        return new Response(JSON.stringify({ total_sessions: 1, active_sessions: 1, failed_ratio: 0, blocked_sessions: 0 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions?") && init?.method !== "POST") {
        sessionCalls += 1;
        const payload = sessionCalls === 1 ? [{ pm_session_id: "pm-live-1", status: "running" }] : [];
        return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (raw.includes("/api/command-tower/alerts")) {
        return new Response(JSON.stringify({ alerts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response("{}", { status: 404, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);
    await expectActiveSession("pm-live-1");
    await user.click(screen.getByRole("button", { name: "立即刷新" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "发送消息" })).toBeDisabled();
    });
    expect(screen.getByText("还没有会话。请先点击“端内创建首会话”；若失败请点击“打开 Dashboard /pm 手动创建”。")).toBeInTheDocument();
  });

  it("handles critical gate blocker confirm action", async () => {
    fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (raw.includes("/api/command-tower/overview")) {
        return new Response(JSON.stringify({ total_sessions: 1, active_sessions: 1, failed_ratio: 1, blocked_sessions: 1 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions?") && init?.method !== "POST") {
        return new Response(JSON.stringify([{ pm_session_id: "pm-live-1", status: "blocked", current_step: "reviewer" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/command-tower/alerts")) {
        return new Response(JSON.stringify({
          alerts: [{ code: "CRITICAL_GATE", severity: "critical", message: "gate hard fail" }]
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response("{}", { status: 404, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);
    const blocker = await screen.findByRole("dialog", { name: "CRITICAL 阻断告警" });
    expect(blocker).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "我已确认，进入人工裁决" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "CRITICAL 阻断告警" })).not.toBeInTheDocument();
    });
  });

  it("closes critical gate blocker dialog on Escape key", async () => {
    fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (raw.includes("/api/command-tower/overview")) {
        return new Response(JSON.stringify({ total_sessions: 1, active_sessions: 1, failed_ratio: 1, blocked_sessions: 1 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions?") && init?.method !== "POST") {
        return new Response(JSON.stringify([{ pm_session_id: "pm-live-1", status: "blocked", current_step: "reviewer" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/command-tower/alerts")) {
        return new Response(JSON.stringify({
          alerts: [{ code: "CRITICAL_GATE", severity: "critical", message: "gate hard fail" }]
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response("{}", { status: 404, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);
    expect(await screen.findByRole("dialog", { name: "CRITICAL 阻断告警" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "CRITICAL 阻断告警" })).not.toBeInTheDocument();
    });
  });

  it("traps focus inside critical gate blocker dialog", async () => {
    fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (raw.includes("/api/command-tower/overview")) {
        return new Response(JSON.stringify({ total_sessions: 1, active_sessions: 1, failed_ratio: 1, blocked_sessions: 1 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions?") && init?.method !== "POST") {
        return new Response(JSON.stringify([{ pm_session_id: "pm-live-1", status: "blocked", current_step: "reviewer" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/command-tower/alerts")) {
        return new Response(JSON.stringify({
          alerts: [{ code: "CRITICAL_GATE", severity: "critical", message: "gate hard fail" }]
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response("{}", { status: 404, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);

    await screen.findByRole("dialog", { name: "CRITICAL 阻断告警" });
    const confirmButton = screen.getByRole("button", { name: "我已确认，进入人工裁决" });
    await waitFor(() => {
      expect(confirmButton).toHaveFocus();
    });

    const composer = screen.getByLabelText("继续对话");
    composer.focus();
    await user.keyboard("{Tab}");
    expect(confirmButton).toHaveFocus();
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(confirmButton).toHaveFocus();
  });

  it("supports additional hotkey routing branches", async () => {
    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);
    await expectActiveSession("pm-live-1");

    fireEvent.keyDown(window, { key: "m", altKey: true });
    expect(await screen.findByRole("heading", { name: "开始执行" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "2", altKey: true });
    expect(await screen.findByLabelText("继续对话")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "3", altKey: true });
    expect(await screen.findByRole("heading", { name: "变更门禁" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "k", metaKey: true });
    if (!screen.queryByRole("heading", { name: "检索" })) {
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    }
    expect(await screen.findByRole("heading", { name: "检索" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: ".", metaKey: true });
    if (document.activeElement?.getAttribute("id") !== "desktop-chat-input") {
      fireEvent.keyDown(window, { key: ".", ctrlKey: true });
    }
    expect(await screen.findByLabelText("继续对话")).toHaveFocus();

    fireEvent.keyDown(window, { key: "c", metaKey: true, shiftKey: true });
    if (!screen.queryByRole("button", { name: "展开 Command Chain" })) {
      fireEvent.keyDown(window, { key: "c", ctrlKey: true, shiftKey: true });
    }
    await waitFor(() => {
      expect(
        Boolean(screen.queryByLabelText("Command Chain 面板")) ||
        Boolean(screen.queryByRole("button", { name: "展开 Command Chain" }))
      ).toBe(true);
    });

    fireEvent.keyDown(window, { key: "d", altKey: true });
    await waitFor(() => {
      expect(screen.queryByLabelText("上下文抽屉")).not.toBeInTheDocument();
    });
    fireEvent.keyDown(window, { key: "p", altKey: true });
    fireEvent.keyDown(window, { key: "s", metaKey: true, shiftKey: true });
    if (!screen.queryByLabelText("对话面板")) {
      fireEvent.keyDown(window, { key: "s", ctrlKey: true, shiftKey: true });
    }
    expect(screen.getByLabelText("对话面板")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "5", altKey: true });
    expect((await screen.findAllByRole("heading", { name: "策略" })).length).toBeGreaterThan(0);
  });

  it("blocks send while offline and keeps message endpoint untouched", async () => {
    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);
    await expectActiveSession("pm-live-1");

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false
    });
    fireEvent(window, new Event("offline"));
    expect(await screen.findByText("现在离线中，联网后会自动继续同步。")).toBeInTheDocument();

    await user.type(screen.getByLabelText("继续对话"), "offline should not send");
    fireEvent.keyDown(screen.getByLabelText("继续对话"), { key: "Enter", shiftKey: false, isComposing: false });

    const messageCalls = fetchMock.mock.calls.filter(([request, init]) => {
      const raw = typeof request === "string" ? request : request instanceof URL ? request.toString() : request.url;
      return raw.includes("/api/pm/sessions/") && raw.includes("/messages") && init?.method === "POST";
    });
    expect(messageCalls).toHaveLength(0);
  });

  it("allows boundary composer input (4000 chars) to send", async () => {
    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);
    await expectActiveSession("pm-live-1");

    const boundaryInput = "x".repeat(4000);
    const input = screen.getByLabelText("继续对话");
    fireEvent.change(input, { target: { value: boundaryInput } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false, isComposing: false });

    const messageCalls = await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(([request, init]) => {
        const raw = typeof request === "string" ? request : request instanceof URL ? request.toString() : request.url;
        return raw.includes("/api/pm/sessions/") && raw.includes("/messages") && init?.method === "POST";
      });
      expect(calls.length).toBeGreaterThan(0);
      return calls;
    });
    const latestCall = messageCalls[messageCalls.length - 1];
    const payload = JSON.parse(String(latestCall?.[1]?.body ?? "{}")) as Record<string, unknown>;
    expect(String(payload.message ?? "")).toHaveLength(4000);
    expect(screen.queryByText("请将输入缩短到 4000 字以内再发送。")).not.toBeInTheDocument();
    const latestMessageCalls = fetchMock.mock.calls.filter(([request, init]) => {
      const raw = typeof request === "string" ? request : request instanceof URL ? request.toString() : request.url;
      return raw.includes("/api/pm/sessions/") && raw.includes("/messages") && init?.method === "POST";
    });
    expect(latestMessageCalls.length).toBeGreaterThan(0);
    await user.clear(input);
  });

  it("supports Cmd/Ctrl+N new conversation branch when no session exists", async () => {
    let intakeCreated = false;
    fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (raw.includes("/api/command-tower/overview")) {
        return new Response(JSON.stringify({ total_sessions: 0, active_sessions: 0, failed_ratio: 0, blocked_sessions: 0 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/sessions?") && init?.method !== "POST") {
        return new Response(JSON.stringify(intakeCreated ? [{ pm_session_id: "pm-hotkey-1", status: "active" }] : []), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/command-tower/alerts")) {
        return new Response(JSON.stringify({ alerts: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (raw.includes("/api/pm/intake") && init?.method === "POST") {
        intakeCreated = true;
        return new Response(JSON.stringify({ intake_id: "pm-hotkey-1", status: "NEEDS_INPUT", questions: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response("{}", { status: 404, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<App />);
    await navigateToPmEntry(user);
    expect(screen.getByRole("button", { name: "端内创建首会话" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "n", metaKey: true });
    if (!screen.queryByLabelText("会话工具栏")?.textContent?.includes("pm-hotkey-1")) {
      fireEvent.keyDown(window, { key: "n", ctrlKey: true });
    }
    await waitFor(() => {
      expect(screen.getByLabelText("会话工具栏")).toHaveTextContent("会话 pm-hotkey-1");
    });
  });

  it("navigates to god-mode page from sidebar", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "快速审批" }));
    expect(await screen.findByRole("heading", { name: "快速审批" })).toBeInTheDocument();
  });

  it("renders chain popout mode when query flag is present", async () => {
    window.history.pushState({}, "", "/?chain-popout=1");
    render(<App />);

    expect(screen.getByRole("main", { name: "Command Chain 独立窗口" })).toBeInTheDocument();
    expect(await screen.findByLabelText("Command Chain 面板")).toBeInTheDocument();

    window.history.pushState({}, "", "/");
  });
});

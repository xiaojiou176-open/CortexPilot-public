# UI Button Coverage Matrix

## Purpose

`ui-button-coverage-matrix.md` is the render-only reference for UI button regression coverage.
Machine-generated and human-maintained inputs are:

- Inventory scan script: `scripts/ui_button_inventory.py`
- Matrix sync script: `scripts/sync_ui_button_matrix.py`
- Human annotation SSOT: `configs/ui_button_coverage_annotations.json`
- Artifact: `.runtime-cache/test_output/ui_regression/button_inventory.dashboard.json`
- Artifact: `.runtime-cache/test_output/ui_regression/button_inventory.desktop.json`
- Validation script: `scripts/check_ui_button_matrix_sync.py`

## Inventory JSON Field Definition

The `entries[]` schema in `button_inventory.{surface}.json` is:

| field | type | meaning |
|---|---|---|
| `id` | string | Stable button identifier (derived from surface + file + line + signature) |
| `surface` | enum | `dashboard` / `desktop` |
| `tier` | enum | `P0` / `P1` / `P2` |
| `file` | string | Source path relative to the repository root |
| `line` | number | 1-based line number |
| `tag` | string | JSX tag type (`button` / `Button` / `a` / `div` / `tr`, etc.) |
| `text` | string | Visible control text (best effort) |
| `aria_label` | string | `aria-label` value, when present |
| `data_testid` | string | `data-testid` value, when present |
| `on_click` | string | `onClick` handler signature (best effort) |
| `class_name` | string | `className` value, when present |

## Priority Tiering (P0/P1/P2)

- `P0`: high-risk actions (approve, reject, rollback, execute, send, stop, promote evidence, replay, and similar controls).
- `P1`: medium-risk actions (refresh, filter, view switching, export, copy, drawer toggles, and similar controls).
- `P2`: low-risk actions (pure navigation, non-critical expansion, and generic interaction helpers).

## Matrix Entries (P0/P1 Full)

> This file is generated output only; do not edit it manually.
> Human-maintained fields must live in `configs/ui_button_coverage_annotations.json`.
> Default policy: unannotated rows stay `TODO`; annotated rows are rendered from the annotations SSOT.
> `evidence type` must be explicit and may not be inferred from notes alone.
> `source path/source kind/source exists` are authenticity metadata; `source exists=yes` means the source path was verified during sync.

| id | surface | tier | file | action | test status | notes | evidence type | source path | source kind | source exists |
|---|---|---|---|---|---|---|---|---|---|---|
| btn-dashboard-53ca4e3a73d9 | dashboard | P0 | apps/dashboard/app/agents/page.tsx:478 | View failed runs in bulk | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-84e1e3a0303b | dashboard | P0 | apps/dashboard/app/locks/page.tsx:212 | Go to runs | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-91f0b2a74a91 | dashboard | P0 | apps/dashboard/app/page.tsx:442 | View all runs | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-0751a2cc97e1 | dashboard | P0 | apps/dashboard/app/pm/components/PMIntakeCenterPanel.tsx:171 | Button (`() => { if (isFirstSendReady) { onSend(); return;`) | COVERED | `apps/dashboard/tests/pm_intake_components_branches.test.tsx`（discover 阶段输入已就绪时直接触发首条需求发送） | mixed | apps/dashboard/tests/pm_intake_components_branches.test.tsx; scripts/e2e_pm_chat_command_tower_success.sh | real_playwright,unit_test | yes |
| btn-dashboard-17022684278f | dashboard | P0 | apps/dashboard/app/pm/components/PMIntakeCenterPanel.tsx:341 | Stop generation (`() => onStopGeneration()`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-065108a1157b | dashboard | P0 | apps/dashboard/app/pm/components/PMIntakeCenterPanel.tsx:353 | Send (`() => onSend()`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-1a24ee250060 | dashboard | P0 | apps/dashboard/app/pm/components/PMIntakeLeftSidebar.tsx:130 | Draft session (start typing) Focuses the composer only. Sending the first request creates the formal session. (`handleDraftSessionClick`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-83ad0d119d7a | dashboard | P0 | apps/dashboard/app/pm/components/PMIntakeRightSidebar.tsx:388 | Start execution (`() => onRun()`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-705b57a4622f | dashboard | P0 | apps/dashboard/app/runs/page.tsx:85 | Button | COVERED | `apps/dashboard/tests/home_page.test.tsx`（治理 CTA 在失败态 `打开全局失败治理` 与无失败态 `发起新任务` 两条分支断言） | mixed | apps/dashboard/tests/home_page.test.tsx; scripts/e2e_dashboard_high_risk_actions_real.sh | real_playwright,unit_test | yes |
| btn-dashboard-bd7a9922f149 | dashboard | P0 | apps/dashboard/app/runs/page.tsx:89 | View failed events | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-09f789e8c654 | dashboard | P0 | apps/dashboard/app/runs/page.tsx:98 | All | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-f710b4a90de0 | dashboard | P0 | apps/dashboard/app/runs/page.tsx:101 | Failed | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-1030c5ddb0ce | dashboard | P0 | apps/dashboard/app/runs/page.tsx:104 | Running | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-cbefd14d7a48 | dashboard | P0 | apps/dashboard/app/runs/page.tsx:107 | Succeeded | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-c30a4bb53012 | dashboard | P0 | apps/dashboard/app/search/page.tsx:107 | Button (`handlePromote`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-8fc092d821f7 | dashboard | P0 | apps/dashboard/components/DiffGatePanel.tsx:345 | Approve | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-f2739823f4be | dashboard | P0 | apps/dashboard/components/DiffGatePanel.tsx:348 | Reject change | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-e379a57d2f42 | dashboard | P0 | apps/dashboard/components/DiffGatePanel.tsx:351 | Rollback run | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-096bba28ddab | dashboard | P0 | apps/dashboard/components/DiffGatePanel.tsx:376 | Retry load (`() => void load({ forceNetwork: true`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-bc2c5a48d6bd | dashboard | P0 | apps/dashboard/components/DiffGatePanel.tsx:384 | Open runs list for investigation | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-51dc807b6856 | dashboard | P0 | apps/dashboard/components/DiffGatePanel.tsx:445 | Button (`() => void load({ soft: true, forceNetwork: true`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-32f4024dd485 | dashboard | P0 | apps/dashboard/components/DiffGatePanel.tsx:455 | Expand all ( ) (`() => { setVisibleCount(filteredItems.length); setListStatus(`Expanded all ${filteredItems.length`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-d9506dce130c | dashboard | P0 | apps/dashboard/components/DiffGatePanel.tsx:467 | Collapse to first 10 (`() => { setVisibleCount(DEFAULT_ROW_LIMIT); setListStatus(`Collapsed back to the first ${DEFAULT_ROW_LIMIT`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-3a7501fef195 | dashboard | P0 | apps/dashboard/components/DiffGatePanel.tsx:479 | Open runs list | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-26d2a744c8b5 | dashboard | P0 | apps/dashboard/components/DiffGatePanel.tsx:538 | Button (`() => void toggleDiff(runId)`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-17ff6f439a1f | dashboard | P0 | apps/dashboard/components/DiffGatePanel.tsx:548 | Rollback (`() => void handleRollback(runId)`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-09de387dc2d3 | dashboard | P0 | apps/dashboard/components/DiffGatePanel.tsx:559 | Reject change (`() => void handleReject(runId)`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-4e1b2cd04780 | dashboard | P0 | apps/dashboard/components/DiffGatePanel.tsx:612 | Collapse to first 10 (`() => setVisibleCount(DEFAULT_ROW_LIMIT)`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-85adbbd51378 | dashboard | P0 | apps/dashboard/components/DiffViewer.tsx:193 | Refresh this page (`handleRetry`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-f76ce6b00fbc | dashboard | P0 | apps/dashboard/components/DiffViewer.tsx:209 | Retry refresh (`handleRetry`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-13fbefe83564 | dashboard | P0 | apps/dashboard/components/GodModePanel.tsx:389 | Button (`(event) => requestApproveItem(String(item.run_id), event.currentTarget)`) | COVERED | `scripts/e2e_dashboard_high_risk_actions_real.sh` (GodMode 队列 我已完成继续执行) | real_playwright | scripts/e2e_dashboard_high_risk_actions_real.sh | real_playwright | yes |
| btn-dashboard-7c4f768a364b | dashboard | P0 | apps/dashboard/components/GodModePanel.tsx:418 | Button (`handleApprove`) | COVERED | `scripts/e2e_dashboard_high_risk_actions_real.sh` (手动输入 run_id 后 POST `/api/god-mode/approve`) | real_playwright | scripts/e2e_dashboard_high_risk_actions_real.sh | real_playwright | yes |
| btn-dashboard-8e33c759dd16 | dashboard | P0 | apps/dashboard/components/GodModePanel.tsx:443 | Confirm approval (`confirmApproveItem`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-ccf502a58012 | dashboard | P0 | apps/dashboard/components/RunList.tsx:42 | Create your first task in PM | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-7fcdbe2fe06d | dashboard | P0 | apps/dashboard/components/RunList.tsx:118 | Open triage | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-4ab8af9291f6 | dashboard | P0 | apps/dashboard/components/command-tower/CommandTowerHomeLayout.tsx:185 | Review runs | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-7d69e02f65e3 | dashboard | P0 | apps/dashboard/components/command-tower/CommandTowerHomeLayout.tsx:222 | Button (`() => props.onRunQuickAction?.("live")`) | COVERED | `apps/dashboard/tests/command_tower_priority_layout.suite.tsx`（Live Lane 快捷动作按钮可见） + `scripts/ui_full_e2e_gemini_audit.py`（`local_command_tower_strict_20260309_c` 真实点击通过） | mixed | apps/dashboard/tests/command_tower_priority_layout.suite.tsx; scripts/ui_full_e2e_gemini_audit.py | real_playwright,component_test | yes |
| btn-dashboard-c93ff33f37a5 | dashboard | P0 | apps/dashboard/components/command-tower/CommandTowerHomeLayout.tsx:274 | Review runs | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-43799d0e18bf | dashboard | P0 | apps/dashboard/components/command-tower/CommandTowerSessionDrawer.tsx:183 | Jump to latest run | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-afcd85dc666d | dashboard | P0 | apps/dashboard/components/command-tower/CommandTowerSessionDrawer.tsx:221 | Button (`() => void props.handleSendMessage()`) | COVERED | `apps/dashboard/tests/command_tower_async_session.suite.tsx`（drawer 发送消息交互） | mixed | apps/dashboard/tests/command_tower_async_session.suite.tsx; scripts/e2e_dashboard_high_risk_actions_real.sh | real_playwright,component_test | yes |
| btn-dashboard-dacf3324330b | dashboard | P0 | apps/dashboard/components/command-tower/CommandTowerSessionLive.tsx:391 | Open run detail (`() => void handleOpenRunDetail()`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-1743b905fea7 | dashboard | P0 | apps/dashboard/components/command-tower/CommandTowerSessionLive.tsx:424 | Open run detail | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-ed5804bc06e8 | dashboard | P0 | apps/dashboard/components/command-tower/CommandTowerSessionLive.tsx:436 | Go to the PM session and trigger /run | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-76d73477e1fb | dashboard | P0 | apps/dashboard/components/command-tower/CommandTowerSessionLive.tsx:443 | Retry (`() => void handleOpenRunDetail()`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-76d75b2a6b17 | dashboard | P0 | apps/dashboard/components/command-tower/CommandTowerSessionLive.tsx:461 | Runs (`() => handleSessionMainTabClick("runs")`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-87f1f12afef6 | dashboard | P0 | apps/dashboard/components/run-detail/RunDetailDetailPanel.tsx:188 | Diff (`() => onTabChange("diff")`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-37316aa9c761 | dashboard | P0 | apps/dashboard/components/run-detail/RunDetailDetailPanel.tsx:201 | Logs (`() => onTabChange("logs")`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-2b7498d35c6b | dashboard | P0 | apps/dashboard/components/run-detail/RunDetailDetailPanel.tsx:214 | Reports (`() => onTabChange("reports")`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-ea6b56eb4d31 | dashboard | P0 | apps/dashboard/components/run-detail/RunDetailDetailPanel.tsx:228 | Chain (`() => onTabChange("chain")`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-fe401827e13a | dashboard | P0 | apps/dashboard/components/run-detail/RunDetailDetailPanel.tsx:332 | Run replay comparison (`onReplay`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-0b19aea4c7fc | dashboard | P0 | apps/dashboard/components/run-detail/RunDetailStatusContractCard.tsx:107 | Button (`onToggleLive`) | COVERED | `scripts/e2e_dashboard_high_risk_actions_real.sh` (RunDetail 实时开关) | real_playwright | scripts/e2e_dashboard_high_risk_actions_real.sh | real_playwright | yes |
| btn-dashboard-58f359e9c622 | dashboard | P0 | apps/dashboard/components/run-detail/RunDetailStatusContractCard.tsx:126 | Open diagnostic report (`onOpenReports`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-0508cb57c8a2 | dashboard | P0 | apps/dashboard/components/run-detail/RunDetailStatusContractCard.tsx:129 | Open execution logs (`onOpenLogs`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-378abe0a476f | dashboard | P0 | apps/dashboard/components/run-detail/RunDetailStatusContractCard.tsx:162 | Open manual approvals | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-09f15ee3b00d | dashboard | P1 | apps/dashboard/app/agents/page.tsx:455 | Apply filter | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-0e506dd23fb3 | dashboard | P1 | apps/dashboard/app/agents/page.tsx:459 | Clear filter | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-4ebab1ed4dd0 | dashboard | P1 | apps/dashboard/app/command-tower/error.tsx:25 | Retry load (`reset`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-7765fefc00b9 | dashboard | P1 | apps/dashboard/app/contracts/page.tsx:65 | Apply filter | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-82f43a564b45 | dashboard | P1 | apps/dashboard/app/error.tsx:25 | Retry load (`reset`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-c87834c3d7eb | dashboard | P1 | apps/dashboard/app/events/page.tsx:195 | Apply filter | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-d47c92fe1a7d | dashboard | P1 | apps/dashboard/app/events/page.tsx:196 | Clear filter | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-32eb05398ee0 | dashboard | P1 | apps/dashboard/app/locks/page.tsx:307 | Show all (`() => setVisibleCount(filteredLocks.length)`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-605787899083 | dashboard | P1 | apps/dashboard/app/pm/error.tsx:25 | Retry loading (`reset`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-465019e3806d | dashboard | P1 | apps/dashboard/app/reviews/page.tsx:147 | Clear filters | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-a6debf056dda | dashboard | P1 | apps/dashboard/app/reviews/page.tsx:238 | Apply filters | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-72a02803713e | dashboard | P1 | apps/dashboard/app/tests/page.tsx:155 | Apply filter | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-05fc70388167 | dashboard | P1 | apps/dashboard/app/tests/page.tsx:156 | Clear filter | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-43e59965bb9f | dashboard | P1 | apps/dashboard/components/EventTimeline.tsx:107 | Button (`() => setFilter(preset.value)`) | COVERED | `apps/dashboard/tests/event_timeline.test.tsx` (filter preset buttons) | unit_test | apps/dashboard/tests/event_timeline.test.tsx | unit_test | yes |
| btn-dashboard-694553a4e310 | dashboard | P1 | apps/dashboard/components/EventTimeline.tsx:147 | Clear filters (`() => setFilter("")`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-ef5fa7839de8 | dashboard | P1 | apps/dashboard/components/EventTimeline.tsx:163 | <span className="mono m (`() => { setSelectedSourceIdx(sourceIdx); onEventInspect?.(ev); if (onEventInspect) { setInspectNotice(`Refreshed the ...`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-2869f57bb49e | dashboard | P1 | apps/dashboard/components/EventTimeline.tsx:218 | Refresh linked execution logs (`() => { onEventInspect(selectedEvent); setInspectNotice(`Refreshed the linked execution logs for ${selectedEventName`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-f643a1770427 | dashboard | P1 | apps/dashboard/components/GodModePanel.tsx:305 | Button (`() => void loadPending({ trigger: "refresh"`) | COVERED | `apps/dashboard/tests/god_mode_panel.test.tsx`（inline refresh 待审批队列） | component_test | apps/dashboard/tests/god_mode_panel.test.tsx | component_test | yes |
| btn-dashboard-4cdfffb7ccc1 | dashboard | P1 | apps/dashboard/components/command-tower/CommandTowerHomeDrawer.tsx:236 | Apply filters (`onApplyFilters`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-8a05236df8c7 | dashboard | P1 | apps/dashboard/components/command-tower/CommandTowerHomeDrawer.tsx:245 | Reset filters (`onResetFilters`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-d8a1c5e57bae | dashboard | P1 | apps/dashboard/components/command-tower/CommandTowerHomeLayout.tsx:132 | Button (`props.toggleHighRiskFocus`) | COVERED | `apps/dashboard/tests/command_tower_async_home.suite.tsx`（high-risk focus toggle 交互） | component_test | apps/dashboard/tests/command_tower_async_home.suite.tsx | component_test | yes |
| btn-dashboard-fdc4f7f1551c | dashboard | P1 | apps/dashboard/components/command-tower/CommandTowerHomeLayout.tsx:227 | Button (`props.toggleHighRiskFocus`) | COVERED | `apps/dashboard/tests/command_tower_async_home.suite.tsx`（high-risk focus toggle 交互） | component_test | apps/dashboard/tests/command_tower_async_home.suite.tsx | component_test | yes |
| btn-dashboard-46cc369bf7ef | dashboard | P1 | apps/dashboard/components/command-tower/CommandTowerHomeLayout.tsx:258 | Reset filters (`props.resetFilters`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-8fa7ec44694f | dashboard | P1 | apps/dashboard/components/command-tower/CommandTowerSessionDrawer.tsx:88 | Button (`props.handleToggleLive`) | COVERED | `apps/dashboard/tests/command_tower_async_session.suite.tsx`（session live toggle） | component_test | apps/dashboard/tests/command_tower_async_session.suite.tsx | component_test | yes |
| btn-dashboard-7ee1d15e3d34 | dashboard | P1 | apps/dashboard/components/command-tower/CommandTowerSessionDrawer.tsx:99 | Manual refresh (`() => void props.handleManualRefresh()`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-c577de4c64a6 | dashboard | P1 | apps/dashboard/components/command-tower/CommandTowerSessionLive.tsx:369 | Refresh latest progress (`() => void handleManualRefresh()`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-9f247d1c3721 | dashboard | P1 | apps/dashboard/components/command-tower/CommandTowerSessionLive.tsx:380 | Button (`handleToggleLive`) | COVERED | `scripts/e2e_command_tower_controls_real.sh` (Session 暂停/恢复实时) | real_playwright | scripts/e2e_command_tower_controls_real.sh | real_playwright | yes |
| btn-dashboard-1b2e8b0293b2 | dashboard | P1 | apps/dashboard/components/command-tower/CommandTowerSessionLive.tsx:478 | Role flow (`() => handleSessionMainTabClick("graph")`) | TODO | Pending test mapping |  |  |  |  |
| btn-dashboard-a0af236fb9a3 | dashboard | P1 | apps/dashboard/components/command-tower/CommandTowerSessionLive.tsx:495 | Timeline (`() => handleSessionMainTabClick("timeline")`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-9a21b868022d | desktop | P0 | apps/desktop/src/components/chain/NodeDetailDrawer.tsx:48 | Open diff review (`onOpenDiff`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-bbe09c32360d | desktop | P0 | apps/desktop/src/components/conversation/ChatPanel.tsx:310 | Send message (`onComposerEnterSend`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-6de53f64743e | desktop | P0 | apps/desktop/src/components/conversation/ChatPanel.tsx:323 | Stop generation (`stopGeneration`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-4079d0fc610c | desktop | P0 | apps/desktop/src/components/review/DiffReviewModal.tsx:98 | × (`onClose`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-91fabc0723b0 | desktop | P0 | apps/desktop/src/components/review/DiffReviewModal.tsx:114 | Accept and merge (`onAccept`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-fde31493ffd3 | desktop | P0 | apps/desktop/src/components/review/DiffReviewModal.tsx:115 | Request changes (`onRework`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-ffb5408aabe4 | desktop | P0 | apps/desktop/src/lib/desktopUi.tsx:299 | View full diff (`() => reportActions?.onViewDiff?.(embed.id)`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-a88f7e08ed01 | desktop | P0 | apps/desktop/src/pages/CTSessionDetailPage.tsx:482 | Button (`handleSend`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-acb28dc8d17f | desktop | P0 | apps/desktop/src/pages/ChangeGatesPage.tsx:83 | Button (`() => loadDiff(runId)`) | COVERED | `apps/desktop/src/pages/desktop_p0_misc_controls.test.tsx` + `apps/desktop/src/pages/run_detail_page_controls.test.tsx` | mixed | apps/desktop/src/pages/desktop_p0_misc_controls.test.tsx; apps/desktop/src/pages/run_detail_page_controls.test.tsx; scripts/e2e_desktop_high_risk_actions_real.sh | real_playwright,unit_test | yes |
| btn-desktop-43d16bbcce69 | desktop | P0 | apps/desktop/src/pages/ChangeGatesPage.tsx:86 | Rollback (`() => handleAction(runId, "rollback")`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-47177eb441e8 | desktop | P0 | apps/desktop/src/pages/ChangeGatesPage.tsx:87 | Reject change (`() => handleAction(runId, "reject")`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-d9bd7f4f7d1f | desktop | P0 | apps/desktop/src/pages/CommandTowerPage.tsx:488 | {opt.value === "all" && } {opt.value === "high_risk" && } {opt.value === "blocked" && } {opt.value === "running" && } (`() => setFocusMode(opt.value)`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-286fa5fcd60b | desktop | P0 | apps/desktop/src/pages/GodModePage.tsx:158 | Approve execution (`() => openConfirmDialog(runId)`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-a2dc86959d1a | desktop | P0 | apps/desktop/src/pages/GodModePage.tsx:171 | Approve (`handleManualApprove`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-3abe2b1a2b5e | desktop | P0 | apps/desktop/src/pages/GodModePage.tsx:179 | Confirm approval Approve run ? This action cannot be undone. Cancel (`closeConfirmDialog`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-a21b01d43400 | desktop | P0 | apps/desktop/src/pages/GodModePage.tsx:190 | Confirm approval (`() => handleApprove(confirmRunId)`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-96260b1f689c | desktop | P0 | apps/desktop/src/pages/OverviewPage.tsx:242 | View all runs (`() => onNavigate("runs")`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-d6601271781e | desktop | P0 | apps/desktop/src/pages/OverviewPage.tsx:256 | Button (`() => onNavigateToRun(run.run_id)`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-ab923b060b9d | desktop | P0 | apps/desktop/src/pages/OverviewPage.tsx:303 | View Run (`() => onNavigateToRun(entry.runId)`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-208a8c2b84be | desktop | P0 | apps/desktop/src/pages/RunDetailPage.tsx:331 | Retry load (`() => void load()`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-9fdc16319c64 | desktop | P0 | apps/desktop/src/pages/RunDetailPage.tsx:332 | Back to list (`onBack`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-6e9ca028419a | desktop | P0 | apps/desktop/src/pages/RunDetailPage.tsx:342 | Retry load (`() => void load()`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-46878b6a5438 | desktop | P0 | apps/desktop/src/pages/RunDetailPage.tsx:343 | Back to list (`onBack`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-3eaeed5d6d21 | desktop | P0 | apps/desktop/src/pages/RunDetailPage.tsx:407 | Back to list (`onBack`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-f142f55adaf8 | desktop | P0 | apps/desktop/src/pages/RunDetailPage.tsx:413 | Button (`() => setLiveEnabled(p => !p)`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-e82780cc0602 | desktop | P0 | apps/desktop/src/pages/RunDetailPage.tsx:463 | Retry fetch (`() => void load()`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-88c9516fb5e7 | desktop | P0 | apps/desktop/src/pages/RunDetailPage.tsx:508 | Refresh data (`() => void load()`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-f7fea8f4e637 | desktop | P0 | apps/desktop/src/pages/RunDetailPage.tsx:512 | Promote evidence (`() => handleAction("promote")`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-53667fd0e9a5 | desktop | P0 | apps/desktop/src/pages/RunDetailPage.tsx:520 | Rollback (`() => handleAction("rollback")`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-7a33361df241 | desktop | P0 | apps/desktop/src/pages/RunDetailPage.tsx:521 | Reject (`() => handleAction("reject")`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-9f246d58d70c | desktop | P0 | apps/desktop/src/pages/RunDetailPage.tsx:522 | Refresh (`load`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-b51d491c90c0 | desktop | P0 | apps/desktop/src/pages/RunDetailPage.tsx:528 | Button (`() => setActiveTab(tab.key)`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-96262083a24e | desktop | P0 | apps/desktop/src/pages/RunDetailPage.tsx:541 | Refresh events (`() => void load()`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-12e22325ec21 | desktop | P0 | apps/desktop/src/pages/RunDetailPage.tsx:555 | Button (`() => toggleExpandedEvent(i)`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-44624472fa53 | desktop | P0 | apps/desktop/src/pages/RunDetailPage.tsx:591 | Retry load (`() => void load()`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-68dff775f18d | desktop | P0 | apps/desktop/src/pages/RunDetailPage.tsx:592 | Back to Event timeline (`() => setActiveTab("events")`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-ad14a0fabe27 | desktop | P0 | apps/desktop/src/pages/RunDetailPage.tsx:614 | Refresh reports (`() => void load()`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-2e9c21b5173e | desktop | P0 | apps/desktop/src/pages/RunDetailPage.tsx:636 | Refresh tool calls (`() => void load()`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-350b36d41664 | desktop | P0 | apps/desktop/src/pages/RunDetailPage.tsx:679 | Refresh chain flow (`() => void load()`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-30ad9f1979f5 | desktop | P0 | apps/desktop/src/pages/RunDetailPage.tsx:694 | Refresh contract (`() => void load()`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-6d2e10402612 | desktop | P0 | apps/desktop/src/pages/RunDetailPage.tsx:715 | Run replay (`() => handleAction("replay")`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-6688e04822a0 | desktop | P0 | apps/desktop/src/pages/RunsPage.tsx:54 | Refresh (`load`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-ec445f782463 | desktop | P0 | apps/desktop/src/pages/RunsPage.tsx:92 | Button (`() => onNavigateToRun(run.run_id)`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-f1c8ace8cf76 | desktop | P0 | apps/desktop/src/pages/SearchPage.tsx:105 | Promote to EvidenceBundle (`handlePromote`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-5291fa7fe5ea | desktop | P0 | apps/desktop/src/pages/WorkflowDetailPage.tsx:39 | Button (`() => onNavigateToRun(r.run_id)`) | COVERED | `apps/desktop/src/pages/desktop_p0_misc_controls.test.tsx` + `apps/desktop/src/pages/run_detail_page_controls.test.tsx` | mixed | apps/desktop/src/pages/desktop_p0_misc_controls.test.tsx; apps/desktop/src/pages/run_detail_page_controls.test.tsx; scripts/e2e_desktop_high_risk_actions_real.sh | real_playwright,unit_test | yes |
| btn-desktop-98c57c960d8a | desktop | P1 | apps/desktop/src/components/chain/NodeDetailDrawer.tsx:45 | Button (`onToggleRaw`) | COVERED | `apps/desktop/src/pages/desktop_p1_controls.test.tsx` + `apps/desktop/src/App.test.tsx` | unit_test | apps/desktop/src/pages/desktop_p1_controls.test.tsx; apps/desktop/src/App.test.tsx | unit_test | yes |
| btn-desktop-99c6e81edb93 | desktop | P1 | apps/desktop/src/components/conversation/ChatPanel.tsx:183 | Refresh now (`() => refreshNow()`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-cce4528a6f6d | desktop | P1 | apps/desktop/src/pages/CTSessionDetailPage.tsx:350 | Button (`() => setLiveEnabled((p) => !p)`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-ab7b2f366eab | desktop | P1 | apps/desktop/src/pages/CTSessionDetailPage.tsx:351 | Refresh now (`() => void refreshAll()`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-8f8b537fedcd | desktop | P1 | apps/desktop/src/pages/ChangeGatesPage.tsx:45 | Refresh (`load`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-e059b3505731 | desktop | P1 | apps/desktop/src/pages/CommandTowerPage.tsx:399 | Button (`refreshNow`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-30d56f85577e | desktop | P1 | apps/desktop/src/pages/CommandTowerPage.tsx:402 | Button (`() => setLiveEnabled((p) => !p)`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-13c04f88da47 | desktop | P1 | apps/desktop/src/pages/CommandTowerPage.tsx:479 | Apply (`applyFilters`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-8490c467b104 | desktop | P1 | apps/desktop/src/pages/CommandTowerPage.tsx:480 | Reset (`resetFilters`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-0acf6574bc77 | desktop | P1 | apps/desktop/src/pages/CommandTowerPage.tsx:517 | Button (`refreshNow`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-9985a70dd53a | desktop | P1 | apps/desktop/src/pages/CommandTowerPage.tsx:520 | Pause live triage (`() => setLiveEnabled(false)`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-23dbd10a6847 | desktop | P1 | apps/desktop/src/pages/CommandTowerPage.tsx:528 | Reset filters (`resetFilters`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-b7125a05d88c | desktop | P1 | apps/desktop/src/pages/CommandTowerPage.tsx:551 | Button (`refreshNow`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-ddf278b1a249 | desktop | P1 | apps/desktop/src/pages/CommandTowerPage.tsx:554 | View all sessions (`() => { setFocusMode("all"); resetFilters();`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-e6f1670302a4 | desktop | P1 | apps/desktop/src/pages/CommandTowerPage.tsx:648 | Alt+Shift+R (`refreshNow`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-122fe3791d87 | desktop | P1 | apps/desktop/src/pages/CommandTowerPage.tsx:649 | Alt+Shift+L (`() => setLiveEnabled((p) => !p)`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-d8c9de8bf867 | desktop | P1 | apps/desktop/src/pages/CommandTowerPage.tsx:650 | Export Alt+Shift+E (`exportFailedSessions`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-79104fb723f0 | desktop | P1 | apps/desktop/src/pages/CommandTowerPage.tsx:651 | Copy Alt+Shift+C (`() => void copyCurrentViewLink()`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-76fdc780f2f5 | desktop | P1 | apps/desktop/src/pages/CommandTowerPage.tsx:702 | Button (`refreshNow`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-0dbb31d07849 | desktop | P1 | apps/desktop/src/pages/ContractsPage.tsx:20 | Refresh (`load`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-d2e26ec72426 | desktop | P1 | apps/desktop/src/pages/EventsPage.tsx:32 | Refresh (`load`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-dfe65f3bfdfe | desktop | P1 | apps/desktop/src/pages/EventsPage.tsx:49 | Button (`() => toggleExpanded(i)`) | COVERED | `apps/desktop/src/pages/EventsPage.test.tsx`（row toggle 展开/收起详情） | unit_test | apps/desktop/src/pages/EventsPage.test.tsx | unit_test | yes |
| btn-desktop-f7d23d99e52f | desktop | P1 | apps/desktop/src/pages/GodModePage.tsx:144 | Refresh (`load`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-b5a1cb9a57f9 | desktop | P1 | apps/desktop/src/pages/LocksPage.tsx:20 | Refresh (`load`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-1fbcc9346569 | desktop | P1 | apps/desktop/src/pages/OverviewPage.tsx:163 | Refresh (`load`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-aaaae3b65369 | desktop | P1 | apps/desktop/src/pages/TestsPage.tsx:22 | Refresh (`load`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-94a8dd2ae2df | desktop | P1 | apps/desktop/src/pages/WorkflowsPage.tsx:31 | Refresh (`load`) | TODO | Pending test mapping |  |  |  |  |
| btn-desktop-2d20e437f143 | desktop | P1 | apps/desktop/src/pages/WorktreesPage.tsx:21 | Refresh (`load`) | TODO | Pending test mapping |  |  |  |  |

_generated_at: 2026-03-29T12:55:28Z_


## Update Workflow

1. Refresh the button inventory:

```bash
python3 scripts/ui_button_inventory.py --surface all
```

2. Sync the full matrix (default `P0,P1`):

```bash
python3 scripts/sync_ui_button_matrix.py --tiers P0,P1
```

3. Update the human annotation SSOT (`configs/ui_button_coverage_annotations.json`):

```json
{
  "rows": {
    "btn-dashboard-xxxx": {
      "status": "COVERED",
      "notes": "evidence summary",
      "evidence_type": "mixed",
      "source_path": "apps/dashboard/tests/example.test.tsx; scripts/e2e_dashboard_high_risk_actions_real.sh",
      "source_kind": "unit_test,real_playwright"
    }
  }
}
```

4. Validate the full matrix gate (structure + authenticity):

```bash
python3 scripts/check_ui_button_matrix_sync.py --required-tiers P0,P1 --fail-on-stale
```

5. Incremental mode (for development-time spot checks only):

```bash
python3 scripts/check_ui_button_matrix_sync.py --required-tiers P0,P1 --base-ref HEAD
```

import { describe, expect, it } from "vitest";
import {
  badgeClass,
  knownOutcomeTypeLabelZh,
  outcomeTypeLabelZh,
  stageCtaZh,
  stageLabelZh,
  stageVariant,
  statusCtaZh,
  statusDotClass,
  statusLabelZh,
  statusVariant,
} from "../lib/statusPresentation";

describe("statusLabelZh", () => {
  it("maps common states to Chinese labels", () => {
    expect(statusLabelZh("success")).toBe("已完成");
    expect(statusLabelZh("running")).toBe("运行中");
    expect(statusLabelZh("blocked")).toBe("阻塞");
    expect(statusLabelZh("failed")).toBe("失败");
    expect(statusLabelZh("paused")).toBe("已暂停");
    expect(statusLabelZh("archived")).toBe("已归档");
  });

  it("returns fallback for unknown values", () => {
    expect(statusLabelZh("")).toBe("未知");
    expect(statusLabelZh("new_state")).toBe("未知");
  });
});

describe("status presentation helpers", () => {
  it("maps status variant classes and cta consistently", () => {
    expect(statusVariant("approved")).toBe("success");
    expect(statusVariant("timeout")).toBe("failed");
    expect(statusVariant("working")).toBe("running");
    expect(statusVariant("pending")).toBe("warning");
    expect(statusVariant("unmapped")).toBe("default");

    expect(statusDotClass("approved")).toBe("status-dot status-dot--success");
    expect(statusDotClass("timeout")).toBe("status-dot status-dot--danger");
    expect(statusDotClass("working")).toBe("status-dot status-dot--primary");
    expect(statusDotClass("pending")).toBe("status-dot status-dot--warning");
    expect(statusDotClass("unmapped")).toBe("status-dot");

    expect(badgeClass("approved")).toBe("badge badge--success");
    expect(badgeClass("timeout")).toBe("badge badge--failed");
    expect(badgeClass("working")).toBe("badge badge--running");
    expect(badgeClass("pending")).toBe("badge badge--warning");
    expect(badgeClass("unmapped")).toBe("badge");

    expect(statusCtaZh("running")).toBe("查看进度");
    expect(statusCtaZh("paused")).toBe("继续执行");
    expect(statusCtaZh("unknown")).toBe("查看详情");
    expect(statusCtaZh("")).toBe("查看详情");
  });

  it("maps stage label variant and cta consistently", () => {
    expect(stageLabelZh("planning")).toBe("方案规划");
    expect(stageLabelZh("analysis")).toBe("需求澄清");
    expect(stageLabelZh("execution")).toBe("执行中");
    expect(stageLabelZh("qa")).toBe("验证复核");
    expect(stageLabelZh("release")).toBe("发布交付");
    expect(stageLabelZh("done")).toBe("收尾完成");
    expect(stageLabelZh("unknown")).toBe("未知阶段");

    expect(stageVariant("planning")).toBe("todo");
    expect(stageVariant("analysis")).toBe("active");
    expect(stageVariant("execution")).toBe("active");
    expect(stageVariant("qa")).toBe("verify");
    expect(stageVariant("release")).toBe("verify");
    expect(stageVariant("done")).toBe("done");
    expect(stageVariant("unknown")).toBe("default");

    expect(stageCtaZh("todo")).toBe("开始录入");
    expect(stageCtaZh("plan")).toBe("确认方案");
    expect(stageCtaZh("verify")).toBe("处理评审");
    expect(stageCtaZh("release")).toBe("发起发布");
    expect(stageCtaZh("done")).toBe("查看结果");
    expect(stageCtaZh("unknown")).toBe("查看详情");
    expect(stageCtaZh("")).toBe("查看详情");
  });
});

describe("outcome type presentation helpers", () => {
  it("maps unified outcome labels without legacy wording", () => {
    expect(knownOutcomeTypeLabelZh("gate")).toBe("规则拦截");
    expect(knownOutcomeTypeLabelZh("manual")).toBe("待人工确认");
    expect(knownOutcomeTypeLabelZh("env")).toBe("环境异常");
    expect(knownOutcomeTypeLabelZh("product")).toBe("功能异常");
    expect(knownOutcomeTypeLabelZh("functional_failure")).toBe("功能异常");
    expect(knownOutcomeTypeLabelZh("unknown")).toBe("失败待确认");
    expect(knownOutcomeTypeLabelZh("not_exists")).toBeUndefined();

    expect(outcomeTypeLabelZh("gate_blocked")).toBe("规则拦截");
    expect(outcomeTypeLabelZh("manual_pending")).toBe("待人工确认");
    expect(outcomeTypeLabelZh("environment_error")).toBe("环境异常");
    expect(outcomeTypeLabelZh("functional_failure")).toBe("功能异常");
    expect(outcomeTypeLabelZh("not_exists")).toBe("未分类");
  });
});

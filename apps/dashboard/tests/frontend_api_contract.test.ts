import { describe, expect, it, expectTypeOf } from "vitest";

import {
  FRONTEND_API_CONTRACT as localContract,
  PM_JOURNEY_STAGES as localStages,
  type FrontendApiContract as LocalFrontendApiContract,
  type PmJourneyContext as LocalPmJourneyContext,
  type PmJourneyStage as LocalPmJourneyStage,
} from "../lib/frontendApiContract";

import {
  FRONTEND_API_CONTRACT as packageContract,
  PM_JOURNEY_STAGES as packageStages,
  type FrontendApiContract as PackageFrontendApiContract,
  type PmJourneyContext as PackagePmJourneyContext,
  type PmJourneyStage as PackagePmJourneyStage,
} from "@cortexpilot/frontend-api-contract";

describe("frontendApiContract re-export mapping", () => {
  it("re-exports the same contract object to prevent drift", () => {
    expect(localContract).toBe(packageContract);
    expect(localContract.paths.pmSessions).toBe("/api/pm/sessions");
    expect(localContract.paths.pmSessionMessages).toBe("/api/pm/sessions/{pm_session_id}/messages");
    expect(localContract.headers.requestId).toBe("x-request-id");
    expect(localContract.headers.traceId).toBe("x-trace-id");
    expect(localContract.headers.traceparent).toBe("traceparent");
    expect(localContract.headers.runId).toBe("x-cortexpilot-run-id");
  });

  it("re-exports PM journey stages without mutation", () => {
    expect(localStages).toBe(packageStages);
    expect(localStages).toEqual(["discover", "clarify", "execute", "verify"]);
  });

  it("keeps exported type aliases aligned with the package contract", () => {
    expectTypeOf<LocalFrontendApiContract>().toEqualTypeOf<PackageFrontendApiContract>();
    expectTypeOf<LocalPmJourneyContext>().toEqualTypeOf<PackagePmJourneyContext>();
    expectTypeOf<LocalPmJourneyStage>().toEqualTypeOf<PackagePmJourneyStage>();
  });
});

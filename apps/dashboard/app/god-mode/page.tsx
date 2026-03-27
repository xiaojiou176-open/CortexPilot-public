import GodModePanel from "../../components/GodModePanel";

export default function GodModePage() {
  return (
    <main className="grid" aria-labelledby="god-mode-page-title">
      <header className="app-section">
        <div className="section-header">
          <div>
            <h1 id="god-mode-page-title">Manual approvals</h1>
            <p>Review every `HUMAN_APPROVAL_REQUIRED` item in one place before resuming execution.</p>
          </div>
        </div>
      </header>
      <section className="app-section" aria-label="Manual approval panel">
        <GodModePanel />
      </section>
    </main>
  );
}

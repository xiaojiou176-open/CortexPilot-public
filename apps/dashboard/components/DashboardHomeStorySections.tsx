"use client";

import Link from "next/link";
import { DEFAULT_UI_LOCALE, getUiCopy, type UiLocale } from "@cortexpilot/frontend-shared/uiCopy";
import { Button, type ButtonVariant } from "./ui/button";
import { Card } from "./ui/card";
import { useDashboardLocale } from "./DashboardLocaleContext";

type DashboardHomeStorySectionsProps = {
  failedCount: number;
  failureRate: number;
  hasRunHistory: boolean;
  latestFailureGovernanceHref: string;
  locale: UiLocale;
  showFirstTaskGuide: boolean;
};

export default function DashboardHomeStorySections({
  failedCount,
  failureRate,
  hasRunHistory,
  latestFailureGovernanceHref,
  locale,
  showFirstTaskGuide,
}: DashboardHomeStorySectionsProps) {
  const { locale: dashboardLocale, uiCopy } = useDashboardLocale();
  const resolvedUiCopy =
    dashboardLocale === DEFAULT_UI_LOCALE && locale !== DEFAULT_UI_LOCALE ? getUiCopy(locale) : uiCopy;
  const homePhase2Copy = resolvedUiCopy.dashboard.homePhase2;

  const primaryActionLabel = hasRunHistory
    ? homePhase2Copy.startNewTaskLabel
    : homePhase2Copy.startFirstTaskLabel;
  const topSecondaryAction = failedCount > 0
    ? {
        href: failureRate >= 0.5 ? "/events" : latestFailureGovernanceHref,
        label:
          failureRate >= 0.5
            ? homePhase2Copy.investigateHighRiskFailuresLabel
            : homePhase2Copy.handleLatestFailureLabel,
        variant: (failureRate >= 0.5 ? "warning" : "secondary") as ButtonVariant,
      }
    : hasRunHistory
      ? {
          href: "/runs",
          label: homePhase2Copy.viewLatestRunsLabel,
          variant: "secondary" as ButtonVariant,
        }
      : null;

  return (
    <>
      <header className="app-section">
        <div className="section-header">
          <div>
            <h1 id="dashboard-home-title" className="page-title">
              {homePhase2Copy.heroTitle}
            </h1>
            <p className="page-subtitle">{homePhase2Copy.heroSubtitle}</p>
          </div>
          <nav aria-label="Home primary actions">
            <Button asChild variant="default">
              <Link href="/pm" prefetch>{primaryActionLabel}</Link>
            </Button>
            {topSecondaryAction ? (
              <Button asChild variant={topSecondaryAction.variant}>
                <Link href={topSecondaryAction.href}>{topSecondaryAction.label}</Link>
              </Button>
            ) : null}
          </nav>
        </div>
      </header>

      <section className="app-section" aria-labelledby="dashboard-product-spine-title">
        <div className="section-header">
          <div>
            <h2 id="dashboard-product-spine-title" className="section-title">
              {homePhase2Copy.productSpineTitle}
            </h2>
            <p>{homePhase2Copy.productSpineDescription}</p>
          </div>
        </div>
        <div className="quick-grid">
          {homePhase2Copy.productSpineCards.map((item) => (
            <Link key={item.title} href={item.href} className="quick-card">
              <span className="quick-card-title">{item.title}</span>
              <span className="quick-card-desc">{item.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="app-section" aria-labelledby="dashboard-public-templates-title">
        <div className="section-header">
          <div>
            <h2 id="dashboard-public-templates-title" className="section-title">
              {homePhase2Copy.publicTemplatesTitle}
            </h2>
            <p>{homePhase2Copy.publicTemplatesDescription}</p>
          </div>
          <nav aria-label="Public task template actions">
            <Button asChild variant="secondary">
              <Link href={homePhase2Copy.publicTemplatesActionHref}>{homePhase2Copy.publicTemplatesActionLabel}</Link>
            </Button>
          </nav>
        </div>
        <div className="quick-grid">
          {homePhase2Copy.publicTemplateCards.map((item) => (
            <Link key={item.title} href={item.href} className="quick-card">
              <span className="quick-card-desc">{item.badge}</span>
              <span className="quick-card-title">{item.title}</span>
              <span className="quick-card-desc">{item.desc}</span>
              <span className="cell-sub mono">Best for: {item.bestFor}</span>
              <span className="cell-sub mono">Try with: {item.example}</span>
              <span className="cell-sub mono">{item.proof}</span>
              <span className="cell-sub mono">{item.fields.join(" · ")}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="app-section" aria-labelledby="dashboard-public-differentiators-title">
        <div className="section-header">
          <div>
            <h2 id="dashboard-public-differentiators-title" className="section-title">
              {homePhase2Copy.publicAdvantagesTitle}
            </h2>
            <p>{homePhase2Copy.publicAdvantagesDescription}</p>
          </div>
        </div>
        <div className="quick-grid">
          {homePhase2Copy.publicAdvantageCards.map((item) => (
            <Link key={item.title} href={item.href} className="quick-card">
              <span className="quick-card-title">{item.title}</span>
              <span className="quick-card-desc">{item.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="app-section" aria-labelledby="dashboard-ecosystem-title">
        <div className="section-header">
          <div>
            <h2 id="dashboard-ecosystem-title" className="section-title">
              {homePhase2Copy.ecosystemTitle}
            </h2>
            <p>{homePhase2Copy.ecosystemDescription}</p>
          </div>
          <nav aria-label="Ecosystem actions">
            <Button asChild variant="secondary">
              <Link href={homePhase2Copy.ecosystemActionHref}>{homePhase2Copy.ecosystemAction}</Link>
            </Button>
          </nav>
        </div>
        <div className="quick-grid">
          {homePhase2Copy.ecosystemCards.map((item) => (
            <Link key={item.title} href={item.href} className="quick-card" prefetch={item.prefetch ?? item.href.startsWith("/")}>
              <span className="quick-card-desc">{item.badge}</span>
              <span className="quick-card-title">{item.title}</span>
              <span className="quick-card-desc">{item.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="app-section" aria-labelledby="dashboard-ai-surfaces-title">
        <div className="section-header">
          <div>
            <h2 id="dashboard-ai-surfaces-title" className="section-title">
              {homePhase2Copy.aiSurfacesTitle}
            </h2>
            <p>{homePhase2Copy.aiSurfacesDescription}</p>
          </div>
          <nav aria-label="AI surfaces actions">
            <Button asChild variant="secondary">
              <Link href={homePhase2Copy.aiSurfacesActionHref}>{homePhase2Copy.aiSurfacesActionLabel}</Link>
            </Button>
          </nav>
        </div>
        <div className="quick-grid">
          {homePhase2Copy.aiSurfaceCards.map((item) => (
            <Link key={item.title} href={item.href} className="quick-card" prefetch={item.prefetch ?? item.href.startsWith("/")}>
              <span className="quick-card-desc">{item.badge}</span>
              <span className="quick-card-title">{item.title}</span>
              <span className="quick-card-desc">{item.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="app-section" aria-labelledby="dashboard-builder-entrypoints-title">
        <div className="section-header">
          <div>
            <h2 id="dashboard-builder-entrypoints-title" className="section-title">
              {homePhase2Copy.builderTitle}
            </h2>
            <p>{homePhase2Copy.builderDescription}</p>
          </div>
          <nav aria-label="Builder quickstart actions">
            <Button asChild variant="secondary">
              <Link href={homePhase2Copy.builderQuickstartCtaHref}>{homePhase2Copy.builderQuickstartCtaLabel}</Link>
            </Button>
          </nav>
        </div>
        <div className="quick-grid">
          {homePhase2Copy.builderCards.map((item) => (
            <Link key={item.title} href={item.href} className="quick-card" prefetch={item.prefetch ?? false}>
              <span className="quick-card-desc">{item.badge}</span>
              <span className="quick-card-title">{item.title}</span>
              <span className="quick-card-desc">{item.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="app-section" aria-labelledby="dashboard-case-gallery-baseline-title">
        <div className="section-header">
          <div>
            <h2 id="dashboard-case-gallery-baseline-title" className="section-title">
              {homePhase2Copy.caseGalleryBaselineTitle}
            </h2>
            <p>{homePhase2Copy.caseGalleryBaselineDescription}</p>
          </div>
          <nav aria-label="Public case gallery actions">
            <Button asChild variant="secondary">
              <Link href={homePhase2Copy.caseGalleryGuideHref}>{homePhase2Copy.caseGalleryGuideCtaLabel}</Link>
            </Button>
          </nav>
        </div>
        <div className="quick-grid">
          {homePhase2Copy.caseGalleryBaselineCards.map((item) => (
            <Link key={item.title} href={item.href} className="quick-card">
              <span className="quick-card-title">{item.title}</span>
              <span className="quick-card-desc">{item.desc}</span>
              <span className="cell-sub mono">{item.evidence}</span>
              <span className="cell-sub mono">{item.shareMode}</span>
            </Link>
          ))}
        </div>
      </section>

      {showFirstTaskGuide ? (
        <section className="app-section" aria-label="Start your first task in four steps">
          <div className="section-header">
            <div>
              <h2 className="section-title">{homePhase2Copy.firstTaskGuideTitle}</h2>
              <p>{homePhase2Copy.firstTaskGuideDescription}</p>
            </div>
          </div>
          <Card asChild>
            <details data-testid="home-onboarding-details">
              <summary className="quick-card-title">{homePhase2Copy.firstTaskGuideSummary}</summary>
              <div className="quick-grid mt-2">
                {homePhase2Copy.firstTaskGuideSteps.map((step) => (
                  <Link key={step.href} href={step.href} prefetch={step.prefetch} className="quick-card">
                    <span className="quick-card-desc">{step.step}</span>
                    <span className="quick-card-title">{step.title}</span>
                    <span className="quick-card-desc">{step.desc}</span>
                  </Link>
                ))}
              </div>
              <div className="quick-grid mt-2" aria-label="Optional approval step">
                <Link
                  href={homePhase2Copy.optionalApprovalStep.href}
                  prefetch={homePhase2Copy.optionalApprovalStep.prefetch}
                  className="quick-card"
                >
                  <span className="quick-card-desc">{homePhase2Copy.optionalApprovalStep.step}</span>
                  <span className="quick-card-title">{homePhase2Copy.optionalApprovalStep.title}</span>
                  <span className="quick-card-desc">{homePhase2Copy.optionalApprovalStep.desc}</span>
                </Link>
              </div>
            </details>
          </Card>
        </section>
      ) : null}
    </>
  );
}

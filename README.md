# MTM + RPM integration study

[Live website](https://juliapark64.github.io/medotter-mtm/) · [Study calculator](https://juliapark64.github.io/medotter-mtm/#/calculator) · [Interactive microsimulation](https://juliapark64.github.io/medotter-mtm/#/simulation) · [Source code](https://github.com/juliapark64/medotter-mtm)

This research-planning website explores the added contribution of pharmacist recruitment and deprescribing within an existing RPM program at a clinic serving **Original Medicare fee-for-service patients**. Usual physician referrals continue in both scenarios. The question is whether added pharmacist integration generates additional participation and enough clinic collections to cover its additional costs; deprescribing outcomes are assessed separately.

No study patient data have been collected or fitted. Synthetic histories illustrate assumptions; they are not observations, clinical recommendations, or evidence of causal synergy. The Word one-pager and AMCP abstract are separate artifacts and remain unchanged.

## One model, two views

**Study Calculator** presents analytic expectations, incremental financial benefit per 1,000 eligible members, additional RPM starts, and optional sustained medication reductions. **Simulation** uses the same inputs and equations to reveal a seeded patient's MTM review, RPM offer and initiation, service months, one-time setup qualification, medication reduction, and financial contribution. Navigation preserves the applied scenario within the browser session. Playback, inspection, and speed changes do not redraw outcomes or count patients twice.

The current program contains existing RPM participants and usual physician referrals. Integration adds completed reviews, pharmacist RPM offers and medication assessment. A referral alone is not enrollment: initiation requires a first transmitted BP reading. Overlapping physician and pharmacist contacts still produce only one RPM episode, although duplicate outreach incurs work. Existing RPM patients can receive medication review without being counted as new starts.

New starts and modeled medication assessments occur at the beginning of the selected month. Year-one spending and collections use only actual service months within the 12-month budget. Existing patients must still be active at the assessment month for a medication action. Clinical persistence is assessed 12 months after reduction and can extend beyond the budget year; drug savings count only reduced-medication months inside the budget.

## Financial and clinical assumptions

The primary financial endpoint is **additional clinic financial surplus per 1,000 eligible patients**: the integrated program's collections minus costs, less the current program's collections minus costs. Positive means financial improvement and negative means deterioration. A positive increment can be a smaller loss; it does not by itself establish that the integrated program is profitable. Cohort counts and each program's total operating margin are also shown.

The financial boundary is fixed to the **clinic serving Original Medicare fee-for-service patients**. All RPM collections received by the clinic count as revenue. There is no external-payer percentage or arbitrary 50% reduction, and no consolidated insurer accounting. Medication-cost offsets remain separately reported and are never added to clinic surplus. This model does not estimate Medicare Advantage contract payments. A first reading or a CDTA alone does not prove billability.

**Medicare 2026 benchmark** mode links allowed amounts to qualifying team clinical management minutes: **$78.16/month at 10 minutes**, **$103.88 at 20**, **$145.30 at 40**, and **$186.72 at 60 or more** (a conservative two-add-on cap). These include one $52.11 device/data allowance. Below 10 clinical minutes, only the device allowance is modeled. Setup is a separate **$21.71 once per qualifying new episode**, never for existing patients or duplicate referrals. Monthly and setup qualification default to **70%** each; an assumed **90%** all-in collection share is then applied. These percentages are unvalidated planning assumptions, not observed clinic performance or CMS payment rates. Collections include realization of the total allowed amount from Medicare and patient/supplemental sources; do not apply another 80% Medicare factor. [Original Medicare cost-sharing](https://www.medicare.gov/coverage/doctor-other-health-care-provider-services). Published allowed amounts are not guaranteed collections. [MedPAC rates, Table 4-8](https://www.medpac.gov/wp-content/uploads/2026/03/Mar26_Ch4_MedPAC_Report_To_Congress_SEC.pdf), [CMS billing requirements](https://www.cms.gov/files/document/mln901705-telehealth-remote-monitoring.pdf)

**Custom benchmark** accepts explicit monthly/setup allowed amounts for a local payment sensitivity within the same clinic perspective. **No reimbursement** removes receipts while retaining costs. Only the explicit qualifying clinical subset of non-pharmacist time counts toward the management tier; nonclinical assistance, outreach and onboarding do not. The pooled qualifying-month assumption does not adjudicate individual codes, transmission days, interactive communications or claims.

The default **illustrative deprescribing** mode enables clearly labeled medication-action assumptions and transferred persistence. **No added deprescribing benefit** sets both programs' clinical effects and medication savings to zero while retaining review workload. **Clinical benefits not estimable** keeps clinical endpoints and medication offsets unavailable, while clinic financial surplus remains calculable from collections and costs. Unknown effects are not silently replaced by zero. No cardiovascular, hospitalization, fall or symptom savings are assigned.

The default scenario is **“90% technician / 10% pharmacist RPM task allocation.”** The **9:1 ratio is technician-to-pharmacist time**, inspired by the cashbook’s team structure. Wages instead use published BLS May 2025 national means of **$22.41/$67.75 per hour** for technicians/pharmacists. Applying the June 2026 healthcare benefit factor once produces loaded rates of approximately **$31.85/$96.29**. The technician mean is a general occupational proxy, not a measured advanced-technician wage. Cashbook wages are not used. Monthly work remains **30 total minutes**: 3 pharmacist and 27 technician minutes, with 17 technician minutes assumed to qualify as supervised clinical treatment management. The 20-minute qualifying total keeps the same potential reimbursement tier. An alternative scenario excludes technician time from that tier without changing costs.

The same 90/10 allocation applies to the retained 5-minute offer and 20-minute onboarding workflows. The 10-minute medication review and follow-up remains entirely pharmacist work, so the 9:1 ratio does **not** describe total program hours or staff headcount. The user-confirmed vendor package remains **$90 per unique new start plus $12 per active month**, including the device, software and cellular connectivity; in-house team labor remains separate. Additional connectivity and platform fees default to zero to avoid counting included services twice. The original $5,000 other overhead plus $1,000 added integration overhead remain assumptions. Contract assumptions are explicitly distinguished from published evidence; the private workbook is not uploaded. Presets retain the earlier component-price benchmark and show the effect of reimbursement eligibility. Read the [methods, equations and evidence](docs/integration-study-methods.md) for source references, citations and limits. The mixed RPM/CCM cashbook time estimate and CCM income are not imported into the RPM-only model.

## Reproduce a scenario

Apply edited inputs before exporting. **Save scenario JSON** includes exact inputs, seed, model/version metadata, evidence notes, patient histories, expected results and seeded results. **Load scenario JSON** verifies an exact replay before applying it. **Export results CSV** provides full-precision summary rows; JSON is the replay format. Save JSON before refreshing to retain inputs.

```bash
# Node.js 20 or newer; no installed dependencies needed for replay
node scripts/replayIntegrationStudy.js /path/to/mtm-integration-seed-2027.json
# Or, within the project
npm run replay:integration -- /path/to/mtm-integration-seed-2027.json
```

Preserve the matching source version alongside exported runs. The integration engine is **model 4.0.0 with export schema 4**. It rejects earlier model versions, including 3.1.0, because the financial boundary and input schema changed. Old exports are not silently converted to the Original Medicare clinic model. Archive earlier runs with their original source revision. Setup remains included in expected and seeded results; do not add the earlier standalone analysis's setup supplement again. Larger synthetic cohorts and repeated seeds reduce Monte Carlo noise; they do not add empirical evidence or establish clinical confidence intervals. Input uncertainty is separate from simulation noise.

## Website and workflow demonstration

Main navigation contains Home, Simulation, Study Calculator and MTM + RPM Demo. The Insurer page and its navigation links have been removed; old `#/insurer` bookmarks redirect to the study calculator. Eligibility links and the header logo remain removed.

**MTM + RPM Demo** opens the workflow overview with the Pharmacist Dashboard and Patient Portal under `#/integration-demo`. Those fictional records are independent of the research cohort. The demo has no clinical backend, live device connection, or shared patient database. Demo enrollments, readings and alerts use browser-local storage and do not synchronize with teammates. Use fictional information only.

The original budget calculator is retained at `#/legacy-budget` for historical reproduction. It uses different endpoints and assumptions; its exports must not be relabeled as current integration-study results. The old [budget methods](docs/integrated-system-model.md), [provider model](docs/provider-feasibility-model.md), and [recruitment-only model](docs/recruitment-microsimulation.md) remain archival. `npm run scenarios` and `npm run scenarios:providers` run those historical models, not the current shared model. Generated room and patient art is documented in [asset provenance](docs/simulation-assets.md).

## Run and check locally

Use Node.js 20 or newer:

```bash
npm ci
npm run dev
npm test
npm run build
npm run preview
```

React, React Router, Recharts, Tailwind CSS and Vite power the app; no API keys or backend are required. Hash routes support direct GitHub Pages links. The shared integration model now includes code-linked reimbursement, one-time setup collections and sourced cost benchmarks in both calculator and microsimulation.

Tests check cohort conservation, monthly accounting, conditional inputs, deduplication, the clinic financial boundary, thresholds and export tampering. Passing tests confirms computational behavior, not clinical validation. Model changes affecting reproducibility require an engine version update.

## GitHub Pages deployment

The [GitHub Actions workflow](.github/workflows/pages.yml) runs tests, builds the Vite app, and deploys `dist` to GitHub Pages on pushes to `main` or manual dispatch. Pull requests run tests and build checks without deployment. In the repository's **Settings → Pages**, select **GitHub Actions** as the source. Check the workflow run before sharing the deployment URL. Relative asset paths and hash-based routes support hosting beneath a repository subpath.

No project license has been selected yet; this repository does not currently include a `LICENSE` file.

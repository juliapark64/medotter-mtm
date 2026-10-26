# MTM + RPM integration study

[Live website](https://juliapark64.github.io/medotter-mtm/) · [Study calculator](https://juliapark64.github.io/medotter-mtm/#/calculator) · [Interactive microsimulation](https://juliapark64.github.io/medotter-mtm/#/simulation) · [Source code](https://github.com/juliapark64/medotter-mtm)

This research-planning website explores the added contribution of pharmacist recruitment and deprescribing within an existing RPM program. Usual physician referrals continue in both scenarios. The question is whether added pharmacist integration generates additional participation and enough retained value to cover its additional costs.

No study patient data have been collected or fitted. Synthetic histories illustrate assumptions; they are not observations, clinical recommendations, or evidence of causal synergy. The Word one-pager and AMCP abstract are separate artifacts and remain unchanged.

## One model, two views

**Study Calculator** presents analytic expectations, incremental financial benefit per 1,000 eligible members, additional RPM starts, and optional sustained medication reductions. **Simulation** uses the same inputs and equations to reveal a seeded patient's MTM review, RPM offer and initiation, service months, one-time setup qualification, medication reduction, and financial contribution. Navigation preserves the applied scenario within the browser session. Playback, inspection, and speed changes do not redraw outcomes or count patients twice.

The current program contains existing RPM participants and usual physician referrals. Integration adds completed reviews, pharmacist RPM offers and medication assessment. A referral alone is not enrollment: initiation requires a first transmitted BP reading. Overlapping physician and pharmacist contacts still produce only one RPM episode, although duplicate outreach incurs work. Existing RPM patients can receive medication review without being counted as new starts.

New starts and modeled medication assessments occur at the beginning of the selected month. Year-one spending and collections use only actual service months within the 12-month budget. Existing patients must still be active at the assessment month for a medication action. Clinical persistence is assessed 12 months after reduction and can extend beyond the budget year; drug savings count only reduced-medication months inside the budget.

## Financial and clinical assumptions

The primary financial endpoint is **additional net financial benefit per 1,000 eligible members**: integrated program minus current program. Positive means financial improvement and negative means deterioration. A positive increment can be a smaller loss; it does not by itself establish that the integrated program is profitable. Cohort counts are also shown without standardization. Operating margin is reported separately.

- **Consolidated integrated system:** external collections plus retained net medication savings minus program costs. Internal transfers between an owned plan, clinic and pharmacy cancel. A separate retained medication-savings share reflects drug-cost liability independently of the external RPM payer mix.
- **Clinic operating margin:** external collections minus program costs. Medication savings paid for by another organization are excluded.

These are accounting perspectives, not competing provider settings. The enabled default scenario assumes **50% external RPM receipts and 50% retained medication savings**. These independent financial assumptions are not Kaiser data. Changing perspective does not create revenue automatically. A first reading or a CDTA alone does not prove billability.

**Medicare 2026 benchmark** mode links allowed amounts to pharmacist clinical management minutes: **$78.16/month at 10 minutes**, **$103.88 at 20**, **$145.30 at 40**, and **$186.72 at 60 or more** (a conservative two-add-on cap). These include one $52.11 device/data allowance. Below 10 clinical minutes, only the device allowance is modeled. Setup is a separate **$21.71 once per qualifying new episode**, never for existing patients or duplicate referrals. Monthly and setup qualification default to **70%** each; an assumed **90%** collection share and the external-payer share further reduce receipts. Published allowed amounts are not guaranteed collections. [MedPAC rates, Table 4-8](https://www.medpac.gov/wp-content/uploads/2026/03/Mar26_Ch4_MedPAC_Report_To_Congress_SEC.pdf), [CMS billing requirements](https://www.cms.gov/files/document/mln901705-telehealth-remote-monitoring.pdf)

**Custom contract** accepts explicit monthly/setup allowances. **No reimbursement** removes receipts while retaining costs. Technician support does not count toward clinical management billing. The pooled qualifying-month assumption does not adjudicate individual codes, transmission days, interactive communications or claims.

The default **illustrative deprescribing** mode enables clearly labeled medication-action assumptions and transferred persistence. **No added deprescribing benefit** sets both programs' clinical effects and medication savings to zero while retaining review workload. **Clinical benefits not estimable** keeps clinical endpoints and total net benefit unavailable, while displaying operating margin. Unknown effects are not silently replaced by zero. No cardiovascular, hospitalization, fall or symptom savings are assigned.

Default costs use BLS-informed loaded pharmacist/technician rates of approximately **$96.29/$31.85 per hour**, a **$99.95 retail cellular cuff**, **$15 software plus $5 assumed connectivity per active month**, and a common **$299/month core subscription** in both arms. The original $5,000 other overhead plus $1,000 added integration overhead remain assumptions. The hardware and software are component-price benchmarks, not a verified vendor package. The **20 pharmacist + 10 nonclinical support minutes/month**, review/onboarding time, one shared software license, recruitment probabilities, and clinical effects require local calibration. The methods document provides exact source values, formulas and limitations. May 2025 wages are carried forward without escalation using a June 2026 compensation load; costs are planning proxies, not fully reindexed local 2026 observations. Read the [methods, equations and evidence](docs/integration-study-methods.md).

## Reproduce a scenario

Apply edited inputs before exporting. **Save scenario JSON** includes exact inputs, seed, model/version metadata, evidence notes, patient histories, expected results and seeded results. **Load scenario JSON** verifies an exact replay before applying it. **Export results CSV** provides full-precision summary rows; JSON is the replay format. Save JSON before refreshing to retain inputs.

```bash
# Node.js 20 or newer; no installed dependencies needed for replay
node scripts/replayIntegrationStudy.js /path/to/mtm-integration-seed-2027.json
# Or, within the project
npm run replay:integration -- /path/to/mtm-integration-seed-2027.json
```

Preserve the matching source version alongside exported runs. The integration engine is **model 2.0.0 with export schema 2**. It rejects earlier 1.0.0/schema 1 integration exports rather than silently changing their meaning. Archive earlier runs with their original source revision. Setup is now included in expected and seeded results; do not add the earlier standalone analysis's setup supplement again. Larger synthetic cohorts and repeated seeds reduce Monte Carlo noise; they do not add empirical evidence or establish clinical confidence intervals. Input uncertainty is separate from simulation noise.

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

Tests check cohort conservation, monthly accounting, conditional inputs, deduplication, financial perspectives, thresholds and export tampering. Passing tests confirms computational behavior, not clinical validation. Model changes affecting reproducibility require an engine version update.

## GitHub Pages deployment

The [GitHub Actions workflow](.github/workflows/pages.yml) runs tests, builds the Vite app, and deploys `dist` to GitHub Pages on pushes to `main` or manual dispatch. Pull requests run tests and build checks without deployment. In the repository's **Settings → Pages**, select **GitHub Actions** as the source. Check the workflow run before sharing the deployment URL. Relative asset paths and hash-based routes support hosting beneath a repository subpath.

No project license has been selected yet; this repository does not currently include a `LICENSE` file.

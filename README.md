# MTM + RPM integration study

[Live website](https://juliapark64.github.io/medotter-mtm/) · [Study calculator](https://juliapark64.github.io/medotter-mtm/#/calculator) · [Interactive microsimulation](https://juliapark64.github.io/medotter-mtm/#/simulation) · [Source code](https://github.com/juliapark64/medotter-mtm)

This research-planning website explores the added contribution of pharmacist recruitment and deprescribing within an existing RPM program. Usual physician referrals continue in both scenarios. The question is whether added pharmacist integration generates additional participation and enough retained value to cover its additional costs.

No study patient data have been collected or fitted. Synthetic histories illustrate assumptions; they are not observations, clinical recommendations, or evidence of causal synergy. The Word one-pager and AMCP abstract are separate artifacts and remain unchanged.

## One model, two views

**Study Calculator** presents analytic expectations, incremental financial benefit per 1,000 eligible members, additional RPM starts, and optional sustained medication reductions. **Simulation** uses the same inputs and equations to reveal a seeded patient's MTM review, RPM offer and initiation, service months, medication reduction, and financial contribution. Navigation preserves the applied scenario within the browser session. Playback, inspection, and speed changes do not redraw outcomes or count patients twice.

The current program contains existing RPM participants and usual physician referrals. Integration adds completed reviews, pharmacist RPM offers and medication assessment. A referral alone is not enrollment: initiation requires a first transmitted BP reading. Overlapping physician and pharmacist contacts still produce only one RPM episode, although duplicate outreach incurs work. Existing RPM patients can receive medication review without being counted as new starts.

New starts and modeled medication assessments occur at the beginning of the selected month. Year-one spending and collections use only actual service months within the 12-month budget. Existing patients must still be active at the assessment month for a medication action. Clinical persistence is assessed 12 months after reduction and can extend beyond the budget year; drug savings count only reduced-medication months inside the budget.

## Financial and clinical assumptions

The primary financial endpoint is **additional net financial benefit per 1,000 eligible members**: integrated program minus current program. Positive means financial improvement and negative means deterioration. A positive increment can be a smaller loss; it does not by itself establish that the integrated program is profitable. Cohort counts are also shown without standardization. Operating margin is reported separately.

- **Consolidated integrated system:** external collections plus retained net medication savings minus program costs. Internal transfers between an owned plan, clinic and pharmacy cancel. A separate retained medication-savings share reflects drug-cost liability independently of the external RPM payer mix.
- **Clinic operating margin:** external collections minus program costs. Medication savings paid for by another organization are excluded.

These are accounting perspectives, not competing provider settings. The default external payer share is zero. Changing the perspective does not create revenue automatically. The revenue benchmark, payer mix, qualifying-month share and collection rate are editable assumptions, not a guaranteed reimbursement schedule. A first reading or a CDTA alone does not prove billability.

The default **no added deprescribing benefit** scenario explicitly sets both programs' clinical effects and medication savings to zero while retaining review workload. **Illustrative deprescribing** enables clearly labeled action assumptions and transferred persistence. **Clinical benefits not estimable** keeps clinical endpoints and total net benefit unavailable, while displaying operating margin. Unknown effects are not silently replaced by zero. No cardiovascular, hospitalization, fall or symptom savings are assigned.

Loaded wages, task minutes, device and platform costs, fixed costs, and net medicine savings are investigator assumptions in 2026 USD pending local calibration. Source links explain what literature supports and where transfer assumptions begin. Read the [methods, equations and evidence](docs/integration-study-methods.md).

## Reproduce a scenario

Apply edited inputs before exporting. **Save scenario JSON** includes exact inputs, seed, model/version metadata, evidence notes, patient histories, expected results and seeded results. **Load scenario JSON** verifies an exact replay before applying it. **Export results CSV** provides full-precision summary rows; JSON is the replay format. Save JSON before refreshing to retain inputs.

```bash
# Node.js 20 or newer; no installed dependencies needed for replay
node scripts/replayIntegrationStudy.js /path/to/mtm-integration-seed-2027.json
# Or, within the project
npm run replay:integration -- /path/to/mtm-integration-seed-2027.json
```

Preserve the matching source version alongside exported runs. The integration engine is model 1.0.0 with export schema 1. Larger synthetic cohorts and repeated seeds reduce Monte Carlo noise; they do not add empirical evidence or establish clinical confidence intervals. Input uncertainty is separate from simulation noise.

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

React, React Router, Recharts, Tailwind CSS and Vite power the app; no API keys or backend are required. Hash routes support direct GitHub Pages links. Version 3.0.0 introduces the shared integration calculator and microsimulation.

Tests check cohort conservation, monthly accounting, conditional inputs, deduplication, financial perspectives, thresholds and export tampering. Passing tests confirms computational behavior, not clinical validation. Model changes affecting reproducibility require an engine version update.

## GitHub Pages deployment

The [GitHub Actions workflow](.github/workflows/pages.yml) runs tests, builds the Vite app, and deploys `dist` to GitHub Pages on pushes to `main` or manual dispatch. Pull requests run tests and build checks without deployment. In the repository's **Settings → Pages**, select **GitHub Actions** as the source. Check the workflow run before sharing the deployment URL. Relative asset paths and hash-based routes support hosting beneath a repository subpath.

No project license has been selected yet; this repository does not currently include a `LICENSE` file.

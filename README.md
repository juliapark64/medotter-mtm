# MedOtter MTM

[Open the live demo](https://juliapark64.github.io/medotter-mtm/) · [Open the calculator](https://juliapark64.github.io/medotter-mtm/#/calculator) · [Source code](https://github.com/juliapark64/medotter-mtm)

MedOtter is a browser-based demonstration of medication therapy management (MTM), hypertension remote patient monitoring (RPM), and financial impact modeling. It includes fictional patient workflows, blood pressure trends and alerts, pharmacist review tools, and a deterministic budget-impact calculator.

## Current study scope

App version 2.5.0 asks: **Can deprescribing savings offset the added costs of RPM within MTM?** The calculator uses a hypothetical Medicare Advantage health-plan perspective, with employed MTM pharmacists and an RPM device/data vendor. It compares deprescribing alone, RPM alone, and the combined program with standard MTM and hypertension care.

The primary endpoint is one-year combined-program net budget impact per member per month (PMPM), across all covered members. Three-year projections are secondary. Positive net impact means added cost; negative means modeled savings. The calculator displays program costs, drug and cardiovascular cost offsets, workload, implementation break-even, and a result excluding cardiovascular savings.

The community-pharmacy versus integrated-clinic comparison is outside the current calculator. Its historical source and [provider model documentation](docs/provider-feasibility-model.md) are retained for reproducibility. The revised endpoint-plan methods—comparing physician referral with MTM-based RPM recruitment—and a patient-level microsimulation have **not** been implemented. Word documents and the AMCP abstract are not included in this repository.

## Try the demo

Use **Value Calculator** in the navigation to explore the study. Routes use URL fragments, such as `#/calculator`, so direct links and refreshes work on GitHub Pages. The published address is available in the repository's **Settings → Pages** and its latest deployment.

All patient records and operational dashboard metrics are fictional. This prototype has no clinical backend, live device connection, or shared patient database. RPM enrollments, readings, alert acknowledgments, thresholds, and simulated prescriber logs are stored in that browser's `localStorage`; they do not synchronize with teammates. A different browser or site origin has separate state. Clearing the site's browser data resets these demo records.

Use fictional information only. The demo is for research discussion and software review, not clinical care. Calculator inputs are held in the current page session; save a scenario JSON before refreshing or leaving if you want to retain them.

## Run locally

Use Node.js 20 or newer. From the cloned repository folder:

```bash
npm ci
npm run dev
```

Open the local address printed by Vite and choose **Value Calculator**, or append `#/calculator` to that address. To check the production build locally:

```bash
npm test
npm run build
npm run preview
```

The project uses React, React Router, Recharts, Tailwind CSS, and Vite. No API keys or application server are required.

## Share and reproduce scenarios

In the calculator, edit assumptions and add source notes, then select the export scope. **Save scenario JSON** preserves exact inputs, model metadata, citations, and annual/cumulative results. Send that file to a teammate, who can use **Load scenario JSON** to recalculate, verify, and restore it. **Export results CSV** provides a table for inspection; JSON is the replay format. Scenario files can contain your notes, so review them before sharing.

Browser and CLI defaults select the Geisinger-informed scenario: 1.09 discontinuation recommendations per completed initial review and 33.2% implementation. **Apply no added benefit** sets additional findings beyond existing MTM to zero while retaining workload, program costs, and RPM effects. **Reset study base case** restores the reference inputs, including the assumed 50% additional-findings share.

```bash
# Study base case, program comparisons, and exploratory sensitivity scenarios
npm run scenarios

# Write to a new folder; existing folders are never overwritten
npm run scenarios -- --outdir ./results/my-study-run

# Verify a saved scenario bundle
npm run scenarios -- --replay ./results/my-study-run/scenarios.json --verify-only
```

Default runs are saved under `results/health-plan-study-v3/`. Each CLI run includes full-precision CSV, replayable JSON, runnable model source, SHA-256 checksums, and replay instructions. The archived verifier needs Node.js but no installed packages. Budget model 3.0.0 uses export schema 3; older bundles must be replayed with their matching archived source. `npm run scenarios:providers` remains an optional historical provider-model command, separate from the current study.

## Evidence and limitations

The [study model specification](docs/integrated-system-model.md) explains equations, sources, denominators, and assumptions. Literature references inform selected inputs; most costs, incremental effects, uptake, and persistence remain explicit assumptions. Geisinger does not validate those other inputs, and the model is not based on Kaiser patient or financial data. It assumes independent deprescribing and RPM effects and counts shared fixed costs once. It does not establish clinical synergy, observed savings, quality bonus revenue, or cost-effectiveness.

Tests check calculation behavior, cohort accounting, validation, thresholds, and export replay. Passing them does not constitute clinical validation or independent spreadsheet verification. Keep assumptions, evidence labels, model metadata, and tests aligned when making changes; update model versions when changes affect reproducibility.

## GitHub Pages deployment

The [GitHub Actions workflow](.github/workflows/pages.yml) runs tests, builds the Vite app, and deploys `dist` to GitHub Pages on pushes to `main` or manual dispatch. Pull requests run tests and build checks without deployment. In the repository's **Settings → Pages**, select **GitHub Actions** as the source. Check the workflow run before sharing the deployment URL. Relative asset paths and hash-based routes support hosting beneath a repository subpath.

No project license has been selected yet; this repository does not currently include a `LICENSE` file.

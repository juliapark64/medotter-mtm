# MTM + RPM delivery study

[Live website](https://juliapark64.github.io/medotter-mtm/) · [Study calculator](https://juliapark64.github.io/medotter-mtm/#/calculator) · [Interactive microsimulation](https://juliapark64.github.io/medotter-mtm/#/simulation) · [Source code](https://github.com/juliapark64/medotter-mtm)

This research-planning website compares **physician-delivered RPM with pharmacist-delivered RPM for the same enrolled patients** at a clinic serving Original Medicare fee-for-service patients. It estimates each program's collections, allocated costs, operating margin and cost per active patient-month. The secondary difference shows the financial impact of switching delivery models.

No study patient data have been collected or fitted. Synthetic histories illustrate assumptions; they do not establish clinical equivalence, observed profit or causal benefit. The Word one-pager and AMCP abstract are separate artifacts and remain unchanged.

## Main comparison

Opening or reloading the website now loads **“Paired sensitivity: nurse-supported physician versus 60:40 pharmacy team.”** This starting scenario keeps the same 1,000-patient cohort, reimbursement assumptions, vendor package, costed physician oversight and unestimated clinical effects. Changing the selected scenario or inputs updates both study pages for the current session; reloading restores this opening scenario. The original 20-minute physician versus 20-minute pharmacist allocation remains selectable.

The calculator computes expected results; the microsimulation runs the same fictional patients through both delivery models with a reproducible seed. Both use the same existing/new status, start month, retention and billing-qualification draws. Changing playback speed or inspecting a patient does not redraw outcomes or charge another service.

In the primary comparison, **N is the common enrolled RPM cohort**, not the number of eligible people awaiting referral. The default is 1,000 enrolled patients: an assumed 5% already receive RPM in January and everyone else starts in month 7. No referral probabilities, recruitment costs or separate MTM intake costs determine this cohort. New patients receive only the service months remaining in the 12-month budget. The established-program sensitivity starts the full cohort in January with no new onboarding or transition charge.

| Assumed work | Physician-delivered RPM | Pharmacist-delivered RPM |
| --- | --- | --- |
| Monthly clinical management | 3 physician + 17 RN minutes | 12 pharmacist + 8 assumed qualifying technician minutes |
| Monthly nonclinical logistics | 10 medical-assistant minutes | 10 pharmacy-technician minutes (18 total technician minutes) |
| Separate physician supervision allowance | Included in physician work | 1 additional minute, costed but excluded from qualifying clinical minutes |
| Clinic onboarding per new start | 5 RN + 15 medical-assistant minutes | 2 pharmacist + 18 technician minutes |

These task durations are **investigator assumptions**, not measured usual-care workloads or CMS-required staffing times. Routine medication management is included in the pharmacist's clinical time. The pharmacist arm replaces the physician arm's routine delivery costs; it does not retain those costs and add a second complete team. Physician/NPP billing and supervision remain necessary.

**New sensitivity: “$0 additional physician supervision cost · existing clinic resources.”** This keeps the entered oversight minutes and physician workload but assumes existing clinic resources cover the cost, so no additional supervision charge is allocated to the pharmacist program. Required oversight remains. Existing staff time may have opportunity cost; this budget sensitivity is not a fully allocated economic-cost comparison. Other costs, reimbursement and clinical assumptions are preserved, and no extra visit revenue is added. Costed supervision remains part of the opening paired staffing scenario.

The primary scenario leaves comparative clinical effects **unestimated**. The calculator and microsimulation offer two staffing sensitivities, separately or together:

- **Nurse-supported physician RPM:** 3 physician + 17 RN + 10 medical-assistant minutes per active patient-month; onboarding uses 5 RN + 15 medical-assistant minutes per new start. Historical HINTS physician time informs the approximate 3-minute allowance; the RN, assistant and onboarding allocations remain assumptions.
- **60:40 technician/pharmacist recurring work:** 12 pharmacist + 18 technician minutes within an assumed 30-minute month. The split transfers an approximate share from the Wisconsin TEAM study of in-person hypertension care, not a measured RPM staffing ratio. Eight technician minutes are assumed qualifying supervised clinical work; ten are nonclinical. Onboarding and separate medication reviews are unchanged.

Each staffing control preserves the other arm and the entered vendor fees, collections, clinical assumptions and supervision cost mode; the paired shortcut applies both allocations. They do not change enrollment or impose clinical effects. Both illustrated allocations contain 20 qualifying clinical minutes, preserving the primary comparison's payment tier. Applying a preset to custom minutes can change that arm's payment tier. The paired staffing allocation is now the website opening default; the financial equations and benchmarks are unchanged.

The assumed **9:1 technician-to-pharmacist workflow** remains an exploratory sensitivity, with no validation of the ratio or technician billing eligibility. MINOR-informed deprescribing and recruitment are separate analyses; recruitment uses an eligible-population denominator. None of these staffing allocations establishes clinical equivalence or sufficient capacity. [Methods and equations](docs/integration-study-methods.md)

## Evidence and remaining assumptions

- **Compensation:** national BLS wages, with one assumed healthcare benefit-loading factor, give approximate hourly employer costs of $174.80 for a family physician, $69.30 for an RN, $31.51 for a medical assistant, $96.29 for a pharmacist and $31.85 for a pharmacy technician. Local compensation and work capacity are not observed. Cashbook wages are excluded. [BLS wages](https://www.bls.gov/news.release/archives/ocwage_05152026.htm), [BLS compensation](https://www.bls.gov/news.release/archives/ecec_09092026.htm)
- **Physician staffing:** HINTS estimated 57.3 physician minutes per patient over 18 months, or 3.18 minutes/month. Physician time observed over 35 days was extrapolated to the study period in a historical VA, event-triggered telemonitoring program. It does not establish a contemporary monthly RPM requirement or the model's full nurse-supported allocation. [Wang et al., 2012](https://dukespace.lib.duke.edu/server/api/core/bitstreams/8fc5be7f-af15-4df4-9383-74250473b0cd/content)
- **Pharmacist/technician staffing:** the Wisconsin TEAM cost analysis reported 62.8 pharmacist and 95.4 technician minutes per patient over six months: approximately 40% and 60% of combined time. Pharmacist consultations were logged; provider communication and technician time were estimated. Transferring this in-person care ratio to 30 monthly RPM minutes and designating qualifying technician work are assumptions. [Shireman and Svarstad, 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4958589/)
- **Reimbursement:** the default 2026 national nonfacility benchmark at 20 qualifying clinical minutes is $103.88 per qualifying month, plus $21.71 once per qualifying new setup. The 70% monthly qualification, 70% setup qualification and 90% collection realization are **unvalidated planning assumptions**. The collection share includes Medicare and patient/supplemental receipts; no additional 50% payer reduction or 80% Medicare factor is applied. [MedPAC Table 4-8](https://www.medpac.gov/wp-content/uploads/2026/03/Mar26_Ch4_MedPAC_Report_To_Congress_SEC.pdf), [CMS requirements](https://www.cms.gov/files/document/mln901705-telehealth-remote-monitoring.pdf)
- **Technology:** $90 per new start and $12 per active patient-month are user-supplied business-plan assumptions with device/software/connectivity included, not a verified Prevounce quote. Clinic labor is separate. Additional connectivity and subscription fees default to zero to avoid duplicate charges. Both arms have $5,000 annual overhead; the pharmacist arm has an assumed $1,000 year-one transition cost.
- **Deprescribing:** the optional MINOR scenario transfers 45-day patient outcomes of 11/161 versus 31/161 to comparable monitored patients, with a separately costed 10-minute added review for completed reviews. No annual medication savings are inferred without an explicitly assumed extension. Medication-cost offsets are reported separately and never counted as clinic receipts. [MINOR trial](https://www.sciencedirect.com/science/article/pii/S0149291823002035)

Lower allocated labor cost does not necessarily reduce a salaried clinic's cash payroll. Released physician hours are reported as capacity; they are not also converted into extra visit revenue. Equal billing assumptions isolate staffing costs, but they do not prove equal quality, safety or workload in practice.

## Sensitivity and break-even analysis

Both study pages include a shared financial sensitivity analysis based on the **analytic expected values of the applied scenario**, independent of the microsimulation's playback progress or random seed. Choose either program's margin or the pharmacist-minus-physician margin difference as the outcome.

- **One-way analysis** changes one input at a time and ranks drivers by the outcome range. Editable bounds are investigator-selected stress tests, not measured confidence intervals. Billing-time thresholds are included because lowering labor time can also lower reimbursement; the lowest input need not give the highest margin.
- **Two-way analysis** varies two inputs together. Inspect a heatmap cell to see both complete program margins and their difference. Invalid combinations, such as qualifying technician time exceeding paid technician time, are identified rather than silently recosted. Inspection does not change the applied program; the explicit apply action does.
- **Break-even targets** show each program's required collection and monthly qualification shares, maximum affordable monthly technology and one-time device fees, and pharmacist-time intervals satisfying the selected financial conditions. These hold other assumptions fixed and do not establish safe clinical workloads or actual billing eligibility. A rate above 100%, a negative affordable fee or an absent paid-service denominator is shown as an unattainable or undefined target, as applicable.

Shared revenue or vendor assumptions may change both programs' absolute profitability while leaving their margin difference unchanged. A zero bar for that difference does not mean the assumption is unimportant to financial feasibility. The ranking is conditional on the chosen bounds and model structure; it is not evidence of a causal effect or parameter importance in observed practice. Medication-cost offsets remain outside clinic operating margin.

Sensitivity JSON/CSV exports retain the applied inputs, ranges, outcome, two-way axes, source notes and deterministic results. Verify a saved analysis with `node scripts/replaySensitivity.js /path/to/sensitivity.json`. Sensitivity replay permits documented numeric tolerance for derived results across JavaScript runtimes; assumptions, sampled input coordinates and evidence metadata are compared without that tolerance. The sensitivity analysis has its own **version 1.0.0 / export schema 1**, using the unchanged study engine **8.1.0 / scenario schema 8**. It is deterministic sensitivity analysis, not probabilistic sensitivity analysis or a clinical confidence interval. [Detailed methods and threshold equations](docs/integration-study-methods.md#financial-sensitivity-and-break-even-analysis)

## CMS policy context

As checked **October 26, 2026**, the CY 2027 PFS restriction on outsourced RPM clinical services is **proposed, not final**. If finalized as written, clinical staff would need to be direct employees of the billing practitioner/practice from January 1, 2027, under general supervision and incident-to requirements. Staff and patients need not be on-site. This staffing proposal does not establish a blanket ban on purchasing vendor technology; device/software costs remain modeled. The website uses **2026 fee benchmarks** as a staffing-policy sensitivity. The proposal also includes initiating-visit and valuation changes that are not implemented here; this is not a complete 2027 implementation forecast. [CMS proposal](https://www.cms.gov/newsroom/fact-sheets/calendar-year-cy-2027-medicare-physician-fee-schedule-proposed-rule), [official proposed rule, pages 150–152](https://public-inspection.federalregister.gov/2026-14327.pdf), [CMS rule index](https://www.cms.gov/medicare/payment/fee-schedules/physician/federal-regulation-notices)

## Reproduce a scenario

Apply edited inputs before exporting. Scenario JSON records the exact inputs, seed, evidence metadata, applied staffing evidence, role-specific task traces, paired patient histories and expected/simulated results. JSON and CSV metadata distinguish the published observations from the staffing assumptions actually applied to the run. CSV is for inspection; JSON is the replay format. Save the matching source revision with each run.

```bash
# Node.js 20 or newer; replay needs no installed dependencies
node scripts/replayIntegrationStudy.js /path/to/scenario.json
```

Website application **8.3.1** uses model **rpm-delivery-comparison**, engine **8.1.0**, export schema **8**. Exports retain the supervision cost mode, task-level cost basis and applied staffing evidence. Earlier-engine exports, including engine 8.0.0, require their matching engine and are rejected here rather than silently changing their evidence or calculation. Keep older exports with their original source revision. Larger cohorts or more seeds reduce Monte Carlo noise; they do not add empirical evidence or produce clinical confidence intervals.

## Website and local development

Navigation contains Home, Simulation, Study Calculator and MTM + RPM Demo. The demo contains the Pharmacist Dashboard and Patient Portal under `#/integration-demo`; its fictional records are separate from the research cohort and remain browser-local. There is no clinical backend or live device connection. The Insurer page is removed, and old `#/insurer` links redirect to the calculator.

```bash
npm ci
npm run dev
npm test
npm run build
npm run preview
```

React, React Router, Recharts, Tailwind CSS and Vite power the app. No API keys are required. Hash routes and relative assets support GitHub Pages. Tests verify accounting and reproducibility; they do not establish clinical validity. The [Pages workflow](.github/workflows/pages.yml) tests, builds and deploys pushes to `main`; pull requests run checks without deployment. In repository **Settings → Pages**, select **GitHub Actions**.

Historical models remain at `#/legacy-budget` and in the [budget](docs/integrated-system-model.md), [provider](docs/provider-feasibility-model.md) and [recruitment-only](docs/recruitment-microsimulation.md) documentation. Their outputs use different questions and assumptions. `npm run scenarios` and `npm run scenarios:providers` run those historical models. [Simulation asset provenance](docs/simulation-assets.md) is documented separately. No project license has been selected.

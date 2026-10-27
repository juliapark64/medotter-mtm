# MTM + RPM delivery study

[Live website](https://juliapark64.github.io/medotter-mtm/) · [Study calculator](https://juliapark64.github.io/medotter-mtm/#/calculator) · [Interactive microsimulation](https://juliapark64.github.io/medotter-mtm/#/simulation) · [Source code](https://github.com/juliapark64/medotter-mtm)

This research-planning website compares **physician-delivered RPM with pharmacist-delivered RPM for the same enrolled patients** at a clinic serving Original Medicare fee-for-service patients. It estimates each program's collections, allocated costs, operating margin and cost per active patient-month. The secondary difference shows the financial impact of switching delivery models.

No study patient data have been collected or fitted. Synthetic histories illustrate assumptions; they do not establish clinical equivalence, observed profit or causal benefit. The Word one-pager and AMCP abstract are separate artifacts and remain unchanged.

## Main comparison

The calculator computes expected results; the microsimulation runs the same fictional patients through both delivery models with a reproducible seed. Both use the same existing/new status, start month, retention and billing-qualification draws. Changing playback speed or inspecting a patient does not redraw outcomes or charge another service.

In the primary comparison, **N is the common enrolled RPM cohort**, not the number of eligible people awaiting referral. The default is 1,000 enrolled patients: an assumed 5% already receive RPM in January and everyone else starts in month 7. No referral probabilities, recruitment costs or separate MTM intake costs determine this cohort. New patients receive only the service months remaining in the 12-month budget. The established-program sensitivity starts the full cohort in January with no new onboarding or transition charge.

| Assumed work | Physician-delivered RPM | Pharmacist-delivered RPM |
| --- | --- | --- |
| Monthly clinical management | 20 physician minutes | 20 pharmacist minutes |
| Monthly logistics | 10 medical-assistant minutes | 10 pharmacy-technician minutes |
| Separate physician supervision allowance | Included in physician work | 1 additional minute, costed but excluded from qualifying clinical minutes |
| Clinic onboarding per new start | 20 medical-assistant minutes | 2 pharmacist + 18 technician minutes |

These task durations are **investigator assumptions**, not measured usual-care workloads or CMS-required staffing times. Routine medication management is included in the pharmacist's clinical time. The pharmacist arm replaces the physician arm's routine delivery costs; it does not retain those costs and add a second complete team. Physician/NPP billing and supervision remain necessary.

**New sensitivity: “$0 additional physician supervision cost · existing clinic resources.”** This keeps the entered oversight minutes and physician workload but assumes existing clinic resources cover the cost, so no additional supervision charge is allocated to the pharmacist program. Required oversight remains. Existing staff time may have opportunity cost; this budget sensitivity is not a fully allocated economic-cost comparison. Other costs, reimbursement and clinical assumptions are preserved, and no extra visit revenue is added. The original costed-supervision scenario remains the default.

The primary scenario leaves comparative clinical effects **unestimated**. Separate sensitivities examine a physician/nurse team, the assumed 9:1 technician-to-pharmacist workflow, MINOR-informed deprescribing and recruitment. The 9:1 scenario is not the default and does not establish that technician time automatically qualifies for reimbursement. Recruitment scenarios answer a different question and use an eligible-population denominator. [Methods and equations](docs/integration-study-methods.md)

## Evidence and remaining assumptions

- **Compensation:** national BLS wages, with one assumed healthcare benefit-loading factor, give approximate hourly employer costs of $174.80 for a family physician, $69.30 for an RN, $31.51 for a medical assistant, $96.29 for a pharmacist and $31.85 for a pharmacy technician. Local compensation and work capacity are not observed. Cashbook wages are excluded. [BLS wages](https://www.bls.gov/news.release/archives/ocwage_05152026.htm), [BLS compensation](https://www.bls.gov/news.release/archives/ecec_09092026.htm)
- **Reimbursement:** the default 2026 national nonfacility benchmark at 20 qualifying clinical minutes is $103.88 per qualifying month, plus $21.71 once per qualifying new setup. The 70% monthly qualification, 70% setup qualification and 90% collection realization are **unvalidated planning assumptions**. The collection share includes Medicare and patient/supplemental receipts; no additional 50% payer reduction or 80% Medicare factor is applied. [MedPAC Table 4-8](https://www.medpac.gov/wp-content/uploads/2026/03/Mar26_Ch4_MedPAC_Report_To_Congress_SEC.pdf), [CMS requirements](https://www.cms.gov/files/document/mln901705-telehealth-remote-monitoring.pdf)
- **Technology:** $90 per new start and $12 per active patient-month are user-supplied business-plan assumptions with device/software/connectivity included, not a verified Prevounce quote. Clinic labor is separate. Additional connectivity and subscription fees default to zero to avoid duplicate charges. Both arms have $5,000 annual overhead; the pharmacist arm has an assumed $1,000 year-one transition cost.
- **Deprescribing:** the optional MINOR scenario transfers 45-day patient outcomes of 11/161 versus 31/161 to comparable monitored patients, with a separately costed 10-minute added review for completed reviews. No annual medication savings are inferred without an explicitly assumed extension. Medication-cost offsets are reported separately and never counted as clinic receipts. [MINOR trial](https://www.sciencedirect.com/science/article/pii/S0149291823002035)

Lower allocated labor cost does not necessarily reduce a salaried clinic's cash payroll. Released physician hours are reported as capacity; they are not also converted into extra visit revenue. Equal billing assumptions isolate staffing costs, but they do not prove equal quality, safety or workload in practice.

## CMS policy context

As checked **October 26, 2026**, the CY 2027 PFS restriction on outsourced RPM clinical services is **proposed, not final**. If finalized as written, clinical staff would need to be direct employees of the billing practitioner/practice from January 1, 2027, under general supervision and incident-to requirements. Staff and patients need not be on-site. This staffing proposal does not establish a blanket ban on purchasing vendor technology; device/software costs remain modeled. The website uses **2026 fee benchmarks** as a staffing-policy sensitivity. The proposal also includes initiating-visit and valuation changes that are not implemented here; this is not a complete 2027 implementation forecast. [CMS proposal](https://www.cms.gov/newsroom/fact-sheets/calendar-year-cy-2027-medicare-physician-fee-schedule-proposed-rule), [official proposed rule, pages 150–152](https://public-inspection.federalregister.gov/2026-14327.pdf), [CMS rule index](https://www.cms.gov/medicare/payment/fee-schedules/physician/federal-regulation-notices)

## Reproduce a scenario

Apply edited inputs before exporting. Scenario JSON records the exact inputs, seed, evidence metadata, role-specific task traces, paired patient histories and expected/simulated results. CSV is for inspection; JSON is the replay format. Save the matching source revision with each run.

```bash
# Node.js 20 or newer; replay needs no installed dependencies
node scripts/replayIntegrationStudy.js /path/to/scenario.json
```

Website application **8.1.0** uses model **rpm-delivery-comparison**, engine **8.0.0**, export schema **8**. Exports retain the supervision cost mode and task-level cost basis. Earlier exports, including version 7, are rejected rather than silently changing their cost allocation or patient definition. Keep older exports with their original engine. Larger cohorts or more seeds reduce Monte Carlo noise; they do not add empirical evidence or produce clinical confidence intervals.

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

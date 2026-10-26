# MTM + RPM integration study

[Live website](https://juliapark64.github.io/medotter-mtm/) · [Study calculator](https://juliapark64.github.io/medotter-mtm/#/calculator) · [Interactive microsimulation](https://juliapark64.github.io/medotter-mtm/#/simulation) · [Source code](https://github.com/juliapark64/medotter-mtm)

This research-planning website explores the added contribution of pharmacist recruitment and deprescribing within an existing RPM program at a clinic serving **Original Medicare fee-for-service patients**. Usual physician referrals continue in both scenarios. The question is whether added pharmacist integration generates additional participation and enough clinic collections to cover its additional costs; deprescribing outcomes are assessed separately.

No study patient data have been collected or fitted. Synthetic histories illustrate assumptions; they are not observations, clinical recommendations, or evidence of causal synergy. The Word one-pager and AMCP abstract are separate artifacts and remain unchanged.

## One model, two views

**Study Calculator** presents analytic expectations, incremental financial benefit per 1,000 eligible members, additional RPM starts, and patient-level deprescribing outcomes. **Simulation** uses the same inputs and equations to reveal a seeded patient's review/intake, RPM initiation, service months, one-time setup qualification, clinical outcome, and financial contribution. Navigation preserves the applied scenario within the browser session. Playback, inspection, and speed changes do not redraw outcomes or count patients twice.

The **current program is physician-led RPM with registered-nurse and medical-assistant support, with no pharmacist or pharmacy-technician involvement**. The main integrated program keeps that routine care team and adds pharmacist recruitment, medication review and deprescribing support, with pharmacy-technician assistance for added outreach. Physician referral source and subsequent staffing are separate inputs. A referral alone is not enrollment: initiation requires a first transmitted BP reading. Overlapping physician and pharmacist contacts still produce only one RPM episode, although duplicate outreach incurs work. Existing RPM patients can receive medication review without being counted as new starts.

New starts and review/intake eligibility use the selected month. Year-one spending and collections use only service months within the 12-month budget. Existing patients must still be active at the review month to enter clinical assessment. MINOR-informed results describe patient-level deprescribing at 45 days; the optional longer-term extension is separate and can extend beyond the budget year.

## Primary scenario and evidence-transfer alternatives

Fresh visits open **Physician-led RPM + MINOR deprescribing; illustrative remote MTM recruitment** (`physician-led-minor`). The main scenario uses the same physician/nurse/medical-assistant RPM workflow in both pathways and a separately costed pharmacist review, assumed to take 10 minutes, with no required in-person visit. Recruitment reach, review completion, offers, uptake and review duration remain transfer or investigator assumptions. A cited input does not make the complete program evidence-validated.

The **HealthPartners/HyperLink intake scenario is optional**, preserving its distinct source workflow and longer allocated intake. It is not the default template for a fully remote program with delivered devices. Other alternatives include the 9:1 technician-to-pharmacist delivery workflow, a persistence extension, and no-added-recruitment, no-enhanced-deprescribing, and explicitly zero-outcome scenarios.

**HealthPartners-informed recruitment** separates targeted patients, completed intake and first BP transmission. HyperLink 3 reported **385/1,423 (27.1%)** attending intake within six weeks and **80% of attendees** transmitting at least one home BP reading. The modeled **60-minute pharmacist intake** is an allocation based on the offered protocol visit, not a measured mean. It replaces the shorter review and includes clinic device education. Every attendee incurs intake costs, including those who never activate RPM; an additional intake-driven start does not receive a second clinic onboarding charge. Usual physician-start onboarding remains in both pathways. Targeted nonattendees still incur the assumed outreach cost. [HyperLink 3](https://pmc.ncbi.nlm.nih.gov/articles/PMC9649877/)

The targeted share of the clinic population, extension of these rates to Original Medicare, treatment of overlapping physician referrals, timing, and subsequent staffing remain assumptions. Intake attendance is not a measured effect attributable to adding pharmacists to this clinic. The previous 84% CMR-completion and 50% post-review offer assumptions do not multiply the HealthPartners stages.

**MINOR-informed deprescribing** uses **11/161 (6.8%)** under home monitoring and usual physician review and **31/161 (19.3%)** with added pharmacist medication management, measured at **45 days**. These rates apply to comparable monitored patients, not just a low-BP subgroup. The scenario therefore does not multiply them by the earlier 23% low-BP input. The assumed share of patients matching the study remains editable. [MINOR trial](https://www.sciencedirect.com/science/article/pii/S0149291823002035)

The default reports patients with deprescribing, without assuming an exact medicine count or annual savings. Twelve-month persistence, reduced-medication months and medication-cost offsets remain **not estimated** until the explicitly assumed extension is selected. That extension assumes one medicine-equivalent per outcome and transfers a 69.4% persistence estimate to the period after the 45-day assessment; it is not a measured MINOR result. Source differences, timing conventions and the older abstract's conflicting control count are documented in the [methods and evidence](docs/integration-study-methods.md).

## Financial and clinical assumptions

The primary financial endpoint is **additional clinic financial surplus per 1,000 eligible patients**: the integrated program's collections minus costs, less the current program's collections minus costs. Positive means financial improvement and negative means deterioration. A positive increment can be a smaller loss; it does not by itself establish that the integrated program is profitable. Cohort counts and each program's total operating margin are also shown.

The financial boundary is fixed to the **clinic serving Original Medicare fee-for-service patients**. All RPM collections received by the clinic count as revenue. There is no external-payer percentage or arbitrary 50% reduction, and no consolidated insurer accounting. Medication-cost offsets remain separately reported and are never added to clinic surplus. This model does not estimate Medicare Advantage contract payments. A first reading or a CDTA alone does not prove billability.

**Medicare 2026 benchmark** mode links allowed amounts to qualifying team clinical management minutes: **$78.16/month at 10 minutes**, **$103.88 at 20**, **$145.30 at 40**, and **$186.72 at 60 or more** (a conservative two-add-on cap). These include one $52.11 device/data allowance. Below 10 clinical minutes, only the device allowance is modeled. Setup is a separate **$21.71 once per qualifying new episode**, never for existing patients or duplicate referrals. Monthly and setup qualification default to **70%** each; an assumed **90%** all-in collection share is then applied. These percentages are unvalidated planning assumptions, not observed clinic performance or CMS payment rates. Collections include realization of the total allowed amount from Medicare and patient/supplemental sources; do not apply another 80% Medicare factor. [Original Medicare cost-sharing](https://www.medicare.gov/coverage/doctor-other-health-care-provider-services). Published allowed amounts are not guaranteed collections. [MedPAC rates, Table 4-8](https://www.medpac.gov/wp-content/uploads/2026/03/Mar26_Ch4_MedPAC_Report_To_Congress_SEC.pdf), [CMS billing requirements](https://www.cms.gov/files/document/mln901705-telehealth-remote-monitoring.pdf)

**Custom benchmark** accepts explicit monthly/setup allowed amounts for a local payment sensitivity within the same clinic perspective. **No reimbursement** removes receipts while retaining costs. The schedule is calculated separately for each pathway using its qualifying clinical work, not its profession labels. The main shared clinic team has 3 physician treatment-management minutes plus 17 qualifying RN minutes, for 20 minutes in each pathway. Nonclinical assistance, generic supervision, outreach, onboarding and separately counted MTM reviews do not create qualifying management time. The pooled qualifying-month assumption does not adjudicate individual codes, transmission days, interactive communications or claims.

The earlier **illustrative deprescribing** mode remains available with investigator-selected action probabilities and transferred persistence. **No enhanced deprescribing effect** retains the usual physician-care probability after pharmacist review; additional monitored patients may still produce more usual-care actions. **Zero deprescribing outcomes in both arms** explicitly sets both programs' clinical effects and medication savings to zero while retaining review/intake workload. **Clinical benefits not estimable** keeps clinical endpoints and medication offsets unavailable, while clinic financial surplus remains calculable from collections and costs. Unknown effects are not silently replaced by zero. No cardiovascular, hospitalization, fall or symptom savings are assigned.

The main staffing scenario assigns **3 physician + 17 RN + 10 medical-assistant minutes per active month**, **2 physician minutes per referral**, and **5 RN + 15 medical-assistant minutes per new onboarding**. These durations are transparent investigator assumptions, not measured workload estimates. The physician minutes represent clinical review/treatment management, including associated oversight; administrative supervision alone is not billable clinical time. Additional patients also generate physician and clinic-staff work. Physician referral costs now use time × physician employer cost rather than a flat $10 charge.

Hourly wage benchmarks are from [BLS May 2025](https://www.bls.gov/news.release/archives/ocwage_05152026.htm): family medicine physician **$122.99**, RN **$48.76**, medical assistant **$22.17**, pharmacist **$67.75**, and pharmacy technician **$22.41**. Applying the [June 2026 healthcare compensation-to-wage ratio](https://www.bls.gov/news.release/archives/ecec_09092026.htm), 49.93/35.13, once produces loaded costs of approximately **$174.80, $69.30, $31.51, $96.29 and $31.85/hour**, respectively. The common industry loading factor and cross-year transfer are assumptions; the results are not observed local compensation. Cashbook wages are excluded. Physician/nurse/assistant workflow variation is supported by [Hailu et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC11436674/), but that study does not establish these minute allocations or a national staffing prevalence.

The optional **integrated-team** scenario replaces the integrated pathway's routine RN/assistant work with **3 pharmacist + 27 technician minutes**, retaining **3 physician clinical minutes**. Its 9:1 ratio describes only technician-to-pharmacist task time, not all program time or headcount; the total is 33 minutes including the physician. With 17 of the technician minutes assumed eligible, it has 23 qualifying clinical minutes, still the 20-minute payment tier. Onboarding uses the separately entered pharmacist/technician time in that scenario. Baseline staffing remains physician/nurse/assistant. Staffing substitution is a separate sensitivity, not an assumed clinical advantage. Added MTM review and outreach remain separately costed.

The user-confirmed vendor package remains **$90 per unique new start plus $12 per active patient-month**, including the device, software and cellular connectivity. These are cashbook business-plan assumptions, **not a verified Prevounce quote**. Costs accrue even in nonqualifying billing months; a contract charging only billable clients would require a different explicit fee basis. Vendor charges remain separate from clinic labor. Additional connectivity and platform fees default to zero to avoid counting included services twice. The original $5,000 other overhead plus $1,000 added integration overhead remain assumptions. The private workbook is not uploaded. Read the [methods, equations and evidence](docs/integration-study-methods.md) for the full accounting and limits. The mixed RPM/CCM cashbook time estimate and CCM income are not imported into this RPM-only model.

## Reproduce a scenario

Apply edited inputs before exporting. **Save scenario JSON** includes exact inputs, seed, model/version metadata, evidence notes, paired patient histories, role-specific task traces, expected results and seeded results. Physician, nurse, medical-assistant, pharmacist and pharmacy-technician hours are reported separately. **Load scenario JSON** verifies an exact replay before applying it. **Export results CSV** provides full-precision summary rows; JSON is the replay format. Save JSON before refreshing to retain inputs.

```bash
# Node.js 20 or newer; no installed dependencies needed for replay
node scripts/replayIntegrationStudy.js /path/to/mtm-integration-seed-2027.json
# Or, within the project
npm run replay:integration -- /path/to/mtm-integration-seed-2027.json
```

Preserve the matching source version alongside exported runs. Website application **7.0.0** uses integration engine **6.0.0 with export schema 6**. It rejects earlier model versions, including 5.0.0, because staffing, cost accounting and the exported inputs/results changed. Old exports are not silently converted to a physician-led baseline. Archive earlier runs with their original source revision. Setup remains included in expected and seeded results; do not add the earlier standalone analysis's setup supplement again. Larger synthetic cohorts and repeated seeds reduce Monte Carlo noise; they do not add empirical evidence or establish clinical confidence intervals. Input uncertainty is separate from simulation noise.

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

Tests check cohort conservation, monthly accounting, conditional inputs, deduplication, baseline exclusion of pharmacist labor, role-specific costs, shared versus substituted staffing, the clinic financial boundary, thresholds and export tampering. Passing tests confirms computational behavior, not clinical validation. Model changes affecting reproducibility require an engine version update.

## GitHub Pages deployment

The [GitHub Actions workflow](.github/workflows/pages.yml) runs tests, builds the Vite app, and deploys `dist` to GitHub Pages on pushes to `main` or manual dispatch. Pull requests run tests and build checks without deployment. In the repository's **Settings → Pages**, select **GitHub Actions** as the source. Check the workflow run before sharing the deployment URL. Relative asset paths and hash-based routes support hosting beneath a repository subpath.

No project license has been selected yet; this repository does not currently include a `LICENSE` file.

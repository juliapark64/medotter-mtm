# RPM delivery comparison: methods and evidence

This hypothetical clinic financial study compares **physician-delivered and pharmacist-delivered RPM for the same enrolled Original Medicare patients**. The question is how replacing routine RPM delivery changes the clinic's allocated costs and operating margin. It is not a head-to-head referral contest or a claim that adding a second complete team is beneficial. The AMCP abstract and Word one-pager remain separate, unchanged artifacts.

The calculator and microsimulation share [integrationStudy.js](../src/lib/integrationStudy.js): model `rpm-delivery-comparison`, engine **7.0.0**, export schema **7**, website **8.0.0**. Input definitions and the saved scenario specify the actual run. No patient data have been collected, fitted or used to validate the proposed workflows.

## Design, cohort and timing

The primary `comparisonMode = delivery` assigns every member of the common enrolled cohort `N` to both arms. Physician referral and pharmacist recruitment probabilities do not select patients or generate recruitment costs in this mode. The default `N = 1000` is not a denominator of 1,000 eligible people awaiting enrollment.

An assumed existing fraction `e = 0.05` receives service from January. All other patients start at the beginning of `s = 7`, with monthly continuation `ρ = 0.98`. These timing and retention inputs are assumptions. New starts, active months, setup qualification and monthly qualification are matched across arms. Patients receive the first service month, then may discontinue; restarting RPM is not modeled.

```text
G(m, ρ) = Σ[k = 0 to m − 1] ρ^k
Existing patients E = N × e
New starts S = N × (1 − e)
Expected active patient-months M = E × G(12, ρ) + S × G(13 − s, ρ)
Expected patients active at the review month A = E × ρ^(s − 1) + S
```

The budget includes only months 1–12. A 45-day clinical outcome can extend past that budget; it must not be described as an observed year-one event. Clinical follow-up and financial exposure are separate. Sensitivities should include all-existing patients, earlier/later starts and alternative retention, because the default 95% new-start mix creates substantial first-year onboarding costs.

## Delivery work and cost accounting

| Work per active month, unless stated | Physician arm | Pharmacist arm |
| --- | --- | --- |
| Clinical management | 20 physician minutes | 20 pharmacist minutes |
| Nonclinical logistics | 10 medical-assistant minutes | 10 pharmacy-technician minutes |
| Separate physician oversight | No second charge beyond entered physician work | 1 minute, costed and excluded from qualifying clinical time |
| Onboarding per unique new start | 20 medical-assistant minutes | 2 pharmacist + 18 pharmacy-technician minutes |
| Separate added medication review in primary analysis | None | None |

Every duration is an **investigator task-allocation assumption**, not a published average or a CMS staffing requirement. The 20 pharmacist minutes include routine medication management. The primary analysis does not charge a separate review for that same work. Generic supervision is distinct from billable patient-specific management. The one-minute oversight allowance does not demonstrate that all actual supervision or escalations can be completed in that time.

Routine physician/nurse/assistant service costs are replaced in the pharmacist arm. Only its explicitly entered physician oversight remains; the model does not charge both full delivery teams. Qualifying nurse/technician minutes are subsets of costed work, never extra minutes. Onboarding and separately costed review are excluded from recurring management time.

Let `wD`, `wR`, `wA`, `wP`, `wT` be loaded hourly costs for physician, RN, medical assistant, pharmacist and pharmacy technician. At the primary allocation:

```text
Physician-arm labor = [M × (20wD + 10wA) + S × 20wA] / 60
Pharmacist-arm labor = [M × (20wP + 10wT + 1wD)
                        + S × (2wP + 18wT)] / 60
Technology cost = S × deviceCost
                  + M × (monthlyTechnologyCost + monthlyConnectivityCost)
Shared annual platform cost = 12 × monthlyPlatformBaseCost × platformProviderCount
Total arm cost Cj = laborj + technology + shared platform + fixedCost
                   + pharmacist-arm transition cost, if applicable
```

These equations describe default delivery work. Edited minutes replace the displayed coefficients; optional extra review adds `completed reviews × reviewMinutes × wP / 60`. The assumed $1,000 pharmacist transition cost occurs once in the year-one model. The established-program sensitivity sets existing share to 100%, review/start month to January and transition cost to zero; it has no new setup or onboarding episodes.

Salary allocation is a resource cost, not necessarily an avoidable cash expense. Released physician hours are capacity; the model does not also monetize them as extra visit revenue. Fixed staffing, minimum shifts, capacity constraints, hiring steps, recruitment expenses and any additional visit revenue require separate data. Equal service time and matched participation isolate a staffing-cost mechanism, but do not establish clinical equivalence.

### Compensation and vendor assumptions

| Role | May 2025 national mean wage/hour | Derived loaded cost/hour |
| --- | ---: | ---: |
| Family medicine physician | $122.99 | $174.80 |
| Registered nurse | $48.76 | $69.30 |
| Medical assistant | $22.17 | $31.51 |
| Pharmacist | $67.75 | $96.29 |
| Pharmacy technician | $22.41 | $31.85 |

Base wages come from [BLS Table 1](https://www.bls.gov/news.release/archives/ocwage_05152026.htm). Loaded costs multiply each wage once by **49.93/35.13 = 1.42129234**, the June 2026 private-industry healthcare compensation-to-wage ratio in [BLS Table 4](https://www.bls.gov/news.release/archives/ecec_09092026.htm). The common industry factor, cross-year transfer and national occupation proxies are assumptions; these are not measured local benefit packages. Do not add benefits again. Pharmacy-technician wages do not establish advanced-technician pay or clinical billing eligibility. Cashbook wages and payroll escalation are excluded.

The user-supplied, unpublished *RPM Cash Book.xlsx* informs an assumed vendor package of **$90 per unique new start and $12 per active patient-month**. The user confirmed device/software/cellular inclusion and separate clinic labor. It is not a verified Prevounce quote or published market average. Existing patients do not incur another device/setup package. Active unpaid months still incur the monthly fee. Additional connectivity and platform fees default to zero to avoid duplication; different contract terms need explicit revised inputs. The private workbook is not distributed.

Both arms include an assumed **$5,000/year** other overhead; pharmacist delivery adds **$1,000** transition expense. Neither number is empirically estimated. Manufacturer/retail component-price scenarios remain price sensitivities, not interchangeable complete-service contracts.

## Reimbursement and financial endpoints

The perspective is the clinic serving **Original Medicare fee-for-service patients**. Collections include the total allowed amount actually realized from Medicare and patient/supplemental sources. There is no 50% external-payer reduction and no insurer-consolidation assumption.

The default fee schedule uses **2026 national nonfacility benchmarks** from [MedPAC, Table 4-8, printed page 131](https://www.medpac.gov/wp-content/uploads/2026/03/Mar26_Ch4_MedPAC_Report_To_Congress_SEC.pdf):

| Qualifying clinical minutes/month | Management component | Device plus management allowance |
| --- | --- | ---: |
| Under 10 | No management fee | $52.11 |
| 10 to under 20 | 99470 | $78.16 |
| 20 to under 40 | 99457 | $103.88 |
| 40 to under 60 | 99457 + one 99458 | $145.30 |
| 60 or more | 99457 + two 99458 | $186.72 |

The model caps add-ons at two while costing all entered time. Each allowance includes a single $52.11 device component, not two device codes. Codes 99445 and 99454 are alternatives according to transmission days; 99470 and 99457 are also alternatives. Setup 99453 is **$21.71 once per qualifying new episode**. These amounts do not predict local collections or finalized 2027 rates. Geographic adjustment and applicable conversion factors require local calibration.

The physician arm's qualifying time is physician clinical minutes plus eligible RN minutes. Pharmacist delivery uses pharmacist clinical minutes plus eligible technician minutes. It excludes the separate physician oversight allowance. At the primary 20-minute allocations both arms receive the same potential benchmark. Administrative tasks, device logistics, recruitment, onboarding and separately costed review do not become billable recurring clinical time.

```text
Expected qualified months Q = M × monthly qualification share b
Expected qualified setups U = S × setup qualification share u
Recurring collections = Q × arm monthly allowance Aj × collection share c
Setup collections = U × setup allowance H × c
Total collections Rj = recurring collections + setup collections
Operating margin Πj = Rj − Cj
Cost per active patient-month = Cj / M
Financial impact of switching = Πpharmacist − Πphysician
```

Primary outputs are **each arm's total collections, program cost, operating margin and cost per active patient-month**. The margin difference is secondary. A positive difference can be a smaller loss, not a positive operating surplus. Negative means switching worsens the modeled financial result. Medication-cost offsets are never included in `Rj` or `Πj`.

Both qualification shares default to **70%** and collection realization to **90%**. These are **unvalidated planning assumptions**, not measured Original Medicare RPM performance, evidence-based default success rates or CMS payment percentages. At 20 minutes, average recurring receipts across all active months are `$103.88 × 0.70 × 0.90 = $65.4444`; setup remains separate. [Medicare cost-sharing guidance](https://www.medicare.gov/coverage/doctor-other-health-care-provider-services) explains the patient portion but does not support the 90% realization assumption. Do not apply another 80% factor.

A common qualification draw matches the arms, but the model uses a pooled gate for a complete monthly bundle. It does not individually adjudicate transmission days, interaction, service periods, denials or separate device-only/management-only claims. A first reading is not proof of reimbursement eligibility. Work still costs money in unpaid months. Custom allowance mode is a payment sensitivity; no-reimbursement mode retains costs while setting receipts to zero.

For fixed workload and participation, each arm's all-in collection break-even share is `Cj / (Q × Aj + U × H)` when the denominator is positive. A threshold above 100% is infeasible under those inputs. Changing workload can change payment tiers, so a staffing threshold requires recalculating both costs and allowances, not a purely linear labor extrapolation. Staffing, billing qualification, collections, fees, vendor prices, start timing and transition overhead should be varied independently before claiming feasibility.

## CMS staffing-policy context

As checked **October 26, 2026**, the latest CMS 2027 PFS entry is a **proposed rule**, not a final restriction. [CMS regulation index](https://www.cms.gov/medicare/payment/fee-schedules/physician/federal-regulation-notices)

The proposal would require RPM/RTM clinical staff to be direct employees of the billing practitioner/practice from **January 1, 2027, if finalized**, under general supervision and incident-to requirements. Staff can work remotely and the patient need not be on-site. The cited provision addresses clinical staffing; it does not establish a blanket ban on buying vendor devices/software. Retaining technology vendors in the model reflects that scope, not a legal determination about a specific contract. [CMS fact sheet](https://www.cms.gov/newsroom/fact-sheets/calendar-year-cy-2027-medicare-physician-fee-schedule-proposed-rule), [proposed-rule PDF, pages 150–152](https://public-inspection.federalregister.gov/2026-14327.pdf)

The study models clinic-employed delivery teams. Current CMS guidance permits eligible auxiliary services under general supervision and restricts RPM billing to eligible physicians/NPPs. Pharmacists can furnish incident-to services within applicable state scope, but a CDTA does not itself establish independent Medicare billing eligibility. Technician job titles and an assumed 9:1 allocation likewise do not prove qualifying clinical service. [CMS RPM booklet, page 13](https://www.cms.gov/files/document/mln901705-telehealth-remote-monitoring.pdf), [CMS pharmacist clarification](https://www.federalregister.gov/documents/2020/05/08/2020-09608/medicare-and-medicaid-programs-basic-health-program-and-exchanges-additional-policy-and-regulatory)

The proposal also includes a separately reportable initiating visit and valuation changes. Those changes and their associated costs/receipts are not implemented here. This is a **staffing-policy sensitivity using 2026 fee benchmarks**, not a complete 2027 implementation or reimbursement forecast.

## Secondary analyses

### Alternative delivery teams

The physician/nurse sensitivity allocates **3 physician + 17 qualifying RN + 10 medical-assistant minutes** per active month. The optional 9:1 workflow allocates **3 pharmacist + 27 technician minutes**, with **17 of the technician minutes assumed qualifying**, plus separately costed nonbillable physician oversight. Its 9:1 ratio describes technician-to-pharmacist task time, not headcount or all program hours. It is inspired by the cashbook structure, not validated by a comparative staffing study. The primary pharmacist arm instead uses 20 pharmacist clinical minutes and no qualifying technician time.

These alternatives must not be presented as measured national usual care. [Hailu et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC11436674/) describe varied physician, nurse, medical-assistant and vendor involvement, supporting workflow plausibility rather than the model's duration estimates or a national prevalence. Any role substitution also assumes adequate staff capacity and scope.

### MINOR-informed deprescribing in the matched cohort

Primary `clinicalMode = unestimated` leaves outcomes and medication offsets unavailable, rather than equating missing evidence with zero. The secondary MINOR analysis retains the same enrolled cohort and applies **11/161 versus 31/161 patient-level deprescribing at 45 days** to the assumed comparable share active at the review month. Enhanced probability applies only after completed pharmacist review; others retain the usual-review probability. [MINOR trial](https://www.sciencedirect.com/science/article/pii/S0149291823002035), [author's institutional record](https://repositorio.ufba.br/handle/ri/36958)

The trial concerned older Brazilian patients using antihypertensives and home BP monitoring. Transfer to Original Medicare, comparability, review reach/completion and the added **10-minute** review allowance are assumptions. In delivery mode, eligible completed reviews are drawn among patients active at the review month and cost extra time once. These reviews do not recruit new RPM patients or create extra billable monthly minutes. There is no second retention gate during the 45-day follow-up. The 23% low-BP subgroup is not multiplied into the full-trial rates. An older indexed abstract reports 9 control outcomes; the scenario uses the concordant 11/161 count in the current source record and discloses that discrepancy.

With extrapolation off, the endpoint is patients with deprescribing, not exact medicines discontinued or annual savings. The optional extension assumes one medicine-equivalent per outcome, $10 per medicine-month and transferred 69.4% 12-month persistence from a separate Singapore cohort. It uses constant monthly persistence `0.694^(1/12)`, starts exposure two months after review as an approximation to 45 days, and truncates financial exposure at month 12. These are explicit extrapolations, not annual MINOR results. [Persistence source](https://pubmed.ncbi.nlm.nih.gov/41505212/)

Medication offsets remain separate from clinic receipts. No hospitalization, cardiovascular, fall, symptom or quality-bonus savings are added. A no-enhanced-effect scenario preserves usual-care outcomes and review costs; explicit zero effects and unestimated effects are different assumptions. Matched cohorts prevent recruitment differences from creating additional clinical outcomes in this delivery comparison.

### Recruitment as a separate question

`comparisonMode = recruitment` retains the earlier analysis of adding pharmacist recruitment. Here **N is an eligible population**, not a common enrolled cohort. Existing participants, usual physician starts and added pharmacist starts are deduplicated. Referral, review and offer costs accrue even without activation. Initiation requires a first transmitted BP reading.

With recontact disabled, the illustrative pathway uses:

```text
Usual new starts = N × (1 − e) × r × qA
Added new starts = N × (1 − e) × (1 − r) × f × c × o × qB
```

The 11.8% physician-attributed referral source does not establish an annual physician-exclusive rate or downstream care staffing. Its use as annual physician-only recruitment is an explicit assumption. The transferred 53% initiation and historical 84% MA-PD CMR completion do not validate Original Medicare pharmacist recruitment. [Referral study](https://www.jmir.org/2025/1/e64933/), [UCSD uptake manuscript](https://pages.ucsd.edu/~yfadlon/pdfs/Digital_Health.pdf), [PQA completion report](https://www.pqa.org/wp-content/uploads/2025/10/PQA-QuIRC-MTM-Report.pdf)

The optional HealthPartners pathway replaces the review/offer/uptake stages with **385/1,423 intake attendance** and **80% first transmission among attendees**. Targeted share remains assumed. A 60-minute intake is a protocol allocation, not a measured mean; every attendee incurs it, including nonactivators. It replaces the short review and includes clinic education, so additional intake-driven starts do not incur duplicate clinic onboarding. Usual physician starts retain onboarding; vendor charges occur once per new start. These study workflows and population transfers are separate from the primary remote delivery comparison. [HyperLink 3](https://pmc.ncbi.nlm.nih.gov/articles/PMC9649877/)

## Simulation, exports and validation

Expected results are analytic projections. Microsimulation uses the same parameters and paired random draws to generate patient histories. In delivery mode, each identifier represents the same enrollment, start month, continuation and qualification history in both arms; only entered delivery resources and enabled clinical assumptions differ. Synthetic trajectories are not observed counterfactual outcomes. More patients/seeds reduce numerical noise, not uncertainty about the real effects. Probabilistic sensitivity analysis would require justified parameter distributions and dependencies beyond the playback simulation.

Scenario JSON includes inputs, model/evidence metadata, seed, paired records, analytic expectations and simulated summaries. Role-specific `taskRecords` reconcile minutes, hourly costs and task costs. `supportHours` aliases pharmacy-technician hours; do not sum it again. Common fixed costs are cohort costs. `monthlyRevenue + setupRevenue = revenue`; setup is already included and must not be added again. Clinical nulls remain null in exports. CSV is for inspection, JSON for exact replay.

Engine **7.0.0/schema 7** rejects older exports, including 6.0.0. They cannot be silently converted because the question, enrolled denominator, staffing substitution and clinical defaults changed. Keep older runs with their matching source revision.

```bash
node scripts/replayIntegrationStudy.js /path/to/scenario.json
npm test
npm run build
```

Replay verifies the exact saved calculation and fails for changed results or incompatible versions. Tests should cover matched cohort/calendar, equal qualification histories, physician-cost replacement, separately costed oversight, qualifying-time subsets, review/onboarding deduplication, role-cost reconciliation, total margins, drug-offset exclusion and secondary recruitment isolation. Passing them verifies implementation, not clinical validity or guaranteed profitability.

Historical [health-plan budget](integrated-system-model.md), [provider comparison](provider-feasibility-model.md) and [recruitment-only](recruitment-microsimulation.md) models remain archival and must not be relabeled as current direct-delivery results.

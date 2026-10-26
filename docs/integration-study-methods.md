# MTM–RPM integration study: methods and evidence

This is a hypothetical planning study of adding MTM recruitment and medication review to an existing RPM service at a clinic serving **Original Medicare fee-for-service patients**. The calculator and synthetic patient simulation must use the same scenario assumptions and financial perspective. Neither is an observed study of Kaiser, a clinical decision tool, or evidence that integration causes savings. The AMCP abstract and Word endpoint plan are separate artifacts and are not modified by this implementation.

The shared engine is [integrationStudy.js](../src/lib/integrationStudy.js), model `mtm-rpm-additive-integration`, version `4.0.0`, export schema `4`. Its input definitions are the authoritative defaults and validation limits. Calculator and simulation share recruitment, task-level team staffing, monthly service costs, code-linked reimbursement benchmarks, one-time setup collections and deprescribing accounting. This implementation supersedes the recruitment-only simulation for the integration question; it is not the old health-plan budget model with renamed outputs.

## Comparison and denominators

The comparator includes the existing RPM program, usual physician recruitment, and medication changes that would occur under that program. Integration may add new RPM starts and change medication-review outcomes among people already receiving RPM. Show these contributions separately; an existing participant is not a new start.

Define the RPM-eligible population once. Apply additional MTM recruitment only to the eligible population remaining after existing participation and usual recruitment, according to the model's stated sequence. Offer and review probabilities are conditional on their preceding stages. A completed review is not an offer, an offer is not consent, and initiation means at least one transmitted reading. Charge recruitment work even when it does not produce a start. Do not add alternative-pathway estimates together or count the same patient twice.

Counts per 1,000 use the common RPM-eligible Original Medicare clinic population. This clinic analysis does not use a health-plan PMPM denominator. A recruitment parity threshold is not a financial break-even threshold.

For population `N`, existing RPM share `e`, physician referral probability `r`, and physician initiation probability `qA`, expected existing participants are `N × e` and usual new starts are `N × (1 − e) × r × qA`. Completed integration reviews are `N × f × c`, including people already receiving RPM and people who never initiate RPM.

By default, `recontactUptake = null`: unsuccessful physician referrals are not offered another chance through MTM. With independent review/offer eligibility, added starts are then `N × (1 − e) × (1 − r) × f × c × o × qB`. Duplicate offers to successful physician initiators still incur work without creating another episode. Entering a numeric recontact probability enables a separate retry opportunity for unsuccessful physician referrals; zero means an unsuccessful offer still takes staff time. This is a simplified recruitment sequence, not a measured interaction between channels.

## Timing and clinical units

Calendar-year costs count only resources used during months 1–12. A late entrant receives fewer first-year service months than a January entrant. Clinical follow-up is measured from initiation or the first medication reduction; a 12-month clinical endpoint for a late entrant occurs after the first budget year. A projected follow-up outcome is not an event observed within year one.

The current engine uses one representative new-start/action month, default **month 7**, rather than staggered monthly arrivals. Existing participants start service in month 1; new participants start at the beginning of `startMonth`. For `m` available months and monthly RPM continuation `ρ`, expected service months per participant are `Σ ρ^k`, for `k = 0, …, m − 1`. Everyone receives the first service month. Existing participants must still be active at the planned action month to enter the illustrative clinical assessment; their expected availability is `ρ^(startMonth − 1)`. Medication persistence after an action is independent of later RPM discontinuation in this model.

Keep active service months, months with readings, and unique patients distinct. A missing reading can still require staff outreach. The literature's mean monthly reading participation does not supply the probability of meeting a requirement for readings in every consecutive two-month block.

The default clinical mode is **illustrative**: it uses a usual-program medication-action probability of **10%**, an integrated probability of **30%** for patients receiving the completed MTM review, and **one medication reduction per patient with an action**. Those are investigator assumptions, not trial estimates. Patients without that review retain the usual-program action probability. Retain usual-program reductions in the comparator; only the between-arm difference is incremental. The explicit **none** mode sets both arms' clinical effects and drug savings to zero while retaining review and program costs. This is a conservative scenario, not evidence that the clinical effect is zero.

The **unestimated** mode, or missing required clinical inputs, produces unavailable clinical outcomes and drug savings rather than replacing unknown effects with zero. Clinic net financial benefit remains calculable from the supplied service costs and collections because medication savings are excluded from the clinic financial endpoint. Unknown clinical inputs and an explicitly assumed zero effect are different scenarios.

The single-medication assumption makes patient and medication counts numerically equal in that scenario. It does not establish their equivalence in practice. If multiple drugs, dose reductions, substitutions, or restarts are introduced, track medicines and patients separately. For a genuine patient endpoint, count each patient once even if several medications change.

The optional **69.4%** persistence assumption concerns people who already underwent deprescribing. The model converts it to monthly medication retention as `0.694^(1/12)`, imposing a constant monthly restart risk. It counts one medication-month in the action month and progressively retained exposure thereafter, truncated at the budget-year boundary. This within-month convention and the constant risk are additional assumptions. An end-of-follow-up reduction does not establish a full year of drug savings.

No numeric symptom-resolution, fall-prevention, hospitalization-prevention, or cardiovascular-event benefit is established by this model. Do not substitute low home BP for confirmed inappropriate treatment. Assessment, clinical suitability, patient agreement, and implementation remain separate concepts even when represented by a combined scenario probability.

## Evidence contract

The references support specific quantities in specific populations. Transferred values remain assumptions about applicability; a citation does not validate the entire model.

| Reference quantity | What the source supports | Modeling restriction |
| --- | --- | --- |
| Physician referral 11.8% | Mean physician-level referral rate in the UCSD study, using October 2020–October 2022 records. [1] | Not an observed annual patient probability. Annual application is an explicit scenario choice. |
| Initiation 53% | UCSD initial uptake defined as at least one transmission after referral. [2] | Applying this to MTM offers, a different population, or the recruitment-year horizon is a transfer assumption. No automatic age adjustment. |
| Review completion 84% | Historical MA-PD CMR completion benchmark in the 2024 Star Ratings, within a defined MTM measure population. [3] | Not the MTM-eligible share of all RPM candidates or a current local completion estimate. Transferring an MA-PD benchmark to this Original Medicare cohort is an explicit applicability assumption. |
| Monthly reading participation 49% | Mean monthly transmission probability over one year, conditional on initial uptake. [2] | Not annual retention or the share meeting all six consecutive two-month reading criteria. |
| Low home BP approximately 23% | MINOR baseline report: 74/322 older Brazilian participants, with or without symptoms. [4] | Exploratory prevalence only; it does not establish that every patient needs deprescribing or has symptoms to improve. |
| Uncontrolled BP 61.18% | The same report gives 61.18% and n=166 among N=322. [4] | Internally inconsistent; do not use as a fixed clinical input or silently repair the numerator. |
| Prescription reduction 28.6% | MINOR hypotension subgroup: reduction in prescriptions, with 37 intervention and 35 control patients. [5] | Not a probability that a patient undergoes deprescribing. It does not justify the model's 10% or 30% action probabilities. |
| Symptom reduction 64.9% versus 20% | Short-term reported symptom reduction in that subgroup. Both groups received home monitoring; pharmacist-assisted review was compared with physician review. [5] | Not verified complete resolution at 12 months, an RPM-versus-no-RPM effect, or an avoided-admission rate. Do not apply to asymptomatic patients. |
| Baseline medicines: two | OPTIMISE reports a median of two antihypertensives in selected patients aged ≥80. [6] | A median is not the mean needed to estimate aggregate medication counts. |
| Deprescribing persistence 69.4% | Singapore retrospective cohort: 12-month maintenance among 108 patients aged ≥60 who had already been deprescribed. [7] | Patient-level conditional persistence, not per-drug persistence or an RPM effect. |
| SBP difference 9.7 mmHg | HyperLink between-group difference in mean SBP change at 12 months. [8] | Not the probability that an individual achieves a 10-mmHg decrease; it cannot identify responder counts. |

MINOR used short-term home BP measurement in Brazilian primary care, not a year-long US RPM service. Its subgroup comparison does not isolate the effect of providing RPM because both arms received home monitoring. These sources do not establish a statistical interaction between MTM and RPM or the study's modeled financial benefits.

## Clinic financial boundary

The model uses one financial perspective: a **clinic serving Original Medicare fee-for-service patients**. Its operating margin equals RPM collections received by the clinic minus program resource costs. All modeled collections count toward that margin after billing qualification and collection realization. There is no additional external-payer fraction or arbitrary 50% reduction. This is not consolidated insurer-plus-clinic accounting and does not estimate Medicare Advantage or commercial contracts.

```text
Clinic operating margin = monthly RPM collections + setup collections − program costs
Added clinic financial surplus = integrated-program margin − current-program margin
Surplus per 1,000 eligible patients = added clinic financial surplus × 1,000 / N
```

The exported `perspective` is fixed to `clinic`. The earlier `externalPayerShare` and `retainedDrugSavingsShare` inputs have been removed. `netFinancialBenefit` equals `operatingMargin` in each arm; the difference is the added clinic financial surplus. `drugSavings` remains a separately reported modeled medication-cost offset. It is never automatically clinic revenue, even when deprescribing assumptions are enabled. Clinical outcomes and medication offsets can remain unknown without making the clinic margin unknown.

### Reimbursement modes and time

The default **Medicare 2026 benchmark** mode links the monthly allowed amount to modeled qualifying clinical management time across the team. Rates are national nonfacility amounts from MedPAC Table 4-8, not a quote for Kaiser, a hospital outpatient department, Medicare Advantage or a commercial contract. [10] Geographic adjustment, billing practitioner, conversion factor, contract terms and qualification affect actual receipts. CMS has separate 2026 conversion factors for qualifying APM participants and other practitioners. [11]

| Qualifying team clinical minutes per active month | Assumed management code | Device/data benchmark | Monthly allowed-amount benchmark |
| --- | --- | ---: | ---: |
| Less than 10 | None | $52.11 | $52.11 |
| 10 to less than 20 | 99470 | $52.11 | $78.16 |
| 20 to less than 40 | 99457 | $52.11 | $103.88 |
| 40 to less than 60 | 99457 + one 99458 | $52.11 | $145.30 |
| 60 or more | 99457 + two 99458 | $52.11 | $186.72 |

The engine conservatively caps management add-ons at two while charging all entered pharmacist management minutes. It does not optimize billing above that cap. The device component uses one of **99445** (2–15 transmission days) or **99454** (16–30 days), both $52.11; they are alternatives, not additive codes. Likewise, 99470 and 99457 are alternatives. [12] A month with fewer than 10 management minutes can still produce the device/data allowance if its separate device requirements are satisfied; it does not produce a management fee.

**Custom benchmark** mode uses investigator-entered monthly and setup allowed amounts for a local payment sensitivity, with the same Original Medicare clinic boundary and qualification/collections accounting. **No reimbursement** mode produces zero monthly and setup collections while retaining service costs. It does not remove drug-cost offsets when these are separately enabled.

In exported inputs, `reimbursementMode` is `medicare2026`, `custom` or `none`. `monthlyRevenueBenchmark` and `customSetupRevenueBenchmark` are used only in custom mode; changing them does not override Medicare's time-linked benchmark. `setupQualificationShare` is distinct from `qualificationShare`. `monthlyTechnologyCost` is the per-patient vendor technology package, `monthlyConnectivityCost` is any additional per-patient connectivity charge, and an additional annual subscription is `12 × monthlyPlatformBaseCost × platformProviderCount`. Included package components must not be charged again.

The management tier uses **pharmacist clinical minutes plus the qualifying portion of non-pharmacist service minutes**. The default team has **3 pharmacist minutes and 27 advanced-technician minutes per active month**, of which **17 technician minutes are assumed to be qualifying supervised treatment management**. Thus, 20 of the 30 total service minutes determine the management tier; the remaining 10 technician minutes do not. `qualifiedSupportMinutes` is a subset of `monitorSupportMinutes`, never an additional workload or second labor charge. It cannot exceed the total non-pharmacist service minutes.

The user explicitly selected the assumption that this supervised clinical time qualifies. This is a scenario assumption about the actual service, scope, supervision, documentation and billing arrangement, not a claim that every CPhT-A credential automatically qualifies. CMS permits eligible auxiliary services under general supervision, with an eligible billing practitioner and other requirements; a CDTA alone does not establish independent pharmacist billing eligibility. [9,12,19] The alternative scenario excludes technician time from the management threshold while preserving the same staffing costs. Real-time patient/caregiver communication and other qualifying work remain necessary. Scheduling, nonclinical device help, onboarding, outreach and separately counted MTM review do not enter the monthly management threshold.

### Monthly and one-time collections

```text
Monthly collections = qualifying active months × monthly allowed benchmark
                      × collection share

Setup collections = unique new initiations × setup-qualification share
                    × one-time setup allowance × collection share

Total collections = monthly collections + setup collections
```

The Medicare setup allowance is **$21.71** for 99453. [10] Setup qualification, default **70%**, is a separate episode-level assumption. Setup is counted once for each qualifying new episode, never for existing participants and never twice for overlapping referral channels. The calculator uses expected qualifying setups; microsimulation uses a separate seeded setup-qualification draw shared between the two arms. Monthly and setup qualification are separate assumptions, not interchangeable probabilities.

The default **70%** qualifying-month share, **70%** setup-qualification share and **90%** all-in collection share are unvalidated planning assumptions, not observed local rates or CMS reimbursement percentages. The collection share represents realization of the total allowed amount, including Medicare, patient/supplemental collections and adjustments. It is not an additional Medicare payment percentage; do not apply another 80% factor. Counting all clinic collections does not mean that every patient or active month qualifies for payment. A first transmission qualifies initiation but does not prove a billable service month or setup episode. All active months incur service costs, including unpaid months. These editable qualification and collection assumptions should be calibrated to local billing experience and tested in sensitivity analyses. Original Medicare generally assigns 20% of the Medicare-approved amount to the patient after the Part B deductible, so the all-in realization assumption includes collections from both Medicare and patient/supplemental sources; it is not a claim that Medicare itself pays 90% of the allowed amount. [20]

At the default 20 qualifying clinical minutes, the expected recurring collection per active patient-month is `$103.88 × 0.70 × 0.90 = $65.4444`. A qualifying service month yields `$103.88 × 0.90 = $93.492` in modeled collections; the lower average across all active months includes unpaid months. Setup remains separate and once per qualifying new episode. These are conditional model calculations, not observed receipts.

Qualification is a pooled monthly gate: the engine does not separately adjudicate transmission days, clinical time, communication, 30-day service periods versus calendar months, patient cost-sharing or claim denials. For a selected monthly bundle, it conservatively pays the device and management components together only in qualifying months. This simplification can omit device-only or management-only receipts. It must not be described as a claims-level reimbursement simulator.

### Cost benchmarks and remaining assumptions

The cost basis is **2026 planning USD**, with source years disclosed. The **“90% technician / 10% pharmacist RPM task allocation”** scenario uses the cashbook only as inspiration for the staffing structure; its wages are excluded. Published BLS May 2025 national wage estimates are loaded once with the June 2026 healthcare compensation factor. [13,14] This cross-year transfer is an assumption, not an observed 2026 local staffing cost. The user-confirmed vendor package remains a separate contract assumption. [18] The source workbook is not distributed with the website, and prices are not inflated automatically.

| Cost input | Default and provenance | Limitation |
| --- | --- | --- |
| Pharmacist labor | BLS **$67.75/hour** × (49.93/35.13) = approximately **$96.29/hour**. [13,14] | Published national mean with an assumed healthcare benefit load; not observed local compensation. |
| Non-pharmacist RPM staff labor | BLS pharmacy-technician **$22.41/hour** × (49.93/35.13) = approximately **$31.85/hour**. [13,14] | General occupational proxy, not a measured advanced-technician wage; clinical eligibility is a separate explicit assumption. |
| One-time vendor/device package | Cashbook **$90 per unique new start**. [18] | User confirmed package coverage of the device and vendor onboarding; not an independently verified quote. In-house onboarding labor is separate. |
| Recurring RPM technology package | Cashbook **$12 per active patient-month**. [18] | User confirmed software and cellular connectivity are included; clinical staff labor is separate. |
| Additional connectivity | **$0** | Included in the assumed package; do not charge another connectivity fee for the same service. |
| Additional core subscription | **$0** | No separate subscription on top of the user-confirmed bundle. Add only actual additional charges. |
| Other fixed overhead | **$5,000/year** in both arms plus **$1,000** for integration | Investigator assumptions, kept separate from the core subscription. |

The compensation factor loads benefits once; no additional productivity multiplier is applied. Neither cashbook wages nor cashbook payroll escalation are used. These are allocated resource costs, not necessarily an immediate reduction in cash payroll for salaried employees.

The published-price comparison retains the prior **$99.95 cuff**, **$15 software**, **$5 connectivity allowance**, and **$299 monthly core subscription**. [15,16] Those are separate component benchmarks, not an independently verified interchangeable vendor package. The prior pharmacist-heavy preset uses the same national loaded wage benchmarks as the team scenario. [13,14] Public prices were accessed October 25, 2026. They are comparison scenarios, not statistical uncertainty bounds.

The default assumes **90% technician / 10% pharmacist time for routine RPM tasks**, inspired by the cashbook’s team structure. [18] The **9:1 ratio is technician-to-pharmacist time**, not pharmacist-to-technician time. To isolate this allocation from a reduction in service intensity, the model retains **30 service minutes per active month**, split **3 pharmacist / 27 staff**; **5 minutes per offer**, split **0.5 / 4.5**; and **20 minutes per new onboarding**, split **2 / 18**. These task allocations are investigator assumptions. The **10-minute incremental medication review and follow-up remains entirely pharmacist work**, so the 9:1 ratio does not describe the overall program’s labor hours, costs or staff headcount. Edited task minutes determine the actual allocation. This structure does not permit independent technician medication changes or imply an observed effect of staffing on clinical outcomes.

All staff minutes are costed once, whether or not they qualify for payment. For active months `M`, completed reviews `R`, offers `O`, and unique new starts `S`:

```text
Pharmacist hours = (R × reviewMinutes + O × offerMinutes
                    + S × onboardingMinutes + M × monitorPharmacistMinutes) / 60
Other staff hours = (O × offerSupportMinutes + S × onboardingSupportMinutes
                     + M × monitorSupportMinutes) / 60
Labor cost = pharmacist hours × loaded pharmacist wage
             + other staff hours × loaded staff wage
Qualifying monthly clinical minutes = monitorPharmacistMinutes + qualifiedSupportMinutes
```

The cashbook combines RPM and CCM and its time-band formula does not reconcile cleanly to all tier labels. Its implied 15.1-minute monthly average therefore is **not** adopted as an RPM-only workload. CCM revenue and time are not imported. The model continues to count the setup fee once per qualifying new episode, and does not repeat setup in each month's receipts. The cashbook's provider revenue-sharing fraction is not imported; this model counts collections retained by the clinic without an additional payer-mix reduction.

Task durations include associated documentation within the entered time. The model does not charge the entire existing CMR again when only incremental work is added. Variable costs use all active months, including unpaid ones. Fixed costs persist when there is no additional recruitment or clinical benefit. Discrete hiring steps, staffing capacity and extra billing administration costs are not separately estimated.

An NYU Langone RPM study reports NP data review of 10 minutes/week plus 15 minutes/month communication. [17] Adapting this to pharmacist work gives `10 × 52 / 12 + 15 = 58.33` clinical minutes/month, a higher-workload sensitivity, not a validated pharmacist mean. It does not imply improved clinical outcomes. The study's average four-month episode and $330 total episode cost in 2024 USD are not current monthly prices for a cellular platform.

Drug offsets use the assumed **$10 per medication-month**, net of modeled restarts. They are reported separately from clinic collections and never added to clinic financial surplus. Actual net drug costs, substitutions and dose changes require calibration; the single-drug illustration does not estimate those separately.

CMS guidance also requires appropriate billing practitioners, supervision, consent, connected devices and no duplicate services/time. [9] This model does not adjudicate CPT claims, implement a statutory change or certify billability. Validate actual payer contracts and applicable requirements before treating the scenario as a local forecast.

Use positive **incremental net benefit** to mean improvement relative to the existing program. A positive difference can represent a smaller loss while both programs still have negative total results; it is not necessarily an absolute surplus or profit. Read each arm's total alongside the difference. For a cost-oriented result, the sign is reversed: incremental clinic net cost equals added program costs minus added RPM collections. State the convention beside every result. Neither an additional RPM start nor a symptom improvement automatically creates a quality bonus or a medical-cost saving.

## Simulation and uncertainty

The deterministic calculation is the primary expectation under the selected inputs. The microsimulation creates fictional individual histories to illustrate the same assumptions. A seed makes its random draws reproducible; it does not make synthetic patients empirical evidence. Paired draws between arms, when used, are a computational comparison device rather than measured counterfactual patient outcomes.

Random variation between synthetic runs is different from uncertainty about inputs. Larger simulated populations reduce numerical noise but do not narrow uncertainty about the true effects of integration. Do not label seed variation a clinical confidence interval. A probabilistic sensitivity analysis requires separately specified input distributions and dependencies; a sensitivity range is not itself such a distribution.

Required structural scenarios include no additional medication-action benefit, no added RPM recruitment, and no RPM reimbursement. Retain the relevant costs in each. Equal action rates remove the assumed improvement per comparable assessed patient, but extra recruitment can still change total actions; a scenario claiming **zero total added deprescribing benefit** must also neutralize that reach-related increment. Vary MTM eligibility, offers, uptake, recruitment month, service duration, staffing time, drug costs and collection assumptions. Report infeasible or undefined thresholds explicitly.

Validation should check cohort conservation, exclusion of existing participants from new starts, calendar-month exposure, unit consistency, comparator subtraction and the clinic financial boundary. Deterministic and simulated summaries should agree in expectation under identical assumptions. Replay checks test computational reproducibility, not clinical validity or real-world savings.

## Export and replay

An integration JSON bundle includes complete inputs, the seed, model/evidence metadata, paired synthetic patient records, analytic expected summaries and simulated summaries. `qualifiedSetups` counts eligible new setup episodes; `monthlyRevenue` and `setupRevenue` sum to total `revenue`. Cost components appear in `costBreakdown`; common platform and other fixed costs and added integration fixed costs are cohort costs, not patient charges. The shared verifier reruns the model and rejects mismatched versions, schema, inputs, metadata or results. It does not treat a plausible edited summary as a valid run. A CSV is a table for inspection; use JSON for exact replay.

Version **4.0.0/schema 4** rejects earlier model versions, including **3.1.0**. Earlier exports remain evidence of their original model, with the original source revision required for replay; they are not silently migrated or relabeled. Version 4 fixes the financial boundary to an Original Medicare fee-for-service clinic, removes the external-payer and medication-savings-retention inputs, and keeps clinic surplus estimable when clinical outcomes are unknown. National wage benchmarks, the task-allocation scenario, non-pharmacist outreach/onboarding and qualifying clinical time remain in the model. Setup remains included in expected and seeded results, so the earlier standalone setup supplement must not be added again.

From the repository root, verify an exported file without modifying it:

```sh
node scripts/replayIntegrationStudy.js /path/to/scenario.json
```

The command prints a compact JSON summary and exits successfully only after exact replay. A missing file, invalid JSON, unsupported version or changed result exits nonzero. Keep the matching code revision with the scenario; replay is version-specific. The bundle does not contain an executable source archive or an independent authenticity guarantee. `npm test` runs model tests; `npm run build` checks the application build. Neither establishes clinical validity.

## Primary references

1. Wu et al. *Factors Influencing Primary Care Physicians’ Intent to Refer Patients With Hypertension to a Digital Remote Blood Pressure Monitoring Program*. JMIR 2025;27:e64933. [DOI 10.2196/64933](https://www.jmir.org/2025/1/e64933/).
2. Fadlon et al. *Equity and Efficiency in Technology Adoption: Evidence from Digital Health*. Author manuscript, section 6.2 and footnote 17; working-paper evidence. [UCSD manuscript](https://pages.ucsd.edu/~yfadlon/pdfs/Digital_Health.pdf).
3. PQA. *Advancing Medication Therapy Management Quality Measurement*, 2024, page 4. [Primary report](https://www.pqa.org/wp-content/uploads/2025/10/PQA-QuIRC-MTM-Report.pdf). The 84% MA-PD benchmark is also in [CMS 2024 Star Ratings Technical Notes, Table C-2](https://www.cms.gov/files/document/2024-star-ratings-technical-notes.pdf).
4. Moreira et al. *Use of Residential Blood Pressure Monitoring as a Tool in Pharmaceutical Care – Baseline Assessment of the MINOR Clinical Trial*. 2025. [Publisher; DOI 10.22563/2525-7323.2025.v10.e00166e](https://ojs.jaff.org.br/ojs/index.php/jaff/article/view/1367).
5. Silva et al. *Desprescribing antihypertensives in older people in primary care: subgroup analysis of the MINOR randomised clinical trial*. Int J Clin Pharm. 2025;47:53–59. [DOI 10.1007/s11096-024-01805-y](https://link.springer.com/article/10.1007/s11096-024-01805-y).
6. Sheppard et al. *The OPTIMISE Randomized Clinical Trial*. JAMA. 2020;323:2039–2051. [PubMed; DOI 10.1001/jama.2020.4871](https://pubmed.ncbi.nlm.nih.gov/32453368/).
7. Yeo, Chia, Tan. *Deprescribing antihypertensives in primary care: clinical and safety outcomes among older adults*. Singapore Med J. Published January 9, 2026. [PubMed; DOI 10.4103/singaporemedj.SMJ-2025-113](https://pubmed.ncbi.nlm.nih.gov/41505212/).
8. Margolis et al. *Effect of Home Blood Pressure Telemonitoring and Pharmacist Management on Blood Pressure Control*. JAMA. 2013;310:46–56. [Full article; DOI 10.1001/jama.2013.6549](https://jamanetwork.com/journals/jama/fullarticle/1707720).
9. CMS. *Telehealth & Remote Monitoring*, MLN901705, December 2025, remote monitoring requirements. [CMS booklet](https://www.cms.gov/files/document/mln901705-telehealth-remote-monitoring.pdf). Policy reference checked October 25, 2026; not a payment-rate source.
10. MedPAC. *March 2026 Report to the Congress: Medicare Payment Policy*, Chapter 4, Table 4-8, printed page 131. [National nonfacility RPM allowed amounts](https://www.medpac.gov/wp-content/uploads/2026/03/Mar26_Ch4_MedPAC_Report_To_Congress_SEC.pdf).
11. CMS. *Calendar Year 2026 Medicare Physician Fee Schedule Final Rule*, October 31, 2025. [Geographic adjustment and separate conversion factors](https://www.cms.gov/newsroom/fact-sheets/calendar-year-cy-2026-medicare-physician-fee-schedule-final-rule-cms-1832-f).
12. Noridian. *Remote Physiologic Monitoring: 2026 E/M Updates*, December 26, 2025. [New 2–15-day and 10-minute options](https://med.noridianmedicare.com/web/jfb/article-detail/-/view/10534/remote-physiologic-monitoring-rpm-2026-evaluation-and-management-em-updates). The [official 2026 PFS final rule](https://public-inspection.federalregister.gov/2025-19787.pdf) specifies nonadditive base codes and real-time interactive communication.
13. BLS. *May 2025 National Occupational Employment and Wage Estimates*, Table 1. [Pharmacist and pharmacy-technician mean hourly wages](https://www.bls.gov/news.release/ocwage.t01.htm).
14. BLS. *Employer Costs for Employee Compensation*, June 2026, Table 4, healthcare and social assistance: wages $35.13 and total compensation $49.93/hour. [Compensation load](https://www.bls.gov/news.release/ecec.t04.htm).
15. The Digital Health Store. [RPM products and public cellular-cuff retail prices](https://thedigitalhealthstore.com/collections/rpm-software-and-services), accessed October 25, 2026.
16. SmartClinix. [Published pricing plan](https://smartclinix.net/pricing-plan/), accessed October 25, 2026. RPM technology and Professional core prices are component benchmarks; clinical monitoring, device compatibility, licensing and enterprise contract terms are separate.
17. NYU Langone RPM economic evaluation, 2026. [Full article and workload/cost inputs](https://pmc.ncbi.nlm.nih.gov/articles/PMC13016703/). Transferring NP workload to pharmacist time is an explicit sensitivity assumption.
18. User-supplied *RPM Cash Book.xlsx*, unpublished business-competition plan, reviewed October 25, 2026. `RPM etc!B30:B31` informs the 90% technician / 10% pharmacist task allocation; cashbook wages are excluded. `RPM etc!B26` and `B28` supply the separately retained $90 one-time and $12 monthly vendor charges. The user confirmed qualifying supervised clinical work and that the vendor charges include device/software/connectivity while in-house labor remains separate. These are planning assumptions, not peer-reviewed staffing estimates, claims evidence, or an independently verified vendor contract. The private source workbook is not uploaded.
19. Noridian. [Incident To Services](https://med.noridianmedicare.com/web/jfb/topics/incident-to-services), role, scope and state qualification requirements. Apply RPM's specific general-supervision provisions from CMS [9]; the generic incident-to direct-supervision discussion does not replace the RPM rule. A job title alone does not establish that a particular task qualifies as clinical treatment management.

20. Medicare.gov. [Doctor & other health care provider services](https://www.medicare.gov/coverage/doctor-other-health-care-provider-services). Original Medicare patient cost-sharing generally equals 20% of the Medicare-approved amount after the Part B deductible. This supports separating the allowed amount from all-in collections, not the model's assumed 90% realization rate.

The prior [health-plan budget model](integrated-system-model.md) and [provider comparison](provider-feasibility-model.md) use different questions and assumptions. Their exports must retain their original model versions; do not relabel them as results from the integration study.

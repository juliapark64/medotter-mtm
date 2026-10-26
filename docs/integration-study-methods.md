# MTM–RPM integration study: methods and evidence

This is a hypothetical planning study of adding MTM recruitment and medication review to an existing RPM service. The calculator and synthetic patient simulation must use the same scenario assumptions and financial perspective. Neither is an observed study of Kaiser, a clinical decision tool, or evidence that integration causes savings. The AMCP abstract and Word endpoint plan are separate artifacts and are not modified by this implementation.

The shared engine is [integrationStudy.js](../src/lib/integrationStudy.js), model `mtm-rpm-additive-integration`, version `1.0.0`, export schema `1`. Its input definitions are the authoritative defaults and validation limits. This implementation supersedes the recruitment-only simulation for the integration question; it is not the old health-plan budget model with renamed outputs.

## Comparison and denominators

The comparator includes the existing RPM program, usual physician recruitment, and medication changes that would occur under that program. Integration may add new RPM starts and change medication-review outcomes among people already receiving RPM. Show these contributions separately; an existing participant is not a new start.

Define the RPM-eligible population once. Apply additional MTM recruitment only to the eligible population remaining after existing participation and usual recruitment, according to the model's stated sequence. Offer and review probabilities are conditional on their preceding stages. A completed review is not an offer, an offer is not consent, and initiation means at least one transmitted reading. Charge recruitment work even when it does not produce a start. Do not add alternative-pathway estimates together or count the same patient twice.

Counts per 1,000 use the common RPM-eligible population. Plan PMPM, when reported, uses all covered plan members instead. These denominators are not interchangeable. A recruitment parity threshold is not a financial break-even threshold.

For population `N`, existing RPM share `e`, physician referral probability `r`, and physician initiation probability `qA`, expected existing participants are `N × e` and usual new starts are `N × (1 − e) × r × qA`. Completed integration reviews are `N × f × c`, including people already receiving RPM and people who never initiate RPM.

By default, `recontactUptake = null`: unsuccessful physician referrals are not offered another chance through MTM. With independent review/offer eligibility, added starts are then `N × (1 − e) × (1 − r) × f × c × o × qB`. Duplicate offers to successful physician initiators still incur work without creating another episode. Entering a numeric recontact probability enables a separate retry opportunity for unsuccessful physician referrals; zero means an unsuccessful offer still takes staff time. This is a simplified recruitment sequence, not a measured interaction between channels.

## Timing and clinical units

Calendar-year costs count only resources used during months 1–12. A late entrant receives fewer first-year service months than a January entrant. Clinical follow-up is measured from initiation or the first medication reduction; a 12-month clinical endpoint for a late entrant occurs after the first budget year. A projected follow-up outcome is not an event observed within year one.

The current engine uses one representative new-start/action month, default **month 7**, rather than staggered monthly arrivals. Existing participants start service in month 1; new participants start at the beginning of `startMonth`. For `m` available months and monthly RPM continuation `ρ`, expected service months per participant are `Σ ρ^k`, for `k = 0, …, m − 1`. Everyone receives the first service month. Existing participants must still be active at the planned action month to enter the illustrative clinical assessment; their expected availability is `ρ^(startMonth − 1)`. Medication persistence after an action is independent of later RPM discontinuation in this model.

Keep active service months, months with readings, and unique patients distinct. A missing reading can still require staff outreach. The literature's mean monthly reading participation does not supply the probability of meeting a requirement for readings in every consecutive two-month block.

The default clinical mode is **none**: both arms have zero assumed clinical effects and drug savings, while review and program costs remain. This is a conservative scenario, not evidence that the clinical effect is zero. The optional **illustrative** mode uses a usual-program medication-action probability of **10%**, an integrated probability of **30%** for patients receiving the completed MTM review, and **one medication reduction per patient with an action**. Those are investigator assumptions, not trial estimates. Patients without that review retain the usual-program action probability. Retain usual-program reductions in the comparator; only the between-arm difference is incremental.

The **unestimated** mode, or missing required clinical inputs, produces unavailable clinical outcomes, drug savings and total net financial benefit rather than replacing unknown effects with zero. An operating margin can still be calculated from the supplied service costs and collections. Unknown clinical inputs and an explicitly assumed zero effect are different scenarios.

The single-medication assumption makes patient and medication counts numerically equal in that scenario. It does not establish their equivalence in practice. If multiple drugs, dose reductions, substitutions, or restarts are introduced, track medicines and patients separately. For a genuine patient endpoint, count each patient once even if several medications change.

The optional **69.4%** persistence assumption concerns people who already underwent deprescribing. The model converts it to monthly medication retention as `0.694^(1/12)`, imposing a constant monthly restart risk. It counts one medication-month in the action month and progressively retained exposure thereafter, truncated at the budget-year boundary. This within-month convention and the constant risk are additional assumptions. An end-of-follow-up reduction does not establish a full year of drug savings.

No numeric symptom-resolution, fall-prevention, hospitalization-prevention, or cardiovascular-event benefit is established by this model. Do not substitute low home BP for confirmed inappropriate treatment. Assessment, clinical suitability, patient agreement, and implementation remain separate concepts even when represented by a combined scenario probability.

## Evidence contract

The references support specific quantities in specific populations. Transferred values remain assumptions about applicability; a citation does not validate the entire model.

| Reference quantity | What the source supports | Modeling restriction |
| --- | --- | --- |
| Physician referral 11.8% | Mean physician-level referral rate in the UCSD study, using October 2020–October 2022 records. [1] | Not an observed annual patient probability. Annual application is an explicit scenario choice. |
| Initiation 53% | UCSD initial uptake defined as at least one transmission after referral. [2] | Applying this to MTM offers, a different population, or the recruitment-year horizon is a transfer assumption. No automatic age adjustment. |
| Review completion 84% | Historical MA-PD CMR completion benchmark in the 2024 Star Ratings, within a defined MTM measure population. [3] | Not the MTM-eligible share of all RPM candidates or a current local completion estimate. |
| Monthly reading participation 49% | Mean monthly transmission probability over one year, conditional on initial uptake. [2] | Not annual retention or the share meeting all six consecutive two-month reading criteria. |
| Low home BP approximately 23% | MINOR baseline report: 74/322 older Brazilian participants, with or without symptoms. [4] | Exploratory prevalence only; it does not establish that every patient needs deprescribing or has symptoms to improve. |
| Uncontrolled BP 61.18% | The same report gives 61.18% and n=166 among N=322. [4] | Internally inconsistent; do not use as a fixed clinical input or silently repair the numerator. |
| Prescription reduction 28.6% | MINOR hypotension subgroup: reduction in prescriptions, with 37 intervention and 35 control patients. [5] | Not a probability that a patient undergoes deprescribing. It does not justify the model's 10% or 30% action probabilities. |
| Symptom reduction 64.9% versus 20% | Short-term reported symptom reduction in that subgroup. Both groups received home monitoring; pharmacist-assisted review was compared with physician review. [5] | Not verified complete resolution at 12 months, an RPM-versus-no-RPM effect, or an avoided-admission rate. Do not apply to asymptomatic patients. |
| Baseline medicines: two | OPTIMISE reports a median of two antihypertensives in selected patients aged ≥80. [6] | A median is not the mean needed to estimate aggregate medication counts. |
| Deprescribing persistence 69.4% | Singapore retrospective cohort: 12-month maintenance among 108 patients aged ≥60 who had already been deprescribed. [7] | Patient-level conditional persistence, not per-drug persistence or an RPM effect. |
| SBP difference 9.7 mmHg | HyperLink between-group difference in mean SBP change at 12 months. [8] | Not the probability that an individual achieves a 10-mmHg decrease; it cannot identify responder counts. |

MINOR used short-term home BP measurement in Brazilian primary care, not a year-long US RPM service. Its subgroup comparison does not isolate the effect of providing RPM because both arms received home monitoring. These sources do not establish a statistical interaction between MTM and RPM or the study's modeled financial benefits.

## Financial perspectives

Keep two ledgers rather than summing them:

- **Clinic:** external collections retained by the clinic minus its program resource costs. Drug-cost savings paid for by an outside health plan are not clinic revenue. Reimbursement inputs describe assumed receipts, not guaranteed claims payment or a published fee schedule.
- **Consolidated integrated system:** attributable drug-cost offsets retained by the system and any explicitly external revenue minus incremental resource costs. Payments between the owned health plan, clinic, and pharmacy cancel. Do not count an internal payment as both system revenue and a system saving.

`drugSavings` is the raw modeled medication-cost offset. The separate `retainedDrugSavingsShare` specifies the share financially retained by the consolidated system, default **100%**. The clinic perspective retains **zero** drug savings regardless of this setting. An outside insurer's medication savings are not automatically system revenue. Set this share from the actual drug-cost liability or contract; do not automatically derive it as `1 − externalPayerShare`, because the revenue share need not represent the same patient population or cost responsibility. In the explicit no-benefit mode, the raw drug offset is zero, so the retained share does not change the result.

Version 1.0.0 uses constant **2026 USD**. Loaded wages, task minutes, device prices, platform fees, fixed implementation costs, net drug costs, and collection rates are investigator assumptions unless a scenario supplies its own documented source. A national wage benchmark does not establish a local loaded productive-hour cost. Normalize any replacement historical prices before entering them; the engine does not automatically inflate costs.

Costs should include role-specific review, outreach, onboarding, monitoring, and medication follow-up time. Do not charge the entire existing CMR again when only incremental work is being added. Keep device, vendor, platform, and labor lines nonoverlapping. Fixed costs persist even when recruitment or added clinical benefit is zero. Drug offsets must be net of substitutions, dose changes and restarts, and limited to the perspective that bears those costs.

CMS guidance establishes billing conditions, not one universal RPM payment. The December 2025 CMS booklet includes eligible billing practitioners, code-specific data requirements, consent, connected-device requirements, and restrictions on duplicate services/time. [9] A collaborative drug therapy agreement alone is not evidence of collection eligibility or a guaranteed payment. This model does not adjudicate CPT claims, implement a statutory change, or certify billability. Validate actual payer contracts and applicable requirements before using external revenue as a local forecast.

Revenue equals qualifying active months × the monthly benchmark × the collection share × the external-payer share. The default **$100** benchmark, **70%** qualifying-month share and **90%** collection share are assumptions. The default external-payer share is **zero**, so retained revenue is zero until an explicit external payer mix is supplied. This is a financial-boundary assumption, not a claim that RPM is never reimbursed. Switching to the clinic perspective does not automatically change the external-payer share. A first transmission qualifies the initiation endpoint but does not prove a billable month; all active months incur service costs even when they generate no collections.

Use positive **incremental net benefit** to mean improvement relative to the existing program. A positive difference can represent a smaller loss while both programs still have negative total results; it is not necessarily an absolute surplus or profit. Read each arm's total alongside the difference. For a cost-oriented result, the sign is reversed: incremental net cost equals added costs minus added offsets. State the convention beside every result. Neither an additional RPM start nor a symptom improvement automatically creates a quality bonus or a medical-cost saving.

## Simulation and uncertainty

The deterministic calculation is the primary expectation under the selected inputs. The microsimulation creates fictional individual histories to illustrate the same assumptions. A seed makes its random draws reproducible; it does not make synthetic patients empirical evidence. Paired draws between arms, when used, are a computational comparison device rather than measured counterfactual patient outcomes.

Random variation between synthetic runs is different from uncertainty about inputs. Larger simulated populations reduce numerical noise but do not narrow uncertainty about the true effects of integration. Do not label seed variation a clinical confidence interval. A probabilistic sensitivity analysis requires separately specified input distributions and dependencies; a sensitivity range is not itself such a distribution.

Required structural scenarios include no additional medication-action benefit, no added RPM recruitment, and no external reimbursement. Retain the relevant costs in each. Equal action rates remove the assumed improvement per comparable assessed patient, but extra recruitment can still change total actions; a scenario claiming **zero total added deprescribing benefit** must also neutralize that reach-related increment. Vary MTM eligibility, offers, uptake, recruitment month, service duration, staffing time, drug costs and collection assumptions. Report infeasible or undefined thresholds explicitly.

Validation should check cohort conservation, exclusion of existing participants from new starts, calendar-month exposure, unit consistency, comparator subtraction and financial-perspective boundaries. Deterministic and simulated summaries should agree in expectation under identical assumptions. Replay checks test computational reproducibility, not clinical validity or real-world savings.

## Export and replay

An integration JSON bundle includes complete inputs, the seed, model/evidence metadata, paired synthetic patient records, analytic expected summaries and simulated summaries. The shared verifier reruns the model and rejects mismatched versions, schema, inputs, metadata or results. It does not treat a plausible edited summary as a valid run. A CSV is a table for inspection; use JSON for exact replay.

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
9. CMS. *Telehealth & Remote Monitoring*, MLN901705, December 2025, remote monitoring requirements. [CMS booklet](https://www.cms.gov/files/document/mln901705-telehealth-remote-patient-monitoring.pdf). Policy reference checked October 25, 2026; not a payment-rate source.

The prior [health-plan budget model](integrated-system-model.md) and [provider comparison](provider-feasibility-model.md) use different questions and assumptions. Their exports must retain their original model versions; do not relabel them as results from the integration study.

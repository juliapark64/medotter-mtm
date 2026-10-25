# Community pharmacy and integrated clinic financial feasibility

Provider model **2.2.0**, export schema **4**, app **2.4.0**. Six scenarios compare each setting under a CDTA plus paid RPM arrangement, assumed Act passage, and no added reimbursement. The abstract and integrated-system budget engine are unchanged.

## Interpretation

Operating margin = incremental receipts minus delivery costs, claim processing, fixed overhead, startup costs, and lost dispensing contribution. Positive margin is surplus; negative is a funding gap. The clinic is a service provider, excluding its parent plan. Drug/hospital cost avoidance, quality bonuses, and internal transfers are not income in this model.

Defaults assume a valid CDTA and a separate paid RPM arrangement, with 100% of RPM participants having an external payment pathway in both settings. The community pharmacy receives 80% of modeled billing-practice collections under a hypothetical contract; the integrated clinic retains its own collections. Qualification and collections are still uncertain. These assumptions do not measure a causal effect of practice setting. A Kaiser-like clinic serving its own capitated members must not automatically receive the external fee-for-service receipts used in the benchmark example. Set the external current RPM share to zero for those services. Both settings retain the same population and clinical assumptions; no setting-specific clinical advantage is inferred.

## Reference inputs and remaining assumptions

| Input | Community pharmacy | Integrated clinic | Evidence status |
| --- | --- | --- | --- |
| Base pharmacist wage | $60.11/hour, independent pharmacy | $80.61/hour, ambulatory care | 2024 survey wages; not loaded costs or Kaiser data. Broader community average $67.94 is an alternative. |
| Wage price-year adjustment | 1.00 | 1.00 | Assumes source wages carried forward without growth; editable multiplier. |
| Employment load / productive share | 30% / 100% | 30% / 100% | Investigator assumptions, not survey estimates. |
| Review time | 30 min plus 10 min coordination | Same | 30-minute historical CMR model input; clinic application is extrapolated. Coordination remains an assumption. |
| Current review fee | $50, before 90% realization | $0 pending a contract | Historical Colorado modeled payment; $35–$75 is a sensitivity range, not a current fee or confidence interval. |
| Current review eligibility | 50% | 0% | Unverified joint eligibility assumptions. |
| Current RPM pathway | CDTA + benchmark-derived contract; 100% eligible pathway, 80% of partner collections retained | Published 2026 nonfacility benchmark; 100% eligible external pathway | User-requested paid arrangement; retained share is illustrative, not a published or approved contract rate. |
| RPM pharmacist / other clinical / technical time | 20 / 0 / 10 min per active month | Same | Assumed workflow; eligible clinical-team time can satisfy the management threshold. Technical support is separate. |
| Current benchmark qualification | Setup 80%, data 80%, management 80% | Same | Assumptions within the eligible population, not published completion rates. |
| Benchmark collections | 90% realization; 80% of patient share collected | Same | Assumptions; deductible satisfied, adjustments included in realization. |

Loaded pharmacist cost = wage × price-year multiplier × (1 + employment load) / productive share. Defaults give $78.143/hour for pharmacy and $104.793/hour for clinic. Productive time cannot be zero. Avoid counting paid leave twice in the load and productivity adjustment.

Technical-support staff remain $40/loaded hour; other eligible clinical staff default to $40/loaded hour as an assumption, with zero assigned minutes until entered; device $100/start; variable technology $10/active month; ordinary overhead $5,000/year; startup $5,000; billing $5/submitted unit. All are editable assumptions, not evidence-based setting differences. Onboarding is 10 pharmacist minutes plus 20 support minutes per new RPM start. No device reuse credit is assumed. Dispensing contribution defaults to zero until locally estimated; use net contribution, not gross prescription revenue.

## Current reimbursement

Review receipts = completed reviews × current review eligibility × contracted/historical amount × review realization. The community $50 historical nominal input is carried forward without escalation; the clinic has no presumed separate review contract.

The default pharmacy pathway is **benchmark-derived contract mode** (input value 2). A valid CDTA supports the agreed clinical work; a distinct service/payment arrangement is assumed. An eligible collaborating practitioner bills for qualifying RPM services. Billing-practice collections are calculated from the fee table and the qualification/collection factors below. Pharmacy RPM income = billing-practice collections × retained contract share (80% by default). The 20% partner remainder is excluded from pharmacy income; it is not deducted again as a cost. Direct Medicare and patient receipts are zero at the pharmacy-provider level in this mode. The partner subtotal is disclosed for audit and is not added to program revenue. A CDTA is not itself a payment contract or independent Medicare billing authorization. The Washington CDTA rule is a state example, not evidence of jurisdiction or approval for this hypothetical program.

The 80% retained share is an investigator assumption, with 50% and 100% exported sensitivities. The Rx Clinic Pharmacy implementation report supports the existence of contracting arrangements but does not establish this percentage or contract price. No percentage is presented as a legal safe harbor or guaranteed reimbursement.

**Fixed net contract mode** (value 0) remains available in either setting: RPM receipts = active months × current payment share × entered net monthly receipt. Include allocated setup/device receipts in that amount and enter it net of partner share and collections. Benchmark calculations and the retained-share multiplier are inactive in this mode. **Direct benchmark mode** (value 1) is available only to the clinic. Each setting selects one pathway; they never generate additive payments for the same services.

Clinic direct benchmark mode and pharmacy benchmark-derived contract mode use:

| Code | 2026 national nonfacility fee | Model unit |
| --- | --- | --- |
| 99453 | $21.71 | One qualifying setup per new episode |
| 99454 | $52.11 | Qualifying period with 16+ days of data |
| 99457 | $51.77 | Qualifying calendar month with first 20 clinical minutes |
| 99470 | $26.05 | Alternative first 10 clinical minutes; never added to 99457 |

Eligible starts/months are multiplied by the separate setup/data/management qualification share. Allowed benchmark charges are the sum of qualifying units × fees. Billing-practice Medicare collections = charges × realization × 0.80. Billing-practice patient/supplemental collections = charges × realization × 0.20 × patient collection. Their sum is retained by the clinic in direct mode, or multiplied by the pharmacy contract share in benchmark-derived contract mode. These are expected receipts before program costs, not profit. National fees require local validation; the example assumes billed charges at least equal the benchmark. The 99445 lower-day alternative, additional 99458 time, and hospital facility fees are not included.

The selected management threshold must be met by combined modeled pharmacist and other eligible clinical-staff time when management payment is enabled. Version 2.1 corrects the prior pharmacist-only restriction. Eligible staff time is entered and costed separately; technical-support time is not reclassified automatically. This is necessary but not sufficient: interactive communication, practitioner eligibility, supervision, medical necessity, consent, and other requirements still must be met. Technical support is device help/nonclinical outreach and cannot be counted as clinical management. Onboarding is also separate from recurring management time. Work allocation requires appropriate staff, scope and supervision, not merely a numeric total. Setup receives no revenue when active episode time is zero. Clinic direct billing expense is charged per submitted CPT code, including unsuccessful claims. Pharmacy contract administration is charged once per covered active patient-month (one invoice unit) in either contract mode; partner CPT claims do not add pharmacy claim costs. The $5 local invoice charge is additional local administration and must not duplicate partner billing work already funded by the retained partner amount. Setup is counted once, not monthly.

## Policy scenarios

Assumed Act passage retains current payments and adds a disjoint previously unpaid eligible share. Defaults: 25% additional reviews and 0% additional RPM in both settings. Current pathway share plus additional Act share cannot exceed 100%. The entire current-pathway population is reserved from Act eligibility, even when a specific current code is not paid; this prevents overlapping service populations. Clinical effects do not change with reimbursement.

The introduced S. 2800 text is a policy counterfactual. Eligibility depends on Medicare coverage, underserved setting, state scope, covered services, and implementation. It is not a claim of enactment or universal pharmacist RPM coverage. Allowed amount = min(charge, 85% × physician fee benchmark); Medicare pays 80% of that base and the remaining 20% is the patient share. Receipts use the entered realization/collection factors. Default $100 review and RPM benchmarks are hypothetical, with no CPT assignment. They are distinct from the published current-RPM fees. Act billing adds assumed $1,000 startup and $1,000/year administration. Relative start year 4 means no Act implementation within the three-year horizon.

No added reimbursement removes all program receipts and claim/Act-specific expenses, retaining service delivery, ordinary overhead, startup and any dispensing effect. It can produce different margins because wages differ.

## Population, timing and uncertainty

200 distinct new participants enter each year on January 1; everyone receives one initial review and 50% start a six-month RPM episode. Annual dropout is 10%, converted to continuous attrition through the existing retainedMonths function. At zero dropout all modeled episode months remain; at 100% dropout active time is zero but device/onboarding costs remain. No one reenrolls during this horizon. Counts are expected aggregate values; recurring billing uses active-month equivalents for calendar months/30-day periods and qualification shares, not exact patient-level claims adjudication.

Geisinger-derived 1.09 discontinuation recommendations per initial review and 33.2% implementation remain in place. Additional findings beyond existing care (50%) and annual discontinuation/customer retention (80%) are assumptions. Clinical effects affect this provider margin only through an entered dispensing contribution. No payer savings are credited.

Ohio State observed $96.30 and $124.17 in RPM collections per enrolled patient across two phases of 2022–2024 observation. These are context, not monthly rates, proof of profit, or calibrated engine inputs. Durations, population, billing processes and incomplete episodes differ. The interface also reports modeled current clinic RPM collections per new enrollee across the modeled episode, excluding review and Act receipts, for transparent discussion of those differences.

Reporting year defaults to 2026; source years remain visible. Historical wages and CMR fees are carried forward under explicit assumptions, not silently inflated. Other values should be entered on a consistent dollar basis. No annual escalation, discounting or tax is modeled. The projection holds the 2026 reimbursement rules and contractual arrangements constant; it does not predict future regulatory or contract changes. Research sensitivity analysis should vary employment load, local wage adjustment, review time, coverage, qualification, collections, vendor costs and contract rates; the defaults alone do not establish comparative profitability.

Break-even is the smallest constant annual enrollment covering cumulative three-year fixed costs at unchanged mix and unit contribution. It assumes linear variable costs and adequate capacity. If unit receipts do not cover unit variable costs, enrollment cannot cover fixed overhead and the model reports no attainable break-even.

## Workload and spending audit

Under unchanged default service volumes, each year has 200 completed reviews, 100 new RPM starts and 584.4698 active RPM patient-months after dropout. Pharmacist time is:

- Reviews and coordination: 200 × 40 / 60 = 133.3333 hours/year.
- RPM onboarding: 100 × 10 / 60 = 16.6667 hours/year.
- Recurring RPM: 584.4698 × 20 / 60 = 194.8233 hours/year.
- RPM pharmacist total: 211.4899 hours/year; all pharmacist work: 344.8233 hours/year.
- Other clinical staff: zero by default. Technical support: 130.7450 hours/year, including onboarding.

Thus 1,034.4698 displayed cumulative pharmacist hours cover three years of both review and RPM work, not one year of RPM. Pharmacist time is charged only as consumed; a full annual pharmacist salary is not charged. Labor is an incremental resource/opportunity cost and need not represent a new cash salary payment if existing capacity supplies it. Overhead and startup must also be incremental and must not duplicate other input costs.

The paid-CDTA defaults produce approximately $174,327 community-pharmacy costs and $206,856 clinic costs over three years. These include $30,000 of device purchases, $17,534 of technology, and $20,000 combined startup/overhead in EACH setting. These are assumptions, not verified procurement costs. No device reuse is credited. Billing is $5 per submitted code/invoice unit rather than per patient; this is also an unverified assumption.

Both settings now receive RPM income. With the 80% pharmacy retained-share assumption, annual pharmacy receipts total $39,273 ($34,773 RPM + $4,500 reviews); clinic receipts total $43,467 RPM, with no separate review receipts. Three-year margins are approximately −$56,507 for pharmacy and −$76,456 for clinic. Year 1 includes $5,000 startup costs. The Act scenario adds the same hypothetical $3,672/year in previously unpaid review receipts in each setting, plus its implementation/administration costs; it adds no duplicate RPM receipts.

Remaining gaps reflect total delivery costs, the pharmacy partner allocation, review-payment assumptions, and 80% code qualification plus collection adjustments. They do not demonstrate that the program is inherently unprofitable. Clinical effectiveness and payer cost offsets are not provider receipts.

The 20-minute default is a scenario, not a universal clinical requirement. HealthPartners HyperLink reported 11.4 pharmacist encounters per intervention patient at 34.2 minutes per encounter across 12 months, approximately 390 minutes per patient by multiplying means. That is a more intensive historical protocol, not a justification for a universal modern monthly average. The calculator cannot infer equivalent outcomes from a reduced-time workflow.

A transparent lower-time sensitivity must adjust billing as well as spending. For example, 10 pharmacist minutes with code 99470 (all other paid-CDTA clinic inputs unchanged) reduces both costs and reimbursement, yielding approximately a $77,003 three-year funding gap versus $76,456 at 20 minutes. At the higher paid-population share, the revenue reduction slightly exceeds the labor saving; reducing time does not necessarily improve margin. Alternatively, 10 pharmacist minutes plus 10 minutes of eligible clinical-staff management can retain the 20-minute threshold if all requirements are met; those staff minutes must be costed separately. Neither sensitivity is a measured intervention effect or an automatic preferred default.

## Exports and verification

JSON saves all six scenarios, three annual rows and cumulative results, full-precision inputs, per-setting source/default provenance, computed loaded wages, citations, and input SHA-256. CSV contains the same metadata with 24 result rows. Edited reference inputs are labeled user-entered assumptions. Imports verify the model, inputs, results and citations. Provider schema 1, 2 or 3 files are not silently migrated; replay them with their original archived source. Integrated-system schema 3 is unchanged.

`npm run scenarios:providers` creates a new export folder with JSON, CSV, methods, source snapshot, checksums, and replay instructions. Node.js 20+ is required. Archived source verifies or re-exports its matching bundle without package installation. Existing export folders are never overwritten.

## References

- [2024 National Pharmacist Workforce Study, Table 2.4.2](https://www.aacp.org/sites/default/files/2025-06/2024-npws-final-report-5.27.25.pdf).
- [Nuffer et al., 2019, JMCP 25:984–988](https://pmc.ncbi.nlm.nih.gov/articles/PMC6859940/).
- [MedPAC March 2026 Report, Table 4-8, p. 131](https://www.medpac.gov/wp-content/uploads/2026/03/Mar26_Ch4_MedPAC_Report_To_Congress_SEC.pdf).
- [CMS Telehealth & Remote Monitoring, December 2025, pp. 12–13](https://www.cms.gov/files/document/mln901705-telehealth-services.pdf).
- [Carroll et al., 2026, J Gen Intern Med 41:3427–3433](https://link.springer.com/article/10.1007/s11606-026-10384-9).
- [Introduced S. 2800, section 2](https://www.govinfo.gov/content/pkg/BILLS-119s2800is/html/BILLS-119s2800is.htm).
- [Graybill et al., 2021, JACCP 4:801–807](https://accpjournals.onlinelibrary.wiley.com/doi/full/10.1002/jac5.1466).

- [Margolis et al., JAMA 2013;310:46–56, HealthPartners HyperLink](https://jamanetwork.com/journals/jama/fullarticle/1707720).

- [Washington WAC 246-945-350, CDTA framework](https://app.leg.wa.gov/WAC/default.aspx?cite=246-945-350).
- [Abubakar and Sinclair, Pharmacy 2020;8:166, Rx Clinic Pharmacy RPM implementation](https://pmc.ncbi.nlm.nih.gov/articles/PMC7557406/).

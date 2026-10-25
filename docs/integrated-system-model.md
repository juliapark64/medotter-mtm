# Health-plan MTM budget-impact study

Version 3.0.0 focuses on whether deprescribing savings can offset the incremental costs of adding RPM within MTM. The decision-maker is a hypothetical Medicare Advantage health plan with employed MTM pharmacists and a vendor providing RPM devices and data service. Standard MTM and hypertension care without the added program is the comparator. The primary endpoint is combined-program net budget impact per member per month (PMPM) over one year. Three-year projections are secondary. The study outline informs the framing; both Word documents remain unchanged.

The main calculator compares standard MTM (zero incremental reference), deprescribing alone, RPM alone, and the combined program. This is a deterministic planning model, not observed outcomes or an independently verified spreadsheet analysis. It neither estimates provider profit nor compares community pharmacies with clinics. The prior provider comparison is removed from the app; its source and historical exports are retained for offline replay.

## Costs and price year

All monetary inputs are estimates in the user-selected price year's USD. Defaults are illustrative 2026 planning amounts, not historical dollars automatically inflated to 2026. Changing the price-year field changes metadata only. Users must normalize historical inputs and document the index, calculation, and source in the scenario notes before entering them. No discounting or future price escalation is applied.

Costs are separated into pharmacist labor, support-staff labor, purchased devices, technology per active patient-month, annual incremental platform support, and one-time implementation. Loaded hourly rates include benefits and applicable employment overhead. Support cost can represent a weighted local staffing mix. Device, connectivity, labor, and fixed platform inputs must not overlap. Provider revenue is outside this plan perspective. The model counts the plan’s incremental resource costs rather than adding billing receipts as revenue. If a vendor quote includes labor or hardware, remove the overlapping resource line instead of charging twice. The platform and setup costs are charged once in combined mode. Fixed costs remain even if enrollment is zero.

The model uses net drug acquisition cost after applicable discounts and rebates, rather than gross Part D spending. Replacement medication costs are explicit. Avoided event cost must reflect attributable and avoidable costs within the modeled horizon, matching the baseline composite CV event definition. A released hospital bed does not automatically translate into cash savings. Set event cost to zero to examine resource costs without medical offsets.

## Population and comparator

Membership remains constant; departing members are replaced at year boundaries. Added medication review eligibility and hypertension RPM eligibility are separate shares of all covered members. The RPM share represents clinically eligible members with uncontrolled hypertension. Only additional effects and workload beyond existing MTM and hypertension care belong in the model.

Deprescribing implementation is an aggregate probability incorporating clinical suitability, pharmacist protocol authority or prescriber agreement, patient agreement, and actual implementation. It is not a prescriber acceptance benchmark and is not assumed to be 100% under a collaborative agreement. Additional detection is relative to the actual existing MTM workflow, not prescription-level DUR.

## Timing

The within-year exposure fraction f places each year's new cohort at month 12(1-f) within that year. Thus f=0.5 represents a July 1 cohort, not a fully simulated uniform arrival process. f=1 starts January 1. f=0 suppresses new reviews, discontinuations, and RPM starts; fixed costs remain. Both one- and three-year views use the same engine and the same first-year equations.

## Deprescribing

Annual reviews = covered members × review-eligible share × completion rate.

New discontinuations in year y = reviews × candidate medications per review × additional detection × implementation × (1 − opportunity decline)^(y − 1). In the Geisinger scenario, candidate medications are discontinuation recommendations per completed initial review. The internal input key `pimsPerPatient` is retained for compatibility; this does not classify all Geisinger recommendations as PIMs.

Prior discontinuations survive each year boundary with probability (1 − restart rate) × (1 − member turnover). New discontinuations contribute f medication-years in their first year. Surviving prior discontinuations contribute one medication-year in each later year. Attrition is applied at boundaries rather than continuously; it is a simplification. Review workload remains constant even when new opportunities decline. Opportunity decline applies to the whole current population, including replacement members.

Net medication offset = discontinued medication-years × (net original drug cost − substitution share × net replacement drug cost).

All medication discontinuations are counted, including substitutions. Substitution costs may make the drug offset negative. Replacement costs are assumed to persist only while the corresponding original drug remains discontinued. The model does not estimate deprescribing-related falls, adverse events, clinical harm, or quality bonus payments.

### Geisinger-informed scenarios

Source: [Graybill et al. (2021), Medication therapy problems identified by pharmacists conducting telephonic comprehensive medication management within a team-based at-home care program. JACCP 4(7):801–807](https://accpjournals.onlinelibrary.wiley.com/doi/full/10.1002/jac5.1466). DOI: 10.1002/jac5.1466. See Methods 2.4, Results, and Tables 1–2.

This retrospective Geisinger study included 307 patients, with 182 patients/caregivers contacted for initial comprehensive medication management. In that contacted subgroup, 199 discontinuation recommendations yield 199/182 = 1.0934 recommendations per initial review, entered as **1.09**. Of those 199 recommendations, 66 were documented as accepted/actioned, yielding 66/199 = 33.17%, entered as **33.2%**. Calculations use these requested rounded inputs, not the unrounded fractions. The implementation denominator is recommendations, not patients. Dose changes and other medication problems are excluded.

The at-home program targeted patients with at least six chronic conditions and high prior hospital/emergency utilization. The overall cohort averaged age 72, seven conditions, and 19 medications. This selected, complex population is not representative of every plan member. The review workflow and collaborative practice setting provide operational context, but neither KPI is a CMS estimate or Kaiser observation.

Each modeled review is treated as an initial-review-equivalent episode. Applying the yield to later annual reviews, the opportunity decline, restarts, member turnover, and three-year persistence are extrapolations. Discontinuation recommendations are not a Beers-criteria PIM count. Chart review assessed action after initial-review follow-up and did not establish long-term discontinuation or cost savings.

The study had no usual-care control. The existing **additional findings beyond MTM** input therefore still determines the share of these recommendations that is incremental to the local comparator. Its illustrative 50% default is not derived from Geisinger. Applying the 33.2% action rate to this additional subset is also an extrapolation. The study does not establish that the modeled work can be done in ten additional minutes or validate the drug-cost assumptions.

The two named scenarios retain all current population, completion, staffing, cost, timing, and RPM inputs:

- `geisinger`: sets recommendation yield to 1.09 and implementation to 0.332, retaining the current additional-findings share.
- `geisinger-no-added-benefit`: uses the same pair and sets the additional-findings share to zero. All three years then have zero added medication discontinuations and zero medication cost offsets. Review workload and program costs remain; any independent RPM effects remain.

Applying the positive-reference preset after the no-added-benefit preset retains the zero additional-findings share. Enter the intended nonzero share explicitly, or use Reset study base case. These two scenarios are available in Combined and Deprescribing only modes. Browser and command-line study defaults now select the Geisinger-informed scenario explicitly. Reset study base case restores 1.09 recommendations, 33.2% implementation, and the assumed 50% additional-findings share. The generic input dictionary retains its legacy illustrative values for historical model tests; these are not the active study default.

## RPM cohorts

At each year boundary, previously enrolled members are reduced by member turnover. New starts = (clinically eligible population − retained previously enrolled members) × annual uptake. Retained members who completed or dropped out do not reenroll. Replacement members replenish the available pool. This conservative structural assumption is explicit; there is no individual patient simulation.

Each new start receives one purchased device and one set of onboarding activities. Episode duration is capped by the chosen number of months, which may span years. Within-episode dropout follows a constant hazard h = −ln(1 − annual dropout)/12 per month. Expected active months between episode ages a and b equal the integral of exp(−ht) over that interval, multiplied by cohort size and calendar-year membership retention. At zero dropout the integral is b−a; at 100% dropout exposure is zero, but onboarding and device costs are still charged.

Fees and recurring labor accrue only during active patient-months. Completed episodes generate no further costs or clinical benefit. The model does not automatically replace dropouts or bill indefinitely for a fixed number of active participants. Setup costs are only in year 1. There is no reused-device credit.

## Cardiovascular offset

Relative event-rate reduction is approximated as 1 − (1 − reduction per 5 mmHg)^(incremental SBP reduction/5). Avoided events = active RPM patient-months / 12 × baseline annual event incidence × relative reduction. CV offset = avoided events × avoidable event cost.

The use of a trial hazard ratio as an event-rate ratio and the application of the 12-month BP effect throughout active exposure are extrapolations, not observed short-term effects. No benefit accrues after graduation. Test no BP benefit or zero medical cost offsets, particularly where baseline hypertension care is already strong. The RPM effect applies to the uncontrolled-hypertension cohort, not to patients simply being monitored during antihypertensive tapering. The combined model does not infer synergy.

## Outcomes and reproducibility

Program cost = all staff costs + devices + connectivity + annual platform + setup. Net impact = program cost − net drug offset − CV offset. Annual PMPM divides annual net impact by covered members × 12. Three-year PMPM divides the cumulative impact by covered members × 36. It is not the year-3 PMPM. Quantities are expected values and may be fractional.

The data dictionary in `src/data/calculatorDefaults.js` records every default, description, unit, source, evidence label, validation limit, and sensitivity bound. Bounds are exploratory assumptions, not confidence intervals. Defaults marked literature-informed still require local applicability assessment; all costs and most implementation parameters are assumptions. Replacing them with local evidence is essential before interpreting the output as a real plan budget.

Browser and CLI exports share scenario definitions and calculations. JSON includes schema/model versions, a full assumption snapshot, names, notes, timestamps, exact inputs, input SHA-256 fingerprints, and annual/cumulative outputs. Geisinger scenarios also carry an evidence profile with the citation, population, limitations, and numerator/denominator derivations. Edited values retain the reference but are labeled user/scenario assumptions. Generic sensitivity bounds are exploratory and are not Geisinger-derived intervals.

Fingerprints identify inputs; they do not authenticate the source of a file. Imports reject version mismatches and recalculate all saved results, and verify the full provenance and evidence profile against the versioned model. CSV preserves full precision, includes the evidence profile on every row, and protects textual fields against spreadsheet formula execution. CLI exports additionally archive runnable source and checksums, and refuse to overwrite previous runs. The interface exports its displayed comparisons; the CLI adds a full one-way low/high sensitivity sweep. Model 3.0.0 uses export schema 3 (unchanged file structure, updated model identity and metadata); older bundles can be replayed using their own archived source, rather than relabeled with new evidence.

## Study scenarios and break-even analysis

Displayed planning scenarios cover 50,000, 100,000, and 250,000 members; 20%, 40%, and 60% deprescribing implementation; and 10%, 30%, and 50% annual RPM uptake among eligible members. These investigator-selected ranges are not literature confidence intervals. The CLI also retains the wider generic one-way sensitivity sweep; its bounds are separately documented in the input dictionary. No-added-deprescribing-benefit and zero-CV-offset scenarios test distinct uncertainties.

The primary view always shows all three program arms using the same assumptions. The services selector controls detailed projections and exports. The drug-savings-only result is combined program cost minus net medication offset with the CV offset set to zero. It tests whether medication savings alone cover the full added program.

The implementation threshold holds all other inputs fixed and solves the combined year-one net impact for zero. Let N0 be net impact at 0% implementation and N1 at 100%. When N0 > 0 and N0 − N1 > 0, the required rate is N0 / (N0 − N1). A value above 100% is unattainable by changing implementation alone. If N0 is already nonpositive, zero implementation suffices; if the incremental drug offset is nonpositive, implementation cannot close a positive deficit. This is an aggregate implementation rate, not prescriber acceptance alone, and includes the currently assumed CV offset. Shared fixed costs are counted once in the combined arm.

## Evidence context

- ISPOR Budget Impact Analysis Good Practice guidance: https://www.ispor.org/publications/journals/value-in-health/abstract/Volume-17--Issue-1/budget-impact-analysis-principles-of-good-practice-report-of-the-ispor-2012-budget-impact-analysis-good-practice-ii-task-force
- HyperLink randomized trial, pharmacist case management with home BP telemonitoring: https://pmc.ncbi.nlm.nih.gov/articles/PMC4311883/
- BPLTTC 2021 individual participant meta-analysis: https://pubmed.ncbi.nlm.nih.gov/33933205/
- UC Davis operational program description, six months with possible extension to a year: https://health.ucdavis.edu/neurology/news/headlines/remote-monitoring-shows-real-results-uc-davis-health-helps-patients-lower-blood-pressure-at-home/2025/06

The UC Davis page informs a duration scenario, not a causal effect estimate or a Kaiser cost estimate. No comprehensive systematic literature search or clinical validation is claimed.

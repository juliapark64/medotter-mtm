# Recruitment microsimulation methods and replay

**Archived model:** this document describes the original recruitment-only engine and its version 1 exports. The current website's calculator and simulation use the additive integration model, **version 3.0.0/schema 3**, documented in [integration study methods](integration-study-methods.md). That model retains physician recruitment in both arms and adds pharmacist recruitment, deprescribing, team service costs and monthly/setup collections. The alternative-pathway equations below must not be used as the current study's incremental financial endpoint. Original recruitment exports remain tied to their own engine and are not migrated to the integration model.

The recruitment engine compares two **alternative** entry pathways for the same synthetic RPM-eligible cohort: physician referral and an RPM offer through a completed medication review. It is a patient-level Bernoulli simulation of recruitment stages, with an analytic cohort calculation alongside it. It does not calculate costs, clinical benefits, or the existing budget calculator's results.

The endpoint is **RPM initiation: at least one transmitted blood pressure reading during the modeled 12-month recruitment period**. Administrative enrollment alone does not meet this definition. The animation illustrates the stages; it does not represent actual appointment duration or calendar time.

Implementation: [`src/lib/recruitmentSimulation.js`](../src/lib/recruitmentSimulation.js). Model ID: `mtm-rpm-paired-recruitment`; model version: `1.0.0`; export schema: `1`.

## Inputs and evidence

The engine requires a complete input object with the following fields. Values must be numbers; blank strings, numeric strings, unknown fields, missing fields, nonfinite values, and out-of-range values are rejected. Omitting the entire argument to `simulateRecruitment()` uses the documented defaults.

| Field | Default | Definition and denominator | Evidence or assumption |
| --- | ---: | --- | --- |
| `N` | 1,000 | Common number of RPM-eligible members; integer from 1 to 10,000. | Investigator choice. This is a synthetic cohort size, not an observed study sample. |
| `r` | 0.118 | Probability of physician referral during the modeled recruitment year, among `N`. | Literature-informed scenario assumption. UCSD reported a mean physician-level referral rate from EHR data spanning October 2020–October 2022; 11.8% is not a documented annual patient probability. |
| `f` | 0.50 | Share of `N` included in the MTM review population. | Investigator assumption; the overlap of RPM and MTM populations is not established by the CMR benchmark. |
| `c` | 0.84 | Review completion conditional on inclusion in the MTM review population. | Scenario informed by the PQA-reported MA-PD CMR completion rate in the 2024 Star Ratings. It is not completion among all RPM-eligible members. |
| `o` | 0.50 | RPM offer conditional on completed review. | Investigator assumption. |
| `qA` | 0.53 | Initiation conditional on physician referral. | Scenario informed by UCSD uptake, defined as at least one BP transmission after referral. Applying it within the modeled recruitment year requires an assumption. |
| `qB` | 0.53 | Initiation conditional on an MTM-based offer. | Applying the physician-referral uptake benchmark to MTM offers is an additional transport assumption. Equality with `qA` is not an observed finding. |
| `seed` | 2027 | Integer pseudorandom seed from 0 to 4,294,967,295. | Reproducibility choice, with no clinical interpretation. |

All probabilities are bounded from 0 to 1. No additional age adjustment is applied. Changing a value does not make its original citation evidence for the new value.

Primary references:

- [UCSD referral study, JMIR 2025](https://www.jmir.org/2025/1/e64933/): referral timeframe and physician-level measurement.
- [PQA report, page 4](https://www.pqa.org/wp-content/uploads/2025/10/PQA-QuIRC-MTM-Report.pdf): the 84% MA-PD CMR benchmark. [CMS technical notes, pages 20–21](https://edit.cms.gov/files/document/mmpperformancedatatechnotes.pdf) describe the corresponding defined MTM-enrollee denominator, including enrollment-duration and hospice rules. The model does not simulate these eligibility rules; applicability is an assumption.
- [UCSD author manuscript, section 6.2 and footnote 17](https://pages.ucsd.edu/~yfadlon/pdfs/Digital_Health.pdf): 53% initial uptake and the distinction between initiation and later monthly transmission adherence. The reported 49% mean monthly adherence over one year is **not used** as annual unique-person engagement or persistence.

## Paired patient draws

Each synthetic ID (`S0001`, `S0002`, and so on) passes through both pathways. There are no invented names, ages, diagnoses, medication histories, or clinical measurements.

For every patient, the seeded `mulberry32` generator produces five uniforms in a fixed order:

1. Physician referral.
2. Inclusion in the MTM review population.
3. Review completion.
4. RPM offer.
5. Initiation, shared between the two pathways for this patient.

The comparison at each stage is `uniform < probability`. All five draws are consumed even when a preceding gate fails. Consequently, changing a physician gate does not shift the MTM random sequence, and increasing `N` preserves the existing patient prefix for a fixed seed and other inputs.

Physician initiation requires referral and a successful initiation draw. MTM initiation requires inclusion in the review population, completed review, an offer, and a successful initiation draw. MTM `referred` is an alias of `offered` in the output. Non-referral reasons distinguish exclusion from the review population, incomplete review, and no offer after review.

The shared initiation draw is an explicit common-random-number choice. At equal uptake probabilities, patients who reach both initiation gates have the same simulated uptake outcome. With unequal uptake probabilities, a successful lower-probability outcome also satisfies the higher-probability gate. Other stages use distinct draws and are modeled independently.

This coupling can reduce Monte Carlo variability in the comparison. It is not evidence that an individual would behave identically in both real care pathways. Likewise, the paired counts of patients initiating through only one route are model outputs, not identified individual causal effects.

## Analytic expectations and thresholds

The expected counts are:

```text
Physician referrals R_A = N × r
Physician initiations E_A = N × r × qA

MTM review population = N × f
Completed MTM reviews = N × f × c
MTM offers R_B = N × f × c × o
MTM initiations E_B = N × f × c × o × qB

Additional initiations ΔE = E_B − E_A
Additional initiations per 1,000 = 1,000 × ΔE / N
Relative initiation yield = E_B / E_A, when E_A > 0
```

For `f × c × qB > 0`, the MTM offer thresholds are:

```text
Offer rate for parity = r × qA / (f × c × qB)
Offer rate for doubling = 2 × r × qA / (f × c × qB)
```

Thresholds above 1 are infeasible probabilities. Thresholds are returned as `null` when the denominator is zero; relative yield is `null` when physician initiations are zero. These are initiation thresholds, not financial break-even rates. At zero physician initiation, the algebraic zero threshold is not evidence of useful reach.

With the default inputs, expectations are 62.54 physician-pathway initiations and 111.30 MTM-pathway initiations, a difference of 48.76 per 1,000. The corresponding offer thresholds are approximately 28.10% for parity and 56.19% for doubling. With seed 2027, the simulated integer counts are 58 and 108, respectively. Expected values are not rounded before calculation.

The engine does not add the two arms together. A scenario retaining usual referrals and adding MTM outreach would require a separate model of the remaining, noninitiated population and overlap.

## Outputs and limitations

`simulateRecruitment(inputs)` returns `inputs`, `metadata`, `patients`, `summary`, and `expected`. `summarizeRecruitment(patients)` summarizes a nonempty valid cohort and checks unique IDs and recruitment gates. `expectedRecruitment(inputs)` returns analytic expectations and offer thresholds without simulation. `validateRecruitmentInputs(inputs)` returns an errors object, empty when valid.

The summary includes counts at each gate, non-referral counts, referred-but-not-initiated counts, initiation rates per 1,000, paired initiation outcomes, absolute differences, and relative yield. Expected counts may be fractional; realized patient counts are integers.

Interpretation constraints:

- Changing seeds measures simulation variability conditional on fixed inputs. It does not quantify uncertainty in the literature estimates, their transportability, or the model structure. Seed variation is not a clinical confidence interval.
- Increasing synthetic `N` makes simulated proportions more stable but does not add empirical evidence or increase a real study's sample size.
- No patient heterogeneity, correlated clinical characteristics, repeated recruitment, capacity limit, calendar schedule, or time-to-initiation is modeled. The 12-month label defines the scenario endpoint; the engine does not simulate when events occur within that period.
- The model does not measure actual engagement after initiation, sustained deprescribing, symptoms, BP control, cardiovascular events, or financial outcomes. It cannot establish clinical synergy or the causal effect of introducing MTM.
- A referral, review, or offer probability transferred between populations remains an explicit assumption even when its starting value comes from a publication.

## Export and standalone replay

`createRecruitmentExport(run)` verifies that a completed run exactly matches replay from its inputs and seed before returning a JSON-ready bundle. The bundle records the model and schema versions, complete inputs, endpoint definition, random-number method and coupling, evidence limitations, patient records, realized summary, and analytic expectations. No dependency installation is needed for the standalone replay script; use Node.js 20 or later from the repository root.

Replay an exported JSON file:

```sh
node scripts/replayRecruitment.js /path/to/recruitment-export.json
```

The command calls `verifyRecruitmentExport`, recomputes the simulation, and rejects mismatched inputs/results, altered assumptions, extra export fields, or a different model/schema version. Success prints concise counts and exits with code 0; verification or file errors exit with code 1; incorrect command usage exits with code 2. Verification establishes computational reproducibility, not clinical validity or authenticity of the underlying research inputs. Keep the matching model source when archiving an export.

To generate and verify a default bundle directly with Node:

```sh
node --input-type=module - <<'JS'
import { writeFile } from 'node:fs/promises'
import {
  simulateRecruitment,
  createRecruitmentExport,
  verifyRecruitmentExport
} from './src/lib/recruitmentSimulation.js'

const bundle = createRecruitmentExport(simulateRecruitment())
verifyRecruitmentExport(JSON.parse(JSON.stringify(bundle)))
await writeFile('/tmp/recruitment-export.json', JSON.stringify(bundle, null, 2))
JS

node scripts/replayRecruitment.js /tmp/recruitment-export.json
```

The engine's focused validation suite covers independent analytic examples, zero/one gates, maximum cohort size, conservation, seed repeatability, shared initiation draws, invalid inputs, mean counts across repeated seeds, and tampered exports:

```sh
node --test src/lib/recruitmentSimulation.test.js
```

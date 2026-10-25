export const PROVIDER_EVIDENCE = {
  wages: {
    title: '2024 National Pharmacist Workforce Study, Table 2.4.2 (published 2025)',
    url: 'https://www.aacp.org/sites/default/files/2025-06/2024-npws-final-report-5.27.25.pdf',
    supports: 'Reported full-time hourly wages: independent pharmacy $60.11; all community $67.94; ambulatory care $80.61. These are 2024 wages, not loaded costs or Kaiser data.'
  },
  cmr: {
    title: 'Nuffer et al., JMCP 2019;25:984–988, Tables 1–2',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6859940/',
    supports: 'Colorado community-pharmacy financial analysis used $50 per CMR, a $35–$75 regional range, and 30 minutes of review time. These were historical modeled payments, not measured collections or a 2026 contract.'
  },
  rpmFees: {
    title: 'MedPAC, March 2026 Report to Congress, Table 4-8, p. 131',
    url: 'https://www.medpac.gov/wp-content/uploads/2026/03/Mar26_Ch4_MedPAC_Report_To_Congress_SEC.pdf',
    supports: '2026 national nonfacility fees: 99453 $21.71; 99454 $52.11; 99457 $51.77; alternative 99470 $26.05. Geography, qualifying services and collections affect receipts.'
  },
  cms: {
    title: 'CMS, Telehealth & Remote Monitoring, December 2025, pp. 12–13',
    url: 'https://www.cms.gov/files/document/mln901705-telehealth-services.pdf',
    supports: 'Eligible billing practitioners, supervised auxiliary/clinical staff, data and service requirements, and no duplicate billing. Eligible clinical staff can contribute management time; technical support is separate. Does not establish an independent pharmacy payment contract.'
  },
  cdta: {
    title: 'Washington WAC 246-945-350: Collaborative drug therapy agreements',
    url: 'https://app.leg.wa.gov/WAC/default.aspx?cite=246-945-350',
    supports: 'Example state CDTA framework for pharmacist prescriptive authority and communication. Does not establish Medicare billing eligibility, a fee, or a contract payment percentage; jurisdiction-specific requirements must be satisfied.'
  },
  rpmContract: {
    title: 'Abubakar and Sinclair, Pharmacy 2020;8:166 (Rx Clinic Pharmacy)',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7557406/',
    supports: 'Describes pharmacists working as contracted personnel with supervising providers in a community-pharmacy RPM pilot. Does not supply the modeled 80% retained share or validate any contract price.'
  },
  rpmTime: {
    title: 'Margolis et al., JAMA 2013;310:46–56 (HealthPartners HyperLink)',
    url: 'https://jamanetwork.com/journals/jama/fullarticle/1707720',
    supports: '228 intervention patients used pharmacist services; mean 11.4 visits at 34.2 minutes per encounter over a 12-month intervention. About 390 minutes per patient is a derived context estimate, not a universal monthly requirement or a calibration for this six-month program.'
  },
  ohio: {
    title: 'Carroll et al., J Gen Intern Med 2026;41:3427–3433',
    url: 'https://link.springer.com/article/10.1007/s11606-026-10384-9',
    supports: 'Ohio State clinic RPM study, 2022–2024: $96.30 and $124.17 average collections per enrolled patient across two phases. Observation totals, not monthly rates; cost and profitability not established. Context only, not an engine input.'
  }
}

export const evidence = (key, evidenceType, extra = {}) => ({
  source: PROVIDER_EVIDENCE[key].title, citationUrl: PROVIDER_EVIDENCE[key].url, evidenceType, ...extra
})

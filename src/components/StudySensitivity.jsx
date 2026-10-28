import { useEffect, useId, useMemo, useState } from 'react'
import { SENSITIVITY_METRICS, getSensitivityParameters, getDefaultSensitivityConfig, validateSensitivityConfig, analyzeIntegrationSensitivity, createSensitivityExport, sensitivityExportCsv } from '../lib/integrationSensitivity'
import { armLabels } from './StudyStaffing'
import '../styles/studySensitivity.css'

const finite = value => typeof value === 'number' && Number.isFinite(value)
const money = value => finite(value) ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : 'Not estimable'
const preciseMoney = value => finite(value) ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'Not estimable'
const number = value => finite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: 3 }) : 'Not estimable'
const isPercent = unit => ['probability', 'proportion', 'share'].includes(unit)
const inputNumber = (value, unit) => finite(value) ? Number((value * (isPercent(unit) ? 100 : 1)).toFixed(7)) : ''
const valueLabel = (value, unit) => !finite(value) ? 'Not estimable' : isPercent(unit) ? `${number(value * 100)}%` : String(unit || '').startsWith('USD') ? preciseMoney(value) : number(value)
const exactInputLabel = (value, unit) => !finite(value) ? 'Not estimable' : isPercent(unit) ? `${(value * 100).toLocaleString('en-US', { maximumFractionDigits: 8 })}%` : value.toLocaleString('en-US', { maximumFractionDigits: 8 })
const compactMoney = value => !finite(value) ? '—' : Math.abs(value) >= 1000 ? `${value < 0 ? '−' : ''}$${number(Math.abs(value) / 1000)}k` : money(value)
const statusLabel = status => String(status || '').replaceAll('-', ' ').replaceAll('_', ' ')
const errorMessages = errors => [...new Set(Object.values(errors || {}).flatMap(value => typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value) : []).filter(value => typeof value === 'string'))]
const metricValue = (point, metric) => point?.valid !== false && finite(point?.[metric]) ? point[metric] : null
const methodUrl = 'https://www.ispor.org/publications/journals/value-in-health/abstract/Volume-17--Issue-1/budget-impact-analysis-principles-of-good-practice-report-of-the-ispor-2012-budget-impact-analysis-good-practice-ii-task-force'

function download(text, filename, type) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function MarginCards({ base, labels }) {
  return <div className="sensitivity-base" aria-label="Expected margins in the applied scenario">{[
    ['physicianMargin', labels[0]], ['pharmacistMargin', labels[1]], ['marginDifference', 'Pharmacist minus physician margin'],
  ].map(([key, label]) => <div key={key}><span>{label}</span><strong className={base[key] < 0 ? 'sensitivity-negative-text' : ''}>{money(base[key])}</strong><small>{key === 'marginDifference' ? 'Positive: pharmacist program has the higher margin.' : 'Expected annual margin under the selected cost allocation.'}</small></div>)}</div>
}

function OneWayChart({ rows, base, metric, driver, setDriver }) {
  const [all, setAll] = useState(false)
  const visible = all ? rows : rows.slice(0, 10)
  const extremes = [base, ...visible.flatMap(row => [row.min, row.max])].filter(finite)
  const low = Math.min(...extremes); const high = Math.max(...extremes)
  const padding = Math.max((high - low) * .04, 1)
  const left = low - padding; const right = high + padding
  const position = value => (value - left) / (right - left) * 100
  return <div className="sensitivity-tornado">
    <div className="sensitivity-tornado-heading"><span>Assumption and tested input range</span><span>Result range · dashed line = applied scenario</span><span>Tested result range</span></div>
    {visible.map(row => <button key={row.key} className={`sensitivity-tornado-row ${driver === row.key ? 'is-selected' : ''}`} onClick={() => setDriver(row.key)} aria-pressed={driver === row.key} aria-label={`Inspect ${row.label}; tested ${valueLabel(row.low, row.unit)} to ${valueLabel(row.high, row.unit)}; result ${preciseMoney(row.min)} to ${preciseMoney(row.max)}`}>
      <span className="sensitivity-driver-label"><strong>{row.label}</strong><small>{valueLabel(row.low, row.unit)} → {valueLabel(row.high, row.unit)}{isPercent(row.unit) ? '' : ` ${row.unit}`}</small></span>
      <span className="sensitivity-tornado-track" aria-hidden="true"><span className="sensitivity-tornado-baseline" style={{ left: `${position(base)}%` }} />{finite(row.min) && finite(row.max) && <span className="sensitivity-tornado-bar" style={{ left: `${position(row.min)}%`, width: `${Math.max(.35, position(row.max) - position(row.min))}%` }} />}</span>
      <span className="sensitivity-driver-result">{money(row.min)} <span>→</span> {money(row.max)}<small>Spread: {money(row.span)}</small></span>
    </button>)}
    <div className="sensitivity-tornado-axis" aria-hidden="true"><span /> <div><span>{compactMoney(left)}</span><span>{compactMoney((left + right) / 2)}</span><span>{compactMoney(right)}</span></div><span /></div>
    {rows.length > 10 && <button className="sensitivity-button sensitivity-button-quiet" onClick={() => setAll(value => !value)}>{all ? 'Show 10 largest drivers' : `Show all ${rows.length} assumptions`}</button>}
    <p className="sensitivity-help">Ranked by the result spread across the chosen range. A wider range can change the ranking. These bars show sensitivity, not the probability or clinical importance of an assumption.</p>
  </div>
}

function DriverTrace({ row, metric, base }) {
  const points = row.points.filter(point => finite(metricValue(point, metric))).sort((a, b) => a.value - b.value)
  if (!points.length) return <p className="sensitivity-error">No valid results within this range.</p>
  const width = 720; const height = 260; const frame = { left: 78, right: 24, top: 24, bottom: 42 }
  const xMin = row.low; const xMax = row.high > row.low ? row.high : row.low + 1
  const yMin = Math.min(0, base, ...points.map(point => point[metric])); const yMax = Math.max(0, base, ...points.map(point => point[metric]))
  const spread = Math.max(yMax - yMin, 1); const yLow = yMin - spread * .08; const yHigh = yMax + spread * .08
  const x = value => frame.left + (value - xMin) / (xMax - xMin) * (width - frame.left - frame.right)
  const y = value => frame.top + (yHigh - value) / (yHigh - yLow) * (height - frame.top - frame.bottom)
  const endpoint = value => points.find(point => Math.abs(point.value - value) < 1e-8)
  const current = points.find(point => Math.abs(point.value - row.current) < 1e-8)
  return <div className="sensitivity-trace">
    <div className="sensitivity-subheading"><div><span className="sensitivity-eyebrow">INSPECT ONE ASSUMPTION</span><h4>{row.label}</h4></div><span>Applied: {valueLabel(row.current, row.unit)}{isPercent(row.unit) ? '' : ` ${row.unit}`}</span></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${row.label} sensitivity trace; result ranges from ${preciseMoney(row.min)} to ${preciseMoney(row.max)}. Details follow in a table.`}>
      {[yLow, (yLow + yHigh) / 2, yHigh].map((value, index) => <g key={index}><line x1={frame.left} y1={y(value)} x2={width - frame.right} y2={y(value)} className="sensitivity-chart-grid" /><text x={frame.left - 10} y={y(value) + 4} textAnchor="end">{compactMoney(value)}</text></g>)}
      <line x1={frame.left} y1={y(0)} x2={width - frame.right} y2={y(0)} className="sensitivity-chart-zero" />
      <line x1={frame.left} y1={y(base)} x2={width - frame.right} y2={y(base)} className="sensitivity-chart-base" />
      <polyline points={points.map(point => `${x(point.value)},${y(point[metric])}`).join(' ')} fill="none" className="sensitivity-chart-line" />
      {current && <circle cx={x(current.value)} cy={y(current[metric])} r="5" className="sensitivity-chart-point" />}
      {[row.low, (row.low + row.high) / 2, row.high].map((value, index) => <text key={index} x={x(value)} y={height - 14} textAnchor="middle">{valueLabel(value, row.unit)}</text>)}
    </svg>
    <p className="sensitivity-help">Solid gray line: zero. Dashed blue line: applied-scenario result. Billing thresholds can produce abrupt jumps; the lowest input does not necessarily produce the lowest margin. Other inputs are held fixed.</p>
    <div className="sensitivity-table-wrap"><table><caption>Selected assumption: exact endpoint and tested extreme results</caption><thead><tr><th scope="col">Point</th><th scope="col">Input</th><th scope="col">Selected result</th></tr></thead><tbody>{[
      ['Lower input', endpoint(row.low)], ['Upper input', endpoint(row.high)], ['Lowest tested result', row.minimumPoint], ['Highest tested result', row.maximumPoint],
    ].map(([label, point]) => <tr key={label}><th scope="row">{label}</th><td>{exactInputLabel(point?.value, row.unit)}{String(row.unit || '').startsWith('USD') && ' USD'}</td><td>{preciseMoney(metricValue(point, metric))}</td></tr>)}</tbody></table></div>
    <p className="sensitivity-help">Extra input decimals distinguish points just below and above a billing threshold. Full precision is retained in exports.</p>
    <p className="sensitivity-source-note">{row.note}</p>
    {row.sourceUrls?.length > 0 && <p className="sensitivity-citations">{row.sourceUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer">Parameter reference {index + 1} ↗</a>)}</p>}
  </div>
}

function TwoWayGrid({ analysis, metric, selected, setSelected, onApplyInputs, inputs, report }) {
  const { x, y, cells } = analysis.twoWay
  const values = cells.map(cell => metricValue(cell, metric)).filter(finite)
  const scale = Math.max(1, ...values.map(Math.abs))
  const inspected = selected ? cells.find(cell => cell.x === selected.x && cell.y === selected.y) : null
  const zeroMeaning = metric === 'marginDifference' ? 'Zero means equal program margins; either or both programs may still lose money.' : 'Zero means the selected program covers its allocated costs.'
  const flat = values.length > 0 && Math.max(...values) - Math.min(...values) < .01
  const cellColor = value => !finite(value) ? '#edf0f4' : Math.abs(value) < .005 ? '#eff5f8' : value < 0 ? `hsl(12 66% ${94 - Math.min(1, Math.abs(value) / scale) * 22}%)` : `hsl(169 46% ${93 - Math.min(1, Math.abs(value) / scale) * 23}%)`
  return <div className="sensitivity-two-way">
    <p className="sensitivity-help">Change two assumptions together. Select a cell to inspect both programs. {zeroMeaning} All other assumptions stay at their applied values.</p>
    <div className="sensitivity-heatmap-legend"><span><i className="is-loss" /> Negative result</span><span><i className="is-gain" /> Positive result</span><span><i className="is-invalid" /> Invalid combination</span></div>
    {flat && <p className="sensitivity-callout">The selected result does not change across this grid. Shared costs or receipts can move both programs equally, leaving their margin difference unchanged. Inspect each program’s margin as well.</p>}
    <div className="sensitivity-heatmap-wrap"><table className="sensitivity-heatmap"><caption>Rows: {y.label} ({isPercent(y.unit) ? '%' : y.unit}) · columns: {x.label} ({isPercent(x.unit) ? '%' : x.unit}) · results in annual USD</caption><thead><tr><th scope="col">{y.label}<span>↓ / {x.label} →</span></th>{x.values.map((value, index) => <th scope="col" key={index}>{valueLabel(value, x.unit)}</th>)}</tr></thead><tbody>{[...y.values].reverse().map((yValue, rowIndex) => <tr key={rowIndex}><th scope="row">{valueLabel(yValue, y.unit)}</th>{x.values.map((xValue, index) => {
      const cell = cells.find(item => item.x === xValue && item.y === yValue)
      const value = metricValue(cell, metric)
      const active = selected?.x === xValue && selected?.y === yValue
      const invalid = !cell || cell.valid === false || !finite(value)
      return <td key={index}><button className={`sensitivity-heatmap-cell ${active ? 'is-selected' : ''}`} style={{ backgroundColor: cellColor(value) }} onClick={() => setSelected({ x: xValue, y: yValue })} aria-pressed={active} aria-label={`${x.label}: ${valueLabel(xValue, x.unit)}; ${y.label}: ${valueLabel(yValue, y.unit)}; ${invalid ? 'invalid combination' : `result ${preciseMoney(value)}`}`}><span>{invalid ? '—' : compactMoney(value)}</span><small>{invalid ? 'Invalid' : value < -.005 ? 'Negative' : value > .005 ? 'Positive' : 'Zero'}</small></button></td>
    })}</tr>)}</tbody></table></div>
    <div className="sensitivity-cell-detail" aria-live="polite">{inspected ? <><h4>Inspected combination</h4><p>{x.label}: <b>{valueLabel(inspected.x, x.unit)}</b> · {y.label}: <b>{valueLabel(inspected.y, y.unit)}</b></p>{inspected.valid === false ? <p className="sensitivity-error">This combination violates a model constraint. {errorMessages(inspected.errors).join(' ')}</p> : <><dl><div><dt>{armLabels(inputs)[0]}</dt><dd>{preciseMoney(inspected.physicianMargin)}</dd></div><div><dt>{armLabels(inputs)[1]}</dt><dd>{preciseMoney(inspected.pharmacistMargin)}</dd></div><div><dt>Pharmacist minus physician margin</dt><dd>{preciseMoney(inspected.marginDifference)}</dd></div></dl>{onApplyInputs && <button className="sensitivity-button" onClick={() => {
      try { onApplyInputs({ ...inputs, [x.key]: inspected.x, [y.key]: inspected.y }); report('Applied the inspected two-way assumptions to both pages. The simulation restarts and sensitivity ranges reset for the new scenario.') } catch (error) { report(`Could not apply the combination: ${error.message}`) }
    }}>Apply inspected assumptions to both pages</button>}</>}<p className="sensitivity-help">Inspecting a cell does not change the applied scenario. Applying it resets stress-test ranges; a seed-only change preserves them.</p></> : <p>Select a grid cell to inspect exact results. Your applied scenario stays unchanged until you choose to apply a combination.</p>}</div>
  </div>
}

function Thresholds({ analysis, inputs }) {
  const labels = armLabels(inputs)
  const windows = analysis.timeWindows || []
  return <section className="sensitivity-panel" aria-label="Expected break-even thresholds"><div className="sensitivity-subheading"><div><span className="sensitivity-eyebrow">WHERE THE RESULT CHANGES</span><h3>Break-even thresholds</h3></div></div>
    <p className="sensitivity-help">Each threshold changes one input while holding other assumptions fixed. Required collection and qualification rates are minimums; affordable vendor fees are maximums. These are mathematical targets, not observed collection rates, vendor quotes or clinically sufficient workloads.</p>
    <div className="sensitivity-threshold-columns">{['baseline', 'integrated'].map((arm, index) => <div key={arm}><h4>{labels[index]}</h4><dl>{analysis.thresholds.filter(row => row.arm === arm).map(row => <div key={row.id}><dt>{row.label}</dt><dd>{valueLabel(row.value, row.unit)}<span>{statusLabel(row.status)}</span></dd><p>{row.note}</p></div>)}</dl></div>)}</div>
    <div className="sensitivity-time-windows"><h4>Pharmacist recurring-time windows</h4><p className="sensitivity-help">Billing tiers may create more than one viable interval. These intervals vary only pharmacist minutes; the technician allocation, other work and cost assumptions stay fixed. They do not show how little care can safely be delivered.</p>{['pharmacistMargin', 'marginDifference'].map(metric => {
      const matching = windows.filter(window => window.metric === metric)
      return <div key={metric}><strong>{metric === 'pharmacistMargin' ? 'Pharmacist program covers its costs' : 'Pharmacist margin is at least the physician margin'}</strong>{matching.length ? <ul>{matching.map((window, index) => <li key={index}><span>{window.lowerInclusive === false ? '(' : '['}{number(window.min)}, {number(window.max)}{window.upperInclusive === false ? ')' : ']'} minutes per active month</span>{window.note && <small>{window.note}</small>}</li>)}</ul> : <p>No qualifying interval reported within the tested pharmacist-time domain.</p>}</div>
    })}<p className="sensitivity-help">Square brackets include the endpoint; parentheses exclude it. An interval’s endpoint can be a billing discontinuity rather than an exact zero-margin point. Displayed bounds are rounded; exports retain full precision.</p></div>
  </section>
}

export default function StudySensitivity({ inputs, config: suppliedConfig, onConfigChange, onApplyInputs, onNotice }) {
  const id = useId()
  const fallbackConfig = useMemo(() => getDefaultSensitivityConfig(inputs), [inputs])
  const config = suppliedConfig || fallbackConfig
  const parameters = useMemo(() => getSensitivityParameters(inputs), [inputs])
  const [draftRanges, setDraftRanges] = useState(config.ranges)
  const [rangeErrors, setRangeErrors] = useState({})
  const [driver, setDriver] = useState('monitorPharmacistMinutes')
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState('')
  const rangesKey = JSON.stringify(config.ranges)
  useEffect(() => { setDraftRanges(config.ranges); setRangeErrors({}) }, [rangesKey, inputs])
  useEffect(() => { setSelected(null) }, [rangesKey, inputs, config.xKey, config.yKey])
  const computation = useMemo(() => {
    try {
      const errors = validateSensitivityConfig(inputs, config)
      if (Object.keys(errors).length) return { errors, analysis: null }
      return { errors: {}, analysis: analyzeIntegrationSensitivity(inputs, config) }
    } catch (error) { return { errors: { analysis: error.message }, analysis: null } }
  }, [inputs, config])
  const { analysis, errors } = computation
  const report = text => { setNotice(text); onNotice?.(text) }
  const updateConfig = next => { onConfigChange?.(next); setNotice('') }
  const metric = SENSITIVITY_METRICS.find(item => item.id === config.metric) || SENSITIVITY_METRICS[0]
  const chosen = analysis?.oneWay.find(row => row.key === driver) || analysis?.oneWay[0]
  const dirty = JSON.stringify(draftRanges) !== rangesKey
  const updateRange = (parameter, bound, raw) => {
    setDraftRanges(previous => ({ ...previous, [parameter.key]: { ...previous[parameter.key], [bound]: raw === '' ? '' : Number(raw) / (isPercent(parameter.unit) ? 100 : 1) } }))
    setRangeErrors({})
  }
  const applyRanges = event => {
    event.preventDefault()
    const next = { ...config, ranges: draftRanges }
    const nextErrors = validateSensitivityConfig(inputs, next)
    setRangeErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    updateConfig(next); report('Applied sensitivity ranges on both pages. The underlying cohort and program inputs are unchanged.')
  }
  const changeAxis = (axis, key) => {
    const other = axis === 'xKey' ? 'yKey' : 'xKey'
    updateConfig({ ...config, [axis]: key, ...(config[other] === key ? { [other]: config[axis] } : {}) })
  }
  const save = type => {
    try {
      const bundle = createSensitivityExport(inputs, config)
      download(type === 'json' ? JSON.stringify(bundle, null, 2) : sensitivityExportCsv(bundle), `rpm-sensitivity-seed-${inputs.seed}.${type}`, type === 'json' ? 'application/json' : 'text/csv;charset=utf-8')
      report(`Saved sensitivity ${type.toUpperCase()}: applied model inputs, stress-test ranges, results and thresholds. ${dirty ? 'Unapplied range edits are excluded.' : 'The analysis uses expected values, not a seeded realization.'}`)
    } catch (error) { report(`Sensitivity export failed: ${error.message}`) }
  }
  return <section className="study-sensitivity" aria-labelledby={`${id}-title`}>
    <header className="sensitivity-header"><div><span className="sensitivity-eyebrow">ASSUMPTIONS → FINANCIAL RESULTS</span><h2 id={`${id}-title`}>Sensitivity &amp; break-even</h2><p>See which assumptions move the result, which program has the higher margin, and when each program covers its costs.</p></div><span className="sensitivity-badge">Analytic expected values</span></header>
    <p className="sensitivity-method-note">Uses the applied scenario on both pages. This deterministic analysis varies assumptions; it does not use the playback’s random patient realization or produce confidence intervals. Default ranges are investigator-selected stress tests, not literature-derived uncertainty estimates. Changing model inputs resets these ranges; changing only the seed does not.</p>
    <div className="sensitivity-controls"><label htmlFor={`${id}-metric`}>Financial result to examine<select id={`${id}-metric`} value={config.metric} onChange={event => updateConfig({ ...config, metric: event.target.value })}>{SENSITIVITY_METRICS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><p>{config.metric === 'marginDifference' ? 'Positive means the pharmacist program has a higher margin. This can mean a smaller loss; inspect both absolute margins.' : 'Positive means this program covers its allocated costs. Existing-resource oversight assumptions are retained.'}</p></div>
    {Object.keys(errors).length > 0 && <div className="sensitivity-error" role="alert"><strong>Sensitivity analysis needs valid settings.</strong><ul>{errorMessages(errors).map(message => <li key={message}>{message}</li>)}</ul></div>}
    <details className="sensitivity-ranges"><summary>Review and edit stress-test ranges{dirty ? ' · unapplied edits' : ''}</summary><p>Change lower and upper bounds to reflect justified local estimates. The input value itself is not changed. A qualifying clinical subset cannot exceed paid work; invalid two-way combinations remain visibly unavailable.</p><form onSubmit={applyRanges}><div className="sensitivity-table-wrap"><table><caption>One-way and two-way input ranges · investigator assumptions</caption><thead><tr><th scope="col">Assumption</th><th scope="col">Applied</th><th scope="col">Lower bound</th><th scope="col">Upper bound</th></tr></thead><tbody>{parameters.map(parameter => <tr key={parameter.key}><th scope="row">{parameter.label}<small>{isPercent(parameter.unit) ? '%' : parameter.unit}</small></th><td>{valueLabel(parameter.current, parameter.unit)}</td>{['low', 'high'].map(bound => <td key={bound}><label className="sr-only" htmlFor={`${id}-${parameter.key}-${bound}`}>{parameter.label} {bound === 'low' ? 'lower' : 'upper'} bound</label><input id={`${id}-${parameter.key}-${bound}`} type="number" step="any" min={inputNumber(parameter.min, parameter.unit)} max={inputNumber(parameter.max, parameter.unit)} value={inputNumber(draftRanges[parameter.key]?.[bound], parameter.unit)} onChange={event => updateRange(parameter, bound, event.target.value)} aria-invalid={!!rangeErrors[`ranges.${parameter.key}`]} /></td>)}</tr>)}</tbody></table></div>{Object.keys(rangeErrors).length > 0 && <div className="sensitivity-error" role="alert"><ul>{Object.entries(rangeErrors).map(([key, message]) => <li key={key}>{parameters.find(parameter => key === `ranges.${parameter.key}`)?.label || key}: {String(message)}</li>)}</ul></div>}<div className="sensitivity-actions"><button className="sensitivity-button" disabled={!dirty} type="submit">Apply sensitivity ranges</button><button className="sensitivity-button sensitivity-button-quiet" type="button" onClick={() => { setDraftRanges(fallbackConfig.ranges); setRangeErrors({}); updateConfig({ ...config, ranges: fallbackConfig.ranges }); report('Restored illustrative stress-test ranges for the applied scenario.') }}>Reset ranges</button><span>Range edits apply only after confirmation here.</span></div></form></details>
    {analysis && <><MarginCards base={analysis.base} labels={armLabels(inputs)} /><section className="sensitivity-panel" aria-label="One-way sensitivity analysis"><div className="sensitivity-subheading"><div><span className="sensitivity-eyebrow">ONE-WAY SENSITIVITY</span><h3>Which assumptions drive {metric.label.toLowerCase()}?</h3></div></div><p className="sensitivity-help">One input changes at a time. Results include interior billing-tier breakpoints, so the range may be wider than the two endpoint results. Select a driver to examine its response.</p><OneWayChart rows={analysis.oneWay} base={analysis.base[config.metric]} metric={config.metric} driver={chosen?.key} setDriver={setDriver} />{chosen && <DriverTrace row={chosen} metric={config.metric} base={analysis.base[config.metric]} />}</section>
      <section className="sensitivity-panel" aria-label="Two-way sensitivity analysis"><div className="sensitivity-subheading"><div><span className="sensitivity-eyebrow">TWO-WAY SENSITIVITY</span><h3>Where does the financial result change?</h3></div></div><div className="sensitivity-axis-controls"><label htmlFor={`${id}-x`}>Horizontal assumption<select id={`${id}-x`} value={config.xKey} onChange={event => changeAxis('xKey', event.target.value)}>{parameters.map(parameter => <option key={parameter.key} value={parameter.key}>{parameter.label}</option>)}</select></label><label htmlFor={`${id}-y`}>Vertical assumption<select id={`${id}-y`} value={config.yKey} onChange={event => changeAxis('yKey', event.target.value)}>{parameters.map(parameter => <option key={parameter.key} value={parameter.key}>{parameter.label}</option>)}</select></label></div><TwoWayGrid analysis={analysis} metric={config.metric} selected={selected} setSelected={setSelected} onApplyInputs={onApplyInputs} inputs={inputs} report={report} /></section>
      <Thresholds analysis={analysis} inputs={inputs} />
      <details className="sensitivity-notes"><summary>Interpretation and method notes</summary><ul>{analysis.notes.map(note => <li key={note}>{note}</li>)}</ul><p><a href={methodUrl} target="_blank" rel="noreferrer">ISPOR guidance on scenario analysis, model validation and transparent inputs ↗</a></p></details></>}
    <footer className="sensitivity-export"><div><strong>Reproduce this sensitivity analysis</strong><p>Separate from the patient-level scenario export. Saves the applied assumptions, analysis settings, complete grids, thresholds and source context.</p></div><div><button className="sensitivity-button" disabled={!analysis} onClick={() => save('json')}>Save sensitivity JSON</button><button className="sensitivity-button sensitivity-button-quiet" disabled={!analysis} onClick={() => save('csv')}>Export sensitivity CSV</button></div></footer>
    {notice && <p className="sensitivity-notice" role="status">{notice}</p>}
  </section>
}

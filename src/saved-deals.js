import { createApi } from './api.js';
import { buildPayloads } from './api-payload.js';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const number = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
const formatMoney = value => number(value) === null ? 'Unknown' : money.format(Number(value));
const formatRatio = value => number(value) === null ? 'Unknown' : `${Number(value).toFixed(2)}x`;
const formatPercent = value => number(value) === null ? 'Unknown' : `${(Number(value) * 100).toFixed(2)}%`;
const statusLabels = { VERIFIED_BY_DOCUMENT: 'Verified by document', SELLER_OR_BROKER_PROVIDED: 'Seller or broker provided', PUBLIC_RECORD: 'Public record', ESTIMATED: 'Estimated', UNKNOWN: 'Unknown' };
const structures = { CONVENTIONAL: 'Conventional loan', ASSUMPTION: 'Proposed loan assumption', SUBJECT_TO: 'Subject-to existing loan', SELLER_FINANCING: 'Seller financing', HYBRID: 'Existing loan plus seller financing', CASH: 'Cash' };

export function initSavedDeals({ form, readValues, recalculate }) {
  const save = document.querySelector('#save-analysis');
  const refresh = document.querySelector('#refresh-deals');
  const select = document.querySelector('#saved-deal-select');
  const load = document.querySelector('#load-saved-deal');
  const status = document.querySelector('#api-status');
  const summary = document.querySelector('#saved-summary');
  let busy = false;
  let storage;
  try { storage = window.sessionStorage; } catch { /* Private browsing may block storage. */ }
  const api = createApi({ storage, onSlow: () => {
    status.textContent = 'The analysis service may be waking up. This can take about a minute; your browser calculation is ready to use.';
  } });

  function setBusy(value) {
    busy = value;
    save.disabled = refresh.disabled = select.disabled = load.disabled = value;
    document.querySelector('#saved-deals').setAttribute('aria-busy', String(value));
  }

  function render(data) {
    summary.replaceChildren();
    const heading = document.createElement('h3');
    heading.textContent = `Saved deal #${data.deal_id ?? data.id}`;
    const grade = document.createElement('p');
    const code = String(data.overall_grade || '').toLowerCase();
    grade.className = `deal-grade grade-${['a', 'b', 'c', 'd', 'f'].includes(code) ? code : 'c'}`;
    grade.textContent = `Screening grade: ${data.overall_grade || 'Unknown'}`;
    const note = document.createElement('p');
    note.textContent = 'Saved screening uses standard DSCR and cash-on-cash thresholds. The browser calculator also considers your targets and due diligence. Neither grade verifies the underlying figures.';
    const rows = [
      ['Financing structure', structures[data.financing_structure] || 'Unknown'],
      ['Annual NOI', formatMoney(data.annual_noi)], ['Monthly cash flow', formatMoney(data.monthly_cash_flow)],
      ['DSCR', formatRatio(data.dscr)], ['Cap rate on purchase price', formatPercent(data.cap_rate)],
      ['Cap on cost (stored analysis)', formatPercent(data.stabilized_cap_on_cost)],
      ['Cash required including reserves and renovation', formatMoney(data.total_cash_to_close)],
      ['Cash-on-cash return', formatPercent(data.cash_on_cash_return)],
      ...['income', 'expenses', 'loan'].map(key => [`${key[0].toUpperCase() + key.slice(1)} evidence`, statusLabels[data.verification?.[key]] || 'Unknown']),
    ];
    const details = document.createElement('dl');
    rows.forEach(([label, value]) => {
      const row = document.createElement('div'), term = document.createElement('dt'), definition = document.createElement('dd');
      term.textContent = label; definition.textContent = value; row.append(term, definition); details.append(row);
    });
    summary.append(heading, grade, note, details);
    const costBasis = document.createElement('p');
    costBasis.textContent = 'New analyses include closing costs in cap on cost. Older saved analyses retain their original calculation and may exclude them.';
    summary.append(costBasis);
    const warnings = [...(Array.isArray(data.warnings) ? data.warnings : [])];
    if (['SUBJECT_TO', 'HYBRID'].includes(data.financing_structure) && !warnings.some(text => /due-on-sale/i.test(text))) {
      warnings.push('Subject-to transactions may trigger a due-on-sale clause. Verify loan terms and legal risks before closing. This is not an approved assumption.');
    }
    warnings.forEach(text => { const warning = document.createElement('p'); warning.className = 'report-warning'; warning.textContent = text; summary.append(warning); });
    const print = document.createElement('button');
    print.type = 'button'; print.className = 'print-saved'; print.textContent = 'Print / Save this summary as PDF';
    print.addEventListener('click', () => {
      document.body.classList.add('print-saved-summary');
      window.print();
    });
    summary.append(print); summary.hidden = false;
  }

  async function action(message, work) {
    if (busy) return;
    setBusy(true); status.textContent = message;
    try { await work(); } catch (error) { status.textContent = error.message || 'The request could not be completed. Your browser calculation is still available.'; }
    finally { setBusy(false); }
  }

  save.addEventListener('click', () => action('Checking your inputs…', async () => {
    const raw = readValues();
    recalculate();
    const payloads = buildPayloads(raw);
    status.textContent = 'Saving the property and analyzing the deal…';
    const result = await api.save(payloads);
    if (JSON.stringify(readValues()) === JSON.stringify(raw)) {
      render(result);
      status.textContent = `Saved deal #${result.id}. The verification labels will stay with this analysis.`;
    } else {
      summary.hidden = true;
      status.textContent = `Saved deal #${result.id} using the inputs at the time you clicked Save. Your current edits have not been saved. Refresh saved deals to view that version.`;
    }
  }));

  refresh.addEventListener('click', () => action('Loading saved deals…', async () => {
    const deals = await api.list();
    if (!Array.isArray(deals)) throw new Error('The saved deal list is unavailable. Try again shortly.');
    select.replaceChildren(new Option('Select a saved deal', ''));
    [...deals].reverse().forEach(deal => {
      if (!Number.isInteger(deal.id)) return;
      const date = new Date(deal.created_at).toLocaleDateString();
      select.append(new Option(`#${deal.id} · ${date} · ${structures[deal.financing_structure] || 'Deal'} · Grade ${deal.overall_grade}`, String(deal.id)));
    });
    status.textContent = deals.length ? `${deals.length} saved deals available.` : 'No saved deals yet.';
  }));

  load.addEventListener('click', () => action('Loading the saved summary…', async () => {
    if (!select.value) throw new Error('Select a saved deal first.');
    const selected = select.value;
    summary.hidden = true;
    const result = await api.summary(selected);
    render(result); status.textContent = `Showing saved deal #${selected}. This summary is separate from the current calculator inputs.`;
  }));

  const invalidate = () => {
    if (!summary.hidden) { summary.hidden = true; if (!busy) status.textContent = 'Inputs changed. Calculate locally or save the updated deal.'; }
  };
  form.addEventListener('input', invalidate);
  window.addEventListener('afterprint', () => document.body.classList.remove('print-saved-summary'));
  document.querySelector('#print-button').addEventListener('click', () => document.body.classList.remove('print-saved-summary'), { capture: true });
  form.addEventListener('reset', invalidate);
  document.querySelector('#sample-button').addEventListener('click', invalidate);
}

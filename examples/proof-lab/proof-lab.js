import { makeProofViewModel } from './proof-model.mjs';

const command = 'python3 scripts/prove.py';
const checkList = document.querySelector('#check-list');
const claimList = document.querySelector('#claim-list');
const claimDetail = document.querySelector('#claim-detail');
const stateBadge = document.querySelector('#proof-state');
const ledgerTitle = document.querySelector('#ledger-title');
let selectedClaimId = null;
let currentModel = null;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatGeneratedAt(value) {
  if (!value) return 'Not generated';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return 'Invalid timestamp';
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

function renderChecks(model) {
  checkList.replaceChildren();
  model.checks.forEach((check, index) => {
    const row = element('li', `check-row ${check.status}`);
    const number = element(
      'span',
      'check-index',
      check.status === 'pass' ? '✓' : String(index + 1).padStart(2, '0'),
    );
    number.setAttribute('aria-hidden', 'true');
    const label = element('span', '', check.label);
    const status = element('strong', '', check.status.toUpperCase());
    row.append(number, label, status);
    checkList.append(row);
  });
}

function renderClaimDetail(claim) {
  selectedClaimId = claim.id;
  for (const button of claimList.querySelectorAll('button')) {
    button.setAttribute(
      'aria-selected',
      String(button.dataset.claimId === selectedClaimId),
    );
  }
  const kicker = element('p', 'detail-kicker', 'SELECTED CLAIM');
  const title = element('h3', '', claim.label);
  const statement = element('p', '', claim.statement);
  const evidence = element('ul', 'evidence-list');
  for (const item of claim.evidence) {
    const listItem = element('li');
    const link = element('a');
    link.href = item.url;
    const label = element('span', '', item.path);
    const arrow = element('span', '', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    link.append(label, arrow);
    listItem.append(link);
    evidence.append(listItem);
  }
  claimDetail.replaceChildren(kicker, title, statement, evidence);
}

function renderClaims(model) {
  claimList.replaceChildren();
  model.claims.forEach((claim, index) => {
    const item = element('li');
    const button = element('button', 'claim-button');
    button.type = 'button';
    button.dataset.claimId = claim.id;
    button.setAttribute('aria-selected', 'false');
    button.append(
      element('span', 'claim-number', String(index + 1).padStart(2, '0')),
      element('span', '', claim.label),
      element('span', 'claim-arrow', '↗'),
    );
    button.addEventListener('click', () => renderClaimDetail(claim));
    item.append(button);
    claimList.append(item);
  });
  const selected = model.claims.find((claim) => claim.id === selectedClaimId)
    ?? model.claims[0];
  renderClaimDetail(selected);
}

function renderLimitations(model) {
  const list = document.querySelector('#limitations');
  list.replaceChildren(
    ...model.limitations.map((limitation) => element('li', '', limitation)),
  );
}

function render(model) {
  currentModel = model;
  document.documentElement.dataset.proofState = model.state;
  document.querySelector('#release-badge').textContent = `v${model.release}`;
  ledgerTitle.textContent = model.state === 'pass'
    ? 'Proof passed'
    : model.state === 'pending'
      ? 'Proof pending'
      : 'Proof failed';
  stateBadge.dataset.state = model.state;
  stateBadge.lastChild.textContent = model.state.toUpperCase();
  document.querySelector('#commit-value').textContent = (
    model.commit === 'working-tree' ? model.commit : model.commit.slice(0, 12)
  );
  document.querySelector('#generated-value').textContent = formatGeneratedAt(
    model.generatedAt,
  );
  document.querySelector('#mode-value').textContent = model.offline
    ? 'Offline'
    : 'Networked';
  renderChecks(model);
  renderClaims(model);
  renderLimitations(model);
}

function renderFailure(error) {
  document.documentElement.dataset.proofState = 'fail';
  ledgerTitle.textContent = 'Proof unavailable';
  stateBadge.dataset.state = 'fail';
  stateBadge.lastChild.textContent = 'FAIL';
  const row = element('li', 'check-row fail');
  row.append(
    element('span', 'check-index', '!'),
    element('span', '', `Could not verify published proof: ${error.message}`),
    element('strong', '', 'FAIL'),
  );
  checkList.replaceChildren(row);
}

async function loadJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  const bytes = await response.arrayBuffer();
  const text = new TextDecoder().decode(bytes);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const sha256 = [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
  return {
    value: JSON.parse(text),
    sha256,
  };
}

async function loadProof() {
  try {
    const [capability, proofRun] = await Promise.all([
      loadJson('./capability-proof.json'),
      loadJson('./proof-run.json'),
    ]);
    render(
      makeProofViewModel(
        capability.value,
        proofRun.value,
        capability.sha256,
      ),
    );
  } catch (error) {
    renderFailure(error instanceof Error ? error : new Error(String(error)));
  }
}

async function copyCommand() {
  const button = document.querySelector('#copy-command');
  let copied = false;
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error('Clipboard API unavailable');
    }
    await Promise.race([
      navigator.clipboard.writeText(command),
      new Promise((_, reject) => {
        window.setTimeout(
          () => reject(new Error('Clipboard permission timed out')),
          500,
        );
      }),
    ]);
    copied = true;
  } catch {
    const input = document.createElement('textarea');
    input.value = command;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.append(input);
    input.select();
    copied = document.execCommand('copy');
    input.remove();
  }
  button.dataset.copyState = copied ? 'copied' : 'unavailable';
  button.querySelector('span').textContent = copied
    ? 'Copied'
    : 'Select command manually';
}

document.querySelector('#copy-command').addEventListener('click', copyCommand);
document.querySelector('#proof-command').textContent = command;
loadProof();

window.__PROOF_LAB__ = {
  get model() {
    return currentModel;
  },
};

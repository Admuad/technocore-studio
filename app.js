import { ed25519 } from 'https://esm.sh/@noble/curves@1.4.0/ed25519';
import { sha256 } from 'https://esm.sh/@noble/hashes@1.4.0/sha256';
import { bytesToHex, hexToBytes } from 'https://esm.sh/@noble/hashes@1.4.0/utils';

// Multibase / Base58btc Alphabet
const B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const MULTICODEC_ED25519 = new Uint8Array([0xed, 0x01]);

function base58btcEncode(bytes) {
  let zeroes = 0;
  while (zeroes < bytes.length && bytes[zeroes] === 0) zeroes++;
  
  let num = 0n;
  for (let i = 0; i < bytes.length; i++) {
    num = (num << 8n) + BigInt(bytes[i]);
  }
  
  let str = "";
  while (num > 0n) {
    const rem = num % 58n;
    num = num / 58n;
    str = B58_ALPHABET[Number(rem)] + str;
  }
  
  return "1".repeat(zeroes) + str;
}

function deriveDidFromPrivateKey(privateKeyBytes) {
  const publicKey = ed25519.getPublicKey(privateKeyBytes);
  const tagged = new Uint8Array(2 + publicKey.length);
  tagged.set(MULTICODEC_ED25519, 0);
  tagged.set(publicKey, 2);
  
  const multibase = "z" + base58btcEncode(tagged);
  if (multibase.length !== 48 || !multibase.startsWith("z6Mk")) {
    throw new Error("Invalid multibase generated: " + multibase);
  }
  return "did:key:" + multibase;
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Sharded KV Storage Convention for Technocore DID Notes
export function getShardedKvPath(didOrFingerprint) {
  const clean = String(didOrFingerprint).replace(/^did:key:/, '');
  const fp = clean.slice(0, 16);
  const prefix = fp.slice(0, 2);
  const remainder = fp.slice(2);
  return {
    shard: `/kv/did-${prefix}/${remainder}`,
    legacy: `/kv/did/${fp}`
  };
}

function sweepText(text, maxChars = 4096) {
  if (typeof text !== 'string') throw new Error("Text must be a string");
  const cleaned = text.replace(/[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Zl}\p{Zp}]/gu, ' ').trim();
  if (!cleaned) throw new Error("No visible characters left after sweep");
  if (cleaned.length > maxChars) throw new Error(`Text exceeds ${maxChars} character limit`);
  return cleaned;
}

// Smart Multi-format Input Parser (.env, JSON, raw hex, passphrase)
function extractSeedFromInput(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return "";
  const trimmed = rawInput.trim();

  // 1. JSON format (e.g. key-info.json or custom object)
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed);
      const candidate = obj.seed || obj.SIGN_SEED || obj.seedHex || obj.private_key || obj.privateKey || obj.key;
      if (candidate && /^[0-9a-fA-F]{64}$/.test(String(candidate).trim())) {
        return String(candidate).trim();
      }
    } catch (e) {}
  }

  // 2. .env file format (e.g. export SIGN_SEED="...", SIGN_SEED=..., SEED=...)
  const envMatch = trimmed.match(/(?:export\s+)?(?:SIGN_SEED|SEED|PRIVATE_KEY|KEY)\s*=\s*["']?([0-9a-fA-F]{64})["']?/i);
  if (envMatch && envMatch[1]) {
    return envMatch[1];
  }

  // 3. Raw 64-character hex seed (standalone or embedded)
  const hexMatch = trimmed.match(/\b([0-9a-fA-F]{64})\b/);
  if (hexMatch && hexMatch[1]) {
    return hexMatch[1];
  }

  // 4. Fallback: treat as plain text passphrase
  return trimmed;
}

// Multi-Tier Resilient Network Transport (Vercel Edge / Serverless + Multi-Gateway Failover)
async function resilientFetchJson(targetUrl) {
  const cacheBustUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + `_ts=${Date.now()}`;
  const encoded = encodeURIComponent(cacheBustUrl);

  const gateways = [
    `/api/proxy?url=${encoded}`,
    `https://corsproxy.io/?url=${encoded}`,
    `https://api.allorigins.win/raw?url=${encoded}`,
    `https://api.codetabs.com/v1/proxy?quest=${encoded}`,
    cacheBustUrl
  ];

  for (const url of gateways) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timer);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      continue;
    }
  }

  return null;
}

async function resilientFetchText(targetUrl) {
  const cacheBustUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + `_ts=${Date.now()}`;
  const encoded = encodeURIComponent(cacheBustUrl);

  const gateways = [
    `/api/proxy?url=${encoded}`,
    `https://corsproxy.io/?url=${encoded}`,
    `https://api.allorigins.win/raw?url=${encoded}`,
    `https://api.codetabs.com/v1/proxy?quest=${encoded}`,
    cacheBustUrl
  ];

  for (const url of gateways) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timer);
      const text = await res.text();
      if (res.ok) {
        return { ok: true, status: res.status, text };
      }
    } catch (e) {
      continue;
    }
  }

  throw new Error("Unable to reach Technocore endpoint. Please check your connection.");
}

// Application State
// Application State
const STATE = {
  seedHex: localStorage.getItem("flop_seed_hex") || "",
  did: localStorage.getItem("flop_did") || "",
  lastSeq: localStorage.getItem("flop_last_seq") || "",
  step1Completed: Boolean(localStorage.getItem("flop_seed_hex")),
  step2Completed: Boolean(localStorage.getItem("flop_last_seq")),
  keyDownloaded: Boolean(localStorage.getItem("flop_key_downloaded")),
  proofAnchored: Boolean(localStorage.getItem("flop_proof_anchored")),
  selectedRole: localStorage.getItem("flop_selected_role") || "",
  isSeedVisible: false,
  currentStep: 1,
  pollInterval: null,
  cachedMessages: [],
  sentMessages: []
};

// Toast Notification
function showToast(msg) {
  const tray = document.getElementById('toast-tray');
  if (!tray) return;
  const toast = document.createElement('div');
  toast.className = 'toast-pill';
  toast.textContent = msg;
  tray.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Copy to Clipboard
async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`);
  } catch (err) {
    showToast('Copy failed: ' + err.message);
  }
}

// Dynamic Readiness Scorecard Calculation
export function updateReadinessScorecard() {
  let score = 0;
  const hasDid = Boolean(STATE.did && STATE.seedHex);
  const hasBackup = Boolean(STATE.keyDownloaded);
  const hasCheckin = Boolean(STATE.step2Completed);
  const hasProof = Boolean(STATE.proofAnchored || localStorage.getItem("flop_proof_anchored"));
  const hasRole = Boolean(STATE.selectedRole);

  if (hasDid) score += 20;
  if (hasBackup) score += 20;
  if (hasCheckin) score += 20;
  if (hasProof) score += 20;
  if (hasRole) score += 20;

  // Update score progress fill & badge
  const scoreFill = document.getElementById('score-progress-fill');
  const scoreBadge = document.getElementById('score-badge');
  if (scoreFill) {
    scoreFill.style.width = `${score}%`;
    scoreFill.classList.toggle('full', score === 100);
  }
  if (scoreBadge) {
    if (score === 100) {
      scoreBadge.textContent = "100% Testnet Ready";
      scoreBadge.className = "score-badge score-ready";
    } else if (score > 0) {
      scoreBadge.textContent = `${score}% Prepared`;
      scoreBadge.className = "score-badge";
    } else {
      scoreBadge.textContent = "0% Prepared";
      scoreBadge.className = "score-badge";
    }
  }

  // Update Checklist Items
  const updateItem = (id, isDone) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('completed', isDone);
    const statusSpan = el.querySelector('.checklist-status');
    if (statusSpan) {
      statusSpan.innerHTML = isDone ? '&#x2713;' : '&#x25CB;';
    }
  };

  updateItem('check-item-did', hasDid);
  updateItem('check-item-backup', hasBackup);
  updateItem('check-item-checkin', hasCheckin);
  updateItem('check-item-proof', hasProof);
  updateItem('check-item-role', hasRole);

  // Update Role Tag
  const roleTag = document.getElementById('active-role-tag');
  if (roleTag) {
    if (hasRole) {
      const roleNames = { miner: 'Miner (GPU)', validator: 'Validator (Node)', creator: 'Creator (Builder)' };
      roleTag.textContent = roleNames[STATE.selectedRole] || STATE.selectedRole;
      roleTag.className = 'badge-role-tag selected';
    } else {
      roleTag.textContent = 'Unselected';
      roleTag.className = 'badge-role-tag';
    }
  }

  // Update Role Cards Active State
  document.querySelectorAll('.role-card').forEach(card => {
    const role = card.getAttribute('data-role');
    const isSelected = role === STATE.selectedRole;
    card.classList.toggle('selected', isSelected);
    const radio = card.querySelector('input[type="radio"]');
    if (radio) radio.checked = isSelected;
  });

  // Update Faucet payload text
  const faucetPayload = document.getElementById('display-faucet-payload');
  if (faucetPayload) {
    faucetPayload.textContent = STATE.did ? STATE.did : "Initialize DID in Step 1 first";
  }
}

// Step Gating & Navigation
export function setStep(targetStep) {
  if (targetStep === 2) {
    if (!STATE.step1Completed) {
      showToast("Please initialize or import your identity first");
      return;
    }
    if (!STATE.keyDownloaded) {
      showToast("Please download your .env key backup before proceeding");
      return;
    }
  }
  
  if (targetStep === 3) {
    if (!STATE.step1Completed) {
      showToast("Please initialize your identity first");
      return;
    }
    if (!STATE.step2Completed) {
      showToast("Please broadcast a signed check-in in Step 2 first");
      return;
    }
  }

  STATE.currentStep = targetStep;

  document.querySelectorAll('.step-tab').forEach(tab => {
    const num = parseInt(tab.getAttribute('data-step'), 10);
    tab.classList.toggle('active', num === targetStep);
  });

  document.querySelectorAll('.step-panel').forEach(panel => {
    const num = parseInt(panel.getAttribute('data-step'), 10);
    panel.classList.toggle('active', num === targetStep);
  });

  updateReadinessScorecard();
}

function updateStepperState() {
  const tab1 = document.getElementById('tab-step-1');
  const tab2 = document.getElementById('tab-step-2');
  const tab3 = document.getElementById('tab-step-3');
  const tab4 = document.getElementById('tab-step-4');
  const btnGoStep2 = document.getElementById('btn-go-step2');
  const btnGoStep3 = document.getElementById('btn-go-step3');
  const downloadBtnText = document.getElementById('download-btn-text');

  if (STATE.step1Completed) {
    if (tab1) tab1.classList.add('completed');
    if (STATE.keyDownloaded) {
      if (tab2) tab2.classList.remove('disabled');
      if (btnGoStep2) btnGoStep2.disabled = false;
      if (downloadBtnText) downloadBtnText.textContent = "Key Backup Downloaded";
    } else {
      if (tab2) tab2.classList.add('disabled');
      if (btnGoStep2) btnGoStep2.disabled = true;
      if (downloadBtnText) downloadBtnText.textContent = "Download Key Backup (.env)";
    }
  } else {
    if (tab1) tab1.classList.remove('completed');
    if (tab2) tab2.classList.add('disabled');
    if (btnGoStep2) btnGoStep2.disabled = true;
  }

  if (STATE.step2Completed) {
    if (tab2) tab2.classList.add('completed');
    if (tab3) tab3.classList.remove('disabled');
    if (btnGoStep3) btnGoStep3.disabled = false;
  } else {
    if (tab2) tab2.classList.remove('completed');
    if (tab3) tab3.classList.add('disabled');
    if (btnGoStep3) btnGoStep3.disabled = true;
  }

  if (STATE.proofAnchored || localStorage.getItem("flop_proof_anchored")) {
    if (tab3) tab3.classList.add('completed');
  }

  updateReadinessScorecard();
}

// Key Management
function setIdentity(rawInput) {
  const parsedSeed = extractSeedFromInput(rawInput);
  if (!parsedSeed) {
    showToast("Invalid key input. Please provide a seed, .env, or JSON file.");
    return;
  }

  let privateKeyBytes;
  let finalSeedHex;

  if (parsedSeed.length === 64 && /^[0-9a-fA-F]+$/.test(parsedSeed)) {
    finalSeedHex = parsedSeed.toLowerCase();
    privateKeyBytes = hexToBytes(finalSeedHex);
  } else {
    // Passphrase mode
    privateKeyBytes = sha256(new TextEncoder().encode(parsedSeed));
    finalSeedHex = bytesToHex(privateKeyBytes);
  }
  
  const did = deriveDidFromPrivateKey(privateKeyBytes);
  
  STATE.seedHex = finalSeedHex;
  STATE.did = did;
  STATE.step1Completed = true;
  localStorage.setItem("flop_seed_hex", finalSeedHex);
  localStorage.setItem("flop_did", did);
  
  updateIdentityUI();
  updateStepperState();
  showToast("Identity Ready: " + did.slice(0, 16) + "...");
}

function updateIdentityUI() {
  const displayDid = document.getElementById('display-did');
  const displaySeedInput = document.getElementById('display-seed-input');
  const identityBox = document.getElementById('identity-box');
  const btnSendCheckin = document.getElementById('btn-send-checkin');
  
  if (STATE.did && STATE.seedHex) {
    if (displayDid) displayDid.textContent = STATE.did;
    if (displaySeedInput) displaySeedInput.value = STATE.seedHex;
    if (identityBox) identityBox.style.display = 'block';
    if (btnSendCheckin) btnSendCheckin.disabled = false;
  } else {
    if (identityBox) identityBox.style.display = 'none';
    if (btnSendCheckin) btnSendCheckin.disabled = true;
  }
}

function toggleSeedVisibility() {
  const input = document.getElementById('display-seed-input');
  const btn = document.getElementById('btn-toggle-seed');
  if (!input || !btn) return;

  STATE.isSeedVisible = !STATE.isSeedVisible;
  if (STATE.isSeedVisible) {
    input.type = 'text';
    btn.textContent = 'Hide';
  } else {
    input.type = 'password';
    btn.textContent = 'Show';
  }
}

// Download .env file
function downloadEnvFile() {
  if (!STATE.seedHex || !STATE.did) return;
  const content = `# Technocore Agent Identity\nexport SIGN_SEED="${STATE.seedHex}"\nexport DID="${STATE.did}"\n`;
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'technocore-agent.env';
  a.click();
  URL.revokeObjectURL(url);

  STATE.keyDownloaded = true;
  localStorage.setItem("flop_key_downloaded", "true");
  updateStepperState();
  showToast("Key backup secured. You may proceed to Step 2.");
}

// Post signed message
async function postSignedMessage(room, text) {
  if (!STATE.seedHex || !STATE.did) throw new Error("Please initialize or import an identity first");
  
  const swept = sweepText(text);
  const nonce = Date.now().toString() + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  const canonical = `${room}|${nonce}|${swept}`;
  
  const privateKeyBytes = hexToBytes(STATE.seedHex);
  const sigBytes = ed25519.sign(new TextEncoder().encode(canonical), privateKeyBytes);
  const sig = bytesToBase64Url(sigBytes);
  const encodedText = encodeURIComponent(swept);
  
  const targetUrl = `https://technocore.chat/r/${encodeURIComponent(room)}/say-signed/${encodeURIComponent(STATE.did)}/${encodeURIComponent(sig)}/${nonce}/${encodedText}`;
  
  const res = await resilientFetchText(targetUrl);
  const rawText = res.text || "";
  
  let assignedSeq = null;
  
  try {
    const json = JSON.parse(rawText);
    assignedSeq = json.posted ? json.posted.seq : (json.last_seq || null);
    if (res.ok) {
      addLocalDispatchedMessage(assignedSeq, swept, room);
      return { success: true, seq: assignedSeq, data: json };
    }
  } catch (e) {}
  
  const rangeMatch = rawText.match(/range\s+\d+\.\.(\d+)/i);
  if (rangeMatch && rangeMatch[1]) {
    assignedSeq = parseInt(rangeMatch[1], 10);
  }
  
  if (!assignedSeq) {
    const allSeqMatches = [...rawText.matchAll(/\[(\d+)\]/g)];
    if (allSeqMatches.length > 0) {
      assignedSeq = parseInt(allSeqMatches[allSeqMatches.length - 1][1], 10);
    }
  }
  
  if (res.ok) {
    addLocalDispatchedMessage(assignedSeq, swept, room);
    return {
      success: true,
      seq: assignedSeq,
      raw: rawText
    };
  }

  return {
    success: false,
    seq: null,
    raw: rawText
  };
}

function addLocalDispatchedMessage(seq, text, room) {
  const displaySeq = seq || "Live";
  const localItem = {
    seq: displaySeq,
    ts: new Date().toISOString(),
    from: STATE.did,
    text: text,
    room: room,
    isMine: true
  };
  
  STATE.sentMessages.unshift(localItem);
  renderLobbyMessages(STATE.cachedMessages);
}

// Telemetry Live Feed
async function fetchLobbyFeed() {
  const lobbyFeed = document.getElementById('lobby-feed');
  if (!lobbyFeed) return;
  
  try {
    const targetUrl = `https://technocore.chat/r/lobby?format=json&limit=30`;
    const data = await resilientFetchJson(targetUrl);
    if (data && Array.isArray(data.messages)) {
      STATE.cachedMessages = data.messages;
      renderLobbyMessages(data.messages);
    }
  } catch (err) {
    console.warn("Telemetry stream update:", err);
  }
}

function isMyDid(senderDid) {
  if (!STATE.did || !senderDid) return false;
  if (senderDid === STATE.did) return true;
  
  const myKey = STATE.did.replace("did:key:", "");
  const cleanSender = senderDid.replace(/[<>\s]/g, "");
  
  if (cleanSender.includes("…") || cleanSender.includes("...")) {
    const parts = cleanSender.split(/[…\.]+/);
    if (parts.length === 2 && parts[0] && parts[1]) {
      return myKey.startsWith(parts[0]) && myKey.endsWith(parts[1]);
    }
  }
  return myKey.includes(cleanSender);
}

function renderLobbyMessages(serverMessages) {
  const lobbyFeed = document.getElementById('lobby-feed');
  if (!lobbyFeed) return;
  
  const seenTexts = new Set();
  const allMessages = [];
  
  STATE.sentMessages.forEach(msg => {
    const key = `${msg.text}_${msg.from}`;
    seenTexts.add(key);
    allMessages.push(msg);
  });
  
  (serverMessages || []).forEach(msg => {
    const key = `${msg.text}_${msg.from}`;
    if (!seenTexts.has(key)) {
      seenTexts.add(key);
      allMessages.push(msg);
    }
  });
  
  allMessages.sort((a, b) => {
    const seqA = typeof a.seq === 'number' ? a.seq : (parseInt(a.seq, 10) || 999999999);
    const seqB = typeof b.seq === 'number' ? b.seq : (parseInt(b.seq, 10) || 999999999);
    if (seqA !== seqB) return seqB - seqA;
    const timeA = new Date(a.ts || 0).getTime();
    const timeB = new Date(b.ts || 0).getTime();
    return timeB - timeA;
  });
  
  lobbyFeed.innerHTML = "";
  if (allMessages.length === 0) {
    lobbyFeed.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--color-text-muted); font-size: 0.82rem;">No active messages in room</div>`;
    return;
  }
  
  allMessages.slice(0, 30).forEach(msg => {
    const isMe = msg.isMine || isMyDid(msg.from) || isMyDid(msg.author);
    const item = document.createElement('div');
    item.className = `feed-entry ${isMe ? 'own-entry' : ''}`;
    
    let senderDisplay = msg.from || msg.author || "anonymous";
    if (senderDisplay.startsWith("did:key:")) {
      senderDisplay = `<${senderDisplay.slice(8, 14)}…${senderDisplay.slice(-4)}>`;
    }
    
    const timeStr = msg.ts ? new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "";
    const seqDisplay = msg.seq ? `#${msg.seq}` : "#live";
    
    item.innerHTML = `
      <div class="entry-head">
        <span class="entry-did">${senderDisplay} ${isMe ? '<strong style="color:var(--color-dark);">(YOU)</strong>' : ''}</span>
        <span class="entry-seq">${timeStr} ${seqDisplay}</span>
      </div>
      <div class="entry-text">${escapeHtml(msg.text || "")}</div>
    `;
    lobbyFeed.appendChild(item);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// App Initialization
function init() {
  document.querySelectorAll('.step-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const step = parseInt(tab.getAttribute('data-step'), 10);
      setStep(step);
    });
  });

  // Step 1: Generate Key
  const btnGenRandom = document.getElementById('btn-gen-random');
  if (btnGenRandom) {
    btnGenRandom.addEventListener('click', () => {
      const randomBytes = crypto.getRandomValues(new Uint8Array(32));
      const randomSeedHex = bytesToHex(randomBytes);
      STATE.keyDownloaded = false;
      localStorage.removeItem("flop_key_downloaded");
      setIdentity(randomSeedHex);
    });
  }

  // Step 1: Import Key via Text Paste
  const btnImportExisting = document.getElementById('btn-import-existing');
  const inputSeedImport = document.getElementById('input-seed-import');
  if (btnImportExisting && inputSeedImport) {
    btnImportExisting.addEventListener('click', () => {
      const input = inputSeedImport.value.trim();
      if (!input) {
        showToast("Please enter or paste a seed, .env content, or JSON");
        return;
      }
      STATE.keyDownloaded = true;
      localStorage.setItem("flop_key_downloaded", "true");
      setIdentity(input);
      inputSeedImport.value = "";
    });
  }

  // Step 1: Import Key via File Upload (.env, .json, .txt)
  const fileKeyUpload = document.getElementById('file-key-upload');
  if (fileKeyUpload) {
    fileKeyUpload.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const fileContent = event.target.result;
        STATE.keyDownloaded = true;
        localStorage.setItem("flop_key_downloaded", "true");
        setIdentity(fileContent);
        showToast(`Loaded key from ${file.name}`);
      };
      reader.onerror = () => showToast("Failed to read file");
      reader.readAsText(file);
      fileKeyUpload.value = "";
    });
  }

  // Step 1: Seed Masking & Copy
  const btnToggleSeed = document.getElementById('btn-toggle-seed');
  if (btnToggleSeed) btnToggleSeed.addEventListener('click', toggleSeedVisibility);

  const btnCopyDid = document.getElementById('btn-copy-did');
  if (btnCopyDid) btnCopyDid.addEventListener('click', () => copyText(STATE.did, "DID"));

  const btnCopySeed = document.getElementById('btn-copy-seed');
  if (btnCopySeed) btnCopySeed.addEventListener('click', () => copyText(STATE.seedHex, "Private Seed"));

  const btnDownloadEnv = document.getElementById('btn-download-env');
  if (btnDownloadEnv) btnDownloadEnv.addEventListener('click', downloadEnvFile);

  // Stepper Navigation Buttons
  const btnGoStep2 = document.getElementById('btn-go-step2');
  if (btnGoStep2) btnGoStep2.addEventListener('click', () => setStep(2));

  const btnBackStep1 = document.getElementById('btn-back-step1');
  if (btnBackStep1) btnBackStep1.addEventListener('click', () => setStep(1));

  const btnGoStep3 = document.getElementById('btn-go-step3');
  if (btnGoStep3) btnGoStep3.addEventListener('click', () => setStep(3));

  const btnBackStep2 = document.getElementById('btn-back-step2');
  if (btnBackStep2) btnBackStep2.addEventListener('click', () => setStep(2));

  // Step 2: Send Checkin
  const btnSendCheckin = document.getElementById('btn-send-checkin');
  const checkinRoom = document.getElementById('checkin-room');
  const checkinMessage = document.getElementById('checkin-message');
  const checkinResultAlert = document.getElementById('checkin-result-alert');

  if (btnSendCheckin) {
    btnSendCheckin.addEventListener('click', async () => {
      const room = (checkinRoom && checkinRoom.value.trim()) || "lobby";
      const msg = (checkinMessage && checkinMessage.value.trim()) || "FLOP agent check-in";
      
      btnSendCheckin.disabled = true;
      btnSendCheckin.innerHTML = `<span>Signing & Dispatching...</span>`;
      
      try {
        const res = await postSignedMessage(room, msg);
        if (res.success) {
          showToast("Check-in confirmed on Technocore!");
          if (checkinResultAlert) {
            checkinResultAlert.style.display = "block";
            checkinResultAlert.className = "status-banner banner-success";
            checkinResultAlert.innerHTML = `
              <strong>Protocol Confirmation Received</strong>
              <div>Destination: <code>${room}</code> | Sequence: <code>#${res.seq || 'Confirmed'}</code></div>
              <div style="font-size:0.75rem; margin-top:0.2rem;">Cryptographically signed and anchored by DID <code>${STATE.did.slice(0, 16)}...</code></div>
            `;
          }
          
          STATE.step2Completed = true;
          if (res.seq) {
            STATE.lastSeq = res.seq;
            localStorage.setItem("flop_last_seq", res.seq);
          }
          
          updateStepperState();
          fetchLobbyFeed();
        } else {
          throw new Error(res.raw || "Check-in failed on network");
        }
      } catch (err) {
        showToast("Error: " + err.message);
        if (checkinResultAlert) {
          checkinResultAlert.style.display = "none";
        }
        console.error(err);
      } finally {
        btnSendCheckin.disabled = false;
        btnSendCheckin.innerHTML = `<span>Sign & Dispatch Message</span>`;
      }
    });
  }

  // Step 3: Record Contribution & Share on X
  const btnRecordContribution = document.getElementById('btn-record-contribution');
  const proofContributionUrl = document.getElementById('proof-contribution-url');
  const proofTopic = document.getElementById('proof-topic');
  const proofCommit = document.getElementById('proof-commit');
  const proofOutputBox = document.getElementById('proof-output-box');
  const shareActionGroup = document.getElementById('share-action-group');
  const btnShareX = document.getElementById('btn-share-x');
  const btnCopyTweet = document.getElementById('btn-copy-tweet');
  const btnDownloadProofJson = document.getElementById('btn-download-proof-json');

  let currentTweetText = "";

  if (btnRecordContribution) {
    btnRecordContribution.addEventListener('click', async () => {
      let url = proofContributionUrl ? proofContributionUrl.value.trim() : "";
      const topic = (proofTopic && proofTopic.value.trim()) || "Technocore agent setup & contribution";
      
      if (!url) {
        showToast("Please enter your contribution URL");
        return;
      }
      
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
        if (proofContributionUrl) proofContributionUrl.value = url;
      }
      
      const announcementText = `I published a Technocore contribution: ${url}. It helps people understand ${topic}.`;
      
      btnRecordContribution.disabled = true;
      btnRecordContribution.innerHTML = `<span>Recording in Registry...</span>`;
      
      try {
        const res = await postSignedMessage("technocore", announcementText);
        showToast("Contribution recorded in room 'technocore'!");
        
        const seq = res.seq || STATE.lastSeq || "Live";
        
        if (proofOutputBox) {
          proofOutputBox.style.display = "block";
          proofOutputBox.innerHTML = `
            <div class="status-banner banner-success">
              <strong>Contribution Successfully Registered</strong>
              <div>Destination: <code>room technocore</code> | Sequence: <code>#${seq}</code></div>
              <div>Agent DID: <code>${STATE.did}</code></div>
            </div>
          `;
        }
        
        currentTweetText = `I published a contribution for Technocore by @flop_labs.\n\nTopic: ${topic}\nContribution: ${url}\nAgent DID: ${STATE.did}\nSigned Technocore record: room technocore, sequence #${seq}`;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(currentTweetText)}`;
        
        STATE.proofAnchored = true;
        localStorage.setItem("flop_proof_anchored", "true");
        updateStepperState();

        if (shareActionGroup) {
          shareActionGroup.style.display = "flex";
        }
        if (btnShareX) {
          btnShareX.onclick = () => window.open(twitterUrl, '_blank');
        }
        if (btnCopyTweet) {
          btnCopyTweet.onclick = () => copyText(currentTweetText, "X Post Text");
        }
        
        fetchLobbyFeed();
      } catch (err) {
        showToast("Error recording: " + err.message);
        console.error(err);
      } finally {
        btnRecordContribution.disabled = false;
        btnRecordContribution.innerHTML = `<span>Record in Technocore Registry</span>`;
      }
    });
  }

  // Step 3: Download Proof JSON
  if (btnDownloadProofJson) {
    btnDownloadProofJson.addEventListener('click', () => {
      if (!STATE.seedHex || !STATE.did) {
        showToast("Please initialize your identity in Step 1 first");
        return;
      }
      let url = (proofContributionUrl && proofContributionUrl.value.trim()) || "https://github.com/flop-community";
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }
      
      const commitInput = proofCommit ? proofCommit.value.trim().toLowerCase() : "";
      const commit = /^[0-9a-f]{40,64}$/.test(commitInput) ? commitInput : "0000000000000000000000000000000000000000";
      
      const record = {
        artifact_url: url,
        commit: commit,
        schema: "technocore-contribution-v1"
      };
      const canonical = `{"artifact_url":"${record.artifact_url}","commit":"${record.commit}","schema":"technocore-contribution-v1"}`;
      
      const sigBytes = ed25519.sign(new TextEncoder().encode(canonical), hexToBytes(STATE.seedHex));
      const sig = bytesToBase64Url(sigBytes);
      
      const proofObj = {
        artifact_url: url,
        commit: commit,
        did: STATE.did,
        schema: "technocore-contribution-proof-v1",
        signature: sig
      };

      STATE.proofAnchored = true;
      localStorage.setItem("flop_proof_anchored", "true");
      updateStepperState();
      
      const blob = new Blob([JSON.stringify(proofObj, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'technocore-contribution-proof.json';
      a.click();
      showToast("Downloaded official technocore-contribution-proof.json");
    });
  }

  // Navigation between Step 3 & Step 4
  const btnGoStep4 = document.getElementById('btn-go-step4');
  if (btnGoStep4) btnGoStep4.addEventListener('click', () => setStep(4));

  const btnBackStep3 = document.getElementById('btn-back-step3');
  if (btnBackStep3) btnBackStep3.addEventListener('click', () => setStep(3));

  // Step 4 Checklist Jump Actions
  const actionJumpStep1 = document.getElementById('action-jump-step1');
  if (actionJumpStep1) actionJumpStep1.addEventListener('click', () => setStep(1));

  const actionBackupKey = document.getElementById('action-backup-key');
  if (actionBackupKey) actionBackupKey.addEventListener('click', downloadEnvFile);

  const actionJumpStep2 = document.getElementById('action-jump-step2');
  if (actionJumpStep2) actionJumpStep2.addEventListener('click', () => setStep(2));

  const actionJumpStep3 = document.getElementById('action-jump-step3');
  if (actionJumpStep3) actionJumpStep3.addEventListener('click', () => setStep(3));

  // Step 4 Role Selection
  document.querySelectorAll('.role-card').forEach(card => {
    card.addEventListener('click', () => {
      const role = card.getAttribute('data-role');
      if (!role) return;
      STATE.selectedRole = role;
      localStorage.setItem("flop_selected_role", role);
      const roleTitles = { miner: 'GPU Miner', validator: 'Validator Node', creator: 'Creator & Builder' };
      showToast(`Selected Track: ${roleTitles[role] || role}`);
      updateReadinessScorecard();
    });
  });

  // Step 4 Copy Faucet Payload
  const btnCopyFaucetPayload = document.getElementById('btn-copy-faucet-payload');
  if (btnCopyFaucetPayload) {
    btnCopyFaucetPayload.addEventListener('click', () => {
      if (!STATE.did) {
        showToast("Please initialize your Agent DID in Step 1 first");
        return;
      }
      copyText(STATE.did, "Testnet DID Faucet Payload");
    });
  }

  // Step 4 Export Full Technocore Profile JSON
  const btnExportProfile = document.getElementById('btn-export-profile');
  if (btnExportProfile) {
    btnExportProfile.addEventListener('click', () => {
      if (!STATE.did && !STATE.seedHex) {
        showToast("No active identity found. Initialize your identity in Step 1 first.");
        return;
      }

      let score = 0;
      if (STATE.did && STATE.seedHex) score += 20;
      if (STATE.keyDownloaded) score += 20;
      if (STATE.step2Completed) score += 20;
      if (STATE.proofAnchored || localStorage.getItem("flop_proof_anchored")) score += 20;
      if (STATE.selectedRole) score += 20;

      const profile = {
        app: "Technocore Agent Studio",
        version: "1.1.0",
        exportTimestamp: new Date().toISOString(),
        network: {
          name: "Technocore / FLOP Labs",
          incentivePool: "3.5 Billion $FLOP",
          consensus: "Proof-of-Useful-Inference (PoUI)",
          testnetWindow: "October - December 2026",
          genesisBlock: "Q1 2027"
        },
        agent: {
          did: STATE.did || "None",
          seedHex: STATE.seedHex || "None",
          lastCheckinSequence: STATE.lastSeq || "None",
          selectedRoleTrack: STATE.selectedRole || "Unselected",
          readinessScore: `${score}%`
        },
        checklist: {
          didInitialized: Boolean(STATE.did),
          backupSecured: Boolean(STATE.keyDownloaded),
          checkinBroadcasted: Boolean(STATE.step2Completed),
          proofAnchored: Boolean(STATE.proofAnchored || localStorage.getItem("flop_proof_anchored")),
          roleSelected: Boolean(STATE.selectedRole)
        }
      };

      const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `technocore-agent-profile-${STATE.did ? STATE.did.slice(-8) : 'export'}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast("Technocore Agent Profile exported successfully");
    });
  }

  // Step 4 Verify Gateway Connectivity
  const btnPingGateway = document.getElementById('btn-ping-gateway');
  const pingBtnText = document.getElementById('ping-btn-text');
  const pingStatusResult = document.getElementById('ping-status-result');

  if (btnPingGateway) {
    btnPingGateway.addEventListener('click', async () => {
      btnPingGateway.disabled = true;
      if (pingBtnText) pingBtnText.textContent = "Pinging Gateways...";
      if (pingStatusResult) {
        pingStatusResult.style.display = "block";
        pingStatusResult.style.color = "var(--color-text-secondary)";
        pingStatusResult.textContent = "Testing Technocore gateway latency...";
      }

      const startTime = performance.now();
      try {
        const testUrl = `https://technocore.chat/r/lobby?format=json&limit=1`;
        const data = await resilientFetchJson(testUrl);
        const duration = Math.round(performance.now() - startTime);

        if (data && Array.isArray(data.messages)) {
          if (pingStatusResult) {
            pingStatusResult.style.color = "var(--color-success)";
            pingStatusResult.textContent = `Gateway Healthy (Latency: ${duration}ms, Room: lobby, Last Seq: #${data.messages[0]?.seq || 'Live'})`;
          }
          showToast(`Gateway Healthy (${duration}ms)`);
        } else {
          throw new Error("Invalid telemetry response");
        }
      } catch (err) {
        const duration = Math.round(performance.now() - startTime);
        if (pingStatusResult) {
          pingStatusResult.style.color = "var(--color-donkey-dark)";
          pingStatusResult.textContent = `Gateway unreachable (${duration}ms). Failover proxies active.`;
        }
        showToast("Gateway ping timed out, using fallback proxies");
      } finally {
        btnPingGateway.disabled = false;
        if (pingBtnText) pingBtnText.textContent = "Verify Gateway Health";
      }
    });
  }

  // Telemetry controls
  const btnRefreshLobby = document.getElementById('btn-refresh-lobby');
  if (btnRefreshLobby) btnRefreshLobby.addEventListener('click', fetchLobbyFeed);

  const toggleAutoRefresh = document.getElementById('toggle-auto-refresh');
  if (toggleAutoRefresh) {
    toggleAutoRefresh.addEventListener('change', (e) => {
      if (e.target.checked) {
        STATE.pollInterval = setInterval(fetchLobbyFeed, 4000);
        showToast("Auto-refresh active (4s)");
      } else {
        if (STATE.pollInterval) clearInterval(STATE.pollInterval);
        STATE.pollInterval = null;
        showToast("Auto-refresh paused");
      }
    });
  }

  // Restore State & Stepper Gating
  if (STATE.seedHex) {
    updateIdentityUI();
  }
  updateStepperState();

  // Start on Step 1
  setStep(1);

  // Initial Lobby Fetch
  fetchLobbyFeed();
  STATE.pollInterval = setInterval(fetchLobbyFeed, 4000);
}

// Global window setStep fallback
window.setStep = setStep;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

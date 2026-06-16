/* =========================================================
   EVM SIMULATOR — script.js

   This file is written to be read top to bottom like a
   tutorial. Every section explains WHY a step exists, not
   just WHAT the code does, so it makes sense even if you're
   still getting comfortable with JavaScript.

   THE BIG IDEA (read this first):
   A real EVM has two boxes joined by a cable.
     - Control Unit  -> operated by the polling officer.
     - Ballot Unit    -> faces the voter.
   The Ballot Unit is normally LOCKED. The officer must press
   "Ballot" to unlock it for exactly one voter. Once a vote is
   cast, it locks itself again. That back-and-forth handoff is
   the entire logic of this app — everything below just keeps
   track of two state variables and updates the screen to match.
   ========================================================= */


// ---- 1. DATA: the candidates and how many votes each has ----
// (Names here are fictional/generic on purpose — this is a
// teaching model, not tied to any real party or election.)
const candidates = [
  { id: 1, name: 'Devendra Fadavnis(BJP)',    symbol: '🪷' },
  { id: 2, name: 'Eknath Shinde(Shivsena)',      symbol: '🏹' },
  { id: 3, name: 'Uddhav Thackeray(Shivsena UBT)', symbol: '🔥' },
  { id: 4, name: 'Raj Thackeray(MNS)',    symbol: '🚂' },
];

// votes[candidateId] -> number of votes that candidate has received
const votes = {};
candidates.forEach(c => { votes[c.id] = 0; });


// ---- 2. STATE: the two things a real EVM keeps track of ----
// pollState   : 'NOT_STARTED' -> 'POLLING' -> 'CLOSED'
// ballotState : 'LOCKED' (waiting for officer) or 'READY' (waiting for voter)
let pollState = 'NOT_STARTED';
let ballotState = 'LOCKED';
let totalVotes = 0;


// ---- 3. Grab every HTML element we'll need to update ----
const totalVotesEl     = document.getElementById('totalVotes');
const pollStatusDot    = document.getElementById('pollStatusDot');
const pollStatusText   = document.getElementById('pollStatusText');
const ballotBtn        = document.getElementById('ballotBtn');
const closeBtn         = document.getElementById('closeBtn');
const resultBtn        = document.getElementById('resultBtn');
const clearBtn         = document.getElementById('clearBtn');
const lockedLamp       = document.getElementById('lockedLamp');
const ballotStatusText = document.getElementById('ballotStatusText');
const candidateListEl  = document.getElementById('candidateList');
const cablePulse       = document.getElementById('cablePulse');
const resultPanel      = document.getElementById('resultPanel');
const resultListEl     = document.getElementById('resultList');
const winnerTextEl     = document.getElementById('winnerText');
const logListEl        = document.getElementById('logList');


// ---- 4. Build the candidate buttons inside the Ballot Unit ----
function renderCandidateList() {
  candidateListEl.innerHTML = '';
  candidates.forEach(c => {
    const li = document.createElement('li');
    li.className = 'candidate';
    li.innerHTML = `
      <span class="candidate-name">${c.name}</span>
      <span class="candidate-symbol">${c.symbol}</span>
      <button class="vote-btn" data-id="${c.id}" aria-label="Vote for ${c.name}">
        <span class="vote-lamp"></span>
      </button>
    `;
    candidateListEl.appendChild(li);
  });
}
renderCandidateList();


// ---- 5. LOG: prints a plain-English line for every action ----
// This is the most important part for learning — it turns the
// invisible state changes above into a readable story.
function log(message) {
  const li = document.createElement('li');
  li.textContent = message;
  logListEl.appendChild(li);
  logListEl.scrollTop = logListEl.scrollHeight;
}


// ---- 6. SOUND: a short synthesised beep, like the real machine ----
// Built with the Web Audio API so no sound file is needed.
let audioCtx;
function beep(freq = 880, durationMs = 120) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    osc.type = 'square';
    gain.gain.value = 0.04; // keep it quiet
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + durationMs / 1000);
  } catch (err) {
    // Some browsers block audio until the user interacts with the
    // page at least once — that's fine, we just skip the sound.
  }
}


// ---- 7. CABLE PULSE: a visual cue that a signal travelled between units ----
function pulseCable() {
  cablePulse.classList.remove('run');
  void cablePulse.offsetWidth; // forces the browser to notice the class was removed, so the animation can restart
  cablePulse.classList.add('run');
}


// ---- 8. REFRESH: makes the whole screen match the current state ----
// Every event handler below changes pollState/ballotState/totalVotes
// and then calls this function once, so the UI never gets out of sync.
function refreshUI() {
  totalVotesEl.textContent = totalVotes;

  pollStatusDot.className = 'status-dot ' + pollState.toLowerCase();
  pollStatusText.textContent =
    pollState === 'NOT_STARTED' ? 'Poll not started' :
    pollState === 'POLLING'     ? 'Poll open' :
                                   'Poll closed';

  ballotBtn.disabled = pollState === 'CLOSED' || ballotState === 'READY';
  closeBtn.disabled  = pollState !== 'POLLING';
  resultBtn.disabled = pollState !== 'CLOSED';

  const ready = ballotState === 'READY';
  lockedLamp.className = 'lamp ' + (ready ? 'green' : 'red');
  ballotStatusText.textContent = ready
    ? 'READY — press your candidate'
    : 'LOCKED — wait for officer';
  candidateListEl.classList.toggle('locked', !ready);
}
refreshUI();


// ---- 9. OFFICER presses "Ballot" -> unlocks the Ballot Unit for ONE voter ----
ballotBtn.addEventListener('click', () => {
  if (pollState === 'NOT_STARTED') {
    pollState = 'POLLING';
    log('🟢 Officer pressed BALLOT for the first time — polling has started.');
  } else {
    log('🟢 Officer pressed BALLOT — Ballot Unit unlocked for the next voter.');
  }
  ballotState = 'READY';
  pulseCable();
  beep(660, 100);
  refreshUI();
});


// ---- 10. VOTER presses a candidate -> records exactly one vote ----
// Listening on the whole list (not each button) is called "event
// delegation" — it works even though the buttons were created
// dynamically in step 4.
candidateListEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.vote-btn');
  if (!btn || ballotState !== 'READY') return; // ignore clicks while locked

  const id = Number(btn.dataset.id);
  const candidate = candidates.find(c => c.id === id);

  votes[id] += 1;
  totalVotes += 1;
  ballotState = 'LOCKED'; // one press = one vote, then it locks again

  const lamp = btn.querySelector('.vote-lamp');
  lamp.classList.add('flash');
  setTimeout(() => lamp.classList.remove('flash'), 500);

  pulseCable();
  beep(440, 200);
  log(`🗳️ Vote cast for ${candidate.symbol} ${candidate.name} — Ballot Unit locked again.`);
  refreshUI();
});


// ---- 11. OFFICER presses "Close poll" -> no further votes allowed ----
closeBtn.addEventListener('click', () => {
  pollState = 'CLOSED';
  ballotState = 'LOCKED';
  log('⏹️ Officer pressed CLOSE POLL — voting has ended.');
  refreshUI();
});


// ---- 12. OFFICER presses "Result" -> only works once the poll is closed ----
// This mirrors a real security feature: results can never be seen
// while voting is still happening.
resultBtn.addEventListener('click', () => {
  log('📊 Officer pressed RESULT — showing the final tally.');
  showResults();
});

function showResults() {
  resultListEl.innerHTML = '';
  let winner = null;

  candidates.forEach(c => {
    const pct = totalVotes ? Math.round((votes[c.id] / totalVotes) * 100) : 0;
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="result-name">${c.symbol} ${c.name}</span>
      <span class="result-bar"><span style="width:${pct}%"></span></span>
      <span class="result-count">${votes[c.id]}</span>
    `;
    resultListEl.appendChild(li);
    if (!winner || votes[c.id] > votes[winner.id]) winner = c;
  });

  winnerTextEl.textContent = totalVotes
    ? `Leading: ${winner.symbol} ${winner.name} with ${votes[winner.id]} vote(s).`
    : 'No votes were cast.';

  resultPanel.hidden = false;
  resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


// ---- 13. CLEAR & RESTART -> wipes everything back to the very start ----
clearBtn.addEventListener('click', () => {
  if (!confirm('Reset the simulator and clear all votes?')) return;

  candidates.forEach(c => { votes[c.id] = 0; });
  totalVotes = 0;
  pollState = 'NOT_STARTED';
  ballotState = 'LOCKED';
  resultPanel.hidden = true;
  logListEl.innerHTML = '';

  log('🔄 Simulator cleared — ready to start a new poll.');
  refreshUI();
});

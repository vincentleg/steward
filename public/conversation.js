import { createLanguageLayer } from '/language-layer.js';
import { speechInput, speechOutput } from '/speech.js';
const escape = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
// Generic evidence retrieval, not an intent menu or generated answer. No invented propositions.
export function retrieveEvidence(facts, question, previous = [], focus = null) {
  const terms = [...new Set(question.toLowerCase().match(/[a-z0-9]+/g) || [])].filter(
    (t) =>
      t.length > 2 &&
      ![
        'what',
        'that',
        'this',
        'with',
        'have',
        'does',
        'would',
        'could',
        'should',
        'about',
        'there',
        'anything',
        'things',
        'your',
        'you',
        'the',
        'and',
        'for',
        'why',
        'how',
        'did',
        'are',
      ].includes(t),
  );
  const scores = facts.map((f) => {
    const hay = (f.label + ' ' + f.evidence).toLowerCase();
    return { f, score: terms.filter((t) => hay.includes(t)).length + (f.id === focus ? 0.5 : 0) };
  });
  const matched = scores
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.f);
  if (matched.length) return matched;
  const referent = /\b(second|first)\b/i.exec(question)?.[1]?.toLowerCase();
  if (referent)
    return previous[referent === 'second' ? 1 : 0] ? [previous[referent === 'second' ? 1 : 0]] : [];
  if (previous.length && terms.length < 3) return previous.slice(0, 3);
  return terms.length ? [] : facts.filter((f) => ['scope', 'attention', 'limits'].includes(f.id));
}
export function createConversation({
  host,
  core,
  context,
  focus = () => null,
  scope = 'synthetic',
}) {
  host.setAttribute('role', 'button');
  host.tabIndex = 0;
  host.setAttribute('aria-label', 'Open Steward');
  host.setAttribute('aria-haspopup', 'dialog');
  const anchor = document.createComment('Steward home');
  host.before(anchor);
  const dialog = document.createElement('dialog');
  dialog.id = 'steward-conversation';
  dialog.setAttribute('aria-labelledby', 'conversation-title');
  document.body.append(dialog);
  const language = createLanguageLayer();
  let facts = [],
    previous = [],
    turns = [],
    generation = 0,
    opened = false;
  const voice = speechInput({
    onState: (s) => {
      if (opened) core.conversation(s);
    },
    onEnergy: (e) => core.voiceEnergy(e),
    onText: (t) => {
      const input = dialog.querySelector('textarea');
      if (input) {
        input.value = t.slice(0, 1000);
        input.focus();
      }
      status('Transcript ready. Review it before sending.');
    },
    onError: status,
  });
  const output = speechOutput({
    onState: (s) => {
      if (opened) core.conversation(s);
    },
    onEnergy: (e) => core.voiceEnergy(e),
  });
  function status(text) {
    const s = dialog.querySelector('#conversation-status');
    if (s) s.textContent = text;
  }
  function clear() {
    generation++;
    facts = [];
    previous = [];
    turns = [];
  }
  function close() {
    if (!opened) {
      clear();
      return;
    }
    opened = false;
    voice.stop();
    output.stop();
    core.conversation(null);
    anchor.after(host);
    dialog.close();
    document.body.classList.remove('conversation-open');
    dialog.innerHTML = '';
    clear();
    host.focus();
  }
  async function open() {
    if (opened) return;
    opened = true;
    clear();
    const current = generation;
    dialog.innerHTML = `<div class="surface-head"><h2 id="conversation-title">STEWARD</h2><button id="exit-conversation" aria-label="Exit conversation">×</button></div><div id="conversation-core"></div><div class="conversation-body"><h3>What would you like to understand?</h3><p class="conversation-disclosure">${scope === 'private' ? 'Private world' : 'Synthetic world'} · grounded evidence. Open-ended generated answers are not available yet.</p><div id="conversation-turns" role="region" aria-label="Conversation evidence" tabindex="0" aria-live="polite"></div><form id="conversation-form"><label for="steward-question">Ask about this world</label><textarea id="steward-question" rows="2" maxlength="1000" placeholder="What happened, and was the outcome verified?" required></textarea><div class="conversation-actions"><button type="submit">Explore evidence →</button><button type="button" id="listen" aria-label="Start listening" ${voice.available ? '' : 'disabled'}>Voice input</button><button type="button" id="stop-listening" aria-label="Stop listening">Stop</button></div><label class="voice-consent"><input type="checkbox" id="speech-consent"> I understand my browser may send speech to its recognition service.</label></form><p id="conversation-status" role="status">Text stays in this conversation. No external model processing.</p><p class="conversation-disclosure">Premium spoken output is awaiting voice-quality validation. Conversation cannot execute actions.</p></div>`;
    dialog.querySelector('#conversation-core').append(host);
    document.body.classList.add('conversation-open');
    dialog.showModal();
    core.conversation('conversation-idle');
    dialog.querySelector('#exit-conversation').onclick = close;
    dialog.querySelector('#listen').onclick = async () => {
      try {
        await voice.start(dialog.querySelector('#speech-consent').checked);
      } catch (e) {
        status(e.message);
      }
    };
    dialog.querySelector('#stop-listening').onclick = voice.stop;
    dialog.querySelector('form').onsubmit = async (e) => {
      e.preventDefault();
      voice.stop();
      const input = dialog.querySelector('textarea'),
        q = input.value.trim();
      if (!q) return;
      core.conversation('understanding');
      status('Retrieving current evidence.');
      try {
        const snapshot = await context();
        if (!opened || current !== generation) return;
        facts = snapshot.facts;
        const languageStatus = await language.answer({
          question: q,
          facts: [],
          mode: snapshot.mode,
        });
        if (languageStatus.status !== 'unavailable') throw Error('Unreviewed language provider');
        previous = retrieveEvidence(facts, q, previous, focus());
        turns.push({ q, evidence: previous });
        turns = turns.slice(-8);
        dialog.querySelector('#conversation-turns').innerHTML = turns
          .map(
            (t) =>
              `<article class="conversation-turn"><p class="user-question">${escape(t.q)}</p><p class="evidence-label">ACTUAL STEWARD STATE · ${snapshot.mode === 'synthetic' ? 'SYNTHETIC' : 'PRIVATE'}</p>${t.evidence.length ? t.evidence.map((f) => `<details><summary>${escape(f.label)} <small>${escape(f.status)}</small></summary><p>${escape(f.evidence)}</p><small>${escape(f.source)}</small></details>`).join('') : '<p>I do not have evidence that answers this. General knowledge and open-ended synthesis require a language model that is not configured.</p>'}</article>`,
          )
          .join('');
        input.value = '';
        core.conversation('conversation-idle');
        status('Evidence retrieved. These are source records, not a generated answer.');
        dialog.querySelector('#conversation-turns').lastElementChild?.scrollIntoView({
          block: 'nearest',
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        });
      } catch {
        if (opened && current === generation) {
          core.conversation('conversation-idle');
          status('Owned state is unavailable. Sign in again or reconnect; no action was taken.');
        }
      }
    };
    dialog.querySelector('textarea').focus();
  }
  host.addEventListener('click', () => void open());
  host.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      void open();
    }
  });
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) voice.stop();
  });
  window.addEventListener('pagehide', close);
  return { open, close, reset: close };
}

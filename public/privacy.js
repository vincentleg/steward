// This document describes implemented behavior, not a legal certification.
export const privacySections = [
  [
    'Our purpose',
    'Steward models outcomes and helps detect, understand and recover deviations. Your life data is used for that purpose. This implementation contains no data-sale, advertising-audience or shared model-training pipeline.',
  ],
  [
    'Public sandbox and Demo',
    'No account, personal information or connection is required. The world and its people, money and actions are synthetic. Demo runs in a separate anonymous world through the same Steward engine. No private Calendar or Gmail data enters it. Do not enter personal information into the sandbox.',
  ],
  [
    'Account data',
    'Private development accounts store a login name, salted scrypt password hash and random user identity. No email verification or password recovery is implemented. A login name can be an email address, but it is not used to send mail. Public production accounts remain disabled.',
  ],
  [
    'World data and purposes',
    'Private records can include authorized Calendar event identifiers, labels, times, locations, statuses, change evidence, internal decisions, actions, reminders, activity and deliberate operational memory. These support commitments, conflicts, consequence analysis and verification. Unknown priorities remain unknown. Public worlds contain only the synthetic equivalents.',
  ],
  [
    'Minimization and accuracy',
    'Calendar reads are bounded to a rolling window: the past 24 hours and next 60 days, from the primary calendar. The reader does not request attendee or organizer details, email bodies or complete account history. Conflicting observations are preserved rather than silently overwritten. Bounded histories can omit older evidence; a missing record is not proof that nothing happened.',
  ],
  [
    'Connections and authority',
    'Current private Google Calendar access is calendar.events.readonly. Gmail is disabled. No Calendar modifications, invitations, attendee contact, email, purchases or financial transactions are authorized. Planned connection cards do not start OAuth or imply partnerships. Future permissions must distinguish SEE, UNDERSTAND, PREPARE and explicitly authorized action. External content is data, never authority.',
  ],
  [
    'Compartmentalization',
    'Private records and credentials are scoped to the authenticated owner. Background sync resolves the owner of each connection. Anonymous worlds use independent bearer capabilities and never fall back to a connected user. Capabilities should receive only relevant context; this is an evolving architecture, not a claim that every future compartment exists today.',
  ],
  [
    'Conversation and inference',
    'The conversation surface retrieves a bounded evidence projection from the same world. No language model is configured in this release: open-ended generated answers and general knowledge are not enabled. Grounded evidence is clearly labeled. Questions and follow-up context stay in page memory; they are not written into operational memory or sent to a model. Closing conversation, logout or page reload clears that context. The server reads owned state to return evidence and does not store question bodies.',
  ],
  [
    'Voice and transcription',
    'Text is always available. Browser speech recognition is optional and starts only after explicit consent and microphone permission. Browser vendors may transmit audio to their recognition service; their processing and retention policies apply and Steward cannot guarantee local-only recognition. Transcripts populate the editable input rather than automatically submitting. Steward does not record or upload audio files, store raw audio, or retain transcripts after the conversation closes. Microphone streams stop on exit, backgrounding or interruption.',
  ],
  [
    'Spoken output',
    'A replaceable speech-output interface exists, but premium spoken output is not enabled. Browser voices vary across devices and have not met a consistent Steward voice-quality gate. No voice cloning or imitation is used. Any future external speech provider must be disclosed before personal text is sent.',
  ],
  [
    'External processing',
    'Private OAuth and read-only sync contact Google authorization and Calendar services. The public product is hosted by Render. Browsers may contact their own speech-recognition service after consent. This release sends no world, question or transcript to an external inference model. No analytics, advertising, session-replay or fingerprinting SDK is installed. Infrastructure and browser vendors may retain technical logs under their own policies.',
  ],
  [
    'Storage and encryption',
    'Anonymous worlds live in server memory. Session identifiers and bearer capabilities are stored in this tab’s sessionStorage; no application tracking cookie is used for the sandbox. Private development data uses local SQLite. Private world records, OAuth transactions and credentials are encrypted with AES-256-GCM with owner-bound authenticated context; account names and password hashes are not field-encrypted. The database file is permission-restricted. Private sessions use HttpOnly SameSite cookies, Secure on HTTPS; loopback development uses HTTP. Production transport uses HTTPS. These controls do not mean every disk, backup or infrastructure log is encrypted by this application.',
  ],
  [
    'Retention',
    'Anonymous server worlds expire 30 minutes after creation, or disappear at server restart. Reset clears synthetic state; deleting the sandbox session removes its active server world and tab credentials. Demo exit deletes the separate demo world. Private login sessions expire after 8 hours; OAuth flows after 10 minutes. Expired session records are purged on authentication checks. Private connected records are retained until deletion; record-count bounds are not a time-based retention policy. A comprehensive automatic private retention schedule and backup lifecycle are not implemented.',
  ],
  [
    'Disconnect and deletion',
    'Private disconnect removes stored provider credentials, invalidates pending OAuth flows and attempts provider revocation; if Google is unavailable, local removal still stops access. Derived world records remain until you delete connected data. Disconnect all sources first so monitoring cannot recreate deleted data. Delete connected data removes owner-scoped records from active storage. It does not delete the account/login or promise forensic erasure of SQLite pages, OS backups or infrastructure logs. Account deletion and backup-erasure workflows are not yet implemented.',
  ],
  [
    'Export and correction',
    'You can export your synthetic world or your own private structured records as JSON; credentials, password hashes and session secrets are excluded. Downloads may contain personal information: keep them secure. Synthetic rules and private commitment annotations can correct selected assumptions. Broader account correction, account deletion and formal rights-request workflows are still in development.',
  ],
  [
    'Security and logs',
    'Server authorization derives identity from a trusted session, not a browser-supplied owner. Tokens stay server-side in private mode; public bearer capabilities are necessary for isolated synthetic sessions. Routine account errors log only error codes, not passwords, tokens or message bodies. Hosting/access logs can include request paths, IP addresses and technical metadata; tracking query parameters do not change identity or world state. Avoid putting personal data in URLs. Exact infrastructure log retention is not controlled or audited by this application.',
  ],
  [
    'No sale, ads or silent training',
    'Steward does not sell private world data, construct advertising profiles, or silently train shared models on your private life, conversations or voice. There is no application behavioral analytics pipeline. This describes the current implementation and intended policy; processors’ independent terms still apply where used.',
  ],
  [
    'Decision support and user control',
    'Recommendations are bounded decision support, not a guarantee. Synthetic actions are simulated external systems; real connected mode is read-only. Review evidence, uncertainty, permissions and verification. Conversation cannot grant authority. You can stop a synthetic resolution, reset or delete a sandbox session, export your data, disconnect private sources, delete connected records and log out. No fake control is shown as implemented.',
  ],
  [
    'Privacy principles and rights',
    'Designed with privacy-by-design and GDPR-style principles in mind: transparency, purpose limitation, minimization, accuracy, storage limitation, confidentiality and accountability. Access, correction, deletion and portability controls are partial and described above. US and California transparency, deletion and data-use control principles inform the design. No legal certification or formal compliance assessment is claimed. Lawful-basis, objection/restriction and statutory-request procedures require further policy and legal work before broad private availability.',
  ],
  [
    'Age, contact and changes',
    'Private accounts are development testing only, not a children’s service. Do not provide children’s or sensitive health information. A verified privacy contact and operator/legal-entity notice have not yet been established; no address or DPO is invented here. This document must change with the actual architecture, especially before wider private access or external inference. Current implementation review: October 2026.',
  ],
];
export function privacyHTML() {
  return `<h2 id="privacy-title">Privacy & data protection.</h2><p class="privacy-lede">Your private life is something to protect.</p><div class="privacy-principles"><span>Minimum necessary context</span><span>No data sale or advertising profile</span><span>No silent shared-model training</span><span>Least-privilege connections</span></div><p>One intelligence. Clear boundaries. The public world is synthetic; private connections stay owner-scoped.</p><p class="privacy-caveat">This is an early product, not a legal certification. Read what is implemented and what still needs work.</p><div class="privacy-document">${privacySections.map(([title, text]) => `<details><summary>${title}</summary><p>${text}</p></details>`).join('')}</div>`;
}
export function openPrivacy() {
  let dialog = document.querySelector('#privacy-center');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'privacy-center';
    dialog.setAttribute('aria-labelledby', 'privacy-title');
    document.body.append(dialog);
  }
  dialog.innerHTML = `<div class="surface-head"><span>YOUR LIFE. YOUR PERMISSIONS.</span><button aria-label="Close privacy" id="close-privacy">×</button></div>${privacyHTML()}`;
  dialog.querySelector('button').onclick = () => dialog.close();
  dialog.showModal();
}
export function downloadJSON(value, name) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

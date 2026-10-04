# Submission video — 2:40 target, 3:00 hard limit

Record desktop plus an actual phone insert. The included silent replay is a stage backup, not proof of delivered email.

| Time      | Picture                           | Narration                                                                                                                                                              |
| --------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:15 | Calm opening                      | “When your flight is cancelled, the airline emails you a problem. It should email your agent instead.”                                                                 |
| 0:15–0:30 | Steward calm → trigger            | “Steward watches the details of your life. Most days, nothing needs you. Then a plan breaks.”                                                                          |
| 0:30–0:45 | Six-node bloom                    | “A cancelled flight affects six things: travel, calendar, people, money, rewards, rights. Steward connects them all.”                                                  |
| 0:45–1:00 | Collapse and options              | “Free rebooking misses my meeting. Miles spend $560 of future value to save $92. A different airline tonight costs $92 net and preserves everything else.”             |
| 1:00–1:15 | Email and actual phone tap        | “One decision. One approval. I put my phone down.”                                                                                                                     |
| 1:15–1:30 | Desktop continues and executes    | “Steward books, updates, notifies, requests the refund, and keeps watching.”                                                                                           |
| 1:30–1:45 | $450 voucher arrives              | “The airline offers $450 credit instead of $412 cash. A bigger number, but a worse deal for me.”                                                                       |
| 1:45–2:00 | Cash comparison and rebuttal      | “Locked to an airline, expiring, unlikely to be used. Steward knows cash wins, rejects the offer, and gets the refund.”                                                |
| 2:00–2:15 | Final tally and proof             | “One human decision. Everything else handled. The world is sandboxed. The agent isn’t. These are real backend events and a signed approval that resumes the workflow.” |
| 2:15–2:30 | Calm product, architecture insert | “Travel disruption is the wedge. Then travel booking, refunds, bills, benefits: an agent of record that owns execution, not advice.”                                   |
| 2:30–2:40 | Resolved / Steward wordmark       | “Companies have operations teams. People have hold music. Steward is the operations team for your life.”                                                               |

## Capture checklist

- Record at 1440×900 or 1920×1080. Keep the cursor still while autonomous work executes.
- Hide personal email addresses and unrelated phone notifications.
- Keep the live proof insert under 10 seconds.
- Capture actual AgentMail receipt and physical phone approval when configured; never replace this proof with the simulated replay without labeling it.
- Export 1080p MP4 with clear narration, no distracting music, under 3:00.
- Review the uploaded file’s duration and audio before submission.
- Submission upload requires the actual hackathon submission destination. A generated narrated draft is available at `docs/submission-demo.mp4`; it uses local synthetic narration and recorded public browser approval. It explicitly distinguishes that footage from separately verified physical-iPhone LIVE tests. An actual phone insert can improve the final cut, but must hide personal information.

## Reproducible generated cut

`node --env-file-if-exists=.env scripts/public-smoke.js` records the complete public HTTPS flow and verifies its final state. `node scripts/build-submission.js` creates a narrated MP4 using local macOS speech and the bundled open-source encoder. It rejects a duration over 180 seconds. Neither script uses a paid service. The original `docs/replay.webm` is never overwritten.

## Final design candidate

`docs/submission-candidate.mp4` is the redesigned 150.9-second cut. It uses `docs/public-demo-v3.webm`, captured through the real public HTTPS URL. The protected `docs/submission-demo.mp4` and original replay are unchanged. The candidate retains explicit sandbox labeling and separately verified physical-iPhone LIVE evidence. Default rendering now writes the candidate, never the protected cut.

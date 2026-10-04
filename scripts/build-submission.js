import { chromium } from 'playwright';
import ffmpeg from 'ffmpeg-static';
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const dir = '.data/submission';
mkdirSync(dir, { recursive: true });
const parts = [
  {
    name: 'opening',
    label: 'PERSONAL OUTCOME RECOVERY',
    title: 'When plans break,<br><em>Steward fixes them.</em>',
    copy: 'Agents execute tasks. Steward restores outcomes.',
    narration:
      'When your flight is cancelled, the airline emails you a problem. It should email your agent instead. Steward is a personal outcome recovery system. It maintains what matters, notices when reality deviates, and works until your outcome is restored.',
  },
  {
    name: 'demo',
    narration:
      'This is the public sandbox. No account, no email, no connected accounts. One cancelled flight creates six consequences: travel, calendar, people, money, rewards, and rights. Steward checks the commitments, compares possible futures, and calculates what each choice means for this person. Free rebooking misses tomorrow’s meeting. Using miles sacrifices approximately five hundred and sixty dollars of future travel value. Another airline tonight costs five hundred and four dollars, with the original four hundred and twelve dollars refundable. Ninety two dollars net. The meeting and thirty one thousand miles are preserved. Six consequences. Three futures. One decision. I approve once. Steward continues on its own: booking, protecting the meeting, preparing Sarah’s update, requesting the refund, and watching. Then the airline offers four hundred and fifty dollars in travel credit. A bigger number, but less personal value. Airline locked, potentially expiring, and unlikely to be used. Cash wins. Steward rejects the offer and requests the cash refund. Finally, it checks the actual booking, payment, refund, calendar, notification, and rewards state. Completing an action is not enough. The outcome must be verified.',
  },
  {
    name: 'proof',
    label: 'THE WORLD IS SANDBOXED. THE AGENT ISN’T.',
    title: 'Real approval.<br><em>Real continuation.</em>',
    copy: 'LIVE: AgentMail → physical iPhone → signed approval → desktop continues<br>PUBLIC: isolated browser approval → same outcome engine<br>REPLAY: deterministic stage safety',
    narration:
      'The world is sandboxed. The agent isn’t. Live delivery and two consecutive physical iPhone approval flows were separately verified. Signed approval resumes the backend and the laptop continues without intervention. What you just watched is the anonymous browser approval path. Both use the same outcome engine and observable events.',
  },
  {
    name: 'vision',
    label: 'GENERAL INTELLIGENCE. BOUNDED AUTHORITY.',
    title: 'Steward is not the flight.<br><em>It protects the outcome.</em>',
    copy: 'Personal World State · Impact Graph · Personal Value Model<br>Constitution · Decision Compression · Outcome Verification',
    narration:
      'Travel is one capability. The generic core owns world state, commitments, personal value, authority, decisions, and verification. Models and workers can change. Steward remains responsible for the outcome. Its Constitution separates intelligence from permissions. It cannot expand its own authority. Other domains are concept previews today. The company opportunity is execution and resolution, with the user’s interests first.',
  },
  {
    name: 'close',
    label: 'ONE HUMAN DECISION.',
    title: 'Your life<br><em>is handled.</em>',
    copy: 'Try the anonymous sandbox. No personal data required.',
    narration:
      'Companies have operations teams. People have hold music. Steward is the operations team for your life.',
  },
];
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: 'pipe' });
  if (r.status !== 0) throw Error(`${cmd} failed: ${r.stderr.toString().slice(-500)}`);
};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
for (const [i, p] of parts.entries()) {
  const stem = `${dir}/${i}`;
  writeFileSync(`${stem}.txt`, p.narration);
  run('/usr/bin/say', ['-v', 'Samantha', '-r', '155', '-f', `${stem}.txt`, '-o', `${stem}.aiff`]);
  if (p.name === 'demo')
    run(ffmpeg, [
      '-y',
      '-i',
      'docs/public-demo.webm',
      '-i',
      `${stem}.aiff`,
      '-vf',
      'tpad=stop_mode=clone:stop_duration=120',
      '-af',
      'apad=pad_dur=2',
      '-shortest',
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '21',
      '-pix_fmt',
      'yuv420p',
      '-r',
      '30',
      '-c:a',
      'aac',
      `${stem}.mp4`,
    ]);
  else {
    await page.setContent(
      `<html><body style="margin:0;background:#f4f5ef;color:#163d31;font-family:Arial;padding:95px;box-sizing:border-box;height:900px"><div style="font-size:22px;letter-spacing:8px">STEWARD</div><div style="margin-top:110px;font-size:13px;letter-spacing:3px;color:#537063">${p.label}</div><h1 style="font-size:76px;line-height:1.1;font-weight:500;margin:28px 0"><span>${p.title}</span></h1><p style="font-size:23px;line-height:1.8;color:#597067">${p.copy}</p><div style="position:absolute;bottom:55px;font-size:13px;letter-spacing:2px">WHEN PLANS BREAK, STEWARD FIXES THEM.</div></body></html>`,
    );
    await page.screenshot({ path: `${stem}.png` });
    run(ffmpeg, [
      '-y',
      '-loop',
      '1',
      '-i',
      `${stem}.png`,
      '-i',
      `${stem}.aiff`,
      '-af',
      'apad=pad_dur=1',
      '-shortest',
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '21',
      '-pix_fmt',
      'yuv420p',
      '-r',
      '30',
      '-c:a',
      'aac',
      `${stem}.mp4`,
    ]);
  }
}
await browser.close();
writeFileSync(`${dir}/concat.txt`, parts.map((_, i) => `file '${i}.mp4'`).join('\n'));
run(ffmpeg, [
  '-y',
  '-f',
  'concat',
  '-safe',
  '0',
  '-i',
  `${dir}/concat.txt`,
  '-c',
  'copy',
  '-movflags',
  '+faststart',
  'docs/submission-demo.mp4',
]);
const inspect = spawnSync(ffmpeg, ['-i', 'docs/submission-demo.mp4'], { encoding: 'utf8' }).stderr;
const duration = inspect.match(/Duration: (\d+):(\d+):([\d.]+)/);
const seconds = +duration[1] * 3600 + +duration[2] * 60 + +duration[3];
if (seconds > 180) throw Error('Submission exceeds three minutes');
writeFileSync(
  `${dir}/evidence.json`,
  JSON.stringify({
    seconds,
    narration: 'local macOS Samantha voice',
    approvalFootage: 'public browser, clearly sandbox',
    originalFallbackPreserved: true,
  }),
);
console.log(
  `Submission MP4 generated: ${seconds.toFixed(1)} seconds. Local synthetic narration; public sandbox footage, separately verified LIVE evidence stated explicitly.`,
);

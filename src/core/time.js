export function instant(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    throw Error('A valid timestamp with an explicit offset is required');
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(value)) throw Error('Time zone offset required');
  return Date.parse(value);
}
export function temporalWindow({
  opensAt,
  deadline,
  expiresAt,
  timeZone = 'UTC',
  travelMinutes = 0,
  costOfWaiting = 0,
} = {}) {
  new Intl.DateTimeFormat('en', { timeZone }).format();
  for (const t of [opensAt, deadline, expiresAt].filter(Boolean)) instant(t);
  if (
    !Number.isFinite(travelMinutes) ||
    travelMinutes < 0 ||
    !Number.isFinite(costOfWaiting) ||
    costOfWaiting < 0
  )
    throw Error('Invalid temporal costs');
  if (opensAt && deadline && instant(opensAt) > instant(deadline))
    throw Error('Invalid time window');
  return { opensAt, deadline, expiresAt, timeZone, travelMinutes, costOfWaiting };
}
export function windowStatus(window, now = Date.now()) {
  if (!Number.isFinite(now)) throw Error('Invalid clock');
  if (window.expiresAt && now >= instant(window.expiresAt)) return 'expired';
  if (window.deadline && now + window.travelMinutes * 60000 > instant(window.deadline))
    return 'missed';
  if (window.opensAt && now < instant(window.opensAt)) return 'pending';
  return 'open';
}
export function fitsCommitment(arrivalAt, commitment, bufferMinutes = 0) {
  if (!arrivalAt || !commitment.startsAt)
    return { known: false, fits: false, reason: 'Missing time evidence' };
  if (!Number.isFinite(bufferMinutes) || bufferMinutes < 0) throw Error('Invalid buffer');
  return {
    known: true,
    fits: instant(arrivalAt) + bufferMinutes * 60000 <= instant(commitment.startsAt),
  };
}

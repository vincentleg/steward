/** A tiny durable counterparty. Commands are allowlisted and idempotent per run. */
export function airlineCommand(run, command, payload = {}) {
  run.airline ??= { state: 'SCHEDULED', receipts: {} };
  if (run.airline.receipts[command]) return run.airline.receipts[command];
  let response;
  switch (command) {
    case 'CANCEL_FLIGHT':
      if (run.airline.state !== 'SCHEDULED') throw new Error('Flight already handled');
      response = { type: 'flight.cancelled', flight: 'SFO → JFK', source: 'Sandbox airline event' };
      run.airline.state = 'CANCELLED';
      break;
    case 'ACCEPT_BOOKING':
      if (run.decision.status !== 'approved') throw new Error('Approval required');
      if (payload.option !== 'B' || payload.price !== 504)
        throw new Error('Booking is outside approved plan');
      response = {
        type: 'booking.completed',
        confirmation: `ST-${run.id.slice(0, 6).toUpperCase()}`,
        price: 504,
      };
      break;
    case 'RECEIVE_REFUND_REQUEST':
      if (run.decision.status !== 'approved' || payload.amount !== 412)
        throw new Error('Refund request is outside plan');
      response = { type: 'refund.requested', amount: 412 };
      run.airline.state = 'REFUND_REQUESTED';
      break;
    case 'OFFER_VOUCHER':
      if (run.airline.state !== 'REFUND_REQUESTED') throw new Error('No refund request received');
      response = { type: 'airline.offer_received', credit: 450, originalFare: 412 };
      run.airline.state = 'VOUCHER_OFFERED';
      break;
    case 'RECEIVE_REJECTION':
      if (run.airline.state !== 'VOUCHER_OFFERED' || payload.requested !== 412)
        throw new Error('No valid counteroffer rejection');
      response = { type: 'rebuttal.sent', requested: 412, reason: payload.reason };
      run.airline.state = 'CASH_REQUESTED';
      break;
    case 'APPROVE_CASH_REFUND':
      if (run.airline.state !== 'CASH_REQUESTED') throw new Error('Cash has not been requested');
      response = { type: 'refund.confirmed', amount: 412, method: 'original payment method' };
      run.airline.state = 'REFUNDED';
      break;
    default:
      throw new Error('Unknown airline command');
  }
  run.airline.receipts[command] = response;
  run.messages.push({
    id: `${run.id}:airline:${command}`,
    kind: response.type,
    channel: 'sandbox',
    from: command === 'OFFER_VOUCHER' || command === 'APPROVE_CASH_REFUND' ? 'airline' : 'steward',
    at: new Date().toISOString(),
    payload: response,
  });
  return response;
}

/** Calendar, people and payment systems are sandbox resources, not just visual labels. */
export function lifeCommand(run, command) {
  if (run.decision.status !== 'approved') throw new Error('Approval required');
  run.world ??= {
    calendar: { meeting: 'Sarah · 9 AM tomorrow', status: 'scheduled' },
    people: { sarahInbox: [] },
    payments: { charges: [], refunds: [] },
  };
  run.world.receipts ??= {};
  if (run.world.receipts[command]) return run.world.receipts[command];
  let receipt;
  switch (command) {
    case 'UPDATE_CALENDAR':
      run.world.calendar = {
        meeting: 'Sarah · 9 AM tomorrow',
        status: 'safe',
        arrival: '6:05 AM',
        flight: '9:40 PM',
      };
      receipt = { updated: true, meetingPreserved: true };
      break;
    case 'NOTIFY_SARAH':
      receipt = {
        id: `${run.id}:sarah`,
        to: 'Sarah sandbox persona',
        text: `${run.context.name}’s flight was cancelled, but Steward rebooked the trip. The 9 AM meeting is preserved.`,
      };
      run.world.people.sarahInbox.push(receipt);
      break;
    case 'CHARGE_BOOKING':
      if (!run.airline?.receipts.ACCEPT_BOOKING) throw new Error('Booking confirmation required');
      receipt = { id: `${run.id}:charge`, amount: 504, simulated: true };
      run.world.payments.charges.push(receipt);
      break;
    case 'CREDIT_REFUND':
      if (run.airline?.state !== 'REFUNDED') throw new Error('Airline refund approval required');
      receipt = { id: `${run.id}:refund`, amount: 412, simulated: true };
      run.world.payments.refunds.push(receipt);
      break;
    default:
      throw new Error('Unknown life command');
  }
  run.world.receipts[command] = receipt;
  return receipt;
}

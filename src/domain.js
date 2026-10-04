/** @typedef {{id:string, price:number, net:number, miles:number, preservesMeeting:boolean, label:string, departure:string, reason:string}} Alternative */
/** @typedef {{name:string, trip:{origin:string,destination:string,fare:number,departure:string}, meeting:{person:string,time:string,startsAt:string}, rewards:{miles:number,plannedValue:number}, voucher:{usageProbability:number}}} LifeContext */
/** @type {LifeContext} */
export const context = Object.freeze({
  name: 'Vincent',
  trip: { origin: 'SFO', destination: 'JFK', fare: 412, departure: '6:40 PM' },
  meeting: { person: 'Sarah', time: '9:00 AM', startsAt: '2026-10-05T09:00:00-04:00' },
  rewards: { miles: 31000, plannedValue: 560 },
  voucher: { usageProbability: 0.35 },
});
/** @returns {{options:Alternative[],recommended:string,net:number,milesPreserved:number}} */
export const flightInventory = Object.freeze([
  {
    id: 'original-rebook',
    arrival: '2026-10-05T23:20:00-04:00',
    price: 0,
    miles: 0,
    available: true,
  },
  {
    id: 'alternative-214',
    arrival: '2026-10-05T06:05:00-04:00',
    price: 504,
    miles: 0,
    available: true,
  },
  {
    id: 'reward-310',
    arrival: '2026-10-05T06:40:00-04:00',
    price: 0,
    miles: 31000,
    available: true,
  },
  {
    id: 'alternative-620',
    arrival: '2026-10-05T06:30:00-04:00',
    price: 620,
    miles: 0,
    available: true,
  },
  { id: 'late-220', arrival: '2026-10-05T09:35:00-04:00', price: 450, miles: 0, available: true },
  {
    id: 'tomorrow-110',
    arrival: '2026-10-05T19:10:00-04:00',
    price: 380,
    miles: 0,
    available: true,
  },
  {
    id: 'sold-out-430',
    arrival: '2026-10-05T05:45:00-04:00',
    price: 430,
    miles: 0,
    available: false,
  },
]);
export function searchFlights(c = context) {
  const deadline = Date.parse(c.meeting.startsAt) - 90 * 60 * 1000;
  return flightInventory.map((f) => ({
    ...f,
    preservesMeeting: f.available && Date.parse(f.arrival) <= deadline,
  }));
}
export function evaluateRecovery(c = context) {
  const inventory = searchFlights(c);
  const cashFlight = inventory
    .filter((f) => f.preservesMeeting && f.miles === 0 && f.price > 0)
    .sort((a, b) => a.price - b.price)[0];
  const rewardFlight = inventory.find((f) => f.miles > 0 && f.preservesMeeting);
  const rebooking = inventory.find((f) => f.id === 'original-rebook');
  const options = [
    {
      id: 'A',
      price: 0,
      net: 0,
      miles: 0,
      preservesMeeting: rebooking.preservesMeeting,
      label: 'Airline rebooking',
      departure: 'Tomorrow · 3:00 PM',
      reason: 'Arrives after your 9 AM meeting',
    },
    {
      id: 'B',
      price: cashFlight.price,
      net: cashFlight.price - c.trip.fare,
      miles: 0,
      preservesMeeting: cashFlight.preservesMeeting,
      label: 'Alternative airline',
      departure: 'Tonight · 9:40 PM',
      reason: 'Meeting safe. Original fare refunded.',
    },
    {
      id: 'C',
      price: 0,
      net: 0,
      miles: rewardFlight.miles,
      preservesMeeting: rewardFlight.preservesMeeting,
      label: 'Redeem your miles',
      departure: 'Tonight · 10:15 PM',
      reason: `Spends miles worth $${c.rewards.plannedValue} to save $92`,
    },
  ];
  const viable = options.filter((o) => o.preservesMeeting);
  const recommended = viable.reduce((best, o) =>
    o.net + (o.miles ? c.rewards.plannedValue : 0) <
    best.net + (best.miles ? c.rewards.plannedValue : 0)
      ? o
      : best,
  );
  return {
    options,
    recommended: recommended.id,
    net: recommended.net,
    milesPreserved: c.rewards.miles - recommended.miles,
  };
}
export function evaluateOffer(credit = 450, c = context) {
  const expectedCreditValue = Math.round(credit * c.voucher.usageProbability);
  return {
    credit,
    cash: c.trip.fare,
    expectedCreditValue,
    usageProbability: c.voucher.usageProbability,
    preferred: expectedCreditValue < c.trip.fare ? 'cash' : 'credit',
    reasons: [
      'Airline-locked credit',
      'Expiration risk',
      'Low expected use',
      'Cancellation refund policy supports cash',
    ],
  };
}

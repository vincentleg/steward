/** Capability adapters provide facts and alternatives. The central engine owns execution. */
export const SCENARIOS = [
  {
    id: 'travel',
    domain: 'Travel',
    title: 'Flight cancelled',
    detail: 'SFO → JFK · protect tomorrow’s commitment',
    event: 'flight.cancelled',
    provider: 'Airline',
    goal: 'Protect the trip and avoid unnecessary loss',
  },
  {
    id: 'events',
    domain: 'Opportunities',
    title: 'Your waitlist cleared',
    detail: 'SF Tech Week · a founder event opens up',
    event: 'event.waitlist_promoted',
    provider: 'Event organizer',
    goal: 'Protect valuable opportunities and commitments',
  },
  {
    id: 'money',
    domain: 'Money',
    title: 'An unwanted renewal',
    detail: '$249 subscription · check whether it still serves you',
    event: 'subscription.renewed',
    provider: 'Subscription provider',
    goal: 'Avoid paying for something you no longer value',
  },
  {
    id: 'purchase',
    domain: 'Purchases',
    title: 'Delivery failed',
    detail: 'An important item is needed tomorrow',
    event: 'delivery.failed',
    provider: 'Merchant',
    goal: 'Have the item when it is needed',
  },
  {
    id: 'benefits',
    domain: 'Benefits',
    title: '$300 expires tomorrow',
    detail: 'A travel benefit has 24 hours left',
    event: 'benefit.expiring',
    provider: 'Benefit provider',
    goal: 'Preserve useful value before it expires',
  },
  {
    id: 'work',
    domain: 'Work',
    title: 'Meeting moved',
    detail: '2:00 PM → 3:30 PM · dependencies change',
    event: 'meeting.moved',
    provider: 'Work calendar',
    goal: 'Keep preparation and the next commitment feasible',
  },
  {
    id: 'home',
    domain: 'Home',
    title: 'Internet went down',
    detail: 'An important call starts in 45 minutes',
    event: 'internet.outage',
    provider: 'Internet provider',
    goal: 'Join the call reliably and on time',
  },
  {
    id: 'admin',
    domain: 'Administration',
    title: 'Renewal due in 48 hours',
    detail: 'Form, document, fee, and one approval',
    event: 'deadline.approaching',
    provider: 'Renewal service',
    goal: 'Complete the renewal before its deadline',
  },
  {
    id: 'people',
    domain: 'People',
    title: 'Dinner is delayed',
    detail: '45 minutes later · preserve your next commitment',
    event: 'reservation.delayed',
    provider: 'Reservation service',
    goal: 'Protect dinner and the people depending on it',
  },
  {
    id: 'opportunity',
    domain: 'Opportunities',
    title: 'A limited invitation',
    detail: 'Evaluate relevance, rarity, people, and your time',
    event: 'invitation.received',
    provider: 'Event organizer',
    goal: 'Allocate time to opportunities that serve your goals',
  },
];
const option = (id, title, costs, benefits, operations, evidence, extra = {}) => ({
  id,
  title,
  costs,
  benefits,
  operations,
  evidence,
  confidence: 0.96,
  reversibility: 'reversible',
  ...extra,
});
export function capabilityPlan(id, w, { affectedIds = null } = {}) {
  const meeting = w.commitments.find((c) => c.id === 'morning');
  const important = meeting.importance >= 0.5 && (!affectedIds || affectedIds.includes('morning'));
  const arrivalHour = 6.083;
  const preparation = meeting.preparationMinutes ?? 0;
  const travel = meeting.travelMinutes ?? 60;
  const arriveInTime = meeting.hour >= arrivalHour + (travel + preparation) / 60;
  let options, targets;
  switch (id) {
    case 'travel':
      targets = ['flight', 'morning', 'sarah', 'cash', 'miles', 'refund-rights'];
      options = [
        option(
          'A',
          'Free rebooking tomorrow',
          { commitments: important ? 900 : 0, time: 20 },
          {},
          [
            { type: 'rebook', choice: 'A' },
            { type: 'update_commitment', id: 'morning', status: 'missed' },
          ],
          ['$0 additional cost', 'Tomorrow at 3 PM', 'Tomorrow morning’s meeting is missed'],
          {
            constraints: [{ id: 'meeting', passed: !important }],
            projected: { meetingPreserved: false, arrival: 'Tomorrow evening' },
            reversibility: 'irreversible',
            requiresApproval: true,
          },
        ),
        option(
          'B',
          'Fly tonight · 9:40 PM',
          { money: 92 },
          {},
          [
            { type: 'rebook', choice: 'B' },
            { type: 'update_commitment', id: 'morning', status: 'protected' },
            { type: 'send_message', id: 'sarah' },
            { type: 'request_refund', amount: 412 },
          ],
          [
            '$504 replacement − $412 refund = $92 net',
            '31,000 miles preserved',
            `Arrival 6:05 AM; ${travel} minutes travel + ${preparation} minutes preparation required`,
          ],
          {
            constraints: [
              { id: 'budget', passed: 92 <= w.settings.maxSpend },
              { id: 'cash-liquidity', passed: w.resources.cash >= 504 },
              { id: 'meeting', passed: !important || arriveInTime },
            ],
            projected: { meetingPreserved: arriveInTime, arrival: '6:05 AM tomorrow' },
            reversibility: 'irreversible',
            requiresApproval: true,
          },
        ),
        option(
          'C',
          'Use 31,000 miles',
          { futureValue: w.settings.preserveMiles ? 560 : 30 },
          {},
          [
            { type: 'rebook', choice: 'C' },
            { type: 'update_commitment', id: 'morning', status: 'protected' },
            { type: 'request_refund', amount: 412 },
          ],
          [
            '31,000 miles consumed',
            `Estimated future value: $${w.settings.preserveMiles ? 560 : 30}`,
            'Commitment preserved if arrival leaves enough travel time',
          ],
          {
            constraints: [
              { id: 'miles', passed: w.resources.miles >= 31000 },
              { id: 'meeting', passed: !important || arriveInTime },
            ],
            projected: { meetingPreserved: arriveInTime },
            reversibility: 'irreversible',
            requiresApproval: true,
          },
        ),
      ];
      break;
    case 'events':
      targets = ['event-a', 'founder', 'event-c', 'cash', 'sarah', 'strategic-goal'];
      options = [
        option(
          'stay',
          'Keep the original evening',
          {},
          { opportunityCost: 20 },
          [{ type: 'reschedule', id: 'founder', status: 'declined' }],
          ['No travel change', 'Founder opportunity declined'],
        ),
        option(
          'founder',
          'Leave early → founder event → 8 PM commitment',
          { money: 15, time: 22 },
          { opportunityCost: w.settings.calendarPriority === 'personal' ? 10 : 100 },
          [
            { type: 'reschedule', id: 'event-a', status: 'leave early' },
            { type: 'reschedule', id: 'founder', status: 'confirmed' },
            { type: 'reschedule', id: 'event-c', status: 'protected' },
            { type: 'reserve', id: 'transport', amount: 15 },
          ],
          [
            'Waitlist accepted at 6:47 PM',
            '22-minute synthetic route',
            '8 PM commitment preserved',
          ],
          {
            constraints: [{ id: 'budget', passed: w.settings.maxSpend >= 15 }],
            requiresApproval: true,
          },
        ),
        option(
          'skip-last',
          'Attend founder event only',
          { commitments: 120 },
          { opportunityCost: 95 },
          [
            { type: 'reschedule', id: 'founder', status: 'confirmed' },
            { type: 'reschedule', id: 'event-c', status: 'declined' },
          ],
          ['More time with founders', '8 PM commitment lost'],
          { requiresApproval: true },
        ),
        option(
          'decline',
          'Protect personal evening',
          {},
          { opportunityCost: w.settings.calendarPriority === 'personal' ? 110 : 0 },
          [{ type: 'reschedule', id: 'founder', status: 'declined' }],
          ['Personal priority respected', 'No extra spending'],
        ),
      ];
      break;
    case 'money':
      targets = ['subscription', 'cash', 'refund-rights'];
      options = [
        option(
          'refund',
          'Cancel renewal and recover $249',
          {},
          { money: w.settings.subscriptionUsage === 'low' ? 249 : 0 },
          [
            { type: 'cancel', id: 'subscription' },
            { type: 'request_refund', amount: 249 },
          ],
          [
            'Unused in the seeded month',
            'Within the synthetic refund window',
            'Auto-renewal can be switched back on',
          ],
        ),
        option(
          'keep',
          'Keep the subscription',
          {},
          { preferences: w.settings.subscriptionUsage === 'high' ? 300 : 0 },
          [{ type: 'verify', id: 'subscription' }],
          ['Retain service', 'No refund requested'],
        ),
      ];
      break;
    case 'purchase':
      targets = ['order', 'cash', 'delivery-deadline'];
      options = [
        option(
          'replace',
          'Replacement arrives tonight',
          { money: 39 },
          { commitments: w.settings.deliveryUrgent ? 150 : 0 },
          [
            { type: 'reserve', id: 'replacement', amount: 39 },
            { type: 'request_refund', amount: 39 },
            { type: 'replace', id: 'order' },
          ],
          ['Replacement $39; original $39 refundable', 'Delivery tonight', 'No real purchase'],
          {
            constraints: [{ id: 'budget', passed: w.settings.maxSpend >= 39 }],
            requiresApproval: true,
          },
        ),
        option(
          'refund',
          'Refund and wait',
          {},
          { money: w.settings.deliveryUrgent ? 0 : 70 },
          [
            { type: 'request_refund', amount: 39 },
            { type: 'cancel', id: 'order' },
          ],
          ['No replacement spending', 'Appropriate when the delivery is no longer urgent'],
        ),
      ];
      break;
    case 'benefits':
      targets = ['benefit', 'cash', 'future-trip'];
      options = [
        option(
          'preserve',
          'Apply $300 to an eligible planned booking',
          {},
          { money: 300 },
          [{ type: 'accept_offer', id: 'benefit' }],
          [
            'Expires in 24 hours',
            'Seeded future trip is eligible',
            'Reversible reservation; no cash spending',
          ],
        ),
        option(
          'expire',
          'Allow the benefit to expire',
          { futureValue: 300 },
          {},
          [{ type: 'decline_offer', id: 'benefit' }],
          ['No booking made', 'Value is lost'],
        ),
      ];
      break;
    case 'work':
      targets = ['work-meeting', 'preparation', 'next-meeting', 'deadline', 'sarah'];
      options = [
        option(
          'replan',
          'Move preparation and preserve the next meeting',
          {},
          { commitments: 100 },
          [
            { type: 'reschedule', id: 'work-meeting', status: '3:30 PM' },
            { type: 'reschedule', id: 'preparation', status: '2:45 PM' },
            { type: 'reschedule', id: 'next-meeting', status: 'protected' },
          ],
          [
            'Preparation before 3:30 PM',
            'Travel buffer remains feasible',
            'No sensitive message sent',
          ],
        ),
        option(
          'unchanged',
          'Leave dependent plans unchanged',
          { commitments: 100 },
          {},
          [{ type: 'verify', id: 'work-meeting' }],
          ['Preparation and travel may conflict'],
        ),
      ];
      break;
    case 'home':
      targets = ['internet', 'call', 'hotspot', 'cash'];
      options = [
        option(
          'hotspot',
          'Activate the available hotspot',
          {},
          { commitments: 100 },
          [{ type: 'activate_backup', id: 'hotspot' }],
          ['Existing synthetic data plan', 'Online before the call', 'No extra spending'],
        ),
        option(
          'workspace',
          'Reserve a nearby workspace',
          { money: 25, time: 18 },
          { commitments: 100 },
          [
            { type: 'reserve', id: 'workspace', amount: 25 },
            { type: 'activate_backup', id: 'workspace' },
          ],
          ['18-minute route', 'Workspace costs $25'],
          {
            constraints: [{ id: 'budget', passed: w.settings.maxSpend >= 25 }],
            requiresApproval: true,
          },
        ),
        option(
          'wait',
          'Wait for the provider',
          { risk: 120 },
          {},
          [{ type: 'verify', id: 'internet' }],
          ['Restoration estimate: 90 minutes', 'Call is in 45 minutes'],
        ),
      ];
      break;
    case 'admin':
      targets = ['renewal', 'document', 'form', 'cash'];
      options = [
        option(
          'submit',
          'Prepare and submit the renewal',
          { money: 35 },
          { commitments: 100 },
          [
            { type: 'prepare', id: 'form' },
            { type: 'prepare', id: 'document' },
            { type: 'submit_form', id: 'renewal', amount: 35 },
          ],
          ['48 hours remain', 'Synthetic document checklist complete', '$35 fee requires approval'],
          {
            constraints: [{ id: 'budget', passed: w.settings.maxSpend >= 35 }],
            requiresApproval: true,
            reversibility: 'irreversible',
          },
        ),
        option(
          'defer',
          'Prepare documents and defer submission',
          { risk: 100 },
          {},
          [
            { type: 'prepare', id: 'form' },
            { type: 'prepare', id: 'document' },
          ],
          ['Safe preparation only', 'Renewal remains outstanding'],
        ),
      ];
      break;
    case 'people':
      targets = ['dinner', 'sarah', 'next-meeting', 'transport'];
      options = [
        option(
          'adjust',
          'Move reservation and prepare a message',
          {},
          { commitments: 100 },
          [
            { type: 'reschedule', id: 'dinner', status: '45 minutes later' },
            { type: 'prepare', id: 'message' },
          ],
          ['Next commitment remains feasible', 'Message prepared; never sent to a real person'],
        ),
        option(
          'cancel',
          'Cancel dinner',
          { commitments: 150 },
          {},
          [{ type: 'cancel', id: 'dinner' }],
          ['Personal commitment lost'],
          { requiresApproval: true },
        ),
      ];
      break;
    case 'opportunity':
      targets = ['invitation', 'strategic-goal', 'cash', 'calendar'];
      options = [
        option(
          'accept',
          'Accept the relevant invitation',
          {},
          { opportunityCost: w.settings.calendarPriority === 'personal' ? 15 : 100 },
          [{ type: 'accept_offer', id: 'invitation' }],
          ['High seeded relevance to founder goals', 'No calendar conflict', 'Reversible RSVP'],
        ),
        option(
          'decline',
          'Protect the time already reserved',
          {},
          { preferences: w.settings.calendarPriority === 'personal' ? 110 : 10 },
          [{ type: 'decline_offer', id: 'invitation' }],
          ['Personal priority preserved', 'No additional commitment'],
        ),
      ];
      break;
    default:
      throw Error('Unknown capability');
  }
  return { targets, options };
}

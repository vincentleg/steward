export interface Trip {
  origin: string;
  destination: string;
  fare: number;
  departure: string;
}
export interface CalendarEvent {
  person: string;
  time: string;
  startsAt: string;
}
export interface RewardBalance {
  miles: number;
  plannedValue: number;
}
export interface LifeContext {
  name: string;
  trip: Trip;
  meeting: CalendarEvent;
  rewards: RewardBalance;
  voucher: { usageProbability: number };
}
export interface Alternative {
  id: 'A' | 'B' | 'C';
  price: number;
  net: number;
  miles: number;
  preservesMeeting: boolean;
  label: string;
  departure: string;
  reason: string;
}
export type WorkflowState =
  | 'CALM'
  | 'CANCELLATION_RECEIVED'
  | 'CONTEXT_LOADED'
  | 'OPTIONS_CALCULATED'
  | 'RECOMMENDATION_READY'
  | 'WAITING_FOR_APPROVAL'
  | 'APPROVED'
  | 'EXECUTING_RECOVERY'
  | 'REFUND_REQUESTED'
  | 'COUNTERPARTY_RESPONSE'
  | 'OFFER_EVALUATED'
  | 'REBUTTAL_SENT'
  | 'RESOLVED';
export interface EventLog {
  id: string;
  sequence: number;
  type: string;
  at: string;
  data: Record<string, unknown>;
}
export interface Decision {
  options: Alternative[];
  recommended: string;
  net: number;
  milesPreserved: number;
  status: 'pending' | 'approved';
  approvedAt?: string;
}
export interface Message {
  kind: string;
  channel: 'sandbox' | 'email';
  at: string;
  messageId?: string;
}
export interface Run {
  id: string;
  mode: 'live' | 'replay';
  state: WorkflowState;
  context: LifeContext;
  decision: Decision;
  events: EventLog[];
  messages: Message[];
  actions: Record<string, unknown>;
}

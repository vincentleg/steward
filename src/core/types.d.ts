export type Authority = 'GREEN' | 'YELLOW' | 'RED' | 'BLACK';
export interface Goal {
  id: string;
  intent: string;
}
export interface Commitment {
  id: string;
  person?: string;
  time?: string;
  priority: string;
}
export interface Constraint {
  id: string;
  value: string;
}
export interface Resource {
  id: string;
  amount: number;
  unit: string;
}
export interface Preference {
  kind: 'explicit-demo-preference' | 'temporary-plan' | 'explicit-rule' | 'historical-observation';
  value: string;
}
export interface Memory {
  kind: 'historical-observation';
  value: string;
  at: string;
}
export interface PersonalWorldState {
  goals: Goal[];
  commitments: Commitment[];
  resources: Resource[];
  preferences: Preference[];
  constraints: Constraint[];
  observation: 'stable' | 'deviated';
  identity: Principal | null;
  context: RepresentationContext | null;
  memory: OperationalMemory[];
  people: unknown[];
  time: unknown[];
  money: unknown[];
  travel: unknown[];
  purchases: unknown[];
  benefits: unknown[];
  rights: unknown[];
  risks: unknown[];
  counterparties: unknown[];
  intendedState: { goals: Goal[]; constraints: Constraint[] };
  observedState: Record<string, unknown>;
  activeDeviations: unknown[];
  activeResolutions: unknown[];
  outcomeHistory: Outcome[];
  authority: { mandateId: string | null };
}
export interface FutureState {
  id: string;
  contextId?: string;
  intended: unknown;
  projected: unknown;
  constraints: { id: string; passed: boolean }[];
  costs: Record<string, number>;
  benefits: Record<string, number>;
  confidence: number;
  reversibility: 'reversible' | 'irreversible' | 'unknown';
  assumptions: string[];
}
export interface PolicyAction {
  authority: Authority;
  requiresApproval?: boolean;
  realMoney?: boolean;
  expandsAuthority?: boolean;
}
export interface Evidence {
  id: string;
  label: string;
  passed: boolean;
}
export interface Outcome {
  verified: boolean;
  evidence: Evidence[];
  at: string;
}

export type RepresentationKind = 'personal' | 'professional' | 'enterprise';
export interface Principal {
  id: string;
  kind: 'person' | 'organization';
  name: string;
}
export interface RepresentationContext {
  id: string;
  principalId: string;
  actorId: string;
  kind: RepresentationKind;
  role: string;
  mandateId: string;
  resourceIds: string[];
  timeZone: string;
  ephemeral: boolean;
}
export interface AuthorityGrant {
  id: string;
  context: RepresentationContext;
  actionIds: string[];
  resourceIds: string[];
  spendingLimit: number;
  currency: string;
  expiresAt?: string;
}
export interface OperationalMemory {
  id: string;
  contextId: string;
  kind:
    | 'stable-preference'
    | 'temporary-preference'
    | 'explicit-rule'
    | 'inferred-tendency'
    | 'current-constraint'
    | 'historical-observation'
    | 'resolution-history'
    | 'counterparty-history';
  value: unknown;
  source: { type: string; id: string };
  confidence: number;
  explicit: boolean;
  evidenceIds: string[];
  expiresAt?: string;
  at: string;
}

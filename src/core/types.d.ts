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
  memory: Memory[];
}
export interface FutureState {
  optionId: string;
  commitmentPreserved: boolean;
  incrementalCost: number;
  resourcesPreserved: number;
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

import { assertContext } from './identity.js';
import { freeze, identifier, finite } from './contracts.js';
import { instant } from './time.js';
/** Grants are supplied by trusted configuration, never external messages or models. */
export function authorityGrant({
  id,
  context,
  actionIds,
  resourceIds,
  spendingLimit = 0,
  currency = 'USD',
  expiresAt,
}) {
  identifier(id);
  actionIds.forEach(identifier);
  resourceIds.forEach(identifier);
  finite(spendingLimit, 'Spending limit');
  if (spendingLimit < 0 || !/^[A-Z]{3}$/.test(currency)) throw Error('Invalid spending scope');
  if (expiresAt) instant(expiresAt);
  if (resourceIds.some((id) => !context.resourceIds.includes(id)))
    throw Error('Resource outside context');
  return freeze({
    id,
    context: structuredClone(context),
    actionIds: [...actionIds],
    resourceIds: [...resourceIds],
    spendingLimit,
    currency,
    expiresAt,
  });
}
export function checkAuthority(
  action,
  context,
  grant,
  { approved = false, now = Date.now() } = {},
) {
  assertContext(context, grant.context);
  if (grant.expiresAt && instant(grant.expiresAt) <= now) throw Error('Authority expired');
  if (
    !grant.actionIds.includes(action.id) ||
    (action.resourceIds || []).some((id) => !grant.resourceIds.includes(id))
  )
    throw Error('Action outside authority scope');
  const cost = action.cost || 0;
  finite(cost, 'Action cost');
  if (cost < 0 || cost > grant.spendingLimit || (cost > 0 && action.currency !== grant.currency))
    throw Error('Spending limit exceeded');
  if (
    action.realMoney ||
    action.expandsAuthority ||
    action.modifiesConstitution ||
    action.authority === 'BLACK'
  )
    throw Error('Prohibited action');
  if (
    (cost > 0 ||
      action.requiresApproval ||
      action.reversibility === 'irreversible' ||
      action.confidence < 0.8) &&
    !approved
  )
    throw Error('Human approval required');
  return { allowed: true, grantId: grant.id };
}

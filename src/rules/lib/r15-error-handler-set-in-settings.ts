import { isMainWorkflow } from '../../utils/utils';
import type { Graph, Finding } from '../../types';
import type { RuleContext } from '../index';
import type { RuleMetadata } from '../metadata';

export const metadata: RuleMetadata = {
  id: 'R15',
  name: 'error_handler_set_in_settings',
  severity: 'must',
  description: 'Ensures main workflows have an error handler workflow configured in settings',
  details:
    'Main workflows (triggered by webhook, schedule, form, etc.) should have settings.errorWorkflow set to receive error notifications. Sub-workflows (Execute Workflow Trigger) are excluded from this check.',
};

function getWorkflowSettings(
  meta: Record<string, unknown>,
): { errorWorkflow?: string } | undefined {
  const settings = meta.settings;
  if (settings != null && typeof settings === 'object' && !Array.isArray(settings)) {
    return settings as { errorWorkflow?: string };
  }
  return undefined;
}

export function r15ErrorHandlerSetInSettings(
  graph: Graph,
  ctx: RuleContext,
): Finding[] {
  const cfg = ctx.cfg.rules.error_handler_set_in_settings;
  if (!cfg?.enabled) return [];

  if (!isMainWorkflow(graph)) return [];

  const settings = getWorkflowSettings(graph.meta);
  if (
    settings?.errorWorkflow &&
    typeof settings.errorWorkflow === 'string' &&
    settings.errorWorkflow.trim().length > 0
  ) {
    return [];
  }

  return [
    {
      rule: metadata.id,
      severity: metadata.severity,
      path: ctx.path,
      message:
        'Main workflow does not have an error handler workflow configured in settings',
      raw_details:
        'Set settings.errorWorkflow to a valid workflow ID so that runtime errors trigger a notification workflow.',
    },
  ];
}

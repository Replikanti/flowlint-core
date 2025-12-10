import YAML from 'yaml';
import type { Graph, NodeRef, Edge } from '../types';
import { validateN8nWorkflow } from '../schemas';
import { flattenConnections, isErrorProneNode } from '../utils/utils';

export function parseN8n(doc: string): Graph {
  let parsed: any;
  try {
    parsed = JSON.parse(doc);
  } catch {
    parsed = YAML.parse(doc);
  }

  // Validate workflow structure before parsing
  validateN8nWorkflow(parsed);

  const nodes: NodeRef[] = parsed.nodes.map((node: any, idx: number) => {
    const nodeId = node.id || node.name || `node-${idx}`;
    const flags: NodeRef['flags'] = {
      continueOnFail: node.continueOnFail,
      retryOnFail: node.retryOnFail ?? node.settings?.retryOnFail,
      waitBetweenTries: node.waitBetweenTries ?? node.settings?.waitBetweenTries,
      maxTries: node.maxTries ?? node.settings?.maxTries,
    };
    const hasFlags =
      flags.continueOnFail !== undefined ||
      flags.retryOnFail !== undefined ||
      flags.waitBetweenTries !== undefined;

    return {
      id: nodeId,
      type: node.type,
      name: node.name,
      params: node.parameters,
      cred: node.credentials,
      flags: hasFlags ? flags : undefined,
    };
  });

  const nameToId = new Map<string, string>();
  for (const node of nodes) {
    if (node.id) nameToId.set(node.id, node.id);
    if (node.name) nameToId.set(node.name, node.id);
  }

  const lines = doc.split(/\r?\n/);
  const idLine = new Map<string, number>();
  const nameLine = new Map<string, number>();
  lines.forEach((line, idx) => {
    const idMatch = line.match(/"id":\s*"([^"]+)"/);
    if (idMatch) idLine.set(idMatch[1], idx + 1);
    const nameMatch = line.match(/"name":\s*"([^"]+)"/);
    if (nameMatch) nameLine.set(nameMatch[1], idx + 1);
  });

  const nodeLines = new Map<string, number>();
  for (const node of nodes) {
    const lineNumber = (node.name && nameLine.get(node.name)) || idLine.get(node.id);
    if (lineNumber) {
      nodeLines.set(node.id, lineNumber);
    }
  }

  const nodeById = new Map<string, NodeRef>();
  for (const node of nodes) {
    nodeById.set(node.id, node);
  }

  const resolveEdgeType = (
    connectionType: string,
    outputIndex: number | undefined,
    sourceType?: string,
  ): Edge['on'] => {
    if (connectionType === 'error') return 'error';
    if (connectionType === 'timeout') return 'timeout';

    if (connectionType === 'main') {
      if (
        typeof outputIndex === 'number' &&
        outputIndex > 0 &&
        sourceType &&
        isErrorProneNode(sourceType)
      ) {
        return 'error';
      }
      return 'success';
    }

    return 'success';
  };

  const edges: Edge[] = [];
  Object.entries(parsed.connections || {}).forEach(([from, exits]) => {
    if (!exits) {
      return;
    }
    const exitChannels = exits as Record<string, any>;
    Object.entries(exitChannels).forEach(([exitType, conn]) => {
      const sourceId = nameToId.get(from) ?? from;
      const sourceNode = nodeById.get(sourceId);

      const enqueueEdges = (value: any, outputIndex?: number) => {
        flattenConnections(value).forEach((link) => {
          if (!link || typeof link !== 'object') return;
          const targetId = nameToId.get(link.node) ?? link.node;
          if (!targetId) return;

          const edgeType = resolveEdgeType(exitType, outputIndex, sourceNode?.type);
          edges.push({ from: sourceId, to: targetId, on: edgeType });
        });
      };

      if (Array.isArray(conn)) {
        conn.forEach((entry, index) => enqueueEdges(entry, index));
      } else {
        enqueueEdges(conn);
      }
    });
  });

  return {
    nodes,
    edges,
    meta: {
      credentials: !!parsed.credentials,
      nodeLines: Object.fromEntries(nodeLines),
    },
  };
}


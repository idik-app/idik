// decisionGraph.ts
export interface DecisionNode {
  id: string;
  condition: string;
  next: string[];
}

export class DecisionGraph {
  nodes: DecisionNode[] = [];
  addNode(node: DecisionNode) {
    this.nodes.push(node);
  }
}

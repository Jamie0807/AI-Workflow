import { ConditionNode } from './condition-node'
import { EndNode } from './end-node'
import { HttpNode } from './http-node'
import { KnowledgeNode } from './knowledge-node'
import { LLMNode } from './llm-node'
import { StartNode } from './start-node'

export const nodeTypes = {
    start: StartNode,
    llm: LLMNode,
    http: HttpNode,
    end: EndNode,
    condition: ConditionNode,
    knowledge: KnowledgeNode,
}

export { StartNode }
export { LLMNode }
export { HttpNode }
export { EndNode }
export { ConditionNode }
export { KnowledgeNode }

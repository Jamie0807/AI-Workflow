import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'

import { VariableMentionComponent } from './variable-mention-component'

export interface VariableMentionOptions {
    HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        variableMention: {
            insertVariable: (attrs: { nodeId: string; nodeLabel: string; variableName: string; variableLabel: string }) => ReturnType
        }
    }
}

/**
 * 变量提及节点扩展
 * 用于在编辑器中渲染变量标签
 */
export const VariableMention = Node.create<VariableMentionOptions>({
    name: 'variableMention',

    group: 'inline',

    inline: true,

    selectable: true,

    atom: true,

    addOptions() {
        return {
            HTMLAttributes: {},
        }
    },

    addAttributes() {
        return {
            nodeId: {
                default: null,
                parseHTML: (element: HTMLElement) => element.getAttribute('data-node-id'),
                renderHTML: (attributes: Record<string, unknown>) => ({
                    'data-node-id': attributes.nodeId,
                }),
            },
            nodeLabel: {
                default: null,
                parseHTML: (element: HTMLElement) => element.getAttribute('data-node-label'),
                renderHTML: (attributes: Record<string, unknown>) => ({
                    'data-node-label': attributes.nodeLabel,
                }),
            },
            variableName: {
                default: null,
                parseHTML: (element: HTMLElement) => element.getAttribute('data-variable-name'),
                renderHTML: (attributes: Record<string, unknown>) => ({
                    'data-variable-name': attributes.variableName,
                }),
            },
            variableLabel: {
                default: null,
                parseHTML: (element: HTMLElement) => element.getAttribute('data-variable-label'),
                renderHTML: (attributes: Record<string, unknown>) => ({
                    'data-variable-label': attributes.variableLabel,
                }),
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-variable-mention]',
            },
        ]
    },

    renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
        return [
            'span',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                'data-variable-mention': '',
                class: 'variable-mention',
            }),
        ]
    },

    addNodeView() {
        return ReactNodeViewRenderer(VariableMentionComponent)
    },

    addCommands() {
        return {
            insertVariable:
                (attrs: { nodeId: string; nodeLabel: string; variableName: string; variableLabel: string }) =>
                ({ commands }) => {
                    return commands.insertContent({
                        type: this.name,
                        attrs,
                    })
                },
        }
    },
})

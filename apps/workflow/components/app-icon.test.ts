import { getAppIconOption, getAppTypeTone } from './app-icon'

if (getAppIconOption('🤖').id !== 'assistant') {
    throw new Error('legacy robot emoji should map to the assistant icon')
}

if (getAppIconOption('📊').id !== 'analytics') {
    throw new Error('legacy chart emoji should map to the analytics icon')
}

if (getAppTypeTone('workflow').accent !== '#4F46E5') {
    throw new Error('workflow apps should use the primary indigo accent')
}

import { describe, expect, it } from 'vitest'

import { parseJsonValue, resolveJsonPath } from '../json-path'

describe('parseJsonValue', () => {
    it('parses a JSON string', () => {
        expect(parseJsonValue('{"risk_level":"HIGH"}')).toEqual({ risk_level: 'HIGH' })
    })

    it('parses a fenced JSON response', () => {
        expect(parseJsonValue('```json\n{"risk_level":"HIGH"}\n```')).toEqual({ risk_level: 'HIGH' })
    })

    it('keeps objects unchanged and returns undefined for invalid JSON', () => {
        const object = { risk_level: 'LOW' }
        expect(parseJsonValue(object)).toBe(object)
        expect(parseJsonValue('not json')).toBeUndefined()
    })
})

describe('resolveJsonPath', () => {
    const value = { analysis: { risk_level: 'HIGH' }, recommendations: ['evacuate'], items: [{ name: 'flood' }] }

    it('returns the parsed root value for an empty path', () => {
        expect(resolveJsonPath('```json\n{"risk_level":"HIGH"}\n```', '')).toEqual({ found: true, value: { risk_level: 'HIGH' } })
    })

    it('resolves dotted object paths', () => {
        expect(resolveJsonPath(value, 'analysis.risk_level')).toEqual({ found: true, value: 'HIGH' })
    })

    it('resolves array indexes', () => {
        expect(resolveJsonPath(value, 'recommendations[0]')).toEqual({ found: true, value: 'evacuate' })
        expect(resolveJsonPath(value, 'items[0].name')).toEqual({ found: true, value: 'flood' })
    })

    it('reports a missing path without throwing', () => {
        expect(resolveJsonPath(value, 'analysis.missing')).toEqual({ found: false, value: undefined })
    })
})

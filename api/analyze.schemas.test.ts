
import { describe, expect, it } from 'vitest'
import {
  bodySchema,
  MAX_MESSAGE_LENGTH,
  resultSchema,
} from './analyze.schemas'

const validResult = {
  riskLevel: 'high',
  summary: 'The message requests an upfront payment.',
  warningSigns: [
    {
      signal: 'Upfront payment',
      evidence: 'Pay a registration fee first',
      explanation: 'Unexpected advance fees can indicate fraud.',
    },
  ],
  reassuringSigns: [],
  recommendedActions: ['Verify the organization using its official website.'],
  uncertainty: 'The sender and organization cannot be verified from this message alone.',
}

describe('ScamLens request validation', () => {
  it('accepts a normal message', () => {
    expect(bodySchema.safeParse({ message: 'Please verify this message.' }).success)
      .toBe(true)
  })

  it('rejects an empty message', () => {
    expect(bodySchema.safeParse({ message: '   ' }).success).toBe(false)
  })

  it('rejects a message exceeding the length limit', () => {
    expect(
      bodySchema.safeParse({ message: 'a'.repeat(MAX_MESSAGE_LENGTH + 1) }).success,
    ).toBe(false)
  })

  it('rejects a missing message', () => {
    expect(bodySchema.safeParse({}).success).toBe(false)
  })
})

describe('ScamLens AI response validation', () => {
  it('accepts a valid analysis', () => {
    expect(resultSchema.safeParse(validResult).success).toBe(true)
  })

  it('rejects an unsupported risk level', () => {
    expect(
      resultSchema.safeParse({ ...validResult, riskLevel: 'certain scam' }).success,
    ).toBe(false)
  })

  it('rejects an empty summary', () => {
    expect(
      resultSchema.safeParse({ ...validResult, summary: '' }).success,
    ).toBe(false)
  })

  it('rejects missing recommended actions', () => {
    expect(
      resultSchema.safeParse({ ...validResult, recommendedActions: [] }).success,
    ).toBe(false)
  })

  it('rejects more than eight warning signs', () => {
    const tooMany = Array.from({ length: 9 }, () => ({
      signal: 'Warning',
      evidence: 'Example',
      explanation: 'Example explanation',
    }))

    expect(
      resultSchema.safeParse({ ...validResult, warningSigns: tooMany }).success,
    ).toBe(false)
  })
})

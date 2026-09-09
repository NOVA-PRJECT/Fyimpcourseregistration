import { CreditLedgerService } from './credit-ledger.service'
import { SupabaseService } from '../../core/database/supabase.service'

describe('CreditLedgerService', () => {
  let service: CreditLedgerService

  const mockSupabaseService = {
    admin: {
      from: jest.fn(),
    },
  } as unknown as SupabaseService

  beforeEach(() => {
    service = new CreditLedgerService(mockSupabaseService)
  })

  describe('deriveLevelBand', () => {
    it('should derive 100s for level 1 codes', () => {
      expect(service.deriveLevelBand('ENG101')).toBe('100s')
      expect(service.deriveLevelBand('PHY-102')).toBe('100s')
      expect(service.deriveLevelBand('MDC 105')).toBe('100s')
    })

    it('should derive 200s for level 2 codes', () => {
      expect(service.deriveLevelBand('CS201')).toBe('200s')
      expect(service.deriveLevelBand('MATH204')).toBe('200s')
    })

    it('should derive 300s, 400s, and 500s accurately', () => {
      expect(service.deriveLevelBand('BOT301')).toBe('300s')
      expect(service.deriveLevelBand('CHE401')).toBe('400s')
      expect(service.deriveLevelBand('INT501')).toBe('500s')
    })

    it('should return Other when no digits are present', () => {
      expect(service.deriveLevelBand('INTERNSHIP')).toBe('Other')
      expect(service.deriveLevelBand('')).toBe('Other')
    })
  })

  describe('normalizeCategory', () => {
    it('should map standard categories', () => {
      expect(service.normalizeCategory('AEC')).toBe('AEC')
      expect(service.normalizeCategory('SEC')).toBe('SEC')
      expect(service.normalizeCategory('VAC')).toBe('VAC')
      expect(service.normalizeCategory('MDC')).toBe('MDC')
    })

    it('should combine DSC, DSE, DSS into DSC / DSE', () => {
      expect(service.normalizeCategory('DSC')).toBe('DSC / DSE')
      expect(service.normalizeCategory('DSE')).toBe('DSC / DSE')
      expect(service.normalizeCategory('DSS')).toBe('DSC / DSE')
    })

    it('should identify Internship', () => {
      expect(service.normalizeCategory('INT')).toBe('Internship')
      expect(service.normalizeCategory('INTERNSHIP')).toBe('Internship')
      expect(service.normalizeCategory('', 'Summer Internship Program')).toBe('Internship')
    })

    it('should identify Research Project', () => {
      expect(service.normalizeCategory('RPH')).toBe('Research Project')
      expect(service.normalizeCategory('', 'Honours Research Project')).toBe('Research Project')
    })
  })
})

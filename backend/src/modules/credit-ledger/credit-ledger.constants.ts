/**
 * KU-FYIMP Regulation 2024 Credit Rules & Thresholds
 */

export const CATEGORY_REQUIREMENTS = {
  AEC: { name: 'Ability Enhancement Course (AEC)', min3Year: 9, min4Year: 9 },
  SEC: { name: 'Skill Enhancement Course (SEC)', min3Year: 9, min4Year: 9 },
  VAC: { name: 'Value Addition Course (VAC)', min3Year: 6, min4Year: 6 },
  MDC: { name: 'Multidisciplinary Course (MDC)', min3Year: 9, min4Year: 9 },
  INTERNSHIP: { name: 'Internship', min3Year: 4, min4Year: 4 },
  DSC_DSE: { name: 'Discipline-Specific (DSC / DSE Combined)', min3Year: 96, min4Year: 124 },
  RESEARCH_PROJECT: { name: 'Research Project', min3Year: 0, min4Year: 12 },
} as const

export const LEVEL_BAND_REQUIREMENTS = {
  '100s': { name: '100-Level Introductory', min: 24, firstDigit: '1' },
  '200s': { name: '200-Level Intermediate', min: 32, firstDigit: '2' },
  '300s': { name: '300-Level Advanced', min: 38, firstDigit: '3' },
  '400s': { name: '400-Level Honours / Advanced', min: 44, firstDigit: '4' },
  '500s': { name: '500-Level Integrated PG', min: 40, firstDigit: '5' },
} as const

export const DEGREE_EXIT_THRESHOLDS = {
  THREE_YEAR_UG: {
    title: '3-Year UG Exit',
    creditsRequired: 133,
    requiredBands: ['100s', '200s', '300s'] as const,
  },
  FOUR_YEAR_HONOURS: {
    title: '4-Year Honours Exit',
    creditsRequired: 177,
    requiredBands: ['100s', '200s', '300s', '400s'] as const,
  },
  FIVE_YEAR_INTEGRATED_PG: {
    title: '5-Year Integrated PG Exit',
    creditsRequired: 217,
    requiredBands: ['100s', '200s', '300s', '400s', '500s'] as const,
  },
} as const

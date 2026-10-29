export interface BrewObservation {
  fields: Record<string, string>
  curveType: string
  curveSummary: string
  timingBasis: string
  evidence: { field: string; text: string; confidence: string }[]
  warnings: string[]
}
export interface BrewAnalysis {
  summary: string
  findings: { observation: string; hypothesis: string; possibleTaste: string; confidence: string }[]
  adjustments: { change: string; reason: string; check: string }[]
  limitations: string[]
  questions: string[]
}
export interface BrewOptimization {
  observation: BrewObservation
  analysis?: BrewAnalysis
  feeling: string
  method: string
  updatedAt: string
}

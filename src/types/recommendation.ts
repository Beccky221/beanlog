export interface CoffeePreferences {
  brew: 'any' | 'espresso' | 'filter' | 'cold' | 'omni'
  origins: string[]
  excludedOrigins: string[]
  varieties: string[]
  processes: string[]
  roasts: string[]
  drink: 'any' | 'black' | 'milk'
  market: 'china' | 'any'
  maxPrice100g: number | null
}
export interface CoffeeProduct {
  listingPriceCny?: number | null
  imageUrl?: string
  brew?: 'espresso' | 'filter' | 'cold' | 'omni'
  id: string
  name: string
  roaster: string
  origins: string[]
  varieties: string[]
  processes: string[]
  roast: string
  flavors: string[]
  drink: 'any' | 'black' | 'milk'
  market: 'china' | 'overseas' | 'unknown'
  price100gCny: number | null
  priceNote: string
  url: string
  evidence: string
  checkedAt: string
  source: 'catalog' | 'qwen' | 'onebound'
}
export interface RoasterSuggestion {
  id: string
  name: string
  url: string
  evidence: string
  checkedAt: string
  source: 'catalog' | 'qwen' | 'onebound'
}
export interface RecommendationState {
  preferences: CoffeePreferences
  products: CoffeeProduct[]
  roasters: RoasterSuggestion[]
  favoriteIds: string[]
  lastSearchAt?: string
  lastSearchPreferences?: string
}

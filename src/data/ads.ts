// Ad types and data are now exported from ./categories.ts
// This file re-exports for backward compatibility
export type { Ad } from './categories';
export { standardAds, secureAds, adsData } from './categories';

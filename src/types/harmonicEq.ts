export interface HarmonicEqBand { order: number; frequencyHz: number; gainDb: number; q: number; }
export interface HarmonicEqPreset { id: string; name: string; createdAt: string; takeId?: string; bands: HarmonicEqBand[]; }

/**
 * Unified cinema catalog – all regions of Thailand (Major + SF).
 * Split into regional files to keep each file manageable.
 */
export type { Chain, CinemaEntry } from './types';
export { BANGKOK_CINEMAS } from './catalog-bangkok';
export { CENTRAL_CINEMAS } from './catalog-central';
export { NORTH_CINEMAS } from './catalog-north';
export { NORTHEAST_CINEMAS } from './catalog-northeast';
export { EAST_CINEMAS } from './catalog-east';
export { SOUTH_CINEMAS, WEST_CINEMAS } from './catalog-south-west';

import { BANGKOK_CINEMAS } from './catalog-bangkok';
import { CENTRAL_CINEMAS } from './catalog-central';
import { NORTH_CINEMAS } from './catalog-north';
import { NORTHEAST_CINEMAS } from './catalog-northeast';
import { EAST_CINEMAS } from './catalog-east';
import { SOUTH_CINEMAS, WEST_CINEMAS } from './catalog-south-west';

/** Full Thailand-wide cinema catalog (all chains, all regions) */
export const CINEMA_CATALOG = [
    ...BANGKOK_CINEMAS,
    ...CENTRAL_CINEMAS,
    ...NORTH_CINEMAS,
    ...NORTHEAST_CINEMAS,
    ...EAST_CINEMAS,
    ...SOUTH_CINEMAS,
    ...WEST_CINEMAS,
];

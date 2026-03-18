export type Chain = 'major' | 'sf';

export interface CinemaEntry {
    id: string;
    chain: Chain;
    nameEn: string;
    nameTh: string;
    province: string;
    district: string;
    address: string;
    lat: number;
    lon: number;
    halls: string[];
    screenTypes: string[];
}

export const API_BASE = 'https://api.pokemontcg.io/v2';
export const TODAY = new Date('2026-04-03T23:59:59Z');
export const UI_STORAGE_KEY = 'tcg-pokemon-ui-v2';
export const COLLECTIONS_STORAGE_KEY = 'tcg-pokemon-collections-v1';
export const AUTH_SESSION_STORAGE_KEY = 'tcg-pokemon-auth-v1';
export const GOOGLE_IDENTITY_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
export const POKEMON_TCG_API_KEY = import.meta.env.VITE_POKEMON_TCG_API_KEY || '';
export const DB_NAME = 'tcg-pokemon-cache';
export const DB_VERSION = 1;
export const STORE_NAME = 'resources';
export const SETS_TTL = 24 * 60 * 60 * 1000;
export const CARDS_TTL = 7 * 24 * 60 * 60 * 1000;
export const SEARCH_TTL = 60 * 60 * 1000;
export const PAGE_SIZE = 24;
export const CARD_FIELDS = 'id,name,number,images,artist,supertype,subtypes,rarity,types,hp,flavorText,evolvesFrom,level,nationalPokedexNumbers,tcgplayer,cardmarket,set';
export const SET_FIELDS = 'id,name,series,printedTotal,total,ptcgoCode,releaseDate,images';

export const SPECIAL_SET_NAMES = new Set([
  'Southern Islands', 'Legendary Collection', 'Pokemon Rumble', 'Call of Legends', 'Dragon Vault',
  'Double Crisis', 'Generations', 'Shining Legends', 'Dragon Majesty', 'Detective Pikachu',
  'Hidden Fates', "Champion's Path", 'Shining Fates', 'Celebrations', 'Pokemon GO',
  'Crown Zenith', '151', 'Paldean Fates', 'Shrouded Fable', 'Black Bolt', 'White Flare'
]);

export const OTHER_SERIES_ALLOWED = new Set(['Southern Islands', 'Legendary Collection', 'Pokemon Rumble']);

export const EXCLUDED_NAME_PATTERNS = [
  /Promos/i, /Black Star/i, /Trainer Kit/i, /McDonald's/i, /Futsal/i, /Starter Set/i,
  /Energies$/i, /Shiny Vault/i, /Trainer Gallery/i, /Galarian Gallery/i, /Classic Collection/i,
  /^POP Series/i, /^Best of Game$/i
];

export type Lang = 'lv' | 'en';
export const localUrl = (path = '') => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

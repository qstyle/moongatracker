// База приложения. По умолчанию пусто → относительные пути на том же домене
// (приложение отдаёт /register и /login). Если лендинг и апп разъедутся по разным
// доменам — задать VITE_APP_URL (напр. https://app.moonga.ru).
const APP_BASE = (import.meta.env.VITE_APP_URL as string | undefined) ?? '';

export const REGISTER_URL = `${APP_BASE}/register`;
export const LOGIN_URL = `${APP_BASE}/login`;

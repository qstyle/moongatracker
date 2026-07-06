// База приложения (куда ведут «Начать»/«Войти»). Значение приходит В РАНТАЙМЕ:
// лендинг-сервер инжектит window.__APP_URL__ в index.html из env APP_URL при
// отдаче страницы. Так один образ разворачивается на любом домене без пересборки —
// домен задаётся переменной окружения. Пусто → относительные пути на том же домене.
declare global {
  interface Window {
    __APP_URL__?: string;
  }
}

const APP_BASE =
  (typeof window !== 'undefined' ? window.__APP_URL__ : '') ?? '';

export const REGISTER_URL = `${APP_BASE}/register`;
export const LOGIN_URL = `${APP_BASE}/login`;

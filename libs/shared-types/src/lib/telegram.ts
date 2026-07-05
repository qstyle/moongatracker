export interface TelegramLinkStatus {
  connected: boolean;
  /** Present only when connected. */
  chatId?: string | null;
}

/** Response of POST /api/telegram/link-code — a one-time deep-link. */
export interface TelegramLinkCodeResponse {
  code: string;
  /** Ready-to-open deep link, e.g. https://t.me/<bot>?start=<code>. */
  url: string;
  expiresAt: string;
}

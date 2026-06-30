import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  formatCardKey,
  parseCardNumber,
  type BoardSummaryDto,
  type CardDto,
} from '@moongatracker/shared-types';
import { apiGet } from '../api-client.js';

export const getCardTool: Tool = {
  name: 'get_card',
  description:
    'Получить карточку одним из способов: по внутреннему ID (cardId); ' +
    'по доске и номеру (boardId + number); ' +
    'или по человекочитаемому ключу вида "РАЗР2-15" в рамках проекта (key + projectId).',
  inputSchema: {
    type: 'object',
    properties: {
      cardId: { type: 'string', description: 'Внутренний ID карточки (cuid)' },
      boardId: { type: 'string', description: 'ID доски (вместе с number)' },
      number: {
        type: 'number',
        description: 'Номер карточки внутри доски (вместе с boardId)',
      },
      key: {
        type: 'string',
        description: 'Человеческий ключ, напр. "РАЗР2-15" (вместе с projectId)',
      },
      projectId: {
        type: 'string',
        description: 'ID проекта — нужен для резолва ключа',
      },
    },
  },
};

export async function getCard(args: {
  cardId?: string;
  boardId?: string;
  number?: number;
  key?: string;
  projectId?: string;
}): Promise<string> {
  let path: string;

  if (args.cardId) {
    path = `/api/cards/${args.cardId}`;
  } else if (args.boardId && args.number != null) {
    path = `/api/cards/by-board/${args.boardId}/number/${args.number}`;
  } else if (args.key && args.projectId) {
    const number = parseCardNumber(args.key);
    if (number == null)
      throw new Error(`Не удалось извлечь номер из ключа "${args.key}"`);
    // Reconstruct the key from each board (single source of truth) and match —
    // robust to the lossy prefix, renames and numeric-prefix boards.
    const boards = await apiGet<BoardSummaryDto[]>(
      `/api/projects/${args.projectId}/boards`,
    );
    const wanted = args.key.toUpperCase();
    const board = boards.find(
      (b) => formatCardKey(b.name, b.seq, number).toUpperCase() === wanted,
    );
    if (!board)
      throw new Error(
        `Доска для ключа "${args.key}" не найдена в проекте ${args.projectId}`,
      );
    path = `/api/cards/by-board/${board.id}/number/${number}`;
  } else {
    throw new Error('Укажите cardId, либо boardId+number, либо key+projectId');
  }

  const card = await apiGet<CardDto>(path);
  return JSON.stringify(card, null, 2);
}

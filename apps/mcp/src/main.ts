import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { listProjectsTool, listProjects } from './tools/list-projects.js';
import { listCardsTool, listCards } from './tools/list-cards.js';
import { getCardTool, getCard } from './tools/get-card.js';
import { createCardTool, createCard } from './tools/create-card.js';
import { moveCardTool, moveCard } from './tools/move-card.js';
import { updateCardTool, updateCard } from './tools/update-card.js';
import { commentCardTool, commentCard } from './tools/comment-card.js';
import { listActivityTool, listActivity } from './tools/list-activity.js';

const server = new Server(
  { name: 'moongatracker', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

const tools = [
  listProjectsTool,
  listCardsTool,
  getCardTool,
  createCardTool,
  moveCardTool,
  updateCardTool,
  commentCardTool,
  listActivityTool,
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    let text: string;
    switch (name) {
      case 'list_projects':
        text = await listProjects(args as { projectId: string });
        break;
      case 'list_cards':
        text = await listCards(args as { boardId: string; columnId?: string });
        break;
      case 'get_card':
        text = await getCard(args as { cardId: string });
        break;
      case 'create_card':
        text = await createCard(args as any);
        break;
      case 'move_card':
        text = await moveCard(args as { cardId: string; columnId: string });
        break;
      case 'update_card':
        text = await updateCard(
          args as {
            cardId: string;
            title?: string;
            body?: string;
            priority?: 'urgent' | 'normal' | 'low';
            columnId?: string;
          },
        );
        break;
      case 'comment_card':
        text = await commentCard(args as { cardId: string; body: string });
        break;
      case 'list_activity':
        text = await listActivity(args as { cardId: string });
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    return { content: [{ type: 'text', text }] };
  } catch (e: any) {
    return {
      content: [{ type: 'text', text: `Error: ${e.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);

#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { STUDIO_BRIEF } from './onboarding.js';
import { getStartedTool, getStarted } from './tools/get-started.js';
import { listProjectsTool, listProjects } from './tools/list-projects.js';
import { listBoardsTool, listBoards } from './tools/list-boards.js';
import { listCardsTool, listCards } from './tools/list-cards.js';
import { listMyCardsTool, listMyCards } from './tools/list-my-cards.js';
import { getCardTool, getCard } from './tools/get-card.js';
import { createCardTool, createCard } from './tools/create-card.js';
import { moveCardTool, moveCard } from './tools/move-card.js';
import { updateCardTool, updateCard } from './tools/update-card.js';
import { assignCardTool, assignCard } from './tools/assign-card.js';
import {
  proposeCardDeletionTool,
  proposeCardDeletion,
} from './tools/propose-card-deletion.js';
import { commentCardTool, commentCard } from './tools/comment-card.js';
import { listCommentsTool, listComments } from './tools/list-comments.js';
import { listActivityTool, listActivity } from './tools/list-activity.js';
import { listWikiTool, listWiki } from './tools/list-wiki.js';
import { getWikiPageTool, getWikiPage } from './tools/get-wiki-page.js';
import { createWikiSectionTool, createWikiSection } from './tools/create-wiki-section.js';
import { createWikiPageTool, createWikiPage } from './tools/create-wiki-page.js';
import { updateWikiPageTool, updateWikiPage } from './tools/update-wiki-page.js';
import { getCanvasTool, getCanvas } from './tools/get-canvas.js';

const server = new Server(
  { name: 'moonga-studio', version: '0.3.0' },
  {
    capabilities: { tools: {}, resources: {} },
    // Shown to the client at handshake so every agent lands oriented.
    instructions: STUDIO_BRIEF,
  },
);

const ONBOARDING_URI = 'studio://onboarding';

const tools = [
  getStartedTool,
  listProjectsTool,
  listBoardsTool,
  listCardsTool,
  listMyCardsTool,
  getCardTool,
  createCardTool,
  moveCardTool,
  updateCardTool,
  assignCardTool,
  proposeCardDeletionTool,
  commentCardTool,
  listCommentsTool,
  listActivityTool,
  listWikiTool,
  getWikiPageTool,
  createWikiSectionTool,
  createWikiPageTool,
  updateWikiPageTool,
  getCanvasTool,
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    let text: string;
    switch (name) {
      case 'get_started':
        text = await getStarted();
        break;
      case 'list_projects':
        text = await listProjects();
        break;
      case 'list_boards':
        text = await listBoards(args as { projectId: string });
        break;
      case 'list_cards':
        text = await listCards(args as { boardId: string; columnId?: string });
        break;
      case 'list_my_cards':
        text = await listMyCards();
        break;
      case 'get_card':
        text = await getCard(
          args as {
            cardId?: string;
            boardId?: string;
            number?: number;
            key?: string;
            projectId?: string;
          },
        );
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
            assigneeType?: 'user' | 'agent';
            assigneeId?: string;
          },
        );
        break;
      case 'assign_card':
        text = await assignCard(args as { cardId: string; target: 'me' | 'none' });
        break;
      case 'propose_card_deletion':
        text = await proposeCardDeletion(
          args as { cardId: string; reason?: string },
        );
        break;
      case 'comment_card':
        text = await commentCard(args as { cardId: string; body: string });
        break;
      case 'list_comments':
        text = await listComments(args as { cardId: string });
        break;
      case 'list_activity':
        text = await listActivity(args as { cardId: string });
        break;
      case 'list_wiki':
        text = await listWiki(args as { projectId: string });
        break;
      case 'get_wiki_page':
        text = await getWikiPage(args as { pageId: string });
        break;
      case 'create_wiki_section':
        text = await createWikiSection(
          args as { projectId: string; title: string },
        );
        break;
      case 'create_wiki_page':
        text = await createWikiPage(
          args as {
            projectId: string;
            sectionId: string;
            title: string;
            body?: string;
          },
        );
        break;
      case 'update_wiki_page':
        text = await updateWikiPage(
          args as { pageId: string; title?: string; body?: string },
        );
        break;
      case 'get_canvas':
        text = await getCanvas(args as { projectId: string });
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

// Onboarding brief also offered as a readable resource for clients that
// browse resources rather than surface `instructions`.
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: ONBOARDING_URI,
      name: 'Moonga Studio — agent onboarding',
      description:
        'Who you are, why you are here, and how the studio workflow works.',
      mimeType: 'text/markdown',
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
  if (req.params.uri !== ONBOARDING_URI) {
    throw new Error(`Unknown resource: ${req.params.uri}`);
  }
  return {
    contents: [
      { uri: ONBOARDING_URI, mimeType: 'text/markdown', text: STUDIO_BRIEF },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { apiGet } from '../api-client.js';
import type { CardDto, ProjectDto } from '@moonga-studio/shared-types';
import { STUDIO_BRIEF } from '../onboarding.js';

export const getStartedTool: Tool = {
  name: 'get_started',
  description:
    'Read this first. Explains who you are in Moonga Studio, why you are here, how the workflow works, and your recommended first steps — with your live projects and assigned cards.',
  inputSchema: { type: 'object', properties: {} },
};

export async function getStarted(): Promise<string> {
  let live: string;
  try {
    const [projects, myCards] = await Promise.all([
      apiGet<ProjectDto[]>('/api/projects'),
      apiGet<CardDto[]>('/api/cards/assigned'),
    ]);
    const projLine = projects.length
      ? projects.map((p) => `- ${p.name} (${p.id})`).join('\n')
      : '- (none yet)';
    const cardLine = myCards.length
      ? myCards.map((c) => `- #${c.number} ${c.title}`).join('\n')
      : '- (nothing assigned — pick up work from a board)';
    live =
      `\n\nYOUR VENTURES (${projects.length})\n${projLine}` +
      `\n\nASSIGNED TO YOU (${myCards.length})\n${cardLine}`;
  } catch (e: any) {
    live = `\n\n(Live context unavailable: ${e.message})`;
  }
  return STUDIO_BRIEF + live;
}

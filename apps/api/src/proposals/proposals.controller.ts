import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ProposalDto } from '@moonga-studio/shared-types';
import { CreateDeletionProposalDto } from './dto/create-deletion-proposal.dto';
import { ProposalsService } from './proposals.service';

@Controller()
export class ProposalsController {
  constructor(private readonly proposals: ProposalsService) {}

  @Post('cards/:cardId/deletion-proposal')
  createDeletion(
    @Param('cardId') cardId: string,
    @Body() dto: CreateDeletionProposalDto,
    @Req() req: any,
  ): Promise<ProposalDto> {
    return this.proposals.createDeleteCard(cardId, dto.reason ?? null, req.user);
  }

  // The caller's approval inbox across projects they decide.
  @Get('proposals/pending')
  listMine(@Req() req: any): Promise<ProposalDto[]> {
    return this.proposals.listMyPending(req.user);
  }

  @Get('projects/:projectId/proposals')
  listForProject(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ): Promise<ProposalDto[]> {
    return this.proposals.listPending(projectId, req.user);
  }

  @Post('proposals/:id/approve')
  approve(@Param('id') id: string, @Req() req: any): Promise<ProposalDto> {
    return this.proposals.approve(id, req.user);
  }

  @Post('proposals/:id/reject')
  reject(@Param('id') id: string, @Req() req: any): Promise<ProposalDto> {
    return this.proposals.reject(id, req.user);
  }
}

import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiTokenDto,
  CreateApiTokenResponse,
} from '@moongatracker/shared-types';
import { ApiTokensService } from './api-tokens.service';
import { CreateApiTokenDto } from './dto/create-api-token.dto';

@Controller()
export class ApiTokensController {
  constructor(private readonly apiTokens: ApiTokensService) {}

  @Post('projects/:projectId/api-tokens')
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateApiTokenDto,
    @Req() req: any,
  ): Promise<CreateApiTokenResponse> {
    if (req.user?.type === 'agent')
      throw new ForbiddenException('Agents cannot create tokens');
    return this.apiTokens.create(projectId, dto.name, dto.scopes);
  }

  @Get('projects/:projectId/api-tokens')
  list(@Param('projectId') projectId: string): Promise<ApiTokenDto[]> {
    return this.apiTokens.list(projectId);
  }

  @Delete('projects/:projectId/api-tokens/:id')
  @HttpCode(204)
  revoke(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.apiTokens.revoke(projectId, id);
  }
}

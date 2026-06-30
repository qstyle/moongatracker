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

  @Post('orgs/:orgId/api-tokens')
  create(
    @Param('orgId') orgId: string,
    @Body() dto: CreateApiTokenDto,
    @Req() req: any,
  ): Promise<CreateApiTokenResponse> {
    if (req.user?.type === 'agent')
      throw new ForbiddenException('Agents cannot create tokens');
    return this.apiTokens.create(orgId, dto.name, dto.scopes);
  }

  @Get('orgs/:orgId/api-tokens')
  list(@Param('orgId') orgId: string): Promise<ApiTokenDto[]> {
    return this.apiTokens.list(orgId);
  }

  @Delete('orgs/:orgId/api-tokens/:id')
  @HttpCode(204)
  revoke(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.apiTokens.revoke(orgId, id);
  }
}

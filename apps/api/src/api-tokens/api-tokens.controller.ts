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
} from '@moonga-studio/shared-types';
import { ApiTokensService } from './api-tokens.service';
import { CreateApiTokenDto } from './dto/create-api-token.dto';

// Tokens are owned by a user and grant access to all of that user's projects,
// so token management lives at the user level (not nested under a project).
@Controller('api-tokens')
export class ApiTokensController {
  constructor(private readonly apiTokens: ApiTokensService) {}

  @Post()
  create(
    @Body() dto: CreateApiTokenDto,
    @Req() req: any,
  ): Promise<CreateApiTokenResponse> {
    if (req.user?.type !== 'user')
      throw new ForbiddenException('Agents cannot create tokens');
    return this.apiTokens.create(req.user.sub, dto.name, dto.scopes);
  }

  @Get()
  list(@Req() req: any): Promise<ApiTokenDto[]> {
    if (req.user?.type !== 'user')
      throw new ForbiddenException('Agents cannot list tokens');
    return this.apiTokens.listForUser(req.user.sub);
  }

  @Delete(':id')
  @HttpCode(204)
  revoke(@Param('id') id: string, @Req() req: any): Promise<void> {
    if (req.user?.type !== 'user')
      throw new ForbiddenException('Agents cannot revoke tokens');
    return this.apiTokens.revoke(req.user.sub, id);
  }
}

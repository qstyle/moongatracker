import {
  Body,
  Controller,
  Delete,
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

@Controller('api-tokens')
export class ApiTokensController {
  constructor(private readonly svc: ApiTokensService) {}

  @Post()
  create(
    @Body() dto: CreateApiTokenDto,
    @Req() req: any,
  ): Promise<CreateApiTokenResponse> {
    return this.svc.create(req.user.sub, dto.name, dto.scope);
  }

  @Get()
  list(@Req() req: any): Promise<ApiTokenDto[]> {
    return this.svc.list(req.user.sub);
  }

  @Delete(':id')
  @HttpCode(204)
  revoke(@Param('id') id: string, @Req() req: any): Promise<void> {
    return this.svc.revoke(req.user.sub, id);
  }
}

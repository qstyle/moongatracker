import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import { MemberDto, OrgDto } from '@moongatracker/shared-types';
import { OrgsService } from './orgs.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { UpdateOrgDto } from './dto/update-org.dto';

@Controller('orgs')
export class OrgsController {
  constructor(private readonly orgs: OrgsService) {}

  @Get()
  listForUser(@Request() req: { user: { sub: string } }): Promise<OrgDto[]> {
    return this.orgs.listForUser(req.user.sub);
  }

  @Post()
  create(
    @Body() dto: CreateOrgDto,
    @Request() req: { user: { sub: string } },
  ): Promise<OrgDto> {
    return this.orgs.create(dto.name, req.user.sub);
  }

  @Patch(':orgId')
  update(
    @Param('orgId') orgId: string,
    @Body() dto: UpdateOrgDto,
    @Request() req: { user: { sub: string } },
  ): Promise<OrgDto> {
    return this.orgs.update(orgId, req.user.sub, dto.name!);
  }

  @Get(':orgId/members')
  getMembers(
    @Param('orgId') orgId: string,
    @Request() req: { user: { sub: string } },
  ): Promise<MemberDto[]> {
    return this.orgs.getMembers(orgId, req.user.sub);
  }
}

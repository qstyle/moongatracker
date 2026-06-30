import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Request,
} from '@nestjs/common';
import { MemberDto, OrgDto } from '@moongatracker/shared-types';
import { OrgsService } from './orgs.service';
import { AddMemberDto } from './dto/add-member.dto';
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

  @Post(':orgId/members')
  addMember(
    @Param('orgId') orgId: string,
    @Body() dto: AddMemberDto,
    @Req() req: any,
  ): Promise<MemberDto> {
    return this.orgs.addMember(orgId, dto.email, req.user.sub);
  }

  @Delete(':orgId/members/:userId')
  @HttpCode(204)
  removeMember(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Req() req: any,
  ): Promise<void> {
    return this.orgs.removeMember(orgId, userId, req.user.sub);
  }
}

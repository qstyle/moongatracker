import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDeletionProposalDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

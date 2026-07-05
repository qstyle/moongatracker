import { IsBoolean, IsOptional } from 'class-validator';

/** PATCH /telegram/preferences — every toggle is optional (partial update). */
export class UpdateNotificationPrefsDto {
  @IsOptional()
  @IsBoolean()
  cardMoved?: boolean;

  @IsOptional()
  @IsBoolean()
  cardAssigned?: boolean;

  @IsOptional()
  @IsBoolean()
  cardCommented?: boolean;

  @IsOptional()
  @IsBoolean()
  cardAssignedToAgent?: boolean;
}

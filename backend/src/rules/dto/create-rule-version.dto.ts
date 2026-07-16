import { IsString, IsNotEmpty, IsInt, IsOptional, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RuleValueDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsNotEmpty()
  valueType: string;
}

export class CreateRuleVersionDto {
  @IsInt()
  @IsNotEmpty()
  definitionId: number;

  @IsInt()
  @IsNotEmpty()
  versionNumber: number;

  @IsDateString()
  @IsNotEmpty()
  effectiveFrom: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleValueDto)
  values: RuleValueDto[];
}

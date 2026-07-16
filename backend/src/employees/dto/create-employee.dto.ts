import { IsString, IsInt, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsInt()
  @IsNotEmpty()
  departmentId: number;

  @IsInt()
  @IsNotEmpty()
  shiftId: number;

  @IsDateString()
  @IsNotEmpty()
  hireDate: string;

  @IsOptional()
  @IsDateString()
  terminationDate?: string;
}

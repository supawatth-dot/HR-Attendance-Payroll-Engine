import { IsString, IsInt, IsNotEmpty, IsOptional, IsDateString, IsEmail, IsNumber } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  employeeCode: string;

  @IsOptional()
  @IsEmail()
  email?: string;

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

  @IsOptional()
  @IsNumber()
  baseSalary?: number;

  @IsOptional()
  @IsNumber()
  dailyRate?: number;

  @IsDateString()
  @IsNotEmpty()
  hireDate: string;

  @IsOptional()
  @IsDateString()
  terminationDate?: string;
}

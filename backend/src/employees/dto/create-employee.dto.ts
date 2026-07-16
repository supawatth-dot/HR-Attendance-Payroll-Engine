import { IsString, IsInt, IsNotEmpty, IsOptional, IsDateString, IsEmail, IsNumber } from 'class-validator';

export class CreateEmployeeDto {
  // Optional: when omitted the service generates a unique code, so existing
  // enrollment forms that don't collect one still work.
  @IsOptional()
  @IsString()
  employeeCode?: string;

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

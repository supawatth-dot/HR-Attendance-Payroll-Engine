import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from './import.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('import')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('attendance')
  @Roles('ADMIN', 'HR')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttendance(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.importService.processFile(file, req.user?.userId || 1);
  }
}

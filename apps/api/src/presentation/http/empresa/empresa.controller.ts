import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import {
  ArchivoSubido,
  EmpresaUseCase,
} from '../../../application/empresa/empresa.usecase';
import { ActualizarEmpresaDto } from './dto/actualizar-empresa.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('empresa')
@UseGuards(JwtAuthGuard, AdminGuard)
@Roles('ADMIN')
export class EmpresaController {
  constructor(private readonly empresa: EmpresaUseCase) {}

  @Get()
  obtener() {
    return this.empresa.obtener();
  }

  @Patch()
  actualizar(@Body() dto: ActualizarEmpresaDto) {
    return this.empresa.actualizar(dto);
  }

  @Get('logo')
  logoUrl() {
    return this.empresa.logoUrl();
  }

  @Post('logo')
  @UseInterceptors(FileInterceptor('logo'))
  subirLogo(@UploadedFile() logo: ArchivoSubido) {
    return this.empresa.subirLogo(logo);
  }

  /** Sube el CSD (.cer y/o .key) + su contraseña (campo `password` del form). */
  @Post('csd')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'cer', maxCount: 1 },
      { name: 'key', maxCount: 1 },
    ]),
  )
  subirCsd(
    @UploadedFiles() files: { cer?: ArchivoSubido[]; key?: ArchivoSubido[] },
    @Body('password') password?: string,
  ) {
    return this.empresa.subirCsd(files?.cer?.[0], files?.key?.[0], password);
  }
}

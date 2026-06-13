import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { SmtpMailProvider } from './smtp.provider';
import { BrevoMailProvider } from './brevo.provider';

/**
 * Módulo de correo reutilizable. Exporta EmailService para que cualquier feature
 * (alertas, cotizaciones, …) lo inyecte sin re-proveerlo ni duplicar lógica.
 */
@Module({
  providers: [EmailService, SmtpMailProvider, BrevoMailProvider],
  exports: [EmailService],
})
export class EmailModule {}

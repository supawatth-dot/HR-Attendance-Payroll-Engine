import { Global, Module } from '@nestjs/common';
import { RulesService } from './rules.service';
import { RuleEngineService } from './rule-engine.service';
import { RulesController } from './rules.controller';
import { AuditModule } from '../audit/audit.module';

@Global()
@Module({
  imports: [AuditModule],
  controllers: [RulesController],
  providers: [RulesService, RuleEngineService],
  exports: [RulesService, RuleEngineService],
})
export class RulesModule {}

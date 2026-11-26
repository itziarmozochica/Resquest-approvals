import { OdooHandoffLogin, OdooHandoffLoginDto } from './odoo-handoff-login.model';

export const toOdooHandoffLogin = (dto: OdooHandoffLoginDto): OdooHandoffLogin => ({
  organizationId: dto.organization_id,
  token: dto.token,
  userId: dto.user_id,
});

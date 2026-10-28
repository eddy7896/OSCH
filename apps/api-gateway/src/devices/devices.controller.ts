import { Body, Controller, Delete, Get, HttpCode, Post } from '@nestjs/common';
import { NoAudit } from '../audit/audit.decorators.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/authenticated-user.js';
import { UserScoped } from '../tenant/tenant.decorators.js';
import { type DeviceListDto, RegisterDeviceDto, RemoveDeviceDto } from './dto/devices.dto.js';
import { DevicesService } from './devices.service.js';

/** A phone's push address, kept for the signed-in account only (P4-S2). Signed in, no school: the phone belongs to the person, not to a school. */
@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @UserScoped()
  @NoAudit('a phone push address on the caller own account; no tenant data and no privilege change')
  @Post()
  @HttpCode(204)
  async register(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterDeviceDto): Promise<void> {
    await this.devices.register(user.uid, dto.token, dto.platform);
  }

  /** Sign-out: this phone stops receiving this account's pushes. */
  @UserScoped()
  @NoAudit('removes a phone push address from the caller own account; no tenant data and no privilege change')
  @Delete()
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthenticatedUser, @Body() dto: RemoveDeviceDto): Promise<void> {
    await this.devices.remove(user.uid, dto.token);
  }

  /** The caller's own phones (never the tokens). */
  @UserScoped()
  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<DeviceListDto> {
    return this.devices.list(user.uid);
  }
}

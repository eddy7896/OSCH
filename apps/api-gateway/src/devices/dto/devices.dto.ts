import { IsIn, IsString, Matches } from 'class-validator';

/** FCM and APNs tokens are made of letters, digits and `_ - : .`; anything else is not one. */
const TOKEN = /^[\w:.-]{8,4096}$/;

export class RegisterDeviceDto {
  /** The push address the platform gave this phone. */
  @IsString() @Matches(TOKEN) token!: string;
  @IsIn(['IOS', 'ANDROID']) platform!: 'IOS' | 'ANDROID';
}

export class RemoveDeviceDto {
  @IsString() @Matches(TOKEN) token!: string;
}

export class DeviceDto {
  id!: string;
  platform!: 'IOS' | 'ANDROID';
  lastSeenAt!: string;
}

export class DeviceListDto {
  items!: DeviceDto[];
}

import { IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsString() @Length(3, 32) @Matches(/^[a-zA-Z0-9_-]+$/) username!: string;
  @IsString() @Length(8, 128) password!: string;
}
export class LoginDto extends RegisterDto {}
export class RefreshDto { @IsString() refreshToken!: string; }
export class ChangePasswordDto {
  @IsString() currentPassword!: string;
  @IsString() @Length(8, 128) newPassword!: string;
}

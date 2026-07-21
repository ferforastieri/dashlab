import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export enum SurfaceDto {
  WEB = 'WEB',
  MOBILE = 'MOBILE',
}
export enum KindDto {
  APPLICATION = 'APPLICATION',
  WIDGET = 'WIDGET',
}
export enum WidgetTypeDto {
  SYSTEM = 'SYSTEM',
  STORAGE = 'STORAGE',
  NETWORK = 'NETWORK',
  CLOCK = 'CLOCK',
  WEATHER = 'WEATHER',
  SEARCH = 'SEARCH',
  STATUS = 'STATUS',
  PROMQL = 'PROMQL',
}

export class BrandingDto {
  @IsOptional() @IsString() @Length(1, 80) name?: string;
  @IsOptional() @IsString() @MaxLength(2048) wallpaper?: string;
  @IsOptional() @IsString() @MaxLength(2048) logo?: string;
  @IsOptional() @IsString() @MaxLength(2048) favicon?: string;
  @IsOptional() @IsString() @MaxLength(16) accent?: string;
  @IsOptional() @IsIn(['dark', 'light']) theme?: 'dark' | 'light';
}
export class CreateApplicationDto {
  @IsString() @Length(1, 80) name!: string;
  @IsUrl({ require_tld: false, protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  url!: string;
  @IsOptional() @IsString() @MaxLength(240) description?: string;
  @IsOptional() @IsString() @MaxLength(2048) deepLink?: string;
  @IsOptional() @IsString() @MaxLength(2048) icon?: string;
  @IsOptional() @IsString() @MaxLength(60) category?: string;
  @IsOptional()
  @IsUrl({ require_tld: false, protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  statusUrl?: string;
  @IsOptional() @IsBoolean() inDock?: boolean;
  @IsOptional() @IsBoolean() visible?: boolean;
}
export class UpdateApplicationDto extends CreateApplicationDto {
  @IsOptional() declare name: string;
  @IsOptional() declare url: string;
}
export class CreateWidgetDto {
  @IsString() @Length(1, 80) title!: string;
  @IsEnum(WidgetTypeDto) type!: WidgetTypeDto;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
  @IsOptional() @IsBoolean() visible?: boolean;
}
export class UpdateWidgetDto {
  @IsOptional() @IsString() @Length(1, 80) title?: string;
  @IsOptional() @IsEnum(WidgetTypeDto) type?: WidgetTypeDto;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
  @IsOptional() @IsBoolean() visible?: boolean;
}
export class LayoutItemDto {
  @IsEnum(KindDto) kind!: KindDto;
  @IsOptional() @IsString() applicationId?: string;
  @IsOptional() @IsString() widgetId?: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(100) x!: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(1000) y!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(12) w!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(12) h!: number;
}
export class SaveLayoutDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => LayoutItemDto)
  items!: LayoutItemDto[];
}
export class WeatherQueryDto {
  @Type(() => Number) @Min(-90) @Max(90) latitude!: number;
  @Type(() => Number) @Min(-180) @Max(180) longitude!: number;
}
export class MetricsHistoryDto {
  @IsOptional() @IsIn(['15m', '1h', '6h', '24h']) range: '15m' | '1h' | '6h' | '24h' = '1h';
}

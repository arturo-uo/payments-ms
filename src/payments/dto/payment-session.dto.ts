import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsNumber, ValidateNested, IsPositive, IsString } from "class-validator";

export class PaymentSessionDto {
	@IsString()
	orderId: string

	@IsString()
	currency: string

	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => PaymentSessionItemsDto)
	items: PaymentSessionItemsDto[]
}

export class PaymentSessionItemsDto {
	@IsString()
	name: string

	@IsNumber()
	@IsPositive()
	price: number

	@IsNumber()
	@IsPositive()
	quantity: number
}
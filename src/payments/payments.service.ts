import { Inject, Injectable, Logger } from '@nestjs/common'
import { envs, NATS_SERVICE } from 'src/config'
import { PaymentSessionDto } from './dto/payment-session.dto'
import { Request, response, Response } from 'express'
import Stripe from 'stripe';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PaymentsService {
	private readonly stripe = new Stripe(envs.stripeSecret)
	private readonly logger = new Logger('PaymentsService')

	constructor(
		@Inject(NATS_SERVICE) private readonly client: ClientProxy){}

	async createPaymentSession(paymentSessionDto: PaymentSessionDto) {
		const { currency, items, orderId } = paymentSessionDto

		const lineItems = items.map(item => {
			return {
				price_data: {
					currency: currency,
					product_data: {
						name: item.name
					},
					unit_amount: Math.round(item.price * 100)
				},
				quantity: item.quantity
			}
		})

		const session = await this.stripe.checkout.sessions.create({
			payment_intent_data: {
				metadata: {
					orderId: orderId
				}
			},
			line_items: lineItems,
			mode: 'payment',
			success_url: envs.stripeSuccessUrl,
			cancel_url: envs.stripeCancelUrl
		})
		//return session
		return {
			cancelUrl: session.cancel_url,
			successUrl: session.success_url,
			url: session.url
		}
	}

	async stripeWebhook(req: Request, res: Response) {
		const sig = req.headers['stripe-signature']
		let event: Stripe.Event
		const endpointSecret = envs.stripeEndpointSecret
		try {
			event = this.stripe.webhooks.constructEvent(req['rawBody'], sig!, endpointSecret)
		}
		catch (err: Error | any) {
			res.status(400).send(`Webhook Error: ${err.message}`)
			return
		}

		console.log({ event })

		switch (event.type) {
			case 'payment_intent.succeeded':
				const paymentIntent = event.data.object
				console.log(event)
				console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`)
				// Then define and call a method to handle the successful payment intent.
				// handlePaymentIntentSucceeded(paymentIntent);
				break;
			case 'charge.succeeded':
				const chargeSucceeded = event.data.object
				const payload = {
					stripePaymentId: chargeSucceeded.id,
					orderId: chargeSucceeded.metadata.orderId,
					receiptUrl: chargeSucceeded.receipt_url
				}
				this.logger.log({ payload })
				this.client.emit('payment.succeded', payload)
				// Then define and call a method to handle the successful payment intent.
				// handlePaymentIntentSucceeded(paymentIntent);
				break;
			case 'payment_method.attached':
				const paymentMethod = event.data.object
				// Then define and call a method to handle the successful attachment of a PaymentMethod.
				// handlePaymentMethodAttached(paymentMethod);
				break;
			default:
				// Unexpected event type
				console.log(`Unhandled event type ${event.type}.`)
		}

		return res.status(200).json({ sig })
	}
}

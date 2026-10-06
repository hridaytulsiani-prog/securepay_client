<?php
/**
 * WooCommerce payment gateway: "Pay with EscroSafe".
 *
 * Flow: WooCommerce creates the order -> process_payment() asks the EscroSafe API for a
 * checkout session (POST /payments/v1/checkout-sessions/) -> the customer is redirected to
 * the returned checkout_url. The Merchant Key and API URL come from Settings -> EscroSafe.
 *
 * Phase 1 limitation: the EscroSafe backend does not yet call back into the store, so the
 * order is left "On hold" with the session ID saved in an order note and in order meta.
 * Mark it Processing from the store once the payment shows as paid in the EscroSafe dashboard.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WC_Gateway_EscroSafe extends WC_Payment_Gateway {

	public function __construct() {
		$this->id                 = 'escrosafe';
		$this->icon               = ESCROSAFE_URL . 'assets/escrosafe-logo.png';
		$this->has_fields         = false;
		$this->method_title       = 'EscroSafe';
		$this->method_description = 'Let customers pay with EscroSafe. Your Merchant Key and API URL are set under Settings > EscroSafe.';
		$this->supports           = array( 'products' );

		$this->init_form_fields();
		$this->init_settings();

		$this->title       = $this->get_option( 'title', 'Pay with EscroSafe' );
		$this->description = $this->get_option( 'description' );
		$this->enabled     = $this->get_option( 'enabled', 'no' );

		add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'process_admin_options' ) );
	}

	public function init_form_fields() {
		$this->form_fields = array(
			'enabled'     => array(
				'title'   => 'Enable',
				'type'    => 'checkbox',
				'label'   => 'Enable EscroSafe at checkout',
				'default' => 'no',
			),
			'title'       => array(
				'title'       => 'Title',
				'type'        => 'text',
				'description' => 'What the customer sees as the payment method name.',
				'default'     => 'Pay with EscroSafe',
				'desc_tip'    => true,
			),
			'description' => array(
				'title'       => 'Description',
				'type'        => 'textarea',
				'description' => 'Short text shown under the payment method.',
				'default'     => 'Your payment is protected until your order is delivered.',
				'desc_tip'    => true,
			),
		);
	}

	/** Hide the gateway until the merchant has saved their key and API URL. */
	public function is_available() {
		$s = EscroSafe_Settings::get();
		return parent::is_available() && '' !== $s['merchant_key'] && '' !== $s['api_url'];
	}

	public function admin_options() {
		$s = EscroSafe_Settings::get();
		if ( '' === $s['merchant_key'] || '' === $s['api_url'] ) {
			echo '<div class="notice notice-warning inline"><p>Add your Merchant Key and API URL under <a href="' . esc_url( admin_url( 'options-general.php?page=escrosafe' ) ) . '">Settings &rarr; EscroSafe</a> first.</p></div>';
		}
		parent::admin_options();
	}

	public function process_payment( $order_id ) {
		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			wc_add_notice( 'Order not found.', 'error' );
			return array( 'result' => 'failure' );
		}

		$phone = trim( (string) $order->get_billing_phone() );
		if ( '' === $phone ) {
			wc_add_notice( 'A phone number is required to pay with EscroSafe. Please add it in the billing details.', 'error' );
			return array( 'result' => 'failure' );
		}

		$s       = EscroSafe_Settings::get();
		$payload = array(
			'merchant_key'  => $s['merchant_key'],
			'customer'      => array(
				'name'    => trim( $order->get_billing_first_name() . ' ' . $order->get_billing_last_name() ),
				'email'   => $order->get_billing_email(),
				'phone'   => $phone,
				'address' => trim( wp_strip_all_tags( str_replace( '<br/>', ', ', $order->get_formatted_billing_address() ) ) ),
			),
			'order'         => array(
				'order_id' => (string) $order->get_order_number(),
				'amount'   => wc_format_decimal( $order->get_total(), 2 ),
				'currency' => $order->get_currency(),
			),
			'page'          => array(
				'title' => get_bloginfo( 'name' ),
				'url'   => wc_get_checkout_url(),
			),
			'source_origin' => home_url(),
			'source_url'    => wc_get_checkout_url(),
		);

		$response = wp_remote_post(
			untrailingslashit( $s['api_url'] ) . '/payments/v1/checkout-sessions/',
			array(
				'timeout' => 20,
				'headers' => array( 'Content-Type' => 'application/json' ),
				'body'    => wp_json_encode( $payload ),
			)
		);

		if ( is_wp_error( $response ) ) {
			wc_add_notice( 'Could not reach EscroSafe. Please try again.', 'error' );
			$order->add_order_note( 'EscroSafe: request failed - ' . $response->get_error_message() );
			return array( 'result' => 'failure' );
		}

		$code = wp_remote_retrieve_response_code( $response );
		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( ( 201 !== $code && 200 !== $code ) || empty( $body['checkout_url'] ) ) {
			$reason = is_array( $body ) && ! empty( $body['error'] ) ? $body['error'] : 'HTTP ' . $code;
			wc_add_notice( 'EscroSafe could not start the payment: ' . esc_html( $reason ), 'error' );
			$order->add_order_note( 'EscroSafe: session not created - ' . $reason );
			return array( 'result' => 'failure' );
		}

		$order->update_meta_data( '_escrosafe_session_id', sanitize_text_field( $body['session_id'] ?? '' ) );
		$order->update_meta_data( '_escrosafe_checkout_url', esc_url_raw( $body['checkout_url'] ) );
		$order->update_status( 'on-hold', 'Awaiting EscroSafe payment. Session: ' . sanitize_text_field( $body['session_id'] ?? '' ) . '. ' );
		$order->save();

		WC()->cart->empty_cart();

		return array(
			'result'   => 'success',
			'redirect' => esc_url_raw( $body['checkout_url'] ),
		);
	}
}

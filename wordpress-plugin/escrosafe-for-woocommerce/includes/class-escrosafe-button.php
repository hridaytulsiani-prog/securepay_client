<?php
/**
 * [escrosafe_button] shortcode for WordPress sites (with or without WooCommerce).
 * Loads the same button script merchants paste on hand-built sites, with the key
 * from Settings -> EscroSafe, so there is no code to edit.
 *
 * Usage: [escrosafe_button amount="499" order_id="ORDER-1001" text="Pay with"]
 * amount / order_id are optional; if omitted the script reads them from the page's form fields.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class EscroSafe_Button {

	private static $instance = 0;

	public static function init() {
		add_shortcode( 'escrosafe_button', array( __CLASS__, 'render' ) );
	}

	public static function render( $atts ) {
		$settings = EscroSafe_Settings::get();
		if ( '' === $settings['merchant_key'] || '' === $settings['script_url'] || '' === $settings['api_url'] ) {
			return current_user_can( 'manage_options' )
				? '<p><em>EscroSafe: add your Merchant Key, API URL and Button script URL under Settings &rarr; EscroSafe.</em></p>'
				: '';
		}

		$atts = shortcode_atts(
			array(
				'amount'   => '',
				'order_id' => '',
				'text'     => 'Pay with',
			),
			$atts,
			'escrosafe_button'
		);

		++self::$instance;
		$container = 'escrosafe-button-' . self::$instance;
		$api       = $settings['api_url'];
		$logo      = trailingslashit( dirname( $settings['script_url'] ) ) . 'escrosafe-logo.png';

		$out = '<div id="' . esc_attr( $container ) . '" class="escrosafe-button-wrap">';
		if ( '' !== $atts['order_id'] ) {
			$out .= '<span hidden data-order-id>' . esc_html( $atts['order_id'] ) . '</span>';
		}
		if ( '' !== $atts['amount'] ) {
			$out .= '<span hidden data-order-amount>' . esc_html( $atts['amount'] ) . '</span>';
		}
		$out .= '</div>';

		// The button script reads its own data-* attributes from document.currentScript,
		// so it is printed inline here rather than enqueued.
		$out .= sprintf(
			'<script src="%1$s" data-target="#%2$s" data-button-text="%3$s" data-button-logo-url="%4$s" data-button-theme="%5$s" data-merchant-key="%6$s" data-session-api-url="%7$s" data-config-api-url="%8$s"></script>',
			esc_url( $settings['script_url'] ),
			esc_attr( $container ),
			esc_attr( $atts['text'] ),
			esc_url( $logo ),
			esc_attr( $settings['theme'] ),
			esc_attr( $settings['merchant_key'] ),
			esc_url( $api . '/payments/v1/checkout-sessions/' ),
			esc_url( $api . '/payments/v1/button-config/' )
		);

		return $out;
	}
}

EscroSafe_Button::init();

<?php
/**
 * Makes the EscroSafe gateway appear in the newer WooCommerce block checkout.
 * (The classic shortcode checkout uses class-escrosafe-gateway.php directly.)
 */

use Automattic\WooCommerce\Blocks\Payments\Integrations\AbstractPaymentMethodType;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class EscroSafe_Blocks_Support extends AbstractPaymentMethodType {

	protected $name = 'escrosafe';

	public function initialize() {
		$this->settings = get_option( 'woocommerce_escrosafe_settings', array() );
	}

	public function is_active() {
		$gateways = WC()->payment_gateways() ? WC()->payment_gateways()->payment_gateways() : array();
		return isset( $gateways['escrosafe'] ) && $gateways['escrosafe']->is_available();
	}

	public function get_payment_method_script_handles() {
		wp_register_script(
			'escrosafe-blocks',
			ESCROSAFE_URL . 'assets/blocks.js',
			array( 'wc-blocks-registry', 'wc-settings', 'wp-element', 'wp-html-entities' ),
			ESCROSAFE_VERSION,
			true
		);
		return array( 'escrosafe-blocks' );
	}

	public function get_payment_method_data() {
		return array(
			'title'       => $this->get_setting( 'title', 'Pay with EscroSafe' ),
			'description' => $this->get_setting( 'description', '' ),
			'logo'        => ESCROSAFE_URL . 'assets/escrosafe-logo.png',
			'supports'    => array( 'products' ),
		);
	}
}

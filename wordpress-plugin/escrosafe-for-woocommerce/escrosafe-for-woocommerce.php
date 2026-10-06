<?php
/**
 * Plugin Name:       EscroSafe for WooCommerce & WordPress
 * Description:       Adds "Pay with EscroSafe" to WooCommerce checkout, and a [escrosafe_button] shortcode for WordPress sites without WooCommerce.
 * Version:           1.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            EscroSafe
 * License:           GPL-2.0-or-later
 * Text Domain:       escrosafe
 *
 * Two modes, one plugin:
 *  - WooCommerce active  -> registers the "EscroSafe" payment gateway (classic + block checkout).
 *  - WordPress only      -> [escrosafe_button] shortcode that loads the EscroSafe button script.
 * Both read the Merchant Key and URLs saved under Settings -> EscroSafe.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'ESCROSAFE_VERSION', '1.0.0' );
define( 'ESCROSAFE_FILE', __FILE__ );
define( 'ESCROSAFE_DIR', plugin_dir_path( __FILE__ ) );
define( 'ESCROSAFE_URL', plugin_dir_url( __FILE__ ) );

require_once ESCROSAFE_DIR . 'includes/class-escrosafe-settings.php';
require_once ESCROSAFE_DIR . 'includes/class-escrosafe-button.php';

/** Declare compatibility with WooCommerce High-Performance Order Storage and block checkout. */
add_action(
	'before_woocommerce_init',
	function () {
		if ( class_exists( '\Automattic\WooCommerce\Utilities\FeaturesUtil' ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', ESCROSAFE_FILE, true );
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'cart_checkout_blocks', ESCROSAFE_FILE, true );
		}
	}
);

/** WooCommerce mode: only loads when WooCommerce is active. */
add_action(
	'plugins_loaded',
	function () {
		if ( ! class_exists( 'WC_Payment_Gateway' ) ) {
			return;
		}

		require_once ESCROSAFE_DIR . 'includes/class-escrosafe-gateway.php';

		add_filter(
			'woocommerce_payment_gateways',
			function ( $gateways ) {
				$gateways[] = 'WC_Gateway_EscroSafe';
				return $gateways;
			}
		);

		if ( class_exists( '\Automattic\WooCommerce\Blocks\Payments\Integrations\AbstractPaymentMethodType' ) ) {
			require_once ESCROSAFE_DIR . 'includes/class-escrosafe-blocks.php';
			add_action(
				'woocommerce_blocks_payment_method_type_registration',
				function ( $registry ) {
					$registry->register( new EscroSafe_Blocks_Support() );
				}
			);
		}
	},
	11
);

/** "Settings" link on the Plugins screen. */
add_filter(
	'plugin_action_links_' . plugin_basename( __FILE__ ),
	function ( $links ) {
		array_unshift( $links, '<a href="' . esc_url( admin_url( 'options-general.php?page=escrosafe' ) ) . '">' . esc_html__( 'Settings', 'escrosafe' ) . '</a>' );
		return $links;
	}
);

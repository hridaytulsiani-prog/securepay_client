<?php
/**
 * Settings -> EscroSafe: the one place a merchant pastes their details.
 * Values are shared by the WooCommerce gateway and the [escrosafe_button] shortcode.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class EscroSafe_Settings {

	const OPTION = 'escrosafe_settings';

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'add_menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'register' ) );
	}

	/** @return array{merchant_key:string,api_url:string,script_url:string,theme:string} */
	public static function get() {
		$saved = get_option( self::OPTION, array() );
		return wp_parse_args(
			is_array( $saved ) ? $saved : array(),
			array(
				'merchant_key' => '',
				'api_url'      => '',
				'script_url'   => '',
				'theme'        => 'grey',
			)
		);
	}

	public static function add_menu() {
		add_options_page( 'EscroSafe', 'EscroSafe', 'manage_options', 'escrosafe', array( __CLASS__, 'render' ) );
	}

	public static function register() {
		register_setting( 'escrosafe', self::OPTION, array( 'sanitize_callback' => array( __CLASS__, 'sanitize' ) ) );
	}

	public static function sanitize( $input ) {
		$input = is_array( $input ) ? $input : array();
		return array(
			'merchant_key' => sanitize_text_field( $input['merchant_key'] ?? '' ),
			'api_url'      => untrailingslashit( esc_url_raw( $input['api_url'] ?? '' ) ),
			'script_url'   => esc_url_raw( $input['script_url'] ?? '' ),
			'theme'        => sanitize_key( $input['theme'] ?? 'grey' ),
		);
	}

	public static function render() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$s    = self::get();
		$name = self::OPTION;
		?>
		<div class="wrap">
			<h1>EscroSafe</h1>
			<p>Copy these values from your EscroSafe dashboard under <strong>Settings &rarr; Connect your store</strong>.</p>
			<form method="post" action="options.php">
				<?php settings_fields( 'escrosafe' ); ?>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="es_key">Merchant Key</label></th>
						<td><input id="es_key" class="regular-text" type="text" name="<?php echo esc_attr( $name ); ?>[merchant_key]" value="<?php echo esc_attr( $s['merchant_key'] ); ?>" placeholder="sp_live_xxx" autocomplete="off" /></td>
					</tr>
					<tr>
						<th scope="row"><label for="es_api">API URL</label></th>
						<td>
							<input id="es_api" class="regular-text" type="url" name="<?php echo esc_attr( $name ); ?>[api_url]" value="<?php echo esc_attr( $s['api_url'] ); ?>" placeholder="https://api.example.com" />
							<p class="description">The EscroSafe API address, with no trailing slash.</p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="es_script">Button script URL</label></th>
						<td>
							<input id="es_script" class="regular-text" type="url" name="<?php echo esc_attr( $name ); ?>[script_url]" value="<?php echo esc_attr( $s['script_url'] ); ?>" placeholder="https://app.example.com/button.js" />
							<p class="description">Only needed for the <code>[escrosafe_button]</code> shortcode (sites without WooCommerce).</p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="es_theme">Button colour</label></th>
						<td>
							<select id="es_theme" name="<?php echo esc_attr( $name ); ?>[theme]">
								<?php foreach ( array( 'grey', 'white', 'pink', 'lavender', 'peach', 'butter', 'sky', 'lilac' ) as $theme ) : ?>
									<option value="<?php echo esc_attr( $theme ); ?>" <?php selected( $s['theme'], $theme ); ?>><?php echo esc_html( ucfirst( $theme ) ); ?></option>
								<?php endforeach; ?>
							</select>
						</td>
					</tr>
				</table>
				<?php submit_button(); ?>
			</form>

			<h2>How to use it</h2>
			<?php if ( class_exists( 'WooCommerce' ) ) : ?>
				<p><strong>WooCommerce detected.</strong> Go to <a href="<?php echo esc_url( admin_url( 'admin.php?page=wc-settings&tab=checkout&section=escrosafe' ) ); ?>">WooCommerce &rarr; Settings &rarr; Payments &rarr; EscroSafe</a> and enable it. "Pay with EscroSafe" then appears at checkout.</p>
			<?php else : ?>
				<p>WooCommerce is not active on this site. Add the button to any page with the shortcode:</p>
				<p><code>[escrosafe_button amount="499" order_id="ORDER-1001"]</code></p>
			<?php endif; ?>
		</div>
		<?php
	}
}

EscroSafe_Settings::init();

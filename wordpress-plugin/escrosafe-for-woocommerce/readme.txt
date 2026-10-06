=== EscroSafe for WooCommerce & WordPress ===
Requires at least: 5.8
Tested up to: 6.6
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later

Add "Pay with EscroSafe" to your WooCommerce checkout, or place an EscroSafe button on any WordPress page.

== Description ==

* WooCommerce: adds EscroSafe as a payment method (classic and block checkout).
* WordPress without WooCommerce: use the [escrosafe_button] shortcode.

== Installation ==

1. Plugins > Add New > Upload Plugin, choose the zip, Install, Activate.
2. Settings > EscroSafe: paste the Merchant Key, API URL and Button script URL from your EscroSafe dashboard (Settings > Connect your store).
3. WooCommerce: WooCommerce > Settings > Payments > EscroSafe > Enable.
   No WooCommerce: put [escrosafe_button amount="499" order_id="ORDER-1001"] on a page.

== Notes ==

Version 1.0.0 starts the payment and redirects the customer to EscroSafe. WooCommerce orders are set to "On hold" with the EscroSafe session ID in an order note. Automatic "paid" updates need a store callback from EscroSafe, which is planned for a later version.

== Changelog ==

= 1.0.0 =
* First release.

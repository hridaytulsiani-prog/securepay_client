/* Registers "Pay with EscroSafe" with the WooCommerce block checkout. Plain JS, no build step. */
( function () {
	var registry = window.wc && window.wc.wcBlocksRegistry;
	var settings = window.wc && window.wc.wcSettings;
	var el = window.wp && window.wp.element && window.wp.element.createElement;
	if ( ! registry || ! settings || ! el ) {
		return;
	}

	var data = settings.getSetting( 'escrosafe_data', {} );
	var title = window.wp.htmlEntities.decodeEntities( data.title || 'Pay with EscroSafe' );

	var Label = function () {
		return el(
			'span',
			{ style: { display: 'inline-flex', alignItems: 'center', gap: '8px' } },
			title,
			data.logo ? el( 'img', { src: data.logo, alt: 'EscroSafe', style: { height: '22px', width: 'auto' } } ) : null
		);
	};

	var Content = function () {
		return el( 'div', null, window.wp.htmlEntities.decodeEntities( data.description || '' ) );
	};

	registry.registerPaymentMethod( {
		name: 'escrosafe',
		label: el( Label, null ),
		content: el( Content, null ),
		edit: el( Content, null ),
		canMakePayment: function () {
			return true;
		},
		ariaLabel: title,
		supports: { features: data.supports || [ 'products' ] },
	} );
} )();

(function () {
	'use strict';

	var SDK_VERSION = '0.1.0';
	var STYLE_ID = 'securepay-button-sdk-style';
	var DEFAULT_CHECKOUT_URL = 'https://pay.securepay.com/checkout';
	var DEFAULT_SESSION_PATH = '/payments/v1/checkout-sessions/';
	var DEFAULT_CONFIG_PATH = '/payments/v1/button-config/';
	var ACTIVE_SESSION_PREFIX = 'securepay.activeSession.';
	var ACTIVE_SESSION_TTL_MS = 10 * 60 * 1000;

	// Button colour themes (keep in sync with src/constants/buttonThemes.js): [bg, border, hoverBg, hoverBorder].
	var THEMES = {
		pink: ['#fde4ec', '#f2b5c8', '#fbd2e0', '#e58fae'],
		lavender: ['#ece6fb', '#c9bbf0', '#ddd3f7', '#ab97e6'],
		peach: ['#ffe9d9', '#f6c7a3', '#fddcc4', '#eaa979'],
		butter: ['#fff4c9', '#f0dc83', '#ffec9e', '#e2c94f'],
		sky: ['#dff0fb', '#a9d3ee', '#c9e5f7', '#7fb9e0'],
		lilac: ['#f6e3f4', '#e2b5dc', '#efd0eb', '#d093c8'],
		grey: ['#eef1f0', '#cbd3d0', '#e1e6e4', '#a9b4b0'],
		white: ['#ffffff', '#bcd3cb', '#eef7f3', '#173d38'],
	};

	function getCurrentScript() {
		if (document.currentScript) {
			return document.currentScript;
		}

		var scripts = document.querySelectorAll('script[data-merchant-key]');
		return scripts[scripts.length - 1] || null;
	}

	function injectStyles() {
		if (document.getElementById(STYLE_ID)) {
			return;
		}

		var style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = [
			'.securepay-button-wrap{display:inline-flex;min-width:260px;flex-direction:column;align-items:stretch;gap:8px;position:relative}',
			'.securepay-button{display:inline-flex;width:100%;min-height:42px;align-items:center;justify-content:center;gap:10px;padding:10px 18px;border:1.5px solid var(--sp-border,#cbd3d0);border-radius:999px;background:var(--sp-bg,#eef1f0);color:#173d38;box-shadow:0 2px 8px rgba(23,61,56,.1);font:600 15px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer;transition:background .15s ease,transform .15s ease,box-shadow .15s ease}',
			'.securepay-button:hover:not(:disabled){background:var(--sp-hover-bg,#e1e6e4);border-color:var(--sp-hover-border,#a9b4b0)}',
						'.securepay-button:disabled{cursor:not-allowed;opacity:.7;transform:none}',
			'.securepay-button-text{white-space:nowrap}',
			'.securepay-button-logo{display:block;flex:none;height:34px;width:auto;margin:-9px -7px -9px -11px}',
			'.securepay-session-tip{display:none;position:absolute;right:0;bottom:calc(100% + 10px);z-index:10000;width:min(320px,calc(100vw - 32px));box-sizing:border-box;padding:11px 12px;border:1px solid rgba(23,61,56,.18);border-radius:8px;background:#f8fbfa;color:#173d38;box-shadow:0 18px 40px rgba(13,31,35,.16);font:500 13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:left}',
			'.securepay-button-wrap.is-session-active:hover .securepay-session-tip,.securepay-button-wrap.is-session-active:focus-within .securepay-session-tip{display:block}',
			'.securepay-session-tip span{display:block;margin-bottom:7px;color:#536662}',
			'.securepay-session-tip a{display:inline-flex;color:#173d38;font-weight:750;text-decoration:underline;text-underline-offset:3px}',
			'.securepay-cod-toast{position:fixed;top:20px;right:20px;z-index:2147483000;display:flex;align-items:flex-start;gap:12px;width:min(360px,calc(100vw - 32px));box-sizing:border-box;padding:14px 14px 14px 16px;border:1px solid rgba(23,61,56,.16);border-left:4px solid #c56b38;border-radius:10px;background:#fff;color:#173d38;box-shadow:0 18px 44px rgba(13,31,35,.22);font:500 13px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;animation:securepay-toast-in .22s ease-out}',
			'.securepay-cod-toast strong{display:block;margin-bottom:3px;font-size:14px;font-weight:700;color:#173d38}',
			'.securepay-cod-toast p{margin:0;color:#173d38;font-weight:600}',
			'.securepay-cod-toast-body{flex:1;min-width:0}',
			'.securepay-cod-toast-link,.securepay-cod-toast-link:hover,.securepay-cod-toast-link:focus,.securepay-cod-toast-link:active{display:inline-flex;align-items:center;gap:4px;margin:0;padding:0;border:0!important;border-radius:0;background:none!important;box-shadow:none!important;color:#173d38!important;font:inherit;font-weight:700;line-height:1;cursor:pointer;vertical-align:baseline;text-decoration:none!important;transform:none!important;outline:none}',
			'.securepay-cod-toast-link img{display:block;height:24px;width:auto;margin:-6px -4px -6px -3px;position:relative;top:1.1px}',
			'.securepay-cod-toast-close{flex:none;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;margin:-2px 0 0;padding:0;border:0;border-radius:50%;background:#f1f5f3;color:#173d38;cursor:pointer;line-height:0}',
			'.securepay-cod-toast-close:hover{background:#173d38;color:#fff}',
			'.securepay-cod-toast-close svg{display:block;width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round}',
			'@keyframes securepay-toast-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}',
		].join('');
		document.head.appendChild(style);
	}

	function resolveUrl(url) {
		try {
			return new URL(url, window.location.href);
		} catch (error) {
			return new URL(DEFAULT_CHECKOUT_URL);
		}
	}

	function buildCheckoutUrl(options) {
		var checkoutUrl = resolveUrl(options.checkoutUrl || DEFAULT_CHECKOUT_URL);
		checkoutUrl.searchParams.set('merchant_key', options.merchantKey);
		checkoutUrl.searchParams.set('sdk_version', SDK_VERSION);
		checkoutUrl.searchParams.set('source_origin', window.location.origin);
		checkoutUrl.searchParams.set('source_url', window.location.href);
		return checkoutUrl.toString();
	}

	function getScriptOrigin() {
		var script = getCurrentScript();
		if (!script || !script.src) {
			return window.location.origin;
		}

		try {
			return new URL(script.src, window.location.href).origin;
		} catch (error) {
			return window.location.origin;
		}
	}

	function buildSessionApiUrl(apiUrl) {
		if (apiUrl) {
			return new URL(apiUrl, window.location.href).toString();
		}

		return new URL(DEFAULT_SESSION_PATH, getScriptOrigin()).toString();
	}

	function buildCheckoutBaseUrl() {
		return new URL('/checkout', getScriptOrigin()).toString();
	}

	function buildConfigApiUrl(configUrl, merchantKey) {
		var url = configUrl ? new URL(configUrl, window.location.href) : new URL(DEFAULT_CONFIG_PATH, getScriptOrigin());
		url.searchParams.set('merchant_key', merchantKey);
		return url.toString();
	}

	function normalizeText(value) {
		return String(value || '').replace(/\s+/g, ' ').trim();
	}

	function storageAvailable() {
		try {
			var testKey = ACTIVE_SESSION_PREFIX + 'test';
			window.localStorage.setItem(testKey, '1');
			window.localStorage.removeItem(testKey);
			return true;
		} catch (error) {
			return false;
		}
	}

	function activeSessionStorageKey(merchantKey, orderId) {
		return ACTIVE_SESSION_PREFIX + encodeURIComponent([
			merchantKey,
			window.location.origin,
			window.location.pathname,
			normalizeText(orderId) || 'no-order',
		].join('|'));
	}

	function activeSessionPagePrefix(merchantKey) {
		return [
			merchantKey,
			window.location.origin,
			window.location.pathname,
			'',
		].join('|');
	}

	function readActiveSession(storageKey) {
		if (!storageAvailable()) {
			return null;
		}

		try {
			var session = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
			if (!session || !session.checkout_url || !session.expires_at) {
				return null;
			}
			if (Date.now() >= Number(session.expires_at)) {
				window.localStorage.removeItem(storageKey);
				return null;
			}
			return session;
		} catch (error) {
			window.localStorage.removeItem(storageKey);
			return null;
		}
	}

	function readActiveSessionForPage(merchantKey) {
		if (!storageAvailable()) {
			return null;
		}

		var pagePrefix = activeSessionPagePrefix(merchantKey);
		for (var index = window.localStorage.length - 1; index >= 0; index -= 1) {
			var key = window.localStorage.key(index);
			if (!key || key.indexOf(ACTIVE_SESSION_PREFIX) !== 0) {
				continue;
			}

			var decodedKey = '';
			try {
				decodedKey = decodeURIComponent(key.slice(ACTIVE_SESSION_PREFIX.length));
			} catch (error) {
				continue;
			}

			if (decodedKey.indexOf(pagePrefix) !== 0) {
				continue;
			}

			var session = readActiveSession(key);
			if (session) {
				return session;
			}
		}

		return null;
	}

	function saveActiveSession(storageKey, payload) {
		if (!storageAvailable()) {
			return;
		}

		window.localStorage.setItem(storageKey, JSON.stringify({
			session_id: payload.session_id,
			checkout_url: payload.checkout_url,
			expires_at: Date.now() + ACTIVE_SESSION_TTL_MS,
		}));
	}

	function readElementValue(element) {
		if (!element) {
			return '';
		}

		if (element.tagName === 'SELECT') {
			return normalizeText(element.options[element.selectedIndex] && element.options[element.selectedIndex].text || element.value);
		}

		return normalizeText(element.value || element.textContent || element.getAttribute('content') || '');
	}

	function isVisibleElement(element) {
		if (!element || element.disabled) {
			return false;
		}

		var style = window.getComputedStyle(element);
		if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
			return false;
		}

		var rect = element.getBoundingClientRect();
		return rect.width > 0 && rect.height > 0;
	}

	function elementKey(element) {
		return [
			element.getAttribute('name'),
			element.id,
			element.getAttribute('autocomplete'),
			element.getAttribute('aria-label'),
			element.getAttribute('placeholder'),
			element.getAttribute('data-securepay-field'),
			element.getAttribute('data-field'),
		].filter(Boolean).join(' ').toLowerCase();
	}

	function allCandidateElements() {
		return Array.prototype.slice.call(document.querySelectorAll('input, textarea, select, [data-securepay-field], [data-field], [data-order-id], [data-order-amount]'));
	}

	function elementLabel(element) {
		if (!element) {
			return '';
		}

		var labelParts = [];
		var id = element.id;
		if (id) {
			var label = document.querySelector('label[for="' + cssEscape(id) + '"]');
			if (label) {
				labelParts.push(label.textContent);
			}
		}

		var wrappingLabel = element.closest && element.closest('label');
		if (wrappingLabel) {
			labelParts.push(wrappingLabel.textContent);
		}

		var parent = element.parentElement;
		if (parent) {
			var nearbyLabel = parent.querySelector('label, .label, [data-label]');
			if (nearbyLabel) {
				labelParts.push(nearbyLabel.textContent || nearbyLabel.getAttribute('data-label'));
			}
		}

		labelParts.push(element.getAttribute('aria-label'));
		labelParts.push(element.getAttribute('placeholder'));
		return normalizeText(labelParts.filter(Boolean).join(' '));
	}

	function rawFieldKey(element, label) {
		return [
			label,
			element.getAttribute('name'),
			element.id,
			element.getAttribute('autocomplete'),
			element.getAttribute('aria-label'),
			element.getAttribute('placeholder'),
			element.getAttribute('data-securepay-field'),
			element.getAttribute('data-field'),
			element.type,
		].filter(Boolean).join(' ').toLowerCase();
	}

	function isSensitiveOrIrrelevantField(element, key) {
		var type = String(element.type || '').toLowerCase();

		if (['password', 'hidden', 'file', 'submit', 'button', 'reset', 'image', 'range', 'color'].indexOf(type) !== -1) {
			return true;
		}

		if (/password|passcode|otp|one.?time|pin|cvv|cvc|card|credit|debit|expiry|expir|captcha|recaptcha|token|secret|auth|login|coupon|promo|voucher|discount|search|newsletter|subscribe|terms|agree|remember/.test(key)) {
			return true;
		}

		return false;
	}

	function collectRawSafeFields() {
		var elements = allCandidateElements();
		var rawFields = [];
		var seen = {};

		for (var i = 0; i < elements.length; i += 1) {
			var element = elements[i];
			if (!isVisibleElement(element)) {
				continue;
			}

			var value = readElementValue(element);
			if (!value) {
				continue;
			}

			var label = elementLabel(element);
			var key = rawFieldKey(element, label);
			if (isSensitiveOrIrrelevantField(element, key)) {
				continue;
			}

			var identity = [element.getAttribute('name'), element.id, label, value].join('|');
			if (seen[identity]) {
				continue;
			}
			seen[identity] = true;

			rawFields.push({
				label: label,
				name: element.getAttribute('name') || '',
				id: element.id || '',
				type: element.tagName === 'SELECT' ? 'select' : String(element.type || element.tagName || '').toLowerCase(),
				autocomplete: element.getAttribute('autocomplete') || '',
				placeholder: element.getAttribute('placeholder') || '',
				value: value,
			});
		}

		return rawFields.slice(0, 80);
	}

	function findRawFieldValue(rawFields, matchers) {
		for (var i = 0; i < rawFields.length; i += 1) {
			var field = rawFields[i];
			var key = [field.label, field.name, field.id, field.autocomplete, field.placeholder, field.type].join(' ').toLowerCase();
			var matches = matchers.some(function (matcher) {
				return matcher.test(key);
			});
			if (matches && field.value) {
				return field.value;
			}
		}
		return '';
	}

	function cssEscape(value) {
		if (window.CSS && typeof window.CSS.escape === 'function') {
			return window.CSS.escape(value);
		}

		return String(value).replace(/["\\#.;:[\]()>,+~*^$|=!]/g, '\\$&');
	}

	function findValueByFieldName(fieldName) {
		var cleanFieldName = normalizeText(fieldName);
		if (!cleanFieldName) {
			return '';
		}

		var escaped = cssEscape(cleanFieldName);
		var selectorList = [
			'[name="' + escaped + '"]',
			'#' + escaped,
			'[data-securepay-field="' + escaped + '"]',
			'[data-field="' + escaped + '"]',
			'[aria-label="' + escaped + '"]',
			'[placeholder="' + escaped + '"]',
		];

		for (var i = 0; i < selectorList.length; i += 1) {
			var element = document.querySelector(selectorList[i]);
			var value = readElementValue(element);
			if (value) {
				return value;
			}
		}

		var lowered = cleanFieldName.toLowerCase();
		var elements = allCandidateElements();
		for (var j = 0; j < elements.length; j += 1) {
			var candidate = elements[j];
			var key = elementKey(candidate);
			if (key && key.indexOf(lowered) !== -1) {
				var fuzzyValue = readElementValue(candidate);
				if (fuzzyValue) {
					return fuzzyValue;
				}
			}
		}

		return '';
	}

	function findRawValueByFieldName(rawFields, fieldName) {
		var cleanFieldName = normalizeText(fieldName).toLowerCase();
		if (!cleanFieldName) {
			return '';
		}

		for (var i = 0; i < rawFields.length; i += 1) {
			var field = rawFields[i];
			var key = [field.label, field.name, field.id, field.autocomplete, field.placeholder].join(' ').toLowerCase();
			if (key.indexOf(cleanFieldName) !== -1 && field.value) {
				return field.value;
			}
		}

		return '';
	}

	function findValue(matchers) {
		var elements = allCandidateElements();

		for (var i = 0; i < elements.length; i += 1) {
			var element = elements[i];
			var key = elementKey(element);
			var matches = matchers.some(function (matcher) {
				return matcher.test(key);
			});

			if (matches) {
				var value = readElementValue(element);
				if (value) {
					return value;
				}
			}
		}

		return '';
	}

	function readMeta(name) {
		var meta = document.querySelector('meta[name="' + name + '"], meta[property="' + name + '"]');
		return meta ? normalizeText(meta.getAttribute('content')) : '';
	}

	function collectCheckoutSnapshot(fieldMapping) {
		fieldMapping = fieldMapping || {};
		var rawFields = collectRawSafeFields();
		var explicitOrderId = document.querySelector('[data-order-id]');
		var explicitAmount = document.querySelector('[data-order-amount]');
		var firstName = findRawFieldValue(rawFields, [/first.?name/, /given.?name/]) || findValue([/first.?name/, /given.?name/]);
		var lastName = findRawFieldValue(rawFields, [/last.?name/, /family.?name/, /surname/]) || findValue([/last.?name/, /family.?name/, /surname/]);
		var fullName = findValueByFieldName(fieldMapping.customer_name) || findRawValueByFieldName(rawFields, fieldMapping.customer_name) || findRawFieldValue(rawFields, [/customer.?name/, /full.?name/, /billing.?name/, /shipping.?name/, /^name$/]) || findValue([/customer.?name/, /full.?name/, /billing.?name/, /shipping.?name/, /^name$/]);

		if (!fullName && (firstName || lastName)) {
			fullName = normalizeText(firstName + ' ' + lastName);
		}

		return {
			customer: {
				name: fullName,
				phone: findValueByFieldName(fieldMapping.phone) || findRawValueByFieldName(rawFields, fieldMapping.phone) || findRawFieldValue(rawFields, [/phone/, /mobile/, /contact/, /tel/]) || findValue([/phone/, /mobile/, /contact/, /tel/]),
				email: findValueByFieldName(fieldMapping.email) || findRawValueByFieldName(rawFields, fieldMapping.email) || findRawFieldValue(rawFields, [/email/, /e-mail/]) || findValue([/email/, /e-mail/]),
				address: findValueByFieldName(fieldMapping.address) || findRawValueByFieldName(rawFields, fieldMapping.address) || findRawFieldValue(rawFields, [/address/, /street/, /shipping/, /billing/]) || findValue([/address/, /street/, /shipping/, /billing/]),
				pincode: findValueByFieldName(fieldMapping.pincode) || findRawValueByFieldName(rawFields, fieldMapping.pincode) || findRawFieldValue(rawFields, [/pin.?code/, /postcode/, /postal/, /zip/]) || findValue([/pin.?code/, /postcode/, /postal/, /zip/]),
				city: findValueByFieldName(fieldMapping.city) || findRawValueByFieldName(rawFields, fieldMapping.city) || findRawFieldValue(rawFields, [/city/, /town/]) || findValue([/city/, /town/]),
				state: findValueByFieldName(fieldMapping.state) || findRawValueByFieldName(rawFields, fieldMapping.state) || findRawFieldValue(rawFields, [/state/, /province/, /region/]) || findValue([/state/, /province/, /region/]),
				country: findValueByFieldName(fieldMapping.country) || findRawValueByFieldName(rawFields, fieldMapping.country) || findRawFieldValue(rawFields, [/country/]) || findValue([/country/]),
			},
			order: {
				order_id: findValueByFieldName(fieldMapping.order_id) || findRawValueByFieldName(rawFields, fieldMapping.order_id) || readElementValue(explicitOrderId) || findRawFieldValue(rawFields, [/order.?id/, /order.?number/, /order.?no/, /invoice/]) || findValue([/order.?id/, /order.?number/, /order.?no/, /invoice/]) || readMeta('securepay:order_id'),
				amount: findValueByFieldName(fieldMapping.amount) || findRawValueByFieldName(rawFields, fieldMapping.amount) || readElementValue(explicitAmount) || findRawFieldValue(rawFields, [/amount/, /grand.?total/, /order.?total/, /cart.?total/, /^total$/, /price/]) || findValue([/amount/, /grand.?total/, /order.?total/, /cart.?total/, /^total$/, /price/]) || readMeta('securepay:amount'),
				currency: readMeta('securepay:currency') || 'INR',
			},
			page: {
				title: document.title,
				url: window.location.href,
				origin: window.location.origin,
				raw_fields: rawFields,
				raw_field_count: rawFields.length,
			},
		};
	}

	function fetchButtonConfig(options) {
		var configApiUrl = buildConfigApiUrl(options.configApiUrl, options.merchantKey);

		return fetch(configApiUrl, {
			headers: {
				'ngrok-skip-browser-warning': 'true',
			},
		})
			.then(function (response) {
				if (!response.ok) {
					return {};
				}
				return response.json().catch(function () {
					return {};
				});
			})
			.catch(function () {
				return {};
			});
	}

	function missingRequiredFields(snapshot) {
		var missing = [];
		if (!snapshot.order.order_id) {
			missing.push('order id');
		}
		if (!snapshot.order.amount) {
			missing.push('amount');
		}
		if (!snapshot.customer.name) {
			missing.push('customer name');
		}
		if (!snapshot.customer.phone) {
			missing.push('phone');
		}
		if (!snapshot.customer.address) {
			missing.push('address');
		}
		return missing;
	}

	function createCheckoutSession(options) {
		var sessionApiUrl = buildSessionApiUrl(options.sessionApiUrl);

		return fetchButtonConfig(options).then(function (config) {
			var snapshot = collectCheckoutSnapshot(config.checkout_field_mapping || {});
			var missing = missingRequiredFields(snapshot);
			if (missing.length) {
				throw new Error('Please fill required checkout fields before paying: ' + missing.join(', ') + '.');
			}
			return fetch(sessionApiUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'ngrok-skip-browser-warning': 'true',
				},
				body: JSON.stringify({
					merchant_key: options.merchantKey,
					customer: snapshot.customer,
					order: snapshot.order,
					page: snapshot.page,
					source_origin: window.location.origin,
					source_url: window.location.href,
					checkout_base_url: buildCheckoutBaseUrl(),
					sdk_version: SDK_VERSION,
					field_mapping_version: config.ok ? 'merchant_config' : 'auto_detect',
				}),
			}).then(function (response) {
				return response.json().catch(function () {
					return {};
				}).then(function (payload) {
					if (!response.ok || !payload.checkout_url) {
						throw new Error(payload.error || 'EscroSafe could not create checkout session.');
					}
					return payload;
				});
			});
		});
	}

	// ---- Cash on Delivery sensing --------------------------------------------
	// Watches the host page. When the shopper picks a Cash on Delivery / Pay on
	// Delivery option (radio, checkbox or <select>), a toast promotes EscroSafe.
	// Pages with no COD option never trigger it.
	var COD_PATTERN = /(^|[^a-z])(cod|cash[\s_-]*on[\s_-]*delivery|pay[\s_-]*on[\s_-]*delivery)([^a-z]|$)/i;
	var codWatcherStarted = false;
	var codWasSelected = false;
	var codToast = null;
	var codToastTimer = null;

	function controlText(element) {
		var parts = [element.value, element.id, element.getAttribute('name'), element.getAttribute('aria-label'), element.getAttribute('data-payment-method')];
		if (element.id) {
			var forLabel = document.querySelector('label[for="' + cssEscape(element.id) + '"]');
			if (forLabel) {
				parts.push(forLabel.textContent);
			}
		}
		var wrappingLabel = element.closest && element.closest('label');
		if (wrappingLabel) {
			parts.push(wrappingLabel.textContent);
			// Logos carry the name in their alt text.
			var logos = wrappingLabel.querySelectorAll('img[alt]');
			for (var k = 0; k < logos.length; k += 1) {
				parts.push(logos[k].getAttribute('alt'));
			}
		}
		return parts.filter(Boolean).join(' ');
	}

	function isCodSelected() {
		var controls = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
		for (var i = 0; i < controls.length; i += 1) {
			if (controls[i].checked && COD_PATTERN.test(controlText(controls[i]))) {
				return true;
			}
		}
		var selects = document.querySelectorAll('select');
		for (var j = 0; j < selects.length; j += 1) {
			var option = selects[j].options[selects[j].selectedIndex];
			if (option && option.value && COD_PATTERN.test(option.text + ' ' + option.value)) {
				return true;
			}
		}
		return false;
	}

	function hideCodToast() {
		window.clearTimeout(codToastTimer);
		if (codToast && codToast.parentNode) {
			codToast.parentNode.removeChild(codToast);
		}
		codToast = null;
	}

	// Pick the EscroSafe option on the host page (a payment-method radio), else focus the EscroSafe button.
	function chooseEscrosafeOption() {
		var controls = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
		for (var i = 0; i < controls.length; i += 1) {
			var text = controlText(controls[i]);
			if (/escro|securepay/i.test(text) && !COD_PATTERN.test(text)) {
				controls[i].click();
				return;
			}
		}
		var payButton = document.querySelector('[data-securepay-button]');
		if (payButton) {
			payButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
			payButton.focus();
		}
	}

	function showCodToast() {
		if (codToast) {
			return;
		}
		injectStyles();
		codToast = document.createElement('div');
		codToast.className = 'securepay-cod-toast';
		codToast.setAttribute('role', 'status');
		codToast.innerHTML = '<div class="securepay-cod-toast-body"><p>Save on COD fees with EscroSafe; pay online, with your money held securely until delivery is confirmed. <button type="button" class="securepay-cod-toast-link">Pay with <img alt="EscroSafe"></button></p></div>' +
			'<button type="button" class="securepay-cod-toast-close" aria-label="Dismiss"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
		codToast.querySelector('.securepay-cod-toast-close').addEventListener('click', hideCodToast);
		var toastLink = codToast.querySelector('.securepay-cod-toast-link');
		toastLink.querySelector('img').src = getScriptOrigin() + '/escrosafe-logo.png';
		toastLink.addEventListener('click', function () {
			hideCodToast();
			chooseEscrosafeOption();
		});
		document.body.appendChild(codToast);
		codToastTimer = window.setTimeout(hideCodToast, 12000);
	}

	function checkCodSelection() {
		var selected = isCodSelected();
		if (selected && !codWasSelected) {
			showCodToast();
		} else if (!selected) {
			hideCodToast();
		}
		codWasSelected = selected;
	}

	function startCodWatcher() {
		if (codWatcherStarted) {
			return;
		}
		codWatcherStarted = true;
		var schedule = function () {
			window.setTimeout(checkCodSelection, 0);
		};
		document.addEventListener('change', schedule, true);
		document.addEventListener('click', schedule, true);
		if (window.MutationObserver) {
			new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['checked', 'selected'] });
		}
		checkCodSelection();
	}

	function mountSecurePayButton(options) {
		var merchantKey = String(options.merchantKey || '').trim();
		var buttonText = String(options.buttonText || 'Pay with EscroSafe').trim();
		var checkoutUrl = String(options.checkoutUrl || DEFAULT_CHECKOUT_URL).trim();
		var sessionApiUrl = String(options.sessionApiUrl || '').trim();
		var configApiUrl = String(options.configApiUrl || '').trim();
		var disabled = Boolean(options.disabled);
		var disabledReason = String(options.disabledReason || 'This payment option is currently unavailable.').trim();
		var target = options.target || null;
		var currentStorageKey = '';

		if (!merchantKey) {
			if (window.console && window.console.warn) {
				window.console.warn('EscroSafe button: data-merchant-key is required.');
			}
			return null;
		}

		injectStyles();
		startCodWatcher();

		var wrapper = document.createElement('span');
		wrapper.className = 'securepay-button-wrap';
		var theme = THEMES[String(options.buttonTheme || '').trim().toLowerCase()];
		if (theme) {
			wrapper.style.setProperty('--sp-bg', theme[0]);
			wrapper.style.setProperty('--sp-border', theme[1]);
			wrapper.style.setProperty('--sp-hover-bg', theme[2]);
			wrapper.style.setProperty('--sp-hover-border', theme[3]);
		}

		var button = document.createElement('button');
		button.type = 'button';
		button.className = 'securepay-button';
		button.setAttribute('data-securepay-button', 'true');
		button.setAttribute('aria-describedby', 'securepay-active-session-message');
		// The EscroSafe name is always shown as the logo image (falls back to text if it can't load).
		var logoUrl = String(options.buttonLogoUrl || '').trim() || (getScriptOrigin() + '/escrosafe-logo.png');
		var logoOk = true;
		var logoEl = document.createElement('img');
		logoEl.className = 'securepay-button-logo';
		logoEl.src = logoUrl;
		logoEl.alt = 'EscroSafe';
		logoEl.addEventListener('error', function () {
			logoOk = false;
			logoEl.style.display = 'none';
			setLabel(currentState);
		});
		var prefixEl = document.createElement('span');
		prefixEl.className = 'securepay-button-text';
		var suffixEl = document.createElement('span');
		suffixEl.className = 'securepay-button-text';
		button.appendChild(prefixEl);
		button.appendChild(logoEl);
		button.appendChild(suffixEl);

		var baseText = buttonText.replace(/\s*EscroSafe\s*$/i, '').trim() || 'Pay with';
		var currentState = 'default';
		var LABEL_STATES = {
			'default': [baseText, ''],
			'opening': ['Opening', '...'],
			'running': ['', 'session running'],
		};
		function setLabel(state) {
			currentState = state;
			var parts = LABEL_STATES[state] || LABEL_STATES['default'];
			var prefix = parts[0];
			var suffix = parts[1];
			if (!logoOk) {
				// Logo missing: keep the text readable.
				prefix = prefix ? prefix + ' EscroSafe' : 'EscroSafe';
			}
			prefixEl.textContent = prefix;
			suffixEl.textContent = suffix;
			prefixEl.style.display = prefix ? '' : 'none';
			suffixEl.style.display = suffix ? '' : 'none';
			logoEl.style.display = logoOk ? '' : 'none';
		}
		setLabel('default');
		button.disabled = disabled;
		if (disabled) {
			button.title = disabledReason;
		}

		var sessionTip = document.createElement('span');
		sessionTip.className = 'securepay-session-tip';
		sessionTip.id = 'securepay-active-session-message';
		sessionTip.innerHTML = '<span>One EscroSafe session is already running for this order.</span><a href="#">Continue current session</a>';
		var sessionTipLink = sessionTip.querySelector('a');

		function getActiveSessionForCurrentOrder() {
			var snapshot = collectCheckoutSnapshot({});
			currentStorageKey = activeSessionStorageKey(merchantKey, snapshot.order.order_id);
			return readActiveSession(currentStorageKey) || readActiveSessionForPage(merchantKey);
		}

		function resetButtonState() {
			if (disabled) {
				button.disabled = true;
				setLabel('default');
				button.title = disabledReason;
				sessionTip.style.display = 'none';
				wrapper.classList.remove('is-session-active');
				return;
			}

			button.disabled = false;
			button.removeAttribute('title');
			setLabel('default');
			sessionTip.style.display = 'none';
			wrapper.classList.remove('is-session-active');
		}

		function startCheckout() {
			if (disabled) {
				window.alert(disabledReason);
				return;
			}
			// A session for this order is already running: go back to it instead of creating a new one.
			var activeSession = getActiveSessionForCurrentOrder();
			if (activeSession && activeSession.checkout_url) {
				window.location.href = activeSession.checkout_url;
				return;
			}
			button.disabled = true;
			setLabel('opening');

			window.dispatchEvent(new CustomEvent('securepay:button-click', {
				detail: {
					merchantKey: merchantKey,
					version: SDK_VERSION,
				},
			}));

			createCheckoutSession({
				merchantKey: merchantKey,
				sessionApiUrl: sessionApiUrl,
				configApiUrl: configApiUrl,
			}).then(function (payload) {
				saveActiveSession(currentStorageKey, payload);
				window.dispatchEvent(new CustomEvent('securepay:session-created', {
					detail: payload,
				}));
				window.location.href = payload.checkout_url;
			}).catch(function (error) {
				if (window.console && window.console.error) {
					window.console.error(error);
				}

				button.disabled = false;
				setLabel('default');

				var fallbackUrl = buildCheckoutUrl({
					merchantKey: merchantKey,
					checkoutUrl: checkoutUrl,
				});
				window.alert(error.message || 'EscroSafe could not start checkout. Please try again.');
				window.dispatchEvent(new CustomEvent('securepay:session-error', {
					detail: {
						message: error.message,
						fallbackUrl: fallbackUrl,
					},
				}));
			});
		}

		button.addEventListener('click', function () {
			var event = new CustomEvent('securepay:before-start', {
				cancelable: true,
				detail: {
					merchantKey: merchantKey,
					version: SDK_VERSION,
					continueCheckout: startCheckout,
				},
			});
			var shouldContinue = window.dispatchEvent(event);
			if (!shouldContinue || event.defaultPrevented) {
				return;
			}
			startCheckout();
		});
		window.addEventListener('pageshow', resetButtonState);
		var resetInterval = window.setInterval(resetButtonState, 15000);
		wrapper.securePayDestroy = function () {
			window.removeEventListener('pageshow', resetButtonState);
			window.clearInterval(resetInterval);
		};

		wrapper.appendChild(button);
		wrapper.appendChild(sessionTip);
		resetButtonState();

		if (target) {
			target.appendChild(wrapper);
		}

		return wrapper;
	}

	function autoMountFromScript(script) {
		if (!script || script.getAttribute('data-auto-render') === 'false') {
			return;
		}

		var target = null;
		var targetSelector = script.getAttribute('data-target') || script.getAttribute('data-container');

		if (targetSelector) {
			target = document.querySelector(targetSelector);
		}

		var button = mountSecurePayButton({
			merchantKey: script.getAttribute('data-merchant-key'),
			buttonText: script.getAttribute('data-button-text'),
			buttonLogoUrl: script.getAttribute('data-button-logo-url'),
			buttonTheme: script.getAttribute('data-button-theme'),
			checkoutUrl: script.getAttribute('data-checkout-url'),
			sessionApiUrl: script.getAttribute('data-session-api-url'),
			configApiUrl: script.getAttribute('data-config-api-url'),
			target: target,
		});

		if (button && !target) {
			if (script.parentNode && script.parentNode !== document.head) {
				script.parentNode.insertBefore(button, script.nextSibling);
			} else {
				document.body.appendChild(button);
			}
		}
	}

	window.SecurePay = window.SecurePay || {};
	window.SecurePay.button = {
		mount: mountSecurePayButton,
		version: SDK_VERSION,
	};

	var script = getCurrentScript();

	if (document.readyState === 'loading' || !document.body) {
		document.addEventListener('DOMContentLoaded', function () {
			autoMountFromScript(script);
		});
	} else {
		autoMountFromScript(script);
	}
})();

import { CLIENT_SIDE_STORAGE_INDEX_NAME } from 'Common/Consts';

var Cookies = (() => {
	function extend (...args) {
		var result = {};
		args.forEach(attributes => {
			for (var key in attributes) {
				result[key] = attributes[key];
			}
		});
		return result;
	}

	function decode (s) {
		return s.replace(/(%[0-9A-Z]{2})+/g, decodeURIComponent);
	}

	function set (key, value, attributes) {
		if (typeof document === 'undefined') {
			return;
		}

		attributes = extend({
			path: '/'
		}, attributes);

		if (typeof attributes.expires === 'number') {
			attributes.expires = new Date(new Date() * 1 + attributes.expires * 864e+5);
		}

		// We're using "expires" because "max-age" is not supported by IE
		attributes.expires = attributes.expires ? attributes.expires.toUTCString() : '';

		try {
			var result = JSON.stringify(value);
			if (/^[{[]/.test(result)) {
				value = result;
			}
		} catch (e) {} // eslint-disable-line no-empty

		value = encodeURIComponent(String(value))
				.replace(/%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g, decodeURIComponent);

		key = encodeURIComponent(String(key))
			.replace(/%(23|24|26|2B|5E|60|7C)/g, decodeURIComponent)
			.replace(/[()]/g, escape);

		var stringifiedAttributes = '';
		for (var attributeName in attributes) {
			if (!attributes[attributeName]) {
				continue;
			}
			stringifiedAttributes += '; ' + attributeName;
			if (attributes[attributeName] === true) {
				continue;
			}

			// Considers RFC 6265 section 5.2:
			// ...
			// 3.  If the remaining unparsed-attributes contains a %x3B (";")
			//     character:
			// Consume the characters of the unparsed-attributes up to,
			// not including, the first %x3B (";") character.
			// ...
			stringifiedAttributes += '=' + attributes[attributeName].split(';')[0];
		}

		return (document.cookie = key + '=' + value + stringifiedAttributes);
	}

	function get (key) {
		if (typeof document === 'undefined') {
			return;
		}

		var jar = {};
		// To prevent the for loop in the first place assign an empty array
		// in case there are no cookies at all.
		var cookies = document.cookie ? document.cookie.split('; ') : [];
		var i = 0;

		for (; i < cookies.length; i++) {
			var parts = cookies[i].split('=');
			var cookie = parts.slice(1).join('=');

			try {
				var name = decode(parts[0]);
				cookie = decode(cookie);

				try {
					cookie = JSON.parse(cookie);
				} catch (e) {} // eslint-disable-line no-empty

				jar[name] = cookie;

				if (key === name) {
					break;
				}
			} catch (e) {} // eslint-disable-line no-empty
		}

		return key ? jar[key] : jar;
	}

	return {
		set: set,
		getJSON: key => get(key)
	};
})();


class CookieDriver {
	/**
	 * @param {string} key
	 * @param {*} data
	 * @returns {boolean}
	 */
	set(key, data) {
		let result = false,
			storageResult = null;

		try {
			storageResult = Cookies.getJSON(CLIENT_SIDE_STORAGE_INDEX_NAME);
		} catch (e) {} // eslint-disable-line no-empty

		(storageResult || (storageResult = {}))[key] = data;

		try {
			Cookies.set(CLIENT_SIDE_STORAGE_INDEX_NAME, storageResult, {
				expires: 30
			});

			result = true;
		} catch (e) {} // eslint-disable-line no-empty

		return result;
	}

	/**
	 * @param {string} key
	 * @returns {*}
	 */
	get(key) {
		let result = null;

		try {
			const storageResult = Cookies.getJSON(CLIENT_SIDE_STORAGE_INDEX_NAME);
			result = storageResult && undefined !== storageResult[key] ? storageResult[key] : null;
		} catch (e) {} // eslint-disable-line no-empty

		return result;
	}

	/**
	 * @returns {boolean}
	 */
	static supported() {
		return !!(navigator && navigator.cookieEnabled);
	}
}

export { CookieDriver, CookieDriver as default };

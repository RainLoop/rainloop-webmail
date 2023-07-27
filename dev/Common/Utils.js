export const
	isArray = Array.isArray,
	arrayLength = array => isArray(array) && array.length,
	isFunction = v => typeof v === 'function',
	pString = value => null != value ? '' + value : '',

	forEachObjectValue = (obj, fn) => Object.values(obj).forEach(fn),

	forEachObjectEntry = (obj, fn) => Object.entries(obj).forEach(([key, value]) => fn(key, value)),

	pInt = (value, defaultValue = 0) => {
		value = parseInt(value, 10);
		return isNaN(value) || !isFinite(value) ? defaultValue : value;
	},

	defaultOptionsAfterRender = (domItem, item) =>
		item && undefined !== item.disabled && domItem?.classList.toggle('disabled', domItem.disabled = item.disabled),

	// unescape(encodeURIComponent()) makes the UTF-16 DOMString to an UTF-8 string
	b64Encode = data => btoa(unescape(encodeURIComponent(data))),
/* 	// Without deprecated 'unescape':
	b64Encode = data => btoa(encodeURIComponent(data).replace(
		/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)
	)),
*/

	b64EncodeJSON = data => b64Encode(JSON.stringify(data)),

	b64EncodeJSONSafe = data => b64EncodeJSON(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),

	getKeyByValue = (o, v) => Object.keys(o).find(key => o[key] === v);

import { SaveSettingsStep } from 'Common/Enums';
import { doc, elementById } from 'Common/Globals';

let __themeTimer = 0,
	__themeJson = null;

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

	convertThemeName = theme => theme
		.replace(/@custom$/, '')
		.replace(/([A-Z])/g, ' $1')
		.replace(/[^a-zA-Z0-9]+/g, ' ')
		.trim(),

	defaultOptionsAfterRender = (domItem, item) =>
		domItem && item && undefined !== item.disabled
		&& domItem.classList.toggle('disabled', domItem.disabled = item.disabled),

	inFocus = () => {
		try {
			return doc.activeElement && doc.activeElement.matches(
				'input,textarea,[contenteditable]'
			);
		} catch (e) {
			return false;
		}
	},

	// unescape(encodeURIComponent()) makes the UTF-16 DOMString to an UTF-8 string
	b64EncodeJSON = data => btoa(unescape(encodeURIComponent(JSON.stringify(data)))),
/* 	// Without deprecated 'unescape':
	b64EncodeJSON = data => btoa(encodeURIComponent(JSON.stringify(data)).replace(
		/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)
	)),
*/
	b64EncodeJSONSafe = data => b64EncodeJSON(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),

	settingsSaveHelperSimpleFunction = (koTrigger, context) =>
		iError => {
			koTrigger.call(context, iError ? SaveSettingsStep.FalseResult : SaveSettingsStep.TrueResult);
			setTimeout(() => koTrigger.call(context, SaveSettingsStep.Idle), 1000);
		},

	changeTheme = (value, themeTrigger = ()=>0) => {
		const themeStyle = elementById('app-theme-style'),
			clearTimer = () => {
				__themeTimer = setTimeout(() => themeTrigger(SaveSettingsStep.Idle), 1000);
				__themeJson = null;
			};

		let url = themeStyle.dataset.href;

		if (url) {
			url = url.toString()
				.replace(/\/-\/[^/]+\/-\//, '/-/' + value + '/-/')
				.replace(/\/Css\/[^/]+\/User\//, '/Css/0/User/')
				.replace(/\/Hash\/[^/]+\//, '/Hash/-/');

			if ('Json/' !== url.substr(-5)) {
				url += 'Json/';
			}

			clearTimeout(__themeTimer);

			themeTrigger(SaveSettingsStep.Animate);

			if (__themeJson) {
				__themeJson.abort();
			}
			let init = {};
			if (window.AbortController) {
				__themeJson = new AbortController();
				init.signal = __themeJson.signal;
			}
			rl.fetchJSON(url, init)
				.then(data => {
					if (2 === arrayLength(data)) {
						themeStyle.textContent = data[1];
						themeStyle.dataset.href = url;
						themeStyle.dataset.theme = data[0];
						themeTrigger(SaveSettingsStep.TrueResult);
					}
				})
				.then(clearTimer, clearTimer);
		}
	},

	getKeyByValue = (o, v) => Object.keys(o).find(key => o[key] === v);

import { SaveSettingsStep } from 'Common/Enums';
import { doc } from 'Common/Globals';

export const
	isArray = Array.isArray,
	isNonEmptyArray = Array.isNotEmpty;

/**
 * @param {*} value
 * @param {number=} defaultValue = 0
 * @returns {number}
 */
export function pInt(value, defaultValue = 0) {
	value = parseInt(value, 10);
	return isNaN(value) || !isFinite(value) ? defaultValue : value;
}

/**
 * @param {*} value
 * @returns {string}
 */
export function pString(value) {
	return null != value ? '' + value : '';
}

/**
 * @returns {boolean}
 */
export function inFocus() {
	try {
		return doc.activeElement && doc.activeElement.matches(
			'input,textarea,iframe,.cke_editable'
		);
	} catch (e) {
		return false;
	}
}

/**
 * @param {string} theme
 * @returns {string}
 */
export const convertThemeName = theme => {
	if ('@custom' === theme.substr(-7)) {
		theme = theme.substr(0, theme.length - 7).trim();
	}

	return theme
		.replace(/([A-Z])/g, ' $1')
		.replace(/[^a-zA-Z0-9]+/g, ' ')
		.trim();
};

/**
 * @param {object} domOption
 * @param {object} item
 * @returns {void}
 */
export function defaultOptionsAfterRender(domItem, item) {
	if (item && undefined !== item.disabled && domItem) {
		domItem.classList.toggle('disabled', domItem.disabled = item.disabled);
	}
}

/**
 * @param {object} koTrigger
 * @param {mixed} context
 * @returns {mixed}
 */
export function settingsSaveHelperSimpleFunction(koTrigger, context) {
	return (type, data) => {
		koTrigger.call(context, data && data.Result ? SaveSettingsStep.TrueResult : SaveSettingsStep.FalseResult);
		setTimeout(() => koTrigger.call(context, SaveSettingsStep.Idle), 1000);
	};
}

let __themeTimer = 0,
	__themeJson = null;

/**
 * @param {string} value
 * @param {function=} themeTrigger = noop
 * @returns {void}
 */
export function changeTheme(value, themeTrigger = ()=>{}) {
	const themeLink = doc.getElementById('app-theme-link'),
		clearTimer = () => {
			__themeTimer = setTimeout(() => themeTrigger(SaveSettingsStep.Idle), 1000);
			__themeJson = null;
		};

	let themeStyle = doc.getElementById('app-theme-style'),
		url = (themeLink && themeLink.href) || (themeStyle && themeStyle.dataset.href);

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
				if (data && Array.isArray(data) && 2 === data.length) {
					if (themeLink && !themeStyle) {
						themeStyle = doc.createElement('style');
						themeStyle.id = 'app-theme-style';
						themeLink.after(themeStyle);
						themeLink.remove();
					}

					if (themeStyle) {
						themeStyle.textContent = data[1];
						themeStyle.dataset.href = url;
						themeStyle.dataset.theme = data[0];
					}

					themeTrigger(SaveSettingsStep.TrueResult);
				}
			})
			.then(clearTimer, clearTimer);
	}
}

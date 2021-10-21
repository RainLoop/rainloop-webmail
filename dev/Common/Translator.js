import ko from 'ko';
import { Notification, UploadErrorCode } from 'Common/Enums';
import { langLink } from 'Common/Links';
import { doc, createElement } from 'Common/Globals';
import { getKeyByValue } from 'Common/Utils';

let I18N_DATA = {};

const
	i18nToNode = element => {
		const key = element.dataset.i18n;
		if (key) {
			if ('[' === key.substr(0, 1)) {
				switch (key.substr(0, 6)) {
					case '[html]':
						element.innerHTML = i18n(key.substr(6));
						break;
					case '[place':
						element.placeholder = i18n(key.substr(13));
						break;
					case '[title':
						element.title = i18n(key.substr(7));
						break;
					// no default
				}
			} else {
				element.textContent = i18n(key);
			}
		}
	},

	init = () => {
		if (rl.I18N) {
			I18N_DATA = rl.I18N;
			Date.defineRelativeTimeFormat(rl.relativeTime || {});
			rl.I18N = null;
			return 1;
		}
	},

	i18nKey = key => key.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase(),

	getNotificationMessage = code => {
		let key = getKeyByValue(Notification, code);
		if (key) {
			key = i18nKey(key).replace('_NOTIFICATION', '_ERROR');
			return I18N_DATA.NOTIFICATIONS[key];
		}
	};

export const
	trigger = ko.observable(false),

	/**
	 * @param {string} key
	 * @param {Object=} valueList
	 * @param {string=} defaulValue
	 * @returns {string}
	 */
	i18n = (key, valueList, defaulValue) => {
		let result = defaulValue || key;
		if (key) {
			let path = key.split('/');
			if (I18N_DATA[path[0]] && path[1]) {
				result = I18N_DATA[path[0]][path[1]] || result;
			}
		}
		if (valueList) {
			Object.entries(valueList).forEach(([key, value]) => {
				result = result.replace('%' + key + '%', value);
			});
		}
		return result;
	},

	/**
	 * @param {Object} elements
	 * @param {boolean=} animate = false
	 */
	i18nToNodes = element =>
		setTimeout(() =>
			element.querySelectorAll('[data-i18n]').forEach(item => i18nToNode(item))
		, 1),

	/**
	 * @param {Function} startCallback
	 * @param {Function=} langCallback = null
	 */
	initOnStartOrLangChange = (startCallback, langCallback = null) => {
		startCallback && startCallback();
		startCallback && trigger.subscribe(startCallback);
		langCallback && trigger.subscribe(langCallback);
	},

	/**
	 * @param {number} code
	 * @param {*=} message = ''
	 * @param {*=} defCode = null
	 * @returns {string}
	 */
	getNotification = (code, message = '', defCode = 0) => {
		code = parseInt(code, 10) || 0;
		if (Notification.ClientViewError === code && message) {
			return message;
		}

		return getNotificationMessage(code)
			|| getNotificationMessage(parseInt(defCode, 10))
			|| '';
	},

	/**
	 * @param {*} code
	 * @returns {string}
	 */
	getUploadErrorDescByCode = code => {
		let result = 'UNKNOWN';
		code = parseInt(code, 10) || 0;
		switch (code) {
			case UploadErrorCode.FileIsTooBig:
			case UploadErrorCode.FilePartiallyUploaded:
			case UploadErrorCode.NoFileUploaded:
			case UploadErrorCode.MissingTempFolder:
			case UploadErrorCode.OnSavingFile:
			case UploadErrorCode.FileType:
				result = i18nKey(getKeyByValue(UploadErrorCode, code));
				break;
		}
		return i18n('UPLOAD/ERROR_' + result);
	},

	/**
	 * @param {boolean} admin
	 * @param {string} language
	 */
	reload = (admin, language) =>
		new Promise((resolve, reject) => {
			const script = createElement('script');
			script.onload = () => {
				// reload the data
				if (init()) {
					i18nToNodes(doc);
					admin || rl.app.reloadTime();
					trigger(!trigger());
				}
				script.remove();
				resolve();
			};
			script.onerror = () => reject(new Error('Language '+language+' failed'));
			script.src = langLink(language, admin);
	//		script.async = true;
			doc.head.append(script);
		}),

	/**
	 *
	 * @param {string} language
	 * @param {boolean=} isEng = false
	 * @returns {string}
	 */
	convertLangName = (language, isEng = false) =>
		i18n(
			'LANGS_NAMES' + (true === isEng ? '_EN' : '') + '/' + language,
			null,
			language
		);

init();

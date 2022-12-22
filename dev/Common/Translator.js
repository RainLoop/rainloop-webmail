import ko from 'ko';
import { Notification, UploadErrorCode } from 'Common/Enums';
import { langLink } from 'Common/Links';
import { doc, createElement } from 'Common/Globals';
import { getKeyByValue, forEachObjectEntry } from 'Common/Utils';
import { pInt } from 'Common/Utils';
import { LanguageStore } from 'Stores/Language';

let I18N_DATA = {};

const
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
		return key ? I18N_DATA.NOTIFICATIONS[i18nKey(key).replace('_NOTIFICATION', '_ERROR')] : '';
	};

export const
	translateTrigger = ko.observable(false),

	/**
	 * @param {string} key
	 * @param {Object=} valueList
	 * @param {string=} defaulValue
	 * @returns {string}
	 */
	i18n = (key, valueList, defaulValue) => {
		let result = null == defaulValue ? key : defaulValue;
		let path = key.split('/');
		if (I18N_DATA[path[0]] && path[1]) {
			result = I18N_DATA[path[0]][path[1]] || result;
		}
		valueList && forEachObjectEntry(valueList, (key, value) => {
			result = result.replace('%' + key + '%', value);
		});
		return result;
	},

	/**
	 * @param {Object} elements
	 * @param {boolean=} animate = false
	 */
	i18nToNodes = element =>
		setTimeout(() =>
			element.querySelectorAll('[data-i18n]').forEach(element => {
				const key = element.dataset.i18n;
				if ('[' === key[0]) {
					switch (key.slice(1, 6)) {
						case 'html]':
							element.innerHTML = i18n(key.slice(6));
							break;
						case 'place':
							element.placeholder = i18n(key.slice(13));
							break;
						case 'title':
							element.title = i18n(key.slice(7));
							break;
						// no default
					}
				} else {
					element.textContent = i18n(key);
				}
			})
		, 1),

	timestampToString = (timeStampInUTC, formatStr) => {
		const now = Date.now(),
			time = 0 < timeStampInUTC ? Math.min(now, timeStampInUTC * 1000) : (0 === timeStampInUTC ? now : 0);

		if (31536000000 < time) {
			const m = new Date(time), h = LanguageStore.hourCycle();
			switch (formatStr) {
				case 'FROMNOW':
					return m.fromNow();
				case 'SHORT': {
					if (4 >= (now - time) / 3600000)
						return m.fromNow();
					const mt = m.getTime(), date = new Date,
						dt = date.setHours(0,0,0,0);
					if (mt > dt)
						return i18n('MESSAGE_LIST/TODAY_AT', {TIME: m.format('LT',0,h)});
					if (mt > dt - 86400000)
						return i18n('MESSAGE_LIST/YESTERDAY_AT', {TIME: m.format('LT',0,h)});
					if (date.getFullYear() === m.getFullYear())
						return m.format('d M');
					return m.format('LL',0,h);
				}
				case 'FULL':
					return m.format('LLL',0,h);
				default:
					return m.format(formatStr,0,h);
			}
		}

		return '';
	},

	timeToNode = (element, time) => {
		try {
			if (time) {
				element.dateTime = (new Date(time * 1000)).format('Y-m-d\\TH:i:s');
			} else {
				time = Date.parse(element.dateTime) / 1000;
			}

			let key = element.dataset.momentFormat;
			if (key) {
				element.textContent = timestampToString(time, key);
			}

			if ((key = element.dataset.momentFormatTitle)) {
				element.title = timestampToString(time, key);
			}
		} catch (e) {
			// prevent knockout crashes
			console.error(e);
		}
	},

	reloadTime = () => setTimeout(() =>
			doc.querySelectorAll('time').forEach(element => timeToNode(element))
			, 1),

	/**
	 * @param {Function} startCallback
	 * @param {Function=} langCallback = null
	 */
	initOnStartOrLangChange = (startCallback, langCallback) => {
		startCallback?.();
		startCallback && translateTrigger.subscribe(startCallback);
		langCallback && translateTrigger.subscribe(langCallback);
	},

	/**
	 * @param {number} code
	 * @param {*=} message = ''
	 * @param {*=} defCode = null
	 * @returns {string}
	 */
	getNotification = (code, message = '', defCode = 0) => {
		code = pInt(code);
		if (Notification.ClientViewError === code && message) {
			return message;
		}

		return getNotificationMessage(code)
			|| getNotificationMessage(pInt(defCode))
			|| '';
	},

	/**
	 * @param {*} code
	 * @returns {string}
	 */
	getUploadErrorDescByCode = code => {
		let key = getKeyByValue(UploadErrorCode, parseInt(code, 10));
		return i18n('UPLOAD/ERROR_' + (key ? i18nKey(key) : 'UNKNOWN'));
	},

	/**
	 * @param {boolean} admin
	 * @param {string} language
	 */
	translatorReload = (admin, language) =>
		new Promise((resolve, reject) => {
			const script = createElement('script');
			script.onload = () => {
				// reload the data
				if (init()) {
					i18nToNodes(doc);
					admin || reloadTime();
					translateTrigger(!translateTrigger());
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

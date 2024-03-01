import ko from 'ko';
import { Notifications, UploadErrorCode } from 'Common/Enums';
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
			rl.I18N = null;
			doc.documentElement.dir = I18N_DATA.LANG_DIR;
			return 1;
		}
	},

	i18nKey = key => key.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase(),

	getNotificationMessage = code => {
		let key = getKeyByValue(Notifications, code);
		return key ? I18N_DATA.NOTIFICATIONS[key] : '';
	},

	fromNow = date => relativeTime(Math.round((date.getTime() - Date.now()) / 1000));

export const
	translateTrigger = ko.observable(false),

	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat
	// see /snappymail/v/0.0.0/app/localization/relativetimeformat/
	relativeTime = seconds => {
		let unit = 'second',
			t = [[60,'minute'],[3600,'hour'],[86400,'day'],[2628000,'month'],[31536000,'year']],
			i = 5,
			abs = Math.abs(seconds);
		while (i--) {
			if (t[i][0] <= abs) {
				seconds = Math.round(seconds / t[i][0]);
				unit = t[i][1];
				break;
			}
		}
		if (Intl.RelativeTimeFormat) {
			let rtf = new Intl.RelativeTimeFormat(doc.documentElement.lang);
			return rtf.format(seconds, unit);
		}
		// Safari < 14
		abs = Math.abs(seconds);
		let rtf = rl.relativeTime.long[unit][0 > seconds ? 'past' : 'future'],
			plural = rl.relativeTime.plural(abs);
		return (rtf[plural] || rtf).replace('{0}', abs);
	},

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
			time = 0 < timeStampInUTC ? timeStampInUTC * 1000 : (0 === timeStampInUTC ? now : 0);
		if (31536000000 < time) {
			const m = new Date(time), h = LanguageStore.hourCycle();
			switch (formatStr) {
				case 'FROMNOW':
					return fromNow(m);
				case 'AUTO': {
					// 4 hours
					if (14400000 >= now - time)
						return fromNow(m);
					const date = new Date,
						dt = date.setHours(0,0,0,0);
					return (time > dt - 86400000)
						? i18n(
							time > dt ? 'MESSAGE_LIST/TODAY_AT' : 'MESSAGE_LIST/YESTERDAY_AT',
							{TIME: m.format('LT',0,h)}
						)
						: m.format(
							date.getFullYear() === m.getFullYear()
								? {day: '2-digit', month: 'short', hour: 'numeric', minute: 'numeric'}
								: {dateStyle: 'medium', timeStyle: 'short'}
							, 0, h);
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
				element.dateTime = new Date(time * 1000).toISOString();
			} else {
				time = Date.parse(element.dateTime) / 1000;
			}

			let key = element.dataset.timeFormat;
			if (key) {
				element.textContent = timestampToString(time, key);
				if ('FULL' !== key && 'FROMNOW' !== key) {
					element.title = timestampToString(time, 'FULL');
				}
			}
		} catch (e) {
			// prevent knockout crashes
			console.error(e);
		}
	},

	reloadTime = () => doc.querySelectorAll('time').forEach(element => timeToNode(element)),

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
		if (Notifications.ClientViewError === code && message) {
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
	translatorReload = (language, admin) =>
		new Promise((resolve, reject) => {
			const script = createElement('script');
			script.onload = () => {
				// reload the data
				if (init()) {
					i18nToNodes(doc);
					translateTrigger(!translateTrigger());
//					admin || reloadTime();
				}
				script.remove();
				resolve();
			};
			script.onerror = () => reject(Error('Language '+language+' failed'));
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

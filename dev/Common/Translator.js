import ko from 'ko';
import { Notification, UploadErrorCode } from 'Common/Enums';
import { langLink } from 'Common/Links';

let I18N_DATA = window.rainloopI18N || {};

const doc = document;

export const trigger = ko.observable(false);

/**
 * @param {string} key
 * @param {Object=} valueList
 * @param {string=} defaulValue
 * @returns {string}
 */
export function i18n(key, valueList, defaulValue) {
	let valueName = '',
		result = I18N_DATA[key];

	if (undefined === result) {
		result = undefined === defaulValue ? key : defaulValue;
	}

	if (null != valueList) {
		for (valueName in valueList) {
			if (Object.prototype.hasOwnProperty.call(valueList, valueName)) {
				result = result.replace('%' + valueName + '%', valueList[valueName]);
			}
		}
	}

	return result;
}

const i18nToNode = element => {
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
	getKeyByValue = (o, v) => Object.keys(o).find(key => o[key] === v);


/**
 * @param {Object} elements
 * @param {boolean=} animate = false
 */
export function i18nToNodes(element) {
	setTimeout(() =>
		element.querySelectorAll('[data-i18n]').forEach(item => i18nToNode(item))
	, 1);
}

/**
 * @param {Function} startCallback
 * @param {Function=} langCallback = null
 */
export function initOnStartOrLangChange(startCallback, langCallback = null) {
	startCallback && startCallback();
	startCallback && trigger.subscribe(startCallback);
	langCallback && trigger.subscribe(langCallback);
}

function getNotificationMessage(code) {
	let key = getKeyByValue(Notification, code);
	if (key) {
		key = key.replace('CantCopyMessage', 'CantMoveMessage').replace('UnknownNotification', 'UnknownError');
		key = 'NOTIFICATIONS/' + key.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
		return I18N_DATA[key];
	}
}

/**
 * @param {number} code
 * @param {*=} message = ''
 * @param {*=} defCode = null
 * @returns {string}
 */
export function getNotification(code, message = '', defCode = null) {
	code = parseInt(code, 10) || 0;
	if (Notification.ClientViewError === code && message) {
		return message;
	}

	defCode = defCode ? parseInt(defCode, 10) || 0 : 0;
	return getNotificationMessage(code)
		|| getNotificationMessage(defCode)
		|| '';
}

/**
 * @param {object} response
 * @param {number} defCode = Notification.UnknownNotification
 * @returns {string}
 */
export function getNotificationFromResponse(response, defCode = Notification.UnknownNotification) {
	return response && response.ErrorCode
		? getNotification(parseInt(response.ErrorCode, 10) || defCode, response.ErrorMessage || '')
		: getNotification(defCode);
}

/**
 * @param {*} code
 * @returns {string}
 */
export function getUploadErrorDescByCode(code) {
	let result = 'UNKNOWN';
	code = parseInt(code, 10) || 0;
	switch (code) {
		case UploadErrorCode.FileIsTooBig:
		case UploadErrorCode.FilePartiallyUploaded:
		case UploadErrorCode.NoFileUploaded:
		case UploadErrorCode.MissingTempFolder:
		case UploadErrorCode.OnSavingFile:
		case UploadErrorCode.FileType:
			result = getKeyByValue(UploadErrorCode, code).replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
			break;
	}
	return i18n('UPLOAD/ERROR_' + result);
}

/**
 * @param {boolean} admin
 * @param {string} language
 */
export function reload(admin, language) {
	return new Promise((resolve, reject) => {
		const script = doc.createElement('script');
		script.onload = () => {
			// reload the data
			if (window.rainloopI18N) {
				I18N_DATA = window.rainloopI18N || {};
				i18nToNodes(doc);
				dispatchEvent(new CustomEvent('reload-time'));
				trigger(!trigger());
			}
			window.rainloopI18N = null;
			script.remove();
			resolve();
		};
		script.onerror = () => reject(new Error('Language '+language+' failed'));
		script.src = langLink(language, admin);
//		script.async = true;
		doc.head.append(script);
	});
}

/**
 *
 * @param {string} language
 * @param {boolean=} isEng = false
 * @returns {string}
 */
export function convertLangName(language, isEng = false) {
	return i18n(
		'LANGS_NAMES' + (true === isEng ? '_EN' : '') + '/LANG_' + language.toUpperCase().replace(/[^a-zA-Z0-9]+/g, '_'),
		null,
		language
	);
}

import window from 'window';
import _ from '_';
import $ from '$';
import ko from 'ko';
import { Notification, UploadErrorCode } from 'Common/Enums';
import { pInt, isUnd, isNull, has, microtime, inArray } from 'Common/Utils';
import { $html, bAnimationSupported } from 'Common/Globals';
import { reload as momentorReload } from 'Common/Momentor';
import { langLink } from 'Common/Links';

let I18N_DATA = window.rainloopI18N || {};

const I18N_NOTIFICATION_DATA = {};
const I18N_NOTIFICATION_MAP = [
	[Notification.InvalidToken, 'NOTIFICATIONS/INVALID_TOKEN'],
	[Notification.InvalidToken, 'NOTIFICATIONS/INVALID_TOKEN'],
	[Notification.AuthError, 'NOTIFICATIONS/AUTH_ERROR'],
	[Notification.AccessError, 'NOTIFICATIONS/ACCESS_ERROR'],
	[Notification.ConnectionError, 'NOTIFICATIONS/CONNECTION_ERROR'],
	[Notification.CaptchaError, 'NOTIFICATIONS/CAPTCHA_ERROR'],
	[Notification.SocialFacebookLoginAccessDisable, 'NOTIFICATIONS/SOCIAL_FACEBOOK_LOGIN_ACCESS_DISABLE'],
	[Notification.SocialTwitterLoginAccessDisable, 'NOTIFICATIONS/SOCIAL_TWITTER_LOGIN_ACCESS_DISABLE'],
	[Notification.SocialGoogleLoginAccessDisable, 'NOTIFICATIONS/SOCIAL_GOOGLE_LOGIN_ACCESS_DISABLE'],
	[Notification.DomainNotAllowed, 'NOTIFICATIONS/DOMAIN_NOT_ALLOWED'],
	[Notification.AccountNotAllowed, 'NOTIFICATIONS/ACCOUNT_NOT_ALLOWED'],

	[Notification.AccountTwoFactorAuthRequired, 'NOTIFICATIONS/ACCOUNT_TWO_FACTOR_AUTH_REQUIRED'],
	[Notification.AccountTwoFactorAuthError, 'NOTIFICATIONS/ACCOUNT_TWO_FACTOR_AUTH_ERROR'],

	[Notification.CouldNotSaveNewPassword, 'NOTIFICATIONS/COULD_NOT_SAVE_NEW_PASSWORD'],
	[Notification.CurrentPasswordIncorrect, 'NOTIFICATIONS/CURRENT_PASSWORD_INCORRECT'],
	[Notification.NewPasswordShort, 'NOTIFICATIONS/NEW_PASSWORD_SHORT'],
	[Notification.NewPasswordWeak, 'NOTIFICATIONS/NEW_PASSWORD_WEAK'],
	[Notification.NewPasswordForbidden, 'NOTIFICATIONS/NEW_PASSWORD_FORBIDDENT'],

	[Notification.ContactsSyncError, 'NOTIFICATIONS/CONTACTS_SYNC_ERROR'],

	[Notification.CantGetMessageList, 'NOTIFICATIONS/CANT_GET_MESSAGE_LIST'],
	[Notification.CantGetMessage, 'NOTIFICATIONS/CANT_GET_MESSAGE'],
	[Notification.CantDeleteMessage, 'NOTIFICATIONS/CANT_DELETE_MESSAGE'],
	[Notification.CantMoveMessage, 'NOTIFICATIONS/CANT_MOVE_MESSAGE'],
	[Notification.CantCopyMessage, 'NOTIFICATIONS/CANT_MOVE_MESSAGE'],

	[Notification.CantSaveMessage, 'NOTIFICATIONS/CANT_SAVE_MESSAGE'],
	[Notification.CantSendMessage, 'NOTIFICATIONS/CANT_SEND_MESSAGE'],
	[Notification.InvalidRecipients, 'NOTIFICATIONS/INVALID_RECIPIENTS'],

	[Notification.CantSaveFilters, 'NOTIFICATIONS/CANT_SAVE_FILTERS'],
	[Notification.CantGetFilters, 'NOTIFICATIONS/CANT_GET_FILTERS'],
	[Notification.FiltersAreNotCorrect, 'NOTIFICATIONS/FILTERS_ARE_NOT_CORRECT'],

	[Notification.CantCreateFolder, 'NOTIFICATIONS/CANT_CREATE_FOLDER'],
	[Notification.CantRenameFolder, 'NOTIFICATIONS/CANT_RENAME_FOLDER'],
	[Notification.CantDeleteFolder, 'NOTIFICATIONS/CANT_DELETE_FOLDER'],
	[Notification.CantDeleteNonEmptyFolder, 'NOTIFICATIONS/CANT_DELETE_NON_EMPTY_FOLDER'],
	[Notification.CantSubscribeFolder, 'NOTIFICATIONS/CANT_SUBSCRIBE_FOLDER'],
	[Notification.CantUnsubscribeFolder, 'NOTIFICATIONS/CANT_UNSUBSCRIBE_FOLDER'],

	[Notification.CantSaveSettings, 'NOTIFICATIONS/CANT_SAVE_SETTINGS'],
	[Notification.CantSavePluginSettings, 'NOTIFICATIONS/CANT_SAVE_PLUGIN_SETTINGS'],

	[Notification.DomainAlreadyExists, 'NOTIFICATIONS/DOMAIN_ALREADY_EXISTS'],

	[Notification.CantInstallPackage, 'NOTIFICATIONS/CANT_INSTALL_PACKAGE'],
	[Notification.CantDeletePackage, 'NOTIFICATIONS/CANT_DELETE_PACKAGE'],
	[Notification.InvalidPluginPackage, 'NOTIFICATIONS/INVALID_PLUGIN_PACKAGE'],
	[Notification.UnsupportedPluginPackage, 'NOTIFICATIONS/UNSUPPORTED_PLUGIN_PACKAGE'],

	[Notification.LicensingServerIsUnavailable, 'NOTIFICATIONS/LICENSING_SERVER_IS_UNAVAILABLE'],
	[Notification.LicensingExpired, 'NOTIFICATIONS/LICENSING_EXPIRED'],
	[Notification.LicensingBanned, 'NOTIFICATIONS/LICENSING_BANNED'],

	[Notification.DemoSendMessageError, 'NOTIFICATIONS/DEMO_SEND_MESSAGE_ERROR'],
	[Notification.DemoAccountError, 'NOTIFICATIONS/DEMO_ACCOUNT_ERROR'],

	[Notification.AccountAlreadyExists, 'NOTIFICATIONS/ACCOUNT_ALREADY_EXISTS'],
	[Notification.AccountDoesNotExist, 'NOTIFICATIONS/ACCOUNT_DOES_NOT_EXIST'],

	[Notification.MailServerError, 'NOTIFICATIONS/MAIL_SERVER_ERROR'],
	[Notification.InvalidInputArgument, 'NOTIFICATIONS/INVALID_INPUT_ARGUMENT'],
	[Notification.UnknownNotification, 'NOTIFICATIONS/UNKNOWN_ERROR'],
	[Notification.UnknownError, 'NOTIFICATIONS/UNKNOWN_ERROR']
];

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

	if (isUnd(result)) {
		result = isUnd(defaulValue) ? key : defaulValue;
	}

	if (!isUnd(valueList) && !isNull(valueList)) {
		for (valueName in valueList) {
			if (has(valueList, valueName)) {
				result = result.replace('%' + valueName + '%', valueList[valueName]);
			}
		}
	}

	return result;
}

const i18nToNode = (element) => {
	const $el = $(element),
		key = $el.data('i18n');

	if (key) {
		if ('[' === key.substr(0, 1)) {
			switch (key.substr(0, 6)) {
				case '[html]':
					$el.html(i18n(key.substr(6)));
					break;
				case '[place':
					$el.attr('placeholder', i18n(key.substr(13)));
					break;
				case '[title':
					$el.attr('title', i18n(key.substr(7)));
					break;
				// no default
			}
		} else {
			$el.text(i18n(key));
		}
	}
};

/**
 * @param {Object} elements
 * @param {boolean=} animate = false
 */
export function i18nToNodes(elements, animate = false) {
	_.defer(() => {
		$('[data-i18n]', elements).each((index, item) => {
			i18nToNode(item);
		});

		if (animate && bAnimationSupported) {
			$('.i18n-animation[data-i18n]', elements).letterfx({
				'fx': 'fall fade',
				'backwards': false,
				'timing': 50,
				'fx_duration': '50ms',
				'letter_end': 'restore',
				'element_end': 'restore'
			});
		}
	});
}

const reloadData = () => {
	if (window.rainloopI18N) {
		I18N_DATA = window.rainloopI18N || {};

		i18nToNodes(window.document, true);

		momentorReload();
		trigger(!trigger());
	}

	window.rainloopI18N = null;
};

/**
 * @returns {void}
 */
export function initNotificationLanguage() {
	I18N_NOTIFICATION_MAP.forEach((item) => {
		I18N_NOTIFICATION_DATA[item[0]] = i18n(item[1]);
	});
}

/**
 * @param {Function} startCallback
 * @param {Function=} langCallback = null
 */
export function initOnStartOrLangChange(startCallback, langCallback = null) {
	if (startCallback) {
		startCallback();
	}

	if (langCallback) {
		trigger.subscribe(() => {
			if (startCallback) {
				startCallback();
			}
			if (langCallback) {
				langCallback();
			}
		});
	} else if (startCallback) {
		trigger.subscribe(startCallback);
	}
}

/**
 * @param {number} code
 * @param {*=} message = ''
 * @param {*=} defCode = null
 * @returns {string}
 */
export function getNotification(code, message = '', defCode = null) {
	code = window.parseInt(code, 10) || 0;
	if (Notification.ClientViewError === code && message) {
		return message;
	}

	defCode = defCode ? window.parseInt(defCode, 10) || 0 : 0;
	return isUnd(I18N_NOTIFICATION_DATA[code])
		? defCode && isUnd(I18N_NOTIFICATION_DATA[defCode])
			? I18N_NOTIFICATION_DATA[defCode]
			: ''
		: I18N_NOTIFICATION_DATA[code];
}

/**
 * @param {object} response
 * @param {number} defCode = Notification.UnknownNotification
 * @returns {string}
 */
export function getNotificationFromResponse(response, defCode = Notification.UnknownNotification) {
	return response && response.ErrorCode
		? getNotification(pInt(response.ErrorCode), response.ErrorMessage || '')
		: getNotification(defCode);
}

/**
 * @param {*} code
 * @returns {string}
 */
export function getUploadErrorDescByCode(code) {
	let result = '';
	switch (window.parseInt(code, 10) || 0) {
		case UploadErrorCode.FileIsTooBig:
			result = i18n('UPLOAD/ERROR_FILE_IS_TOO_BIG');
			break;
		case UploadErrorCode.FilePartiallyUploaded:
			result = i18n('UPLOAD/ERROR_FILE_PARTIALLY_UPLOADED');
			break;
		case UploadErrorCode.FileNoUploaded:
			result = i18n('UPLOAD/ERROR_NO_FILE_UPLOADED');
			break;
		case UploadErrorCode.MissingTempFolder:
			result = i18n('UPLOAD/ERROR_MISSING_TEMP_FOLDER');
			break;
		case UploadErrorCode.FileOnSaveingError:
			result = i18n('UPLOAD/ERROR_ON_SAVING_FILE');
			break;
		case UploadErrorCode.FileType:
			result = i18n('UPLOAD/ERROR_FILE_TYPE');
			break;
		default:
			result = i18n('UPLOAD/ERROR_UNKNOWN');
			break;
	}

	return result;
}

/**
 * @param {boolean} admin
 * @param {string} language
 */
export function reload(admin, language) {
	const start = microtime();

	$html.addClass('rl-changing-language');

	return new window.Promise((resolve, reject) => {
		$.ajax({
			url: langLink(language, admin),
			dataType: 'script',
			cache: true
		}).then(
			() => {
				_.delay(
					() => {
						reloadData();

						const isRtl = -1 < inArray((language || '').toLowerCase(), ['ar', 'ar_sa', 'he', 'he_he', 'ur', 'ur_ir']);

						$html
							.removeClass('rl-changing-language')
							.removeClass('rl-rtl rl-ltr')
							// .attr('dir', isRtl ? 'rtl' : 'ltr')
							.addClass(isRtl ? 'rl-rtl' : 'rl-ltr');

						resolve();
					},
					500 < microtime() - start ? 1 : 500
				);
			},
			() => {
				$html.removeClass('rl-changing-language');
				window.rainloopI18N = null;
				reject();
			}
		);
	});
}

// init section
$html.addClass('rl-' + ($html.attr('dir') || 'ltr'));

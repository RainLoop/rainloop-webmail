
import {window, $, _} from 'common';
import ko from 'ko';
import {Notification, UploadErrorCode} from 'Common/Enums';
import Utils from 'Common/Utils';
import Globals from 'Common/Globals';

class Translator
{
	constructor() {
		this.data = window['rainloopI18N'] || {};
		this.notificationI18N = {};
		this.trigger = ko.observable(false);
		this.i18n = _.bind(this.i18n, this);
		this.init();
	}

	/**
	 * @param {string} key
	 * @param {Object=} valueList
	 * @param {string=} defaulValue
	 * @return {string}
	 */
	i18n(key, valueList, defaulValue) {

		let
			valueName = '',
			result = _.isUndefined(this.data[key]) ? (_.isUndefined(defaulValue) ? key : defaulValue) : this.data[key]
		;

		if (!_.isUndefined(valueList) && !_.isNull(valueList))
		{
			for (valueName in valueList)
			{
				if (_.has(valueList, valueName))
				{
					result = result.replace('%' + valueName + '%', valueList[valueName]);
				}
			}
		}

		return result;
	}

	/**
	 * @param {Object} element
	 */
	i18nToNode(element) {

		const
			$el = $(element),
			key = $el.data('i18n')
		;

		if (key)
		{
			if ('[' === key.substr(0, 1))
			{
				switch (key.substr(0, 6))
				{
					case '[html]':
						$el.html(this.i18n(key.substr(6)));
						break;
					case '[place':
						$el.attr('placeholder', this.i18n(key.substr(13)));
						break;
					case '[title':
						$el.attr('title', this.i18n(key.substr(7)));
						break;
				}
			}
			else
			{
				$el.text(this.i18n(key));
			}
		}
	}

	/**
	 * @param {Object} elements
	 * @param {boolean=} animate = false
	 */
	i18nToNodes(elements, animate = false) {
		_.defer(() => {

			$('[data-i18n]', elements).each((index, item) => {
				this.i18nToNode(item);
			});

			if (animate && Globals.bAnimationSupported)
			{
				$('.i18n-animation[data-i18n]', elements).letterfx({
					'fx': 'fall fade', 'backwards': false, 'timing': 50, 'fx_duration': '50ms', 'letter_end': 'restore', 'element_end': 'restore'
				});
			}
		});
	}

	reloadData() {
		if (window['rainloopI18N'])
		{
			this.data = window['rainloopI18N'] || {};

			this.i18nToNodes(window.document, true);

			require('Common/Momentor').reload();
			this.trigger(!this.trigger());
		}

		window['rainloopI18N'] = null;
	}

	initNotificationLanguage() {

		const map = [
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

		this.notificationI18N = this.notificationI18N || {};

		_.each(map, (item) => {
			this.notificationI18N[item[0]] = this.i18n(item[1]);
		});
	}

	/**
	 * @param {Function} callback
	 * @param {Object} scope
	 * @param {Function=} langCallback
	 */
	initOnStartOrLangChange(callback, scope, langCallback = null) {
		if (callback)
		{
			callback.call(scope);
		}

		if (langCallback)
		{
			this.trigger.subscribe(() => {
				if (callback)
				{
					callback.call(scope);
				}

				langCallback.call(scope);
			});
		}
		else if (callback)
		{
			this.trigger.subscribe(callback, scope);
		}
	}

	/**
	 * @param {number} code
	 * @param {*=} message = ''
	 * @param {*=} defCode = null
	 * @return {string}
	 */
	getNotification(code, message = '', defCode = null) {
		code = window.parseInt(code, 10) || 0;
		if (Notification.ClientViewError === code && message)
		{
			return message;
		}

		return _.isUndefined(this.notificationI18N[code]) ? (
			defCode && _.isUndefined(this.notificationI18N[defCode]) ? this.notificationI18N[defCode] : ''
		) : this.notificationI18N[code];
	}

	/**
	 * @param {*} code
	 * @return {string}
	 */
	getUploadErrorDescByCode(code) {
		let result = '';
		switch (window.parseInt(code, 10) || 0) {
			case UploadErrorCode.FileIsTooBig:
				result = this.i18n('UPLOAD/ERROR_FILE_IS_TOO_BIG');
				break;
			case UploadErrorCode.FilePartiallyUploaded:
				result = this.i18n('UPLOAD/ERROR_FILE_PARTIALLY_UPLOADED');
				break;
			case UploadErrorCode.FileNoUploaded:
				result = this.i18n('UPLOAD/ERROR_NO_FILE_UPLOADED');
				break;
			case UploadErrorCode.MissingTempFolder:
				result = this.i18n('UPLOAD/ERROR_MISSING_TEMP_FOLDER');
				break;
			case UploadErrorCode.FileOnSaveingError:
				result = this.i18n('UPLOAD/ERROR_ON_SAVING_FILE');
				break;
			case UploadErrorCode.FileType:
				result = this.i18n('UPLOAD/ERROR_FILE_TYPE');
				break;
			default:
				result = this.i18n('UPLOAD/ERROR_UNKNOWN');
				break;
		}

		return result;
	}

	/**
	 * @param {boolean} admin
	 * @param {string} language
	 * @param {Function=} done
	 * @param {Function=} fail
	 */
	reload(admin, language, done, fail) {

		const
			self = this,
			start = Utils.microtime()
		;

		Globals.$html.addClass('rl-changing-language');

		$.ajax({
				'url': require('Common/Links').langLink(language, admin),
				'dataType': 'script',
				'cache': true
			})
			.fail(fail || Utils.emptyFunction)
			.done(function () {
				_.delay(function () {

					self.reloadData();

					(done || Utils.emptyFunction)();

					const isRtl = -1 < Utils.inArray(language, ['ar', 'ar_sa', 'he', 'he_he', 'ur', 'ur_ir']);

					Globals.$html
						.removeClass('rl-changing-language')
						.removeClass('rl-rtl rl-ltr')
						.addClass(isRtl ? 'rl-rtl' : 'rl-ltr')
	//						.attr('dir', isRtl ? 'rtl' : 'ltr')
					;

				}, 500 < Utils.microtime() - start ? 1 : 500);
			})
		;
	}

	init() {
		Globals.$html.addClass('rl-' + (Globals.$html.attr('dir') || 'ltr'));
	}
}

module.exports = new Translator();

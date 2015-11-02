
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Consts = require('Common/Consts'),
		Globals = require('Common/Globals'),
		Utils = require('Common/Utils'),
		Translator = require('Common/Translator'),

		AppStore = require('Stores/User/App'),
		LanguageStore = require('Stores/Language'),
		SettingsStore = require('Stores/User/Settings'),
		IdentityStore = require('Stores/User/Identity'),
		NotificationStore = require('Stores/User/Notification'),
		MessageStore = require('Stores/User/Message'),

		Remote = require('Remote/User/Ajax')
	;

	/**
	 * @constructor
	 */
	function GeneralUserSettings()
	{
		this.language = LanguageStore.language;
		this.languages = LanguageStore.languages;
		this.messagesPerPage = SettingsStore.messagesPerPage;
		this.messagesPerPageArray = Consts.Defaults.MessagesPerPageArray;

		this.editorDefaultType = SettingsStore.editorDefaultType;
		this.layout = SettingsStore.layout;
		this.usePreviewPane = SettingsStore.usePreviewPane;

		this.soundNotificationIsSupported = NotificationStore.soundNotificationIsSupported;
		this.enableSoundNotification = NotificationStore.enableSoundNotification;

		this.enableDesktopNotification = NotificationStore.enableDesktopNotification;
		this.isDesktopNotificationSupported = NotificationStore.isDesktopNotificationSupported;
		this.isDesktopNotificationDenied = NotificationStore.isDesktopNotificationDenied;

		this.showImages = SettingsStore.showImages;
		this.useCheckboxesInList = SettingsStore.useCheckboxesInList;
		this.threadsAllowed = AppStore.threadsAllowed;
		this.useThreads = SettingsStore.useThreads;
		this.replySameFolder = SettingsStore.replySameFolder;
		this.allowLanguagesOnSettings = AppStore.allowLanguagesOnSettings;

		this.languageFullName = ko.computed(function () {
			return Utils.convertLangName(this.language());
		}, this);

		this.languageTrigger = ko.observable(Enums.SaveSettingsStep.Idle).extend({'throttle': 100});

		this.mppTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.editorDefaultTypeTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.layoutTrigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.isAnimationSupported = Globals.bAnimationSupported;

		this.identities = IdentityStore.identities;

		this.identityMain = ko.computed(function () {
			var aList = this.identities();
			return Utils.isArray(aList) ? _.find(aList, function (oItem) {
				return oItem && '' === oItem.id() ? true : false;
			}) : null;
		}, this);

		this.identityMainDesc = ko.computed(function () {
			var oIdentity = this.identityMain();
			return oIdentity ? oIdentity.formattedName() : '---';
		}, this);

		this.editorDefaultTypes = ko.computed(function () {
			Translator.trigger();
			return [
				{'id': Enums.EditorDefaultType.Html, 'name': Translator.i18n('SETTINGS_GENERAL/LABEL_EDITOR_HTML')},
				{'id': Enums.EditorDefaultType.Plain, 'name': Translator.i18n('SETTINGS_GENERAL/LABEL_EDITOR_PLAIN')},
				{'id': Enums.EditorDefaultType.HtmlForced, 'name': Translator.i18n('SETTINGS_GENERAL/LABEL_EDITOR_HTML_FORCED')},
				{'id': Enums.EditorDefaultType.PlainForced, 'name': Translator.i18n('SETTINGS_GENERAL/LABEL_EDITOR_PLAIN_FORCED')}
			];
		}, this);

		this.layoutTypes = ko.computed(function () {
			Translator.trigger();
			return [
				{'id': Enums.Layout.NoPreview, 'name': Translator.i18n('SETTINGS_GENERAL/LABEL_LAYOUT_NO_SPLIT')},
				{'id': Enums.Layout.SidePreview, 'name': Translator.i18n('SETTINGS_GENERAL/LABEL_LAYOUT_VERTICAL_SPLIT')},
				{'id': Enums.Layout.BottomPreview, 'name': Translator.i18n('SETTINGS_GENERAL/LABEL_LAYOUT_HORIZONTAL_SPLIT')}
			];
		}, this);
	}

	GeneralUserSettings.prototype.editMainIdentity = function ()
	{
		var oIdentity = this.identityMain();
		if (oIdentity)
		{
			require('Knoin/Knoin').showScreenPopup(require('View/Popup/Identity'), [oIdentity]);
		}
	};

	GeneralUserSettings.prototype.testSoundNotification = function ()
	{
		NotificationStore.playSoundNotification(true);
	};

	GeneralUserSettings.prototype.onBuild = function ()
	{
		var self = this;

		_.delay(function () {

			var
				f0 = Utils.settingsSaveHelperSimpleFunction(self.editorDefaultTypeTrigger, self),
				f1 = Utils.settingsSaveHelperSimpleFunction(self.mppTrigger, self),
				f2 = Utils.settingsSaveHelperSimpleFunction(self.layoutTrigger, self),
				fReloadLanguageHelper = function (iSaveSettingsStep) {
					return function() {
						self.languageTrigger(iSaveSettingsStep);
						_.delay(function () {
							self.languageTrigger(Enums.SaveSettingsStep.Idle);
						}, 1000);
					};
				}
			;

			self.language.subscribe(function (sValue) {

				self.languageTrigger(Enums.SaveSettingsStep.Animate);

				Translator.reload(false, sValue,
					fReloadLanguageHelper(Enums.SaveSettingsStep.TrueResult),
					fReloadLanguageHelper(Enums.SaveSettingsStep.FalseResult));

				Remote.saveSettings(null, {
					'Language': sValue
				});
			});

			self.editorDefaultType.subscribe(function (sValue) {
				Remote.saveSettings(f0, {
					'EditorDefaultType': sValue
				});
			});

			self.messagesPerPage.subscribe(function (iValue) {
				Remote.saveSettings(f1, {
					'MPP': iValue
				});
			});

			self.showImages.subscribe(function (bValue) {
				Remote.saveSettings(null, {
					'ShowImages': bValue ? '1' : '0'
				});
			});

			self.enableDesktopNotification.subscribe(function (bValue) {
				Utils.timeOutAction('SaveDesktopNotifications', function () {
					Remote.saveSettings(null, {
						'DesktopNotifications': bValue ? '1' : '0'
					});
				}, 3000);
			});

			self.enableSoundNotification.subscribe(function (bValue) {
				Utils.timeOutAction('SaveSoundNotification', function () {
					Remote.saveSettings(null, {
						'SoundNotification': bValue ? '1' : '0'
					});
				}, 3000);
			});

			self.replySameFolder.subscribe(function (bValue) {
				Utils.timeOutAction('SaveReplySameFolder', function () {
					Remote.saveSettings(null, {
						'ReplySameFolder': bValue ? '1' : '0'
					});
				}, 3000);
			});

			self.useThreads.subscribe(function (bValue) {

				MessageStore.messageList([]);

				Remote.saveSettings(null, {
					'UseThreads': bValue ? '1' : '0'
				});
			});

			self.layout.subscribe(function (nValue) {

				MessageStore.messageList([]);

				Remote.saveSettings(f2, {
					'Layout': nValue
				});
			});

			self.useCheckboxesInList.subscribe(function (bValue) {
				Remote.saveSettings(null, {
					'UseCheckboxesInList': bValue ? '1' : '0'
				});
			});

		}, 50);
	};

	GeneralUserSettings.prototype.onShow = function ()
	{
		this.enableDesktopNotification.valueHasMutated();
	};

	GeneralUserSettings.prototype.selectLanguage = function ()
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/Languages'), [
			this.language, this.languages(), LanguageStore.userLanguage()
		]);
	};

	module.exports = GeneralUserSettings;

}());
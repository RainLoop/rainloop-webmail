
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

		UserSettingsStore = require('Stores/UserSettings'),
		NotificationSettingsStore = require('Stores/NotificationSettings'),

		Data = require('Storage/User/Data'),
		Remote = require('Storage/User/Remote')
	;

	/**
	 * @constructor
	 */
	function GeneralUserSettings()
	{
		this.language = UserSettingsStore.language;
		this.messagesPerPage = UserSettingsStore.messagesPerPage;
		this.messagesPerPageArray = Consts.Defaults.MessagesPerPageArray;

		this.editorDefaultType = UserSettingsStore.editorDefaultType;
		this.layout = UserSettingsStore.layout;
		this.usePreviewPane = UserSettingsStore.usePreviewPane;

		this.showImages = Data.showImages;

		this.enableDesktopNotification = NotificationSettingsStore.enableDesktopNotification;
		this.isDesktopNotificationSupported = NotificationSettingsStore.isDesktopNotificationSupported;
		this.isDesktopNotificationDenied = NotificationSettingsStore.isDesktopNotificationDenied;

		this.threading = Data.threading;
		this.useThreads = Data.useThreads;
		this.replySameFolder = Data.replySameFolder;
		this.useCheckboxesInList = Data.useCheckboxesInList;
		this.allowLanguagesOnSettings = Data.allowLanguagesOnSettings;

		this.languageFullName = ko.computed(function () {
			return Utils.convertLangName(this.language());
		}, this);

		this.languageTrigger = ko.observable(Enums.SaveSettingsStep.Idle).extend({'throttle': 100});

		this.mppTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.editorDefaultTypeTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.layoutTrigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.isAnimationSupported = Globals.bAnimationSupported;

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

				Translator.reload(sValue,
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

			Data.showImages.subscribe(function (bValue) {
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

			Data.replySameFolder.subscribe(function (bValue) {
				Utils.timeOutAction('SaveReplySameFolder', function () {
					Remote.saveSettings(null, {
						'ReplySameFolder': bValue ? '1' : '0'
					});
				}, 3000);
			});

			Data.useThreads.subscribe(function (bValue) {

				Data.messageList([]);

				Remote.saveSettings(null, {
					'UseThreads': bValue ? '1' : '0'
				});
			});

			self.layout.subscribe(function (nValue) {

				Data.messageList([]);

				Remote.saveSettings(f2, {
					'Layout': nValue
				});
			});

			Data.useCheckboxesInList.subscribe(function (bValue) {
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
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/Languages'));
	};

	module.exports = GeneralUserSettings;

}());

(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Consts = require('Common/Consts'),
		Globals = require('Common/Globals'),
		Utils = require('Common/Utils'),

		Data = require('Storage/User/Data'),
		Remote = require('Storage/User/Remote')
	;

	/**
	 * @constructor
	 */
	function GeneralUserSettings()
	{
		this.mainLanguage = Data.mainLanguage;
		this.mainMessagesPerPage = Data.mainMessagesPerPage;
		this.mainMessagesPerPageArray = Consts.Defaults.MessagesPerPageArray;
		this.editorDefaultType = Data.editorDefaultType;
		this.showImages = Data.showImages;
		this.interfaceAnimation = Data.interfaceAnimation;
		this.useDesktopNotifications = Data.useDesktopNotifications;
		this.threading = Data.threading;
		this.useThreads = Data.useThreads;
		this.replySameFolder = Data.replySameFolder;
		this.layout = Data.layout;
		this.usePreviewPane = Data.usePreviewPane;
		this.useCheckboxesInList = Data.useCheckboxesInList;
		this.allowLanguagesOnSettings = Data.allowLanguagesOnSettings;

		this.usePreviewPaneCheckbox = ko.computed({
			read: this.usePreviewPane,
			write: function (bValue) {
				this.layout(bValue ? Enums.Layout.SidePreview : Enums.Layout.NoPreview);
			}
		}, this);

		this.isDesktopNotificationsSupported = ko.computed(function () {
			return Enums.DesktopNotifications.NotSupported !== Data.desktopNotificationsPermisions();
		});

		this.isDesktopNotificationsDenied = ko.computed(function () {
			return Enums.DesktopNotifications.NotSupported === Data.desktopNotificationsPermisions() ||
				Enums.DesktopNotifications.Denied === Data.desktopNotificationsPermisions();
		});

		this.mainLanguageFullName = ko.computed(function () {
			return Utils.convertLangName(this.mainLanguage());
		}, this);

		this.languageTrigger = ko.observable(Enums.SaveSettingsStep.Idle).extend({'throttle': 100});

		this.mppTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.editorDefaultTypeTrigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.isAnimationSupported = Globals.bAnimationSupported;

		this.editorDefaultTypes = ko.computed(function () {
			Globals.langChangeTrigger();
			return [
				{'id': Enums.EditorDefaultType.Html, 'name': Utils.i18n('SETTINGS_GENERAL/LABEL_EDITOR_HTML')},
				{'id': Enums.EditorDefaultType.Plain, 'name': Utils.i18n('SETTINGS_GENERAL/LABEL_EDITOR_PLAIN')},
				{'id': Enums.EditorDefaultType.HtmlForced, 'name': Utils.i18n('SETTINGS_GENERAL/LABEL_EDITOR_HTML_FORCED')},
				{'id': Enums.EditorDefaultType.PlainForced, 'name': Utils.i18n('SETTINGS_GENERAL/LABEL_EDITOR_PLAIN_FORCED')}
			];
		}, this);
	}

	GeneralUserSettings.prototype.toggleLayout = function ()
	{
		this.layout(Enums.Layout.NoPreview === this.layout() ? Enums.Layout.SidePreview : Enums.Layout.NoPreview);
	};

	GeneralUserSettings.prototype.onBuild = function ()
	{
		var self = this;

		_.delay(function () {

			var
				f0 = Utils.settingsSaveHelperSimpleFunction(self.editorDefaultTypeTrigger, self),
				f1 = Utils.settingsSaveHelperSimpleFunction(self.mppTrigger, self),
				fReloadLanguageHelper = function (iSaveSettingsStep) {
					return function() {
						self.languageTrigger(iSaveSettingsStep);
						_.delay(function () {
							self.languageTrigger(Enums.SaveSettingsStep.Idle);
						}, 1000);
					};
				}
			;

			Data.language.subscribe(function (sValue) {

				self.languageTrigger(Enums.SaveSettingsStep.Animate);

				Utils.reloadLanguage(sValue,
					fReloadLanguageHelper(Enums.SaveSettingsStep.TrueResult),
					fReloadLanguageHelper(Enums.SaveSettingsStep.FalseResult));

				Remote.saveSettings(null, {
					'Language': sValue
				});
			});

			Data.editorDefaultType.subscribe(function (sValue) {
				Remote.saveSettings(f0, {
					'EditorDefaultType': sValue
				});
			});

			Data.messagesPerPage.subscribe(function (iValue) {
				Remote.saveSettings(f1, {
					'MPP': iValue
				});
			});

			Data.showImages.subscribe(function (bValue) {
				Remote.saveSettings(null, {
					'ShowImages': bValue ? '1' : '0'
				});
			});

			Data.interfaceAnimation.subscribe(function (sValue) {
				Remote.saveSettings(null, {
					'InterfaceAnimation': sValue
				});
			});

			Data.useDesktopNotifications.subscribe(function (bValue) {
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

			Data.layout.subscribe(function (nValue) {

				Data.messageList([]);

				Remote.saveSettings(null, {
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
		Data.desktopNotifications.valueHasMutated();
	};

	GeneralUserSettings.prototype.selectLanguage = function ()
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/Languages'));
	};

	module.exports = GeneralUserSettings;

}());
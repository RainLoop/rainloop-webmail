/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';
	
	var
		$ = require('$'),
		ko = require('ko'),

		Enums = require('Enums'),
		Consts = require('Consts'),
		Globals = require('Globals'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder'),

		Data = require('../Storages/WebMailDataStorage.js'),
		Remote = require('../Storages/WebMailAjaxRemoteStorage.js'),

		kn = require('kn'),
		PopupsLanguagesViewModel = require('../ViewModels/Popups/PopupsLanguagesViewModel.js')
	;

	/**
	 * @constructor
	 */
	function SettingsGeneral()
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

		this.isAnimationSupported = Globals.bAnimationSupported;
	}

	SettingsGeneral.prototype.toggleLayout = function ()
	{
		this.layout(Enums.Layout.NoPreview === this.layout() ? Enums.Layout.SidePreview : Enums.Layout.NoPreview);
	};

	SettingsGeneral.prototype.onBuild = function ()
	{
		var self = this;

		_.delay(function () {

			var
				f1 = Utils.settingsSaveHelperSimpleFunction(self.mppTrigger, self)
			;

			Data.language.subscribe(function (sValue) {

				self.languageTrigger(Enums.SaveSettingsStep.Animate);

				$.ajax({
					'url': LinkBuilder.langLink(sValue),
					'dataType': 'script',
					'cache': true
				}).done(function() {
					Utils.i18nReload();
					self.languageTrigger(Enums.SaveSettingsStep.TrueResult);
				}).fail(function() {
					self.languageTrigger(Enums.SaveSettingsStep.FalseResult);
				}).always(function() {
					_.delay(function () {
						self.languageTrigger(Enums.SaveSettingsStep.Idle);
					}, 1000);
				});

				Remote.saveSettings(Utils.emptyFunction, {
					'Language': sValue
				});
			});

			Data.editorDefaultType.subscribe(function (sValue) {
				Remote.saveSettings(Utils.emptyFunction, {
					'EditorDefaultType': sValue
				});
			});

			Data.messagesPerPage.subscribe(function (iValue) {
				Remote.saveSettings(f1, {
					'MPP': iValue
				});
			});

			Data.showImages.subscribe(function (bValue) {
				Remote.saveSettings(Utils.emptyFunction, {
					'ShowImages': bValue ? '1' : '0'
				});
			});

			Data.interfaceAnimation.subscribe(function (sValue) {
				Remote.saveSettings(Utils.emptyFunction, {
					'InterfaceAnimation': sValue
				});
			});

			Data.useDesktopNotifications.subscribe(function (bValue) {
				Utils.timeOutAction('SaveDesktopNotifications', function () {
					Remote.saveSettings(Utils.emptyFunction, {
						'DesktopNotifications': bValue ? '1' : '0'
					});
				}, 3000);
			});

			Data.replySameFolder.subscribe(function (bValue) {
				Utils.timeOutAction('SaveReplySameFolder', function () {
					Remote.saveSettings(Utils.emptyFunction, {
						'ReplySameFolder': bValue ? '1' : '0'
					});
				}, 3000);
			});

			Data.useThreads.subscribe(function (bValue) {

				Data.messageList([]);

				Remote.saveSettings(Utils.emptyFunction, {
					'UseThreads': bValue ? '1' : '0'
				});
			});

			Data.layout.subscribe(function (nValue) {

				Data.messageList([]);

				Remote.saveSettings(Utils.emptyFunction, {
					'Layout': nValue
				});
			});

			Data.useCheckboxesInList.subscribe(function (bValue) {
				Remote.saveSettings(Utils.emptyFunction, {
					'UseCheckboxesInList': bValue ? '1' : '0'
				});
			});

		}, 50);
	};

	SettingsGeneral.prototype.onShow = function ()
	{
		Data.desktopNotifications.valueHasMutated();
	};

	SettingsGeneral.prototype.selectLanguage = function ()
	{
		kn.showScreenPopup(PopupsLanguagesViewModel);
	};

	module.exports = SettingsGeneral;

}(module, require));
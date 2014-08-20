/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function SettingsGeneral()
{
	var oData = RL.data();
	
	this.mainLanguage = oData.mainLanguage;
	this.mainMessagesPerPage = oData.mainMessagesPerPage;
	this.mainMessagesPerPageArray = Consts.Defaults.MessagesPerPageArray;
	this.editorDefaultType = oData.editorDefaultType;
	this.showImages = oData.showImages;
	this.interfaceAnimation = oData.interfaceAnimation;
	this.useDesktopNotifications = oData.useDesktopNotifications;	
	this.threading = oData.threading;
	this.useThreads = oData.useThreads;
	this.replySameFolder = oData.replySameFolder;
	this.layout = oData.layout;
	this.usePreviewPane = oData.usePreviewPane;
	this.useCheckboxesInList = oData.useCheckboxesInList;
	this.allowLanguagesOnSettings = oData.allowLanguagesOnSettings;

	this.isDesktopNotificationsSupported = ko.computed(function () {
		return Enums.DesktopNotifications.NotSupported !== oData.desktopNotificationsPermisions();
	});

	this.isDesktopNotificationsDenied = ko.computed(function () {
		return Enums.DesktopNotifications.NotSupported === oData.desktopNotificationsPermisions() ||
			Enums.DesktopNotifications.Denied === oData.desktopNotificationsPermisions();
	});

	this.mainLanguageFullName = ko.computed(function () {
		return Utils.convertLangName(this.mainLanguage());
	}, this);

	this.languageTrigger = ko.observable(Enums.SaveSettingsStep.Idle).extend({'throttle': 100});
	this.mppTrigger = ko.observable(Enums.SaveSettingsStep.Idle);

	this.isAnimationSupported = Globals.bAnimationSupported;
}

Utils.addSettingsViewModel(SettingsGeneral, 'SettingsGeneral', 'SETTINGS_LABELS/LABEL_GENERAL_NAME', 'general', true);

SettingsGeneral.prototype.toggleLayout = function ()
{
	this.layout(Enums.Layout.NoPreview === this.layout() ? Enums.Layout.SidePreview : Enums.Layout.NoPreview);
};

SettingsGeneral.prototype.onBuild = function ()
{
	var self = this;

	_.delay(function () {

		var 
			oData = RL.data(),
			f1 = Utils.settingsSaveHelperSimpleFunction(self.mppTrigger, self)
		;

		oData.language.subscribe(function (sValue) {

			self.languageTrigger(Enums.SaveSettingsStep.Animate);
			
			$.ajax({
				'url': RL.link().langLink(sValue),
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

			RL.remote().saveSettings(Utils.emptyFunction, {
				'Language': sValue
			});
		});

		oData.editorDefaultType.subscribe(function (sValue) {
			RL.remote().saveSettings(Utils.emptyFunction, {
				'EditorDefaultType': sValue
			});
		});

		oData.messagesPerPage.subscribe(function (iValue) {
			RL.remote().saveSettings(f1, {
				'MPP': iValue
			});
		});

		oData.showImages.subscribe(function (bValue) {
			RL.remote().saveSettings(Utils.emptyFunction, {
				'ShowImages': bValue ? '1' : '0'
			});
		});

		oData.interfaceAnimation.subscribe(function (sValue) {
			RL.remote().saveSettings(Utils.emptyFunction, {
				'InterfaceAnimation': sValue
			});
		});

		oData.useDesktopNotifications.subscribe(function (bValue) {
			Utils.timeOutAction('SaveDesktopNotifications', function () {
				RL.remote().saveSettings(Utils.emptyFunction, {
					'DesktopNotifications': bValue ? '1' : '0'
				});
			}, 3000);
		});

		oData.replySameFolder.subscribe(function (bValue) {
			Utils.timeOutAction('SaveReplySameFolder', function () {
				RL.remote().saveSettings(Utils.emptyFunction, {
					'ReplySameFolder': bValue ? '1' : '0'
				});
			}, 3000);
		});

		oData.useThreads.subscribe(function (bValue) {

			oData.messageList([]);

			RL.remote().saveSettings(Utils.emptyFunction, {
				'UseThreads': bValue ? '1' : '0'
			});
		});

		oData.layout.subscribe(function (nValue) {

			oData.messageList([]);

			RL.remote().saveSettings(Utils.emptyFunction, {
				'Layout': nValue
			});
		});

		oData.useCheckboxesInList.subscribe(function (bValue) {
			RL.remote().saveSettings(Utils.emptyFunction, {
				'UseCheckboxesInList': bValue ? '1' : '0'
			});
		});
		
	}, 50);
};

SettingsGeneral.prototype.onShow = function ()
{
	RL.data().desktopNotifications.valueHasMutated();
};

SettingsGeneral.prototype.selectLanguage = function ()
{
	kn.showScreenPopup(PopupsLanguagesViewModel);
};

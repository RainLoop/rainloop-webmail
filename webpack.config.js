var webpack = require('webpack');

module.exports = {
	entry: {
		'app': __dirname + '/dev/RainLoop.js',
		'admin': __dirname + '/dev/Admin.js'
	},
	output: {
		pathinfo: true,
		path: __dirname + '/rainloop/v/0.0.0/static/js/',
		filename: '[name].js',
		publicPath: 'rainloop/v/0.0.0/static/js/',
		chunkFilename: '[chunkhash].chunk.js'
	},
	plugins: [
		new webpack.optimize.OccurenceOrderPlugin()
	],
	resolve: {
		modulesDirectories: [__dirname + '/dev/'],
		extensions: ['', '.js'],
		alias: {
			"ko": __dirname  + "/dev/External/ko.js",

			"Knoin:AbstractBoot": __dirname + "/dev/Knoin/KnoinAbstractBoot.js",
			"Knoin:AbstractScreen": __dirname + "/dev/Knoin/KnoinAbstractScreen.js",
			"Knoin:AbstractViewModel": __dirname  + "/dev/Knoin/KnoinAbstractViewModel.js",

			"App:Boot": __dirname  + "/dev/Boot.js",
			"App:Knoin": __dirname  + "/dev/Knoin/Knoin.js",
			"App:Abstract": __dirname  + "/dev/Apps/AbstractApp.js",
			"App:RainLoop": __dirname  + "/dev/Apps/RainLoopApp.js",
			"App:Admin": __dirname  + "/dev/Apps/AdminApp.js",

			"Model:Account": __dirname  + "/dev/Models/AccountModel.js",
			"Model:Attachment": __dirname  + "/dev/Models/AttachmentModel.js",
			"Model:ComposeAttachment": __dirname  + "/dev/Models/ComposeAttachmentModel.js",
			"Model:Contact": __dirname  + "/dev/Models/ContactModel.js",
			"Model:ContactProperty": __dirname  + "/dev/Models/ContactPropertyModel.js",
			"Model:ContactTag": __dirname  + "/dev/Models/ContactTagModel.js",
			"Model:Email": __dirname  + "/dev/Models/EmailModel.js",
			"Model:Filter": __dirname  + "/dev/Models/FilterModel.js",
			"Model:FilterCondition": __dirname  + "/dev/Models/FilterConditionModel.js",
			"Model:Folder": __dirname  + "/dev/Models/FolderModel.js",
			"Model:Identity": __dirname  + "/dev/Models/IdentityModel.js",
			"Model:Message": __dirname  + "/dev/Models/MessageModel.js",
			"Model:OpenPgpKey": __dirname  + "/dev/Models/OpenPgpKeyModel.js",

			"Storage:LocalStorage": __dirname  + "/dev/Storages/LocalStorage.js",
			"Storage:LocalStorage:Cookie": __dirname  + "/dev/Storages/LocalStorages/CookieDriver.js",
			"Storage:LocalStorage:LocalStorage": __dirname  + "/dev/Storages/LocalStorages/LocalStorageDriver.js",

			"Storage:Settings": __dirname  + "/dev/Storages/SettingsStorage.js",

			"Storage:Abstract:Remote": __dirname  + "/dev/Storages/AbstractRemoteStorage.js",
			"Storage:Abstract:Data": __dirname  + "/dev/Storages/AbstractData.js",

			"Storage:RainLoop:Cache": __dirname  + "/dev/Storages/CacheStorage.js",
			"Storage:RainLoop:Remote": __dirname  + "/dev/Storages/RemoteStorage.js",
			"Storage:RainLoop:Data": __dirname  + "/dev/Storages/DataStorage.js",

			"Storage:Admin:Remote": __dirname  + "/dev/Storages/AdminRemoteStorage.js",
			"Storage:Admin:Data": __dirname  + "/dev/Storages/AdminDataStorage.js",

			"Screen:AbstractSettings": __dirname  + "/dev/Screens/AbstractSettingsScreen.js",
			"Screen:RainLoop:Login": __dirname  + "/dev/Screens/LoginScreen.js",
			"Screen:RainLoop:About": __dirname  + "/dev/Screens/AboutScreen.js",
			"Screen:RainLoop:MailBox": __dirname  + "/dev/Screens/MailBoxScreen.js",
			"Screen:RainLoop:Settings": __dirname  + "/dev/Screens/SettingsScreen.js",
			"Screen:Admin:Login": __dirname  + "/dev/Screens/AdminLoginScreen.js",
			"Screen:Admin:Settings": __dirname  + "/dev/Screens/AdminSettingsScreen.js",

			"Settings:RainLoop:General": __dirname  + "/dev/Settings/App/SettingsGeneral.js",
			"Settings:RainLoop:ChangePassword": __dirname  + "/dev/Settings/App/SettingsChangePassword.js",
			"Settings:RainLoop:Accounts": __dirname  + "/dev/Settings/App/SettingsAccounts.js",
			"Settings:RainLoop:Contacts": __dirname  + "/dev/Settings/App/SettingsContacts.js",
			"Settings:RainLoop:Filters": __dirname  + "/dev/Settings/App/SettingsFilters.js",
			"Settings:RainLoop:Folders": __dirname  + "/dev/Settings/App/SettingsFolders.js",
			"Settings:RainLoop:Identity": __dirname  + "/dev/Settings/App/SettingsIdentity.js",
			"Settings:RainLoop:Identities": __dirname  + "/dev/Settings/App/SettingsIdentities.js",
			"Settings:RainLoop:OpenPGP": __dirname  + "/dev/Settings/App/SettingsOpenPGP.js",
			"Settings:RainLoop:Security": __dirname  + "/dev/Settings/App/SettingsSecurity.js",
			"Settings:RainLoop:Social": __dirname  + "/dev/Settings/App/SettingsSocial.js",
			"Settings:RainLoop:Themes": __dirname  + "/dev/Settings/App/SettingsThemes.js",

			"Settings:Admin:General": __dirname  + "/dev/Settings/Admin/AdminSettingsGeneral.js",
			"Settings:Admin:Login": __dirname  + "/dev/Settings/Admin/AdminSettingsLogin.js",
			"Settings:Admin:Branding": __dirname  + "/dev/Settings/Admin/AdminSettingsBranding.js",
			"Settings:Admin:Contacts": __dirname  + "/dev/Settings/Admin/AdminSettingsContacts.js",
			"Settings:Admin:Domains": __dirname  + "/dev/Settings/Admin/AdminSettingsDomains.js",
			"Settings:Admin:Social": __dirname  + "/dev/Settings/Admin/AdminSettingsSocial.js",
			"Settings:Admin:Security": __dirname  + "/dev/Settings/Admin/AdminSettingsSecurity.js",
			"Settings:Admin:Plugins": __dirname  + "/dev/Settings/Admin/AdminSettingsPlugins.js",
			"Settings:Admin:Packages": __dirname  + "/dev/Settings/Admin/AdminSettingsPackages.js",
			"Settings:Admin:Licensing": __dirname  + "/dev/Settings/Admin/AdminSettingsLicensing.js",
			"Settings:Admin:About": __dirname  + "/dev/Settings/Admin/AdminSettingsAbout.js",

			"View:Admin:Login": __dirname  + "/dev/ViewModels/AdminLoginViewModel.js",
			"View:Admin:SettingsMenu": __dirname  + "/dev/ViewModels/AdminSettingsMenuViewModel.js",
			"View:Admin:SettingsPane": __dirname  + "/dev/ViewModels/AdminSettingsPaneViewModel.js",

			"View:RainLoop:AbstractSystemDropDown": __dirname  + "/dev/ViewModels/AbstractSystemDropDownViewModel.js",
			"View:RainLoop:MailBoxSystemDropDown": __dirname  + "/dev/ViewModels/MailBoxSystemDropDownViewModel.js",
			"View:RainLoop:SettingsSystemDropDown": __dirname  + "/dev/ViewModels/SettingsSystemDropDownViewModel.js",
			"View:RainLoop:SettingsMenu": __dirname  + "/dev/ViewModels/SettingsMenuViewModel.js",
			"View:RainLoop:SettingsPane": __dirname  + "/dev/ViewModels/SettingsPaneViewModel.js",
			"View:RainLoop:MailBoxMessageView": __dirname  + "/dev/ViewModels/MailBoxMessageViewViewModel.js",
			"View:RainLoop:MailBoxMessageList": __dirname  + "/dev/ViewModels/MailBoxMessageListViewModel.js",
			"View:RainLoop:MailBoxFolderList": __dirname  + "/dev/ViewModels/MailBoxFolderListViewModel.js",
			"View:RainLoop:Login": __dirname  + "/dev/ViewModels/LoginViewModel.js",
			"View:RainLoop:About": __dirname  + "/dev/ViewModels/AboutViewModel.js",

			"View:Popup:Activate": __dirname  + "/dev/ViewModels/Popups/PopupsActivateViewModel.js",
			"View:Popup:AddAccount": __dirname  + "/dev/ViewModels/Popups/PopupsAddAccountViewModel.js",
			"View:Popup:AddOpenPgpKey": __dirname  + "/dev/ViewModels/Popups/PopupsAddOpenPgpKeyViewModel.js",
			"View:Popup:AdvancedSearch": __dirname  + "/dev/ViewModels/Popups/PopupsAdvancedSearchViewModel.js",
			"View:Popup:Ask": __dirname  + "/dev/ViewModels/Popups/PopupsAskViewModel.js",
			"View:Popup:ComposeOpenPgp": __dirname  + "/dev/ViewModels/Popups/PopupsComposeOpenPgpViewModel.js",
			"View:Popup:Compose": __dirname  + "/dev/ViewModels/Popups/PopupsComposeViewModel.js",
			"View:Popup:Contacts": __dirname  + "/dev/ViewModels/Popups/PopupsContactsViewModel.js",
			"View:Popup:Domain": __dirname  + "/dev/ViewModels/Popups/PopupsDomainViewModel.js",
			"View:Popup:Filter": __dirname  + "/dev/ViewModels/Popups/PopupsFilterViewModel.js",
			"View:Popup:FolderClear": __dirname  + "/dev/ViewModels/Popups/PopupsFolderClearViewModel.js",
			"View:Popup:FolderCreate": __dirname  + "/dev/ViewModels/Popups/PopupsFolderCreateViewModel.js",
			"View:Popup:FolderSystem": __dirname  + "/dev/ViewModels/Popups/PopupsFolderSystemViewModel.js",
			"View:Popup:Identity": __dirname  + "/dev/ViewModels/Popups/PopupsIdentityViewModel.js",
			"View:Popup:KeyboardShortcutsHelp": __dirname  + "/dev/ViewModels/Popups/PopupsKeyboardShortcutsHelpViewModel.js",
			"View:Popup:Languages": __dirname  + "/dev/ViewModels/Popups/PopupsLanguagesViewModel.js",
			"View:Popup:NewOpenPgpKey": __dirname  + "/dev/ViewModels/Popups/PopupsNewOpenPgpKeyViewModel.js",
			"View:Popup:Plugin": __dirname  + "/dev/ViewModels/Popups/PopupsPluginViewModel.js",
			"View:Popup:TwoFactorTest": __dirname  + "/dev/ViewModels/Popups/PopupsTwoFactorTestViewModel.js",
			"View:Popup:ViewOpenPgpKey": __dirname  + "/dev/ViewModels/Popups/PopupsViewOpenPgpKeyViewModel.js"
		}
	},
	externals: {
		'window': 'window',
		'JSON': 'JSON',
		'moment': 'moment',
		'ifvisible': 'ifvisible',
		'crossroads': 'crossroads',
		'Jua': 'Jua',
		'hasher': 'hasher',
		'ssm': 'ssm',
		'key': 'key',
		'_': '_',
		'$': 'jQuery'
	}
};
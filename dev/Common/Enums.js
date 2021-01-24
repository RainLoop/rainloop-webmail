/* eslint quote-props: 0 */

/**
 * @enum {string}
 */
export const StorageResultType = {
	Success: 'success',
	Abort: 'abort',
	Error: 'error',
	Unload: 'unload'
};

/**
 * @enum {string}
 */
export const Capa = {
	TwoFactor: 'TWO_FACTOR',
	TwoFactorForce: 'TWO_FACTOR_FORCE',
	OpenPGP: 'OPEN_PGP',
	Prefetch: 'PREFETCH',
	Folders: 'FOLDERS',
	Composer: 'COMPOSER',
	Contacts: 'CONTACTS',
	Reload: 'RELOAD',
	Search: 'SEARCH',
	SearchAdv: 'SEARCH_ADV',
	MessageActions: 'MESSAGE_ACTIONS',
	MessageListActions: 'MESSAGELIST_ACTIONS',
	AttachmentsActions: 'ATTACHMENTS_ACTIONS',
	DangerousActions: 'DANGEROUS_ACTIONS',
	Settings: 'SETTINGS',
	Help: 'HELP',
	Themes: 'THEMES',
	UserBackground: 'USER_BACKGROUND',
	Sieve: 'SIEVE',
	Filters: 'FILTERS',
	AttachmentThumbnails: 'ATTACHMENT_THUMBNAILS',
	Templates: 'TEMPLATES',
	AutoLogout: 'AUTOLOGOUT',
	AdditionalAccounts: 'ADDITIONAL_ACCOUNTS',
	Identities: 'IDENTITIES'
};

/**
 * @enum {string}
 */
export const KeyState = {
	All: 'all',
	None: 'none',
	ContactList: 'contact-list',
	MessageList: 'message-list',
	FolderList: 'folder-list',
	MessageView: 'message-view',
	Compose: 'compose',
	Settings: 'settings',
	Menu: 'menu',
	PopupComposeOpenPGP: 'compose-open-pgp',
	PopupMessageOpenPGP: 'message-open-pgp',
	PopupViewOpenPGP: 'view-open-pgp',
	PopupKeyboardShortcutsHelp: 'popup-keyboard-shortcuts-help',
	PopupAsk: 'popup-ask'
};

/**
 * @enum {number}
 */
export const UploadErrorCode = {
	Normal: 0,
	FileIsTooBig: 1,
	FilePartiallyUploaded: 2,
	NoFileUploaded: 3,
	MissingTempFolder: 4,
	OnSavingFile: 5,
	FileType: 98,
	Unknown: 99
};

/**
 * @enum {number}
 */
export const SaveSettingsStep = {
	Animate: -2,
	Idle: -1,
	TrueResult: 1,
	FalseResult: 0
};

/**
 * @enum {number}
 */
export const Notification = {
	InvalidToken: 101,
	AuthError: 102,
	ConnectionError: 104,
	DomainNotAllowed: 109,
	AccountNotAllowed: 110,

	AccountTwoFactorAuthRequired: 120,
	AccountTwoFactorAuthError: 121,

//	CurrentPasswordIncorrect: 131,
//	NewPasswordShort: 132,
//	NewPasswordWeak: 133,
//	NewPasswordForbidden: 134,

	ContactsSyncError: 140,

	CantGetMessageList: 201,
	CantGetMessage: 202,
	CantDeleteMessage: 203,
	CantMoveMessage: 204,
	CantCopyMessage: 205,

	CantSaveMessage: 301,
	CantSendMessage: 302,
	InvalidRecipients: 303,

	CantSaveFilters: 351,
	CantGetFilters: 352,
	CantActivateFiltersScript: 353,
	CantDeleteFiltersScript: 354,
//	FiltersAreNotCorrect: 355,

	CantCreateFolder: 400,
	CantRenameFolder: 401,
	CantDeleteFolder: 402,
	CantSubscribeFolder: 403,
	CantUnsubscribeFolder: 404,
	CantDeleteNonEmptyFolder: 405,

//	CantSaveSettings: 501,
	CantSavePluginSettings: 502,

	DomainAlreadyExists: 601,

	CantInstallPackage: 701,
	CantDeletePackage: 702,
	InvalidPluginPackage: 703,
	UnsupportedPluginPackage: 704,

	DemoSendMessageError: 750,
	DemoAccountError: 751,

	AccountAlreadyExists: 801,
	AccountDoesNotExist: 802,

	MailServerError: 901,
	ClientViewError: 902,
	InvalidInputArgument: 903,

	JsonFalse: 950,
	JsonAbort: 951,
	JsonParse: 952,
//	JsonTimeout: 953,

	UnknownNotification: 998,
	UnknownError: 999
};

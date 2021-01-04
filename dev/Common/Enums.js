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
export const Focused = {
	None: 'none',
	MessageList: 'message-list',
	MessageView: 'message-view',
	FolderList: 'folder-list'
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
export const FolderType = {
	Inbox: 10,
	SentItems: 11,
	Draft: 12,
	Trash: 13,
	Spam: 14,
	Archive: 15,
	NotSpam: 80,
	User: 99
};

/**
 * @enum {number}
 */
export const ServerFolderType = {
	USER: 0,
	INBOX: 1,
	SENT: 2,
	DRAFTS: 3,
	JUNK: 4,
	TRASH: 5,
	IMPORTANT: 10,
	FLAGGED: 11,
	ALL: 12
};

/**
 * @enum {string}
 */
export const LoginSignMeTypeAsString = {
	DefaultOff: 'defaultoff',
	DefaultOn: 'defaulton',
	Unused: 'unused'
};

/**
 * @enum {number}
 */
export const LoginSignMeType = {
	DefaultOff: 0,
	DefaultOn: 1,
	Unused: 2
};

/**
 * @enum {string}
 */
export const ComposeType = {
	Empty: 'empty',
	Reply: 'reply',
	ReplyAll: 'replyall',
	Forward: 'forward',
	ForwardAsAttachment: 'forward-as-attachment',
	Draft: 'draft',
	EditAsNew: 'editasnew'
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
export const SetSystemFoldersNotification = {
	None: 0,
	Sent: 1,
	Draft: 2,
	Spam: 3,
	Trash: 4,
	Archive: 5
};

/**
 * @enum {number}
 */
export const ClientSideKeyName = {
	FoldersLashHash: 0,
	MessagesInboxLastHash: 1,
	MailBoxListSize: 2,
	ExpandedFolders: 3,
	FolderListSize: 4,
	MessageListSize: 5,
	LastReplyAction: 6,
	LastSignMe: 7,
	ComposeLastIdentityID: 8,
	MessageHeaderFullInfo: 9,
	MessageAttachmentControls: 10
};

/**
 * @enum {number}
 */
export const MessageSetAction = {
	SetSeen: 0,
	UnsetSeen: 1,
	SetFlag: 2,
	UnsetFlag: 3
};

/**
 * @enum {number}
 */
export const MessageSelectAction = {
	All: 0,
	None: 1,
	Invert: 2,
	Unseen: 3,
	Seen: 4,
	Flagged: 5,
	Unflagged: 6
};

/**
 * @enum {number}
 */
export const MessagePriority = {
	Low: 5,
	Normal: 3,
	High: 1
};

/**
 * @enum {string}
 */
export const EditorDefaultType = {
	Html: 'Html',
	Plain: 'Plain',
	HtmlForced: 'HtmlForced',
	PlainForced: 'PlainForced'
};

/**
 * @enum {number}
 */
export const ServerSecure = {
	None: 0,
	SSL: 1,
	TLS: 2
};

/**
 * @enum {number}
 */
export const SearchDateType = {
	All: -1,
	Days3: 3,
	Days7: 7,
	Month: 30
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
export const Layout = {
	NoPreview: 0,
	SidePreview: 1,
	BottomPreview: 2
};

/**
 * @enum {string}
 */
export const FilterConditionField = {
	From: 'From',
	Recipient: 'Recipient',
	Subject: 'Subject',
	Header: 'Header',
	Body: 'Body',
	Size: 'Size'
};

/**
 * @enum {string}
 */
export const FilterConditionType = {
	Contains: 'Contains',
	NotContains: 'NotContains',
	EqualTo: 'EqualTo',
	NotEqualTo: 'NotEqualTo',
	Regex: 'Regex',
	Over: 'Over',
	Under: 'Under',
	Text: 'Text',
	Raw: 'Raw'
};

/**
 * @enum {string}
 */
export const FiltersAction = {
	None: 'None',
	MoveTo: 'MoveTo',
	Discard: 'Discard',
	Vacation: 'Vacation',
	Reject: 'Reject',
	Forward: 'Forward'
};

/**
 * @enum {string}
 */
export const FilterRulesType = {
	All: 'All',
	Any: 'Any'
};

/**
 * @enum {number}
 */
export const SignedVerifyStatus = {
	UnknownPublicKeys: -4,
	UnknownPrivateKey: -3,
	Unverified: -2,
	Error: -1,
	None: 0,
	Success: 1
};

/**
 * @enum {number}
 */
export const ContactPropertyType = {
	Unknown: 0,

	FullName: 10,

	FirstName: 15,
	LastName: 16,
	MiddleName: 17,
	Nick: 18,

	NamePrefix: 20,
	NameSuffix: 21,

	Email: 30,
	Phone: 31,
	Web: 32,

	Birthday: 40,

	Facebook: 90,
	Skype: 91,
	GitHub: 92,

	Note: 110,

	Custom: 250
};

/**
 * @enum {number}
 */
export const Notification = {
	InvalidToken: 101,
	AuthError: 102,
	AccessError: 103,
	ConnectionError: 104,
	CaptchaError: 105,
	DomainNotAllowed: 109,
	AccountNotAllowed: 110,

	AccountTwoFactorAuthRequired: 120,
	AccountTwoFactorAuthError: 121,

	CouldNotSaveNewPassword: 130,
	CurrentPasswordIncorrect: 131,
	NewPasswordShort: 132,
	NewPasswordWeak: 133,
	NewPasswordForbidden: 134,

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
	FiltersAreNotCorrect: 355,

	CantCreateFolder: 400,
	CantRenameFolder: 401,
	CantDeleteFolder: 402,
	CantSubscribeFolder: 403,
	CantUnsubscribeFolder: 404,
	CantDeleteNonEmptyFolder: 405,

	CantSaveSettings: 501,
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

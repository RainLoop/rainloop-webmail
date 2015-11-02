
(function () {

	'use strict';

	var Enums = {};

	/**
	 * @enum {string}
	 */
	Enums.FileType = {
		'Unknown': 'unknown',
		'Text': 'text',
		'Html': 'html',
		'Code': 'code',
		'Eml': 'eml',
		'WordText': 'word-text',
		'Pdf': 'pdf',
		'Image': 'image',
		'Audio': 'audio',
		'Video': 'video',
		'Sheet': 'sheet',
		'Presentation': 'presentation',
		'Certificate': 'certificate',
		'CertificateBin': 'certificate-bin',
		'Archive': 'archive'
	};

	/**
	 * @enum {string}
	 */
	Enums.StorageResultType = {
		'Success': 'success',
		'Abort': 'abort',
		'Error': 'error',
		'Unload': 'unload'
	};

	/**
	 * @enum {string}
	 */
	Enums.Focused = {
		'None': 'none',
		'MessageList': 'message-list',
		'MessageView': 'message-view',
		'FolderList': 'folder-list'
	};

	/**
	 * @enum {number}
	 */
	Enums.State = {
		'Empty': 10,
		'Login': 20,
		'Auth': 30
	};

	/**
	 * @enum {number}
	 */
	Enums.StateType = {
		'Webmail': 0,
		'Admin': 1
	};

	/**
	 * @enum {string}
	 */
	Enums.Capa = {
		'TwoFactor': 'TWO_FACTOR',
		'TwoFactorForce': 'TWO_FACTOR_FORCE',
		'OpenPGP': 'OPEN_PGP',
		'Prefetch': 'PREFETCH',
		'Gravatar': 'GRAVATAR',
		'Folders': 'FOLDERS',
		'Composer': 'COMPOSER',
		'Contacts': 'CONTACTS',
		'Reload': 'RELOAD',
		'Search': 'SEARCH',
		'SearchAdv': 'SEARCH_ADV',
		'MessageActions': 'MESSAGE_ACTIONS',
		'MessageListActions': 'MESSAGELIST_ACTIONS',
		'AttachmentsActions': 'ATTACHMENTS_ACTIONS',
		'DangerousActions': 'DANGEROUS_ACTIONS',
		'Settings': 'SETTINGS',
		'Help': 'HELP',
		'Themes': 'THEMES',
		'UserBackground': 'USER_BACKGROUND',
		'Sieve': 'SIEVE',
		'Filters': 'FILTERS',
		'AttachmentThumbnails': 'ATTACHMENT_THUMBNAILS',
		'Templates': 'TEMPLATES',
		'AutoLogout': 'AUTOLOGOUT',
		'AdditionalAccounts': 'ADDITIONAL_ACCOUNTS',
		'Identities': 'IDENTITIES'
	};

	/**
	 * @enum {string}
	 */
	Enums.KeyState = {
		'All': 'all',
		'None': 'none',
		'ContactList': 'contact-list',
		'MessageList': 'message-list',
		'FolderList': 'folder-list',
		'MessageView': 'message-view',
		'Compose': 'compose',
		'Settings': 'settings',
		'Menu': 'menu',
		'PopupComposeOpenPGP': 'compose-open-pgp',
		'PopupMessageOpenPGP': 'message-open-pgp',
		'PopupViewOpenPGP': 'view-open-pgp',
		'PopupKeyboardShortcutsHelp': 'popup-keyboard-shortcuts-help',
		'PopupAsk': 'popup-ask'
	};

	/**
	 * @enum {number}
	 */
	Enums.FolderType = {
		'Inbox': 10,
		'SentItems': 11,
		'Draft': 12,
		'Trash': 13,
		'Spam': 14,
		'Archive': 15,
		'NotSpam': 80,
		'User': 99
	};

	/**
	 * @enum {number}
	 */
	Enums.ServerFolderType = {
		'USER': 0,
		'INBOX': 1,
		'SENT': 2,
		'DRAFTS': 3,
		'JUNK': 4,
		'TRASH': 5,
		'IMPORTANT': 10,
		'FLAGGED': 11,
		'ALL': 12
	};

	/**
	 * @enum {string}
	 */
	Enums.LoginSignMeTypeAsString = {
		'DefaultOff': 'defaultoff',
		'DefaultOn': 'defaulton',
		'Unused': 'unused'
	};

	/**
	 * @enum {number}
	 */
	Enums.LoginSignMeType = {
		'DefaultOff': 0,
		'DefaultOn': 1,
		'Unused': 2
	};

	/**
	 * @enum {string}
	 */
	Enums.ComposeType = {
		'Empty': 'empty',
		'Reply': 'reply',
		'ReplyAll': 'replyall',
		'Forward': 'forward',
		'ForwardAsAttachment': 'forward-as-attachment',
		'Draft': 'draft',
		'EditAsNew': 'editasnew'
	};

	/**
	 * @enum {number}
	 */
	Enums.UploadErrorCode = {
		'Normal': 0,
		'FileIsTooBig': 1,
		'FilePartiallyUploaded': 2,
		'FileNoUploaded': 3,
		'MissingTempFolder': 4,
		'FileOnSaveingError': 5,
		'FileType': 98,
		'Unknown': 99
	};

	/**
	 * @enum {number}
	 */
	Enums.SetSystemFoldersNotification = {
		'None': 0,
		'Sent': 1,
		'Draft': 2,
		'Spam': 3,
		'Trash': 4,
		'Archive': 5
	};

	/**
	 * @enum {number}
	 */
	Enums.ClientSideKeyName = {
		'FoldersLashHash': 0,
		'MessagesInboxLastHash': 1,
		'MailBoxListSize': 2,
		'ExpandedFolders': 3,
		'FolderListSize': 4,
		'MessageListSize': 5,
		'LastReplyAction': 6,
		'LastSignMe': 7,
		'ComposeLastIdentityID': 8
	};

	/**
	 * @enum {number}
	 */
	Enums.EventKeyCode = {
		'Backspace': 8,
		'Tab': 9,
		'Enter': 13,
		'Esc': 27,
		'PageUp': 33,
		'PageDown': 34,
		'Left': 37,
		'Right': 39,
		'Up': 38,
		'Down': 40,
		'End': 35,
		'Home': 36,
		'Space': 32,
		'Insert': 45,
		'Delete': 46,
		'A': 65,
		'S': 83
	};

	/**
	 * @enum {number}
	 */
	Enums.MessageSetAction = {
		'SetSeen': 0,
		'UnsetSeen': 1,
		'SetFlag': 2,
		'UnsetFlag': 3
	};

	/**
	 * @enum {number}
	 */
	Enums.MessageSelectAction = {
		'All': 0,
		'None': 1,
		'Invert': 2,
		'Unseen': 3,
		'Seen': 4,
		'Flagged': 5,
		'Unflagged': 6
	};

	/**
	 * @enum {number}
	 */
	Enums.DesktopNotification = {
		'Allowed': 0,
		'NotAllowed': 1,
		'Denied': 2,
		'NotSupported': 9
	};

	/**
	 * @enum {number}
	 */
	Enums.MessagePriority = {
		'Low': 5,
		'Normal': 3,
		'High': 1
	};

	/**
	 * @enum {string}
	 */
	Enums.EditorDefaultType = {
		'Html': 'Html',
		'Plain': 'Plain',
		'HtmlForced': 'HtmlForced',
		'PlainForced': 'PlainForced'
	};

	/**
	 * @enum {number}
	 */
	Enums.ServerSecure = {
		'None': 0,
		'SSL': 1,
		'TLS': 2
	};

	/**
	 * @enum {number}
	 */
	Enums.SearchDateType = {
		'All': -1,
		'Days3': 3,
		'Days7': 7,
		'Month': 30
	};

	/**
	 * @enum {number}
	 */
	Enums.SaveSettingsStep = {
		'Animate': -2,
		'Idle': -1,
		'TrueResult': 1,
		'FalseResult': 0
	};

	/**
	 * @enum {number}
	 */
	Enums.Layout = {
		'NoPreview': 0,
		'SidePreview': 1,
		'BottomPreview': 2,
		'Mobile': 3
	};

	/**
	 * @enum {string}
	 */
	Enums.FilterConditionField = {
		'From': 'From',
		'Recipient': 'Recipient',
		'Subject': 'Subject',
		'Header': 'Header',
		'Size': 'Size'
	};

	/**
	 * @enum {string}
	 */
	Enums.FilterConditionType = {
		'Contains': 'Contains',
		'NotContains': 'NotContains',
		'EqualTo': 'EqualTo',
		'NotEqualTo': 'NotEqualTo',
		'Over': 'Over',
		'Under': 'Under'
	};

	/**
	 * @enum {string}
	 */
	Enums.FiltersAction = {
		'None': 'None',
		'MoveTo': 'MoveTo',
		'Discard': 'Discard',
		'Vacation': 'Vacation',
		'Reject': 'Reject',
		'Forward': 'Forward'
	};

	/**
	 * @enum {string}
	 */
	Enums.FilterRulesType = {
		'All': 'All',
		'Any': 'Any'
	};

	/**
	 * @enum {number}
	 */
	Enums.SignedVerifyStatus = {
		'UnknownPublicKeys': -4,
		'UnknownPrivateKey': -3,
		'Unverified': -2,
		'Error': -1,
		'None': 0,
		'Success': 1
	};

	/**
	 * @enum {number}
	 */
	Enums.ContactPropertyType = {

		'Unknown': 0,

		'FullName': 10,

		'FirstName': 15,
		'LastName': 16,
		'MiddleName': 16,
		'Nick': 18,

		'NamePrefix': 20,
		'NameSuffix': 21,

		'Email': 30,
		'Phone': 31,
		'Web': 32,

		'Birthday': 40,

		'Facebook': 90,
		'Skype': 91,
		'GitHub': 92,

		'Note': 110,

		'Custom': 250
	};

	/**
	 * @enum {number}
	 */
	Enums.Notification = {
		'InvalidToken': 101,
		'AuthError': 102,
		'AccessError': 103,
		'ConnectionError': 104,
		'CaptchaError': 105,
		'SocialFacebookLoginAccessDisable': 106,
		'SocialTwitterLoginAccessDisable': 107,
		'SocialGoogleLoginAccessDisable': 108,
		'DomainNotAllowed': 109,
		'AccountNotAllowed': 110,

		'AccountTwoFactorAuthRequired': 120,
		'AccountTwoFactorAuthError': 121,

		'CouldNotSaveNewPassword': 130,
		'CurrentPasswordIncorrect': 131,
		'NewPasswordShort': 132,
		'NewPasswordWeak': 133,
		'NewPasswordForbidden': 134,

		'ContactsSyncError': 140,

		'CantGetMessageList': 201,
		'CantGetMessage': 202,
		'CantDeleteMessage': 203,
		'CantMoveMessage': 204,
		'CantCopyMessage': 205,

		'CantSaveMessage': 301,
		'CantSendMessage': 302,
		'InvalidRecipients': 303,

		'CantSaveFilters': 351,
		'CantGetFilters': 352,
		'FiltersAreNotCorrect': 355,

		'CantCreateFolder': 400,
		'CantRenameFolder': 401,
		'CantDeleteFolder': 402,
		'CantSubscribeFolder': 403,
		'CantUnsubscribeFolder': 404,
		'CantDeleteNonEmptyFolder': 405,

		'CantSaveSettings': 501,
		'CantSavePluginSettings': 502,

		'DomainAlreadyExists': 601,

		'CantInstallPackage': 701,
		'CantDeletePackage': 702,
		'InvalidPluginPackage': 703,
		'UnsupportedPluginPackage': 704,

		'LicensingServerIsUnavailable': 710,
		'LicensingExpired': 711,
		'LicensingBanned': 712,

		'DemoSendMessageError': 750,
		'DemoAccountError': 751,

		'AccountAlreadyExists': 801,
		'AccountDoesNotExist': 802,

		'MailServerError': 901,
		'ClientViewError': 902,
		'InvalidInputArgument': 903,

		'AjaxFalse': 950,
		'AjaxAbort': 951,
		'AjaxParse': 952,
		'AjaxTimeout': 953,

		'UnknownNotification': 999,
		'UnknownError': 999
	};

	module.exports = Enums;

}());
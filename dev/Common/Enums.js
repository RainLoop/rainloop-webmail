/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

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
	'User': 99
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
	'FolderListSize': 4
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
Enums.DesktopNotifications = {
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
	'Plain': 'Plain'
};

/**
 * @enum {string}
 */
Enums.CustomThemeType = {
	'Light': 'Light',
	'Dark': 'Dark'
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
Enums.EmailType = {
	'Defailt': 0,
	'Facebook': 1,
	'Google': 2
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
 * @enum {string}
 */
Enums.InterfaceAnimation = {
	'None': 'None',
	'Normal': 'Normal',
	'Full': 'Full'
};

/**
 * @enum {number}
 */
Enums.Layout = {
	'NoPreview': 0,
	'SidePreview': 1,
	'BottomPreview': 2
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
	
	'AccountAlreadyExists': 801,

	'MailServerError': 901,
	'ClientViewError': 902,
	'UnknownNotification': 999,
	'UnknownError': 999
};

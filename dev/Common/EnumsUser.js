/* eslint quote-props: 0 */

/**
 * @enum {number}
 */
export const FolderType = {
	Inbox: 1,
	Sent: 2,
	Drafts: 3,
	Junk: 4, // Spam
	Trash: 5,
	Archive: 6
/*
	IMPORTANT : 10;
	FLAGGED : 11;
	ALL : 13;
	// TODO: SnappyMail
	TEMPLATES : 19;
	// Kolab
	CONFIGURATION : 20;
	CALENDAR : 21;
	CONTACTS : 22;
	TASKS    : 23;
	NOTES    : 24;
	FILES    : 25;
	JOURNAL  : 26;
*/
};

/**
 * @enum {string}
 */
export const FolderMetadataKeys = {
	// RFC 5464
	Comment: '/private/comment',
	CommentShared: '/shared/comment',
	// RFC 6154
	SpecialUse: '/private/specialuse',
	// Kolab
	KolabFolderType: '/private/vendor/kolab/folder-type',
	KolabFolderTypeShared: '/shared/vendor/kolab/folder-type'
};

/**
 * @enum {string}
 */
export const ComposeType = {
	Empty: 0,
	Reply: 1,
	ReplyAll: 2,
	Forward: 3,
	ForwardAsAttachment: 4,
	Draft: 5,
	EditAsNew: 6
};

/**
 * @enum {number}
 */
export const
	ClientSideKeyNameExpandedFolders = 3,
	ClientSideKeyNameFolderListSize = 4,
	ClientSideKeyNameMessageListSize = 5,
	ClientSideKeyNameLastSignMe = 7,
	ClientSideKeyNameMessageHeaderFullInfo = 9,
	ClientSideKeyNameMessageAttachmentControls = 10;

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
	Plain: 'Plain'
};

/**
 * @enum {number}
 */
export const Layout = {
	NoPreview: 0,
	SidePreview: 1,
	BottomPreview: 2
};

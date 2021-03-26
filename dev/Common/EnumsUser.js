/* eslint quote-props: 0 */

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
 * @enum {string}
 */
export const FolderSortType = {
	DateDesc: '', // default 'REVERSE DATE'
	DateAsc: 'DATE',
	FromDesc: 'REVERSE FROM',
	FromAsc: 'FROM',
	SizeDesc: 'REVERSE SIZE',
	SizeAsc: 'SIZE',
	SubjectDesc: 'REVERSE SUBJECT',
	SubjectAsc: 'SUBJECT'
//	ToDesc: 'REVERSE TO',
//	ToAsc: 'TO',
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
export const Layout = {
	NoPreview: 0,
	SidePreview: 1,
	BottomPreview: 2
};

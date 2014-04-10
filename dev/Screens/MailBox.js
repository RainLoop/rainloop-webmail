/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractScreen
 */
function MailBoxScreen()
{
	KnoinAbstractScreen.call(this, 'mailbox', [
		MailBoxSystemDropDownViewModel,
		MailBoxFolderListViewModel,
		MailBoxMessageListViewModel,
		MailBoxMessageViewViewModel
	]);

	this.oLastRoute = {};
}

_.extend(MailBoxScreen.prototype, KnoinAbstractScreen.prototype);

/**
 * @type {Object}
 */
MailBoxScreen.prototype.oLastRoute = {};

MailBoxScreen.prototype.setNewTitle  = function ()
{
	var
		sEmail = RL.data().accountEmail(),
		ifoldersInboxUnreadCount = RL.data().foldersInboxUnreadCount()
	;
	
	RL.setTitle(('' === sEmail ? '' :
		(0 < ifoldersInboxUnreadCount ? '(' + ifoldersInboxUnreadCount + ') ' : ' ') + sEmail + ' - ') + Utils.i18n('TITLES/MAILBOX'));
};

MailBoxScreen.prototype.onShow = function ()
{
	this.setNewTitle();
	RL.data().keyScope(Enums.KeyState.MessageList);
};

MailBoxScreen.prototype.onHide = function ()
{
	RL.data().keyScope(Enums.KeyState.All);
};

/**
 * @param {string} sFolderHash
 * @param {number} iPage
 * @param {string} sSearch
 * @param {boolean=} bPreview = false
 */
MailBoxScreen.prototype.onRoute = function (sFolderHash, iPage, sSearch, bPreview)
{
	if (Utils.isUnd(bPreview) ? false : !!bPreview)
	{
		_.delay(function () {
			if (Enums.Layout.NoPreview === RL.data().layout() && !RL.data().message())
			{
				RL.historyBack();
			}
		}, 5);
	}
	else
	{
		var
			oData = RL.data(),
			sFolderFullNameRaw = RL.cache().getFolderFullNameRaw(sFolderHash),
			oFolder = RL.cache().getFolderFromCacheList(sFolderFullNameRaw)
		;

		if (oFolder)
		{
			oData
				.currentFolder(oFolder)
				.messageListPage(iPage)
				.messageListSearch(sSearch)
			;

			if (Enums.Layout.NoPreview === oData.layout() && oData.message())
			{
				oData.message(null);
				oData.messageFullScreenMode(false);
			}

			RL.reloadMessageList();
		}
	}
};

MailBoxScreen.prototype.onStart = function ()
{
	var
		oData = RL.data(),
		fResizeFunction = function () {
			Utils.windowResize();
		}
	;

	if (RL.settingsGet('AllowAdditionalAccounts') || RL.settingsGet('AllowIdentities'))
	{
		RL.accountsAndIdentities();
	}

	_.delay(function () {
		if ('INBOX' !== oData.currentFolderFullNameRaw())
		{
			RL.folderInformation('INBOX');
		}
	}, 1000);

	_.delay(function () {
		RL.quota();
	}, 5000);

	_.delay(function () {
		RL.remote().appDelayStart(Utils.emptyFunction);
	}, 35000);

	$html.toggleClass('rl-no-preview-pane', Enums.Layout.NoPreview === oData.layout());

	oData.folderList.subscribe(fResizeFunction);
	oData.messageList.subscribe(fResizeFunction);
	oData.message.subscribe(fResizeFunction);

	oData.layout.subscribe(function (nValue) {
		$html.toggleClass('rl-no-preview-pane', Enums.Layout.NoPreview === nValue);
	});
	
	oData.foldersInboxUnreadCount.subscribe(function () {
		this.setNewTitle();
	}, this);
};

//MailBoxScreen.prototype.onBuild = function ()
//{
//	if (!Globals.bMobileDevice)
//	{
//		_.defer(function () {
//			Utils.initLayoutResizer('#rl-resizer-left', '#rl-resizer-right', '#rl-right',
//				350, 800, 350, 350, Enums.ClientSideKeyName.MailBoxListSize);
//		});
//	}
//};

/**
 * @return {Array}
 */
MailBoxScreen.prototype.routes = function ()
{
	var
		fNormP = function () {
			return ['Inbox', 1, '', true];
		},
		fNormS = function (oRequest, oVals) {
			oVals[0] = Utils.pString(oVals[0]);
			oVals[1] = Utils.pInt(oVals[1]);
			oVals[1] = 0 >= oVals[1] ? 1 : oVals[1];
			oVals[2] = Utils.pString(oVals[2]);

			if ('' === oRequest)
			{
				oVals[0] = 'Inbox';
				oVals[1] = 1;
			}

			return [decodeURI(oVals[0]), oVals[1], decodeURI(oVals[2]), false];
		},
		fNormD = function (oRequest, oVals) {
			oVals[0] = Utils.pString(oVals[0]);
			oVals[1] = Utils.pString(oVals[1]);

			if ('' === oRequest)
			{
				oVals[0] = 'Inbox';
			}

			return [decodeURI(oVals[0]), 1, decodeURI(oVals[1]), false];
		}
	;

	return [
		[/^([a-zA-Z0-9]+)\/p([1-9][0-9]*)\/(.+)\/?$/, {'normalize_': fNormS}],
		[/^([a-zA-Z0-9]+)\/p([1-9][0-9]*)$/, {'normalize_': fNormS}],
		[/^([a-zA-Z0-9]+)\/(.+)\/?$/, {'normalize_': fNormD}],
		[/^message-preview$/,  {'normalize_': fNormP}],
		[/^([^\/]*)$/,  {'normalize_': fNormS}]
	];
};

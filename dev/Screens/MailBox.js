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

MailBoxScreen.prototype.oLastRoute = {};

MailBoxScreen.prototype.onShow = function ()
{
	var sEmail = RL.data().accountEmail();
	RL.setTitle(('' === sEmail ? '' : sEmail + ' - ') + Utils.i18n('TITLES/MAILBOX'));
};

MailBoxScreen.prototype.onRoute = function (sFolderHash, iPage, sSearch)
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

		if (!oData.usePreviewPane() && oData.message())
		{
			oData.message(null);
		}

		RL.reloadMessageList();
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
		RL.quota();
	}, 1000 * 5);

	_.delay(function () {
		if ('INBOX' !== oData.currentFolderFullNameRaw())
		{
			RL.folderInformation('INBOX');
		}
	}, 1000);

	_.delay(function () {
		var sFolder = RL.data().spamFolder();
		if (sFolder !== oData.currentFolderFullNameRaw() && '' !== sFolder)
		{
			RL.folderInformation(sFolder);
		}
	}, 1500);

	_.delay(function () {
		var sFolder = RL.data().draftFolder();
		if (sFolder !== oData.currentFolderFullNameRaw() && '' !== sFolder)
		{
			RL.folderInformation(sFolder);
		}
	}, 2000);

	_.delay(function () {
		RL.remote().appDelayStart(Utils.emptyFunction);
	}, 1000 * 35);

	window.setInterval(function () {
		RL.folderInformation('INBOX');
	}, 1000 * 60 * 2);
	
	window.setInterval(function () {
		RL.quota();
	}, 1000 * 60 * 5);

	$html.toggleClass('rl-no-preview-pane', !oData.usePreviewPane());

	oData.folderList.subscribe(fResizeFunction);
	oData.messageList.subscribe(fResizeFunction);
	oData.message.subscribe(fResizeFunction);

	oData.usePreviewPane.subscribe(function (bValue) {
		$html.toggleClass('rl-no-preview-pane', !bValue);
	});
};

MailBoxScreen.prototype.onBuild = function ()
{
	if (!Globals.bMobileDevice)
	{
		_.defer(function () {
			Utils.initLayoutResizer('#rl-resizer-left', '#rl-resizer-right', '#rl-right',
				350, 800, 350, 350, Enums.ClientSideKeyName.MailBoxListSize);
		});
	}
};

MailBoxScreen.prototype.routes = function ()
{
	var
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

			return [decodeURI(oVals[0]), oVals[1], decodeURI(oVals[2])];
		},
		fNormD = function (oRequest, oVals) {
			oVals[0] = Utils.pString(oVals[0]);
			oVals[1] = Utils.pString(oVals[1]);

			if ('' === oRequest)
			{
				oVals[0] = 'Inbox';
			}

			return [decodeURI(oVals[0]), 1, decodeURI(oVals[1])];
		}
	;

	return [
		[/^([a-zA-Z0-9]+)\/p([1-9][0-9]*)\/(.+)\/?$/, {'normalize_': fNormS}],
		[/^([a-zA-Z0-9]+)\/p([1-9][0-9]*)\/?$/, {'normalize_': fNormS}],
		[/^([a-zA-Z0-9]+)\/(.+)\/?$/, {'normalize_': fNormD}],
		[/^([^\/]*)$/,  {'normalize_': fNormS}]
	];
};

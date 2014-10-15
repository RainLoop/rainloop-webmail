
(function () {

	'use strict';

	var
		_ = require('_'),

		Enums = require('Common/Enums'),
		Globals = require('Common/Globals'),
		Utils = require('Common/Utils'),
		Events = require('Common/Events'),

		Settings = require('Storage/Settings'),
		Data = require('Storage/App/Data'),
		Cache = require('Storage/App/Cache'),
		Remote = require('Storage/App/Remote'),

		AbstractScreen = require('Knoin/AbstractScreen')
	;

	/**
	 * @constructor
	 * @extends AbstractScreen
	 */
	function MailBoxAppScreen()
	{
		AbstractScreen.call(this, 'mailbox', [
			require('View/App/MailBox/SystemDropDown'),
			require('View/App/MailBox/FolderList'),
			require('View/App/MailBox/MessageList'),
			require('View/App/MailBox/MessageView')
		]);

		this.oLastRoute = {};
	}

	_.extend(MailBoxAppScreen.prototype, AbstractScreen.prototype);

	/**
	 * @type {Object}
	 */
	MailBoxAppScreen.prototype.oLastRoute = {};

	MailBoxAppScreen.prototype.setNewTitle  = function ()
	{
		var
			sEmail = Data.accountEmail(),
			nFoldersInboxUnreadCount = Data.foldersInboxUnreadCount()
		;

		require('App/App').setTitle(('' === sEmail ? '' :
			(0 < nFoldersInboxUnreadCount ? '(' + nFoldersInboxUnreadCount + ') ' : ' ') + sEmail + ' - ') + Utils.i18n('TITLES/MAILBOX'));
	};

	MailBoxAppScreen.prototype.onShow = function ()
	{
		this.setNewTitle();
		Globals.keyScope(Enums.KeyState.MessageList);
	};

	/**
	 * @param {string} sFolderHash
	 * @param {number} iPage
	 * @param {string} sSearch
	 * @param {boolean=} bPreview = false
	 */
	MailBoxAppScreen.prototype.onRoute = function (sFolderHash, iPage, sSearch, bPreview)
	{
		if (Utils.isUnd(bPreview) ? false : !!bPreview)
		{
			if (Enums.Layout.NoPreview === Data.layout() && !Data.message())
			{
				require('App/App').historyBack();
			}
		}
		else
		{
			var
				sFolderFullNameRaw = Cache.getFolderFullNameRaw(sFolderHash),
				oFolder = Cache.getFolderFromCacheList(sFolderFullNameRaw)
			;

			if (oFolder)
			{
				Data
					.currentFolder(oFolder)
					.messageListPage(iPage)
					.messageListSearch(sSearch)
				;

				if (Enums.Layout.NoPreview === Data.layout() && Data.message())
				{
					Data.message(null);
				}

				require('App/App').reloadMessageList();
			}
		}
	};

	MailBoxAppScreen.prototype.onStart = function ()
	{
		var
			fResizeFunction = function () {
				Utils.windowResize();
			}
		;

		if (Settings.capa(Enums.Capa.AdditionalAccounts) || Settings.capa(Enums.Capa.AdditionalIdentities))
		{
			require('App/App').accountsAndIdentities();
		}

		_.delay(function () {
			if ('INBOX' !== Data.currentFolderFullNameRaw())
			{
				require('App/App').folderInformation('INBOX');
			}
		}, 1000);

		_.delay(function () {
			require('App/App').quota();
		}, 5000);

		_.delay(function () {
			Remote.appDelayStart(Utils.emptyFunction);
		}, 35000);

		Globals.$html.toggleClass('rl-no-preview-pane', Enums.Layout.NoPreview === Data.layout());

		Data.folderList.subscribe(fResizeFunction);
		Data.messageList.subscribe(fResizeFunction);
		Data.message.subscribe(fResizeFunction);

		Data.layout.subscribe(function (nValue) {
			Globals.$html.toggleClass('rl-no-preview-pane', Enums.Layout.NoPreview === nValue);
		});

		Events.sub('mailbox.inbox-unread-count', function (nCount) {
			Data.foldersInboxUnreadCount(nCount);
		});

		Data.foldersInboxUnreadCount.subscribe(function () {
			this.setNewTitle();
		}, this);
	};

	/**
	 * @return {Array}
	 */
	MailBoxAppScreen.prototype.routes = function ()
	{
		var
			fNormP = function () {
				return ['INBOX', 1, '', true];
			},
			fNormS = function (oRequest, oVals) {
				oVals[0] = Utils.pString(oVals[0]);
				oVals[1] = Utils.pInt(oVals[1]);
				oVals[1] = 0 >= oVals[1] ? 1 : oVals[1];
				oVals[2] = Utils.pString(oVals[2]);

				if ('' === oRequest)
				{
					oVals[0] = 'INBOX';
					oVals[1] = 1;
				}

				return [decodeURI(oVals[0]), oVals[1], decodeURI(oVals[2]), false];
			},
			fNormD = function (oRequest, oVals) {
				oVals[0] = Utils.pString(oVals[0]);
				oVals[1] = Utils.pString(oVals[1]);

				if ('' === oRequest)
				{
					oVals[0] = 'INBOX';
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

	module.exports = MailBoxAppScreen;

}());
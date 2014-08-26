/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		$html = require('$html'),

		Enums = require('Enums'),
		Globals = require('Globals'),
		Utils = require('Utils'),
		Events = require('Events'),

		KnoinAbstractScreen = require('KnoinAbstractScreen'),

		AppSettings = require('../Storages/AppSettings.js'),
		Data = require('../Storages/WebMailDataStorage.js'),
		Cache = require('../Storages/WebMailCacheStorage.js'),
		Remote = require('../Storages/WebMailAjaxRemoteStorage.js')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractScreen
	 */
	function MailBoxScreen()
	{
		var
			MailBoxSystemDropDownViewModel = require('../ViewModels/MailBoxSystemDropDownViewModel.js'),
			MailBoxFolderListViewModel = require('../ViewModels/MailBoxFolderListViewModel.js'),
			MailBoxMessageListViewModel = require('../ViewModels/MailBoxMessageListViewModel.js'),
			MailBoxMessageViewViewModel = require('../ViewModels/MailBoxMessageViewViewModel.js')
		;

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
			App = require('../Apps/RainLoopApp.js'),
			sEmail = Data.accountEmail(),
			nFoldersInboxUnreadCount = Data.foldersInboxUnreadCount()
		;

		App.setTitle(('' === sEmail ? '' :
			(0 < nFoldersInboxUnreadCount ? '(' + nFoldersInboxUnreadCount + ') ' : ' ') + sEmail + ' - ') + Utils.i18n('TITLES/MAILBOX'));
	};

	MailBoxScreen.prototype.onShow = function ()
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
	MailBoxScreen.prototype.onRoute = function (sFolderHash, iPage, sSearch, bPreview)
	{
		var App = require('../Apps/RainLoopApp.js');
		if (Utils.isUnd(bPreview) ? false : !!bPreview)
		{
			if (Enums.Layout.NoPreview === Data.layout() && !Data.message())
			{
				App.historyBack();
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

				App.reloadMessageList();
			}
		}
	};

	MailBoxScreen.prototype.onStart = function ()
	{
		var
			App = require('../Apps/RainLoopApp.js'),
			fResizeFunction = function () {
				Utils.windowResize();
			}
		;

		if (AppSettings.capa(Enums.Capa.AdditionalAccounts) || AppSettings.capa(Enums.Capa.AdditionalIdentities))
		{
			App.accountsAndIdentities();
		}

		_.delay(function () {
			if ('INBOX' !== Data.currentFolderFullNameRaw())
			{
				App.folderInformation('INBOX');
			}
		}, 1000);

		_.delay(function () {
			App.quota();
		}, 5000);

		_.delay(function () {
			Remote.appDelayStart(Utils.emptyFunction);
		}, 35000);

		$html.toggleClass('rl-no-preview-pane', Enums.Layout.NoPreview === Data.layout());

		Data.folderList.subscribe(fResizeFunction);
		Data.messageList.subscribe(fResizeFunction);
		Data.message.subscribe(fResizeFunction);

		Data.layout.subscribe(function (nValue) {
			$html.toggleClass('rl-no-preview-pane', Enums.Layout.NoPreview === nValue);
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

	module.exports = MailBoxScreen;

}(module, require));
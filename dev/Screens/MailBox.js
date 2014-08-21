/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		_ = require('../External/underscore.js'),
		$html = require('../External/$html.js'),
		
		Enums = require('../Common/Enums.js'),
		Utils = require('../Common/Utils.js'),

		KnoinAbstractScreen = require('../Knoin/KnoinAbstractScreen.js'),

		Cache = require('../Storages/WebMailCacheStorage.js'),
		Remote = require('../Storages/WebMailAjaxRemoteStorage.js'),

		MailBoxSystemDropDownViewModel = require('../ViewModels/MailBoxSystemDropDownViewModel.js'),
		MailBoxFolderListViewModel = require('../ViewModels/MailBoxFolderListViewModel.js'),
		MailBoxMessageListViewModel = require('../ViewModels/MailBoxMessageListViewModel.js'),
		MailBoxMessageViewViewModel = require('../ViewModels/MailBoxMessageViewViewModel.js')
	;

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
			sEmail = RL.data().accountEmail(), // TODO cjs
			ifoldersInboxUnreadCount = RL.data().foldersInboxUnreadCount() // TODO cjs
		;
 // TODO cjs
		RL.setTitle(('' === sEmail ? '' :
			(0 < ifoldersInboxUnreadCount ? '(' + ifoldersInboxUnreadCount + ') ' : ' ') + sEmail + ' - ') + Utils.i18n('TITLES/MAILBOX'));
	};

	MailBoxScreen.prototype.onShow = function ()
	{
		this.setNewTitle();
		RL.data().keyScope(Enums.KeyState.MessageList);// TODO cjs
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
			if (Enums.Layout.NoPreview === RL.data().layout() && !RL.data().message())// TODO cjs
			{
				RL.historyBack();// TODO cjs
			}
		}
		else
		{
			var
				oData = RL.data(),// TODO cjs
				sFolderFullNameRaw = Cache.getFolderFullNameRaw(sFolderHash),
				oFolder = Cache.getFolderFromCacheList(sFolderFullNameRaw)
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
				}

				RL.reloadMessageList();// TODO cjs
			}
		}
	};

	MailBoxScreen.prototype.onStart = function ()
	{
		var
			oData = RL.data(),// TODO cjs
			fResizeFunction = function () {
				Utils.windowResize();
			}
		;

		if (RL.capa(Enums.Capa.AdditionalAccounts) || RL.capa(Enums.Capa.AdditionalIdentities))// TODO cjs
		{
			RL.accountsAndIdentities();// TODO cjs
		}

		_.delay(function () {
			if ('INBOX' !== oData.currentFolderFullNameRaw())
			{
				RL.folderInformation('INBOX');// TODO cjs
			}
		}, 1000);

		_.delay(function () {
			RL.quota();// TODO cjs
		}, 5000);

		_.delay(function () {
			Remote.appDelayStart(Utils.emptyFunction);
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

}(module));
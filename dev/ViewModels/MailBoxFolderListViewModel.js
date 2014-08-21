/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		window = require('../External/window.js'),
		$ = require('../External/jquery.js'),
		ko = require('../External/ko.js'),
		key = require('../External/key.js'),
		$html = require('../External/$html.js'),
		
		Utils = require('../Common/Utils.js'),
		Enums = require('../Common/Enums.js'),
		LinkBuilder = require('../Common/LinkBuilder.js'),

		Cache = require('../Storages/WebMailCacheStorage.js'),

		kn = require('../Knoin/Knoin.js'),
		KnoinAbstractViewModel = require('../Knoin/KnoinAbstractViewModel.js')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function MailBoxFolderListViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Left', 'MailFolderList');

		var oData = RL.data();

		this.oContentVisible = null;
		this.oContentScrollable = null;

		this.messageList = oData.messageList;
		this.folderList = oData.folderList;
		this.folderListSystem = oData.folderListSystem;
		this.foldersChanging = oData.foldersChanging;

		this.leftPanelDisabled = oData.leftPanelDisabled;

		this.iDropOverTimer = 0;

		this.allowContacts = !!RL.settingsGet('ContactsIsAllowed');

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('MailBoxFolderListViewModel', MailBoxFolderListViewModel);

	MailBoxFolderListViewModel.prototype.onBuild = function (oDom)
	{
		this.oContentVisible = $('.b-content', oDom);
		this.oContentScrollable = $('.content', this.oContentVisible);

		var self = this;

		oDom
			.on('click', '.b-folders .e-item .e-link .e-collapsed-sign', function (oEvent) {

				var
					oFolder = ko.dataFor(this),
					bCollapsed = false
				;

				if (oFolder && oEvent)
				{
					bCollapsed = oFolder.collapsed();
					Utils.setExpandedFolder(oFolder.fullNameHash, bCollapsed);

					oFolder.collapsed(!bCollapsed);
					oEvent.preventDefault();
					oEvent.stopPropagation();
				}
			})
			.on('click', '.b-folders .e-item .e-link.selectable', function (oEvent) {

				oEvent.preventDefault();

				var
					oData = RL.data(),
					oFolder = ko.dataFor(this)
				;

				if (oFolder)
				{
					if (Enums.Layout.NoPreview === oData.layout())
					{
						oData.message(null);
					}

					if (oFolder.fullNameRaw === oData.currentFolderFullNameRaw())
					{
						Cache.setFolderHash(oFolder.fullNameRaw, '');
					}

					kn.setHash(LinkBuilder.mailBox(oFolder.fullNameHash));
				}
			})
		;

		key('up, down', Enums.KeyState.FolderList, function (event, handler) {

			var
				iIndex = -1,
				iKeyCode = handler && 'up' === handler.shortcut ? 38 : 40,
				$items = $('.b-folders .e-item .e-link:not(.hidden):visible', oDom)
			;

			if (event && $items.length)
			{
				iIndex = $items.index($items.filter('.focused'));
				if (-1 < iIndex)
				{
					$items.eq(iIndex).removeClass('focused');
				}

				if (iKeyCode === 38 && iIndex > 0)
				{
					iIndex--;
				}
				else if (iKeyCode === 40 && iIndex < $items.length - 1)
				{
					iIndex++;
				}

				$items.eq(iIndex).addClass('focused');
				self.scrollToFocused();
			}

			return false;
		});

		key('enter', Enums.KeyState.FolderList, function () {
			var $items = $('.b-folders .e-item .e-link:not(.hidden).focused', oDom);
			if ($items.length && $items[0])
			{
				self.folderList.focused(false);
				$items.click();
			}

			return false;
		});

		key('space', Enums.KeyState.FolderList, function () {
			var bCollapsed = true, oFolder = null, $items = $('.b-folders .e-item .e-link:not(.hidden).focused', oDom);
			if ($items.length && $items[0])
			{
				oFolder = ko.dataFor($items[0]);
				if (oFolder)
				{
					bCollapsed = oFolder.collapsed();
					Utils.setExpandedFolder(oFolder.fullNameHash, bCollapsed);
					oFolder.collapsed(!bCollapsed);
				}
			}

			return false;
		});

		key('esc, tab, shift+tab, right', Enums.KeyState.FolderList, function () {
			self.folderList.focused(false);
			return false;
		});

		self.folderList.focused.subscribe(function (bValue) {
			$('.b-folders .e-item .e-link.focused', oDom).removeClass('focused');
			if (bValue)
			{
				$('.b-folders .e-item .e-link.selected', oDom).addClass('focused');
			}
		});
	};

	MailBoxFolderListViewModel.prototype.messagesDropOver = function (oFolder)
	{
		window.clearTimeout(this.iDropOverTimer);
		if (oFolder && oFolder.collapsed())
		{
			this.iDropOverTimer = window.setTimeout(function () {
				oFolder.collapsed(false);
				Utils.setExpandedFolder(oFolder.fullNameHash, true);
				Utils.windowResize();
			}, 500);
		}
	};

	MailBoxFolderListViewModel.prototype.messagesDropOut = function ()
	{
		window.clearTimeout(this.iDropOverTimer);
	};

	MailBoxFolderListViewModel.prototype.scrollToFocused = function ()
	{
		if (!this.oContentVisible || !this.oContentScrollable)
		{
			return false;
		}

		var
			iOffset = 20,
			oFocused = $('.e-item .e-link.focused', this.oContentScrollable),
			oPos = oFocused.position(),
			iVisibleHeight = this.oContentVisible.height(),
			iFocusedHeight = oFocused.outerHeight()
		;

		if (oPos && (oPos.top < 0 || oPos.top + iFocusedHeight > iVisibleHeight))
		{
			if (oPos.top < 0)
			{
				this.oContentScrollable.scrollTop(this.oContentScrollable.scrollTop() + oPos.top - iOffset);
			}
			else
			{
				this.oContentScrollable.scrollTop(this.oContentScrollable.scrollTop() + oPos.top - iVisibleHeight + iFocusedHeight + iOffset);
			}

			return true;
		}

		return false;
	};

	/**
	 *
	 * @param {FolderModel} oToFolder
	 * @param {{helper:jQuery}} oUi
	 */
	MailBoxFolderListViewModel.prototype.messagesDrop = function (oToFolder, oUi)
	{
		if (oToFolder && oUi && oUi.helper)
		{
			var
				sFromFolderFullNameRaw = oUi.helper.data('rl-folder'),
				bCopy = $html.hasClass('rl-ctrl-key-pressed'),
				aUids = oUi.helper.data('rl-uids')
			;

			if (Utils.isNormal(sFromFolderFullNameRaw) && '' !== sFromFolderFullNameRaw && Utils.isArray(aUids))
			{
				RL.moveMessagesToFolder(sFromFolderFullNameRaw, aUids, oToFolder.fullNameRaw, bCopy);
			}
		}
	};

	MailBoxFolderListViewModel.prototype.composeClick = function ()
	{
		kn.showScreenPopup(PopupsComposeViewModel);
	};

	MailBoxFolderListViewModel.prototype.createFolder = function ()
	{
		kn.showScreenPopup(PopupsFolderCreateViewModel);
	};

	MailBoxFolderListViewModel.prototype.configureFolders = function ()
	{
		kn.setHash(LinkBuilder.settings('folders'));
	};

	MailBoxFolderListViewModel.prototype.contactsClick = function ()
	{
		if (this.allowContacts)
		{
			kn.showScreenPopup(PopupsContactsViewModel);
		}
	};

	module.exports = new MailBoxFolderListViewModel();

}(module));

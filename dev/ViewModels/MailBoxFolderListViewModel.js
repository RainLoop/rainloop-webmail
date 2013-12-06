/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function MailBoxFolderListViewModel()
{
	KnoinAbstractViewModel.call(this, 'Left', 'MailFolderList');
	
	this.folderList = RL.data().folderList;
	this.folderListSystem = RL.data().folderListSystem;
	
	this.iDropOverTimer = 0;

	this.allowContacts = !!RL.settingsGet('ContactsIsAllowed');
}

Utils.extendAsViewModel('MailBoxFolderListViewModel', MailBoxFolderListViewModel);

MailBoxFolderListViewModel.prototype.onBuild = function (oDom)
{
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

			var oFolder = ko.dataFor(this);
			if (oFolder)
			{
				if (!RL.data().usePreviewPane())
				{
					RL.data().message(null);
				}
				
				if (oFolder.fullNameRaw === RL.data().currentFolderFullNameRaw())
				{
					RL.cache().setFolderHash(oFolder.fullNameRaw, '');
				}

				kn.setHash(RL.link().mailBox(oFolder.fullNameHash));
			}
		})
	;
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
			aUids = oUi.helper.data('rl-uids')
		;

		if (MailBoxMessageListViewModel && MailBoxMessageListViewModel.__vm && Utils.isNormal(sFromFolderFullNameRaw) && Utils.isArray(aUids))
		{
			MailBoxMessageListViewModel.__vm.moveMessagesToFolder(
				sFromFolderFullNameRaw, aUids, oToFolder.fullNameRaw);
		}
	}
};

MailBoxFolderListViewModel.prototype.composeClick = function ()
{
	kn.showScreenPopup(PopupsComposeViewModel);
};

MailBoxFolderListViewModel.prototype.contactsClick = function ()
{
	if (this.allowContacts)
	{
		kn.showScreenPopup(PopupsContactsViewModel);
	}
};

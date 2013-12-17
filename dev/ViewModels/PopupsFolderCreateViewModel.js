/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsFolderCreateViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsFolderCreate');

	Utils.initOnStartOrLangChange(function () {
		this.sNoParentText = Utils.i18n('POPUPS_CREATE_FOLDER/SELECT_NO_PARENT');
	}, this);

	this.folderName = ko.observable('');
	this.focusTrigger = ko.observable(false);

	this.selectedParentValue = ko.observable(Consts.Values.UnuseOptionValue);

	this.parentFolderSelectList = ko.computed(function () {

		var
			oData = RL.data(),
			aTop = [],
			fDisableCallback = null,
			fVisibleCallback = null,
			aList = oData.folderList(),
			fRenameCallback = function (oItem) {
				return oItem ? (oItem.isSystemFolder() ? oItem.name() + ' ' + oItem.manageFolderSystemName() : oItem.name()) : '';
			}
		;

		aTop.push(['', this.sNoParentText]);
		
		if ('' !== oData.namespace)
		{
			fDisableCallback = function (oItem)
			{
				return oData.namespace !== oItem.fullNameRaw.substr(0, oData.namespace.length);
			};
		}

		return RL.folderListOptionsBuilder([], aList, [], aTop, null, fDisableCallback, fVisibleCallback, fRenameCallback);

	}, this);
	
	// commands
	this.createFolder = Utils.createCommand(this, function () {

		var 
			oData = RL.data(),
			sParentFolderName = this.selectedParentValue()
		;
		
		if ('' === sParentFolderName && 1 < oData.namespace.length)
		{
			sParentFolderName = oData.namespace.substr(0, oData.namespace.length - 1);
		}

		oData.foldersCreating(true);
		RL.remote().folderCreate(function (sResult, oData) {
			
			RL.data().foldersCreating(false);
			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				RL.folders();
			}
			else
			{
				RL.data().foldersListError(
					oData && oData.ErrorCode ? Utils.getNotification(oData.ErrorCode) : Utils.i18n('NOTIFICATIONS/CANT_CREATE_FOLDER'));
			}
			
		},	this.folderName(), sParentFolderName);
		
		this.cancelCommand();

	}, function () {
		return this.simpleFolderNameValidation(this.folderName());
	});

	this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsFolderCreateViewModel', PopupsFolderCreateViewModel);

PopupsFolderCreateViewModel.prototype.sNoParentText = '';

PopupsFolderCreateViewModel.prototype.simpleFolderNameValidation = function (sName)
{
	return (/^[^\\\/]+$/g).test(Utils.trim(sName));
};

PopupsFolderCreateViewModel.prototype.clearPopup = function ()
{
	this.folderName('');
	this.selectedParentValue('');
	this.focusTrigger(false);
};

PopupsFolderCreateViewModel.prototype.onShow = function ()
{
	this.clearPopup();
	this.focusTrigger(true);
};

PopupsFolderCreateViewModel.prototype.onBuild = function ()
{
	var self = this;
	$window.on('keydown', function (oEvent) {
		var bResult = true;
		if (oEvent && Enums.EventKeyCode.Esc === oEvent.keyCode && self.modalVisibility())
		{
			kn.delegateRun(self, 'cancelCommand');
			bResult = false;
		}
		return bResult;
	});
};

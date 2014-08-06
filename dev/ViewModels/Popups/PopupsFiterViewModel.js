/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsFilterViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsFilter');

	this.filter = ko.observable(null);

	this.selectedFolderValue = ko.observable(Consts.Values.UnuseOptionValue);
	this.folderSelectList = RL.data().folderMenuForMove;
	this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsFilterViewModel', PopupsFilterViewModel);

PopupsFilterViewModel.prototype.clearPopup = function ()
{

};

PopupsFilterViewModel.prototype.onShow = function (oFilter)
{
	this.clearPopup();

	this.filter(oFilter);
};

PopupsFilterViewModel.prototype.onFocus = function ()
{

};

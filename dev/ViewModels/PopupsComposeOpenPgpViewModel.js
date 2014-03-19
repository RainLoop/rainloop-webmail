/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsComposeOpenPgpViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsComposeOpenPgp');

	this.notification = ko.observable('');

	this.sign = ko.observable(true);
	this.encrypt = ko.observable(true);

	this.password = ko.observable('');
	this.password.focus = ko.observable(true);

	// commands
	this.doCommand = Utils.createCommand(this, function () {
	
		this.cancelCommand();

	}, function () {
		return '' === this.notification();
	});

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsComposeOpenPgpViewModel', PopupsComposeOpenPgpViewModel);

PopupsComposeOpenPgpViewModel.prototype.clearPopup = function ()
{
	this.notification('');

	this.password('');
	this.password.focus(false);
};

PopupsComposeOpenPgpViewModel.prototype.onHide = function ()
{
	this.clearPopup();
};

PopupsComposeOpenPgpViewModel.prototype.onShow = function (fCallback, sText, sFromEmail, sTo, sCc, sBcc)
{
	this.clearPopup();

	if ('' === sTo + sCc + sBcc)
	{
		this.notification('Please specify at least one recipient');
	}

	// TODO
};

PopupsComposeOpenPgpViewModel.prototype.onFocus = function ()
{
	if (this.sign())
	{
		this.password.focus(true);
	}
};

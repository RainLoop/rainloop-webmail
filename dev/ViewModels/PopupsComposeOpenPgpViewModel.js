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

	var
		oEmail = new EmailModel(),
		sResultFromEmail = '',
		aRec = []
	;

	if ('' === sTo + sCc + sBcc)
	{
		this.notification('Please specify at least one recipient');
		return false;
	}

	oEmail.clear();
	oEmail.mailsoParse(sFromEmail);
	if ('' === oEmail.email)
	{
		this.notification('Please specify From email address');
		return false;
	}
	else
	{
		sResultFromEmail = oEmail.email;
	}

	if ('' !== sTo)
	{
		aRec.push(sTo);
	}
	
	if ('' !== sCc)
	{
		aRec.push(sCc);
	}

	if ('' !== sBcc)
	{
		aRec.push(sBcc);
	}

	aRec = aRec.join(', ').split(',');
	aRec = _.compact(_.map(aRec, function (sValue) {
		oEmail.clear();
		oEmail.mailsoParse(Utils.trim(sValue));
		return '' === oEmail.email ? false : oEmail.email;
	}));

	if (0 === aRec.length)
	{
		this.notification('Please specify at least one recipient');
		return false;
	}

	window.console.log(sResultFromEmail);
	window.console.log(aRec);

	// TODO
};

PopupsComposeOpenPgpViewModel.prototype.onFocus = function ()
{
	if (this.sign())
	{
		this.password.focus(true);
	}
};

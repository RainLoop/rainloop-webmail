/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsAddOpenPgpKeyViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsAddOpenPgpKey');

	this.key = ko.observable('');
	this.key.error = ko.observable(false);
	this.key.focus = ko.observable(false);

	this.key.subscribe(function () {
		this.key.error(false);
	}, this);

	this.addOpenPgpKeyCommand = Utils.createCommand(this, function () {

		var
			sKey = Utils.trim(this.key()),
			oOpenpgpKeyring = RL.data().openpgpKeyring
		;

		this.key.error('' === sKey);
		
		if (!oOpenpgpKeyring || this.key.error())
		{
			return false;
		}

		oOpenpgpKeyring.importKey(sKey);
		oOpenpgpKeyring.store();

		RL.reloadOpenPgpKeys();
		Utils.delegateRun(this, 'cancelCommand');
		
		return true;
	});

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsAddOpenPgpKeyViewModel', PopupsAddOpenPgpKeyViewModel);

PopupsAddOpenPgpKeyViewModel.prototype.clearPopup = function ()
{
	this.key('');
	this.key.error(false);
};

PopupsAddOpenPgpKeyViewModel.prototype.onShow = function ()
{
	this.clearPopup();
};

PopupsAddOpenPgpKeyViewModel.prototype.onFocus = function ()
{
	this.key.focus(true);
};

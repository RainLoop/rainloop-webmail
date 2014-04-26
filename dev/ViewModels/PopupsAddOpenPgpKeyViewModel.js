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
			iCount = 30,
			aMatch = null,
			sKey = Utils.trim(this.key()),
			oReg = /[\-]{3,6}BEGIN PGP (PRIVATE|PUBLIC) KEY BLOCK[\-]{3,6}[\s\S]+[\-]{3,6}END PGP (PRIVATE|PUBLIC) KEY BLOCK[\-]{3,6}/gi,
			oOpenpgpKeyring = RL.data().openpgpKeyring
		;

		this.key.error('' === sKey);
		
		if (!oOpenpgpKeyring || this.key.error())
		{
			return false;
		}

		do
		{
			aMatch = oReg.exec(sKey);
			if (!aMatch || 0 > iCount)
			{
				break;
			}

			if (aMatch[0] && aMatch[1] && aMatch[2] && aMatch[1] === aMatch[2])
			{
				if ('PRIVATE' === aMatch[1])
				{
					oOpenpgpKeyring.privateKeys.importKey(aMatch[0]);
				}
				else if ('PUBLIC' === aMatch[1])
				{
					oOpenpgpKeyring.publicKeys.importKey(aMatch[0]);
				}
			}

			iCount--;
		}
		while (true);

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

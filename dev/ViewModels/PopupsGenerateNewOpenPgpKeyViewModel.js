/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsGenerateNewOpenPgpKeyViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsGenerateNewOpenPgpKey');

	this.email = ko.observable('');
	this.email.focus = ko.observable('');
	this.email.error = ko.observable(false);
	
	this.name = ko.observable('');
	this.password = ko.observable('');
	this.keyBitLength = ko.observable(2048);

	this.submitRequest = ko.observable(false);

	this.email.subscribe(function () {
		this.email.error(false);
	}, this);

	this.generateOpenPgpKeyCommand = Utils.createCommand(this, function () {

		var
			self = this,
			sUserID = '',
			mKeyPair = null,
			oOpenpgpKeyring = RL.data().openpgpKeyring
		;

		this.email.error('' === Utils.trim(this.email()));
		if (!oOpenpgpKeyring || this.email.error())
		{
			return false;
		}

		sUserID = this.email();
		if ('' !== this.name())
		{
			sUserID = this.name() + ' <' + sUserID + '>';
		}

		this.submitRequest(true);

		_.delay(function () {
			mKeyPair = window.openpgp.generateKeyPair(1, Utils.pInt(self.keyBitLength()), sUserID, Utils.trim(self.password()));
			if (mKeyPair && mKeyPair.privateKeyArmored)
			{
				oOpenpgpKeyring.importKey(mKeyPair.privateKeyArmored);
				oOpenpgpKeyring.importKey(mKeyPair.publicKeyArmored);

				oOpenpgpKeyring.store();

				RL.reloadOpenPgpKeys();
				Utils.delegateRun(self, 'cancelCommand');
			}

			self.submitRequest(false);
		}, 100);

		return true;
	});

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsGenerateNewOpenPgpKeyViewModel', PopupsGenerateNewOpenPgpKeyViewModel);

PopupsGenerateNewOpenPgpKeyViewModel.prototype.clearPopup = function ()
{
	this.name('');
	this.password('');
	
	this.email('');
	this.email.error(false);
	this.keyBitLength(2048);
};

PopupsGenerateNewOpenPgpKeyViewModel.prototype.onShow = function ()
{
	this.clearPopup();
};

PopupsGenerateNewOpenPgpKeyViewModel.prototype.onFocus = function ()
{
	this.email.focus(true);
};

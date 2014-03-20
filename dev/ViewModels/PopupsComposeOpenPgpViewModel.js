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

	this.from = ko.observable('');
	this.to = ko.observableArray([]);
	this.text = ko.observable('');

	this.resultCallback = null;
	
	this.submitRequest = ko.observable(false);

	// commands
	this.doCommand = Utils.createCommand(this, function () {

		var
			self = this,
			bResult = true,
			aOpenpgpkeysPublic = RL.data().openpgpkeysPublic(),
			oKey = null,
			oPrivateKey = null,
			aPublicKeys = [],
			fFindPublicKey = function (sEmail) {
				
				var
					oResult = null,
					oKey = _.find(aOpenpgpkeysPublic, function (oItem) {
						return oItem && sEmail === oItem.email;
					})
				;

				if (oKey)
				{
					try
					{
						oResult = window.openpgp.key.readArmored(oKey.armor);
						if (oResult && !oResult.err && oResult.keys && oResult.keys[0])
						{
							oResult = oResult.keys[0];
						}
						else
						{
							oResult = null;
						}
					}
					catch (e)
					{
						oResult = null;
					}
				}

				return oResult;
			}
		;

		this.submitRequest(true);

		if (bResult && this.sign() && '' === this.from())
		{
			this.notification('Please specify From email address');
			bResult = false;
		}

		if (bResult && this.sign())
		{
			oKey = _.find(RL.data().openpgpkeysPrivate(), function (oItem) {
				return oItem && self.from() === oItem.email;
			});

			if (oKey)
			{
				try
				{
					oPrivateKey = window.openpgp.key.readArmored(oKey.armor);
					if (oPrivateKey && !oPrivateKey.err && oPrivateKey.keys && oPrivateKey.keys[0])
					{
						oPrivateKey = oPrivateKey.keys[0];
						oPrivateKey.decrypt(this.password());
					}
					else
					{
						oPrivateKey = null;
					}
				}
				catch (e)
				{
					oPrivateKey = null;
				}
			}

			if (!oPrivateKey)
			{
				this.notification('No private key found for "' + this.from() + '" email');
				bResult = false;
			}
		}

		if (bResult && this.encrypt() && 0 === this.to().length)
		{
			this.notification('Please specify at least one recipient');
			bResult = false;
		}

		if (bResult && this.encrypt())
		{
			aPublicKeys = _.compact(_.map(this.to(), function (sEmail) {
				var oKey = fFindPublicKey(sEmail);
				if (!oKey && bResult)
				{
					self.notification('No public key found for "' + sEmail + '" email');
					bResult = false;
				}
				
				return oKey;
				
			}));

			if (0 === aPublicKeys.length || this.to().length !== aPublicKeys.length)
			{
				bResult = false;
			}
		}

		_.delay(function () {

			if (self.resultCallback && bResult)
			{
				try {

					if (oPrivateKey && 0 === aPublicKeys.length)
					{
						self.resultCallback(
							window.openpgp.signClearMessage([oPrivateKey], self.text())
						);
					}
					else if (oPrivateKey && 0 < aPublicKeys.length)
					{
						self.resultCallback(
							window.openpgp.signAndEncryptMessage(aPublicKeys, oPrivateKey, self.text())
						);
					}
					else if (!oPrivateKey && 0 < aPublicKeys.length)
					{
						self.resultCallback(
							window.openpgp.encryptMessage(aPublicKeys, self.text())
						);
					}
				}
				catch (e)
				{
					self.notification('OpenPGP error: ' + e);
					bResult = false;
				}
			}

			if (bResult)
			{
				self.cancelCommand();
			}

			self.submitRequest(false);

		}, 10);

	}, function () {
		return !this.submitRequest() &&	(this.sign() || this.encrypt());
	});

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsComposeOpenPgpViewModel', PopupsComposeOpenPgpViewModel);

PopupsComposeOpenPgpViewModel.prototype.clearPopup = function ()
{
	this.notification('');

	this.password('');
	this.password.focus(false);

	this.from('');
	this.to([]);
	this.text('');

	this.submitRequest(false);

	this.resultCallback = null;
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

	this.resultCallback = fCallback;

	oEmail.clear();
	oEmail.mailsoParse(sFromEmail);
	if ('' !== oEmail.email)
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

	this.from(sResultFromEmail);
	this.to(aRec);
	this.text(sText);
};

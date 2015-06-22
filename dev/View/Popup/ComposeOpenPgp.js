
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),
		key = require('key'),

		Utils = require('Common/Utils'),
		Enums = require('Common/Enums'),
		Translator = require('Common/Translator'),

		PgpStore = require('Stores/User/Pgp'),

		EmailModel = require('Model/Email'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function ComposeOpenPgpPopupView()
	{
		AbstractView.call(this, 'Popups', 'PopupsComposeOpenPgp');

		this.notification = ko.observable('');

		this.sign = ko.observable(true);
		this.encrypt = ko.observable(true);

		this.password = ko.observable('');
		this.password.focus = ko.observable(false);
		this.buttonFocus = ko.observable(false);

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
				oPrivateKey = null,
				aPublicKeys = []
			;

			this.submitRequest(true);

			if (bResult && this.sign() && '' === this.from())
			{
				this.notification(Translator.i18n('PGP_NOTIFICATIONS/SPECIFY_FROM_EMAIL'));
				bResult = false;
			}

			if (bResult && this.sign())
			{
				oPrivateKey = PgpStore.findPrivateKeyByEmail(this.from(), this.password());
				if (!oPrivateKey)
				{
					this.notification(Translator.i18n('PGP_NOTIFICATIONS/NO_PRIVATE_KEY_FOUND_FOR', {
						'EMAIL': this.from()
					}));

					bResult = false;
				}
			}

			if (bResult && this.encrypt() && 0 === this.to().length)
			{
				this.notification(Translator.i18n('PGP_NOTIFICATIONS/SPECIFY_AT_LEAST_ONE_RECIPIENT'));
				bResult = false;
			}

			if (bResult && this.encrypt())
			{
				aPublicKeys = [];
				_.each(this.to(), function (sEmail) {
					var aKeys = PgpStore.findPublicKeysByEmail(sEmail);
					if (0 === aKeys.length && bResult)
					{
						self.notification(Translator.i18n('PGP_NOTIFICATIONS/NO_PUBLIC_KEYS_FOUND_FOR', {
							'EMAIL': sEmail
						}));

						bResult = false;
					}

					aPublicKeys = aPublicKeys.concat(aKeys);
				});

				if (bResult && (0 === aPublicKeys.length || this.to().length !== aPublicKeys.length))
				{
					bResult = false;
				}
			}

			_.delay(function () {

				if (self.resultCallback && bResult)
				{
					var oPromise = null;
					try
					{
						if (oPrivateKey && 0 === aPublicKeys.length)
						{
							oPromise = PgpStore.openpgp.signClearMessage([oPrivateKey], self.text());
						}
						else if (oPrivateKey && 0 < aPublicKeys.length)
						{
							oPromise = PgpStore.openpgp.signAndEncryptMessage(aPublicKeys, oPrivateKey, self.text());
						}
						else if (!oPrivateKey && 0 < aPublicKeys.length)
						{
							oPromise = PgpStore.openpgp.encryptMessage(aPublicKeys, self.text());
						}
					}
					catch (e)
					{
						self.notification(Translator.i18n('PGP_NOTIFICATIONS/PGP_ERROR', {
							'ERROR': '' + e
						}));
					}

					if (oPromise)
					{
						try
						{
							oPromise.then(function (mData) {

								self.resultCallback(mData);
								self.cancelCommand();

							})['catch'](function (e) {
								self.notification(Translator.i18n('PGP_NOTIFICATIONS/PGP_ERROR', {
									'ERROR': '' + e
								}));
							});
						}
						catch (e)
						{
							self.notification(Translator.i18n('PGP_NOTIFICATIONS/PGP_ERROR', {
								'ERROR': '' + e
							}));
						}
					}
				}

				self.submitRequest(false);

			}, 10);

		}, function () {
			return !this.submitRequest() &&	(this.sign() || this.encrypt());
		});

		this.sDefaultKeyScope = Enums.KeyState.PopupComposeOpenPGP;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/ComposeOpenPgp', 'PopupsComposeOpenPgpViewModel'], ComposeOpenPgpPopupView);
	_.extend(ComposeOpenPgpPopupView.prototype, AbstractView.prototype);

	ComposeOpenPgpPopupView.prototype.clearPopup = function ()
	{
		this.notification('');

		this.password('');
		this.password.focus(false);
		this.buttonFocus(false);

		this.from('');
		this.to([]);
		this.text('');

		this.submitRequest(false);

		this.resultCallback = null;
	};

	ComposeOpenPgpPopupView.prototype.onBuild = function ()
	{
		key('tab,shift+tab', Enums.KeyState.PopupComposeOpenPGP, _.bind(function () {

			switch (true)
			{
				case this.password.focus():
					this.buttonFocus(true);
					break;
				case this.buttonFocus():
					this.password.focus(true);
					break;
			}

			return false;

		}, this));
	};

	ComposeOpenPgpPopupView.prototype.onHideWithDelay = function ()
	{
		this.clearPopup();
	};

	ComposeOpenPgpPopupView.prototype.onShowWithDelay = function ()
	{
		if (this.sign())
		{
			this.password.focus(true);
		}
		else
		{
			this.buttonFocus(true);
		}
	};

	ComposeOpenPgpPopupView.prototype.onShow = function (fCallback, sText, oIdentity, sTo, sCc, sBcc)
	{
		this.clearPopup();

		var
			aRec = [],
			oEmail = new EmailModel()
		;

		this.resultCallback = fCallback;

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

		this.from(oIdentity ? oIdentity.email() : '');
		this.to(aRec);
		this.text(sText);
	};

	module.exports = ComposeOpenPgpPopupView;

}());
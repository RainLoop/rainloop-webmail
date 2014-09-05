
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Common/Utils'),

		Data = require('Storage:RainLoop:Data'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsNewOpenPgpKeyViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsNewOpenPgpKey');

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
				oOpenpgpKeyring = Data.openpgpKeyring
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
	//			mKeyPair = Data.openpgp.generateKeyPair(1, Utils.pInt(self.keyBitLength()), sUserID, Utils.trim(self.password()));
				mKeyPair = Data.openpgp.generateKeyPair({
					'userId': sUserID,
					'numBits': Utils.pInt(self.keyBitLength()),
					'passphrase': Utils.trim(self.password())
				});

				if (mKeyPair && mKeyPair.privateKeyArmored)
				{
					oOpenpgpKeyring.privateKeys.importKey(mKeyPair.privateKeyArmored);
					oOpenpgpKeyring.publicKeys.importKey(mKeyPair.publicKeyArmored);
					oOpenpgpKeyring.store();

					require('App:RainLoop').reloadOpenPgpKeys();
					Utils.delegateRun(self, 'cancelCommand');
				}

				self.submitRequest(false);
			}, 100);

			return true;
		});

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Popup:NewOpenPgpKey', 'PopupsNewOpenPgpKeyViewModel'], PopupsNewOpenPgpKeyViewModel);
	_.extend(PopupsNewOpenPgpKeyViewModel.prototype, KnoinAbstractViewModel.prototype);

	PopupsNewOpenPgpKeyViewModel.prototype.clearPopup = function ()
	{
		this.name('');
		this.password('');

		this.email('');
		this.email.error(false);
		this.keyBitLength(2048);
	};

	PopupsNewOpenPgpKeyViewModel.prototype.onShow = function ()
	{
		this.clearPopup();
	};

	PopupsNewOpenPgpKeyViewModel.prototype.onFocus = function ()
	{
		this.email.focus(true);
	};

	module.exports = PopupsNewOpenPgpKeyViewModel;

}());
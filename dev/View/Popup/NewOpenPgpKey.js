
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Common/Utils'),

		PgpStore = require('Stores/User/Pgp'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function NewOpenPgpKeyPopupView()
	{
		AbstractView.call(this, 'Popups', 'PopupsNewOpenPgpKey');

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
				oOpenpgpKeyring = PgpStore.openpgpKeyring
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

				mKeyPair = false;
				try {
					mKeyPair = PgpStore.openpgp.generateKeyPair({
						'userId': sUserID,
						'numBits': Utils.pInt(self.keyBitLength()),
						'passphrase': Utils.trim(self.password())
					});
				} catch (e) {
//					window.console.log(e);
				}

				if (mKeyPair && mKeyPair.privateKeyArmored)
				{
					oOpenpgpKeyring.privateKeys.importKey(mKeyPair.privateKeyArmored);
					oOpenpgpKeyring.publicKeys.importKey(mKeyPair.publicKeyArmored);
					oOpenpgpKeyring.store();

					require('App/User').reloadOpenPgpKeys();
					Utils.delegateRun(self, 'cancelCommand');
				}

				self.submitRequest(false);
				
			}, 100);

			return true;
		});

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/NewOpenPgpKey', 'PopupsNewOpenPgpKeyViewModel'], NewOpenPgpKeyPopupView);
	_.extend(NewOpenPgpKeyPopupView.prototype, AbstractView.prototype);

	NewOpenPgpKeyPopupView.prototype.clearPopup = function ()
	{
		this.name('');
		this.password('');

		this.email('');
		this.email.error(false);
		this.keyBitLength(2048);
	};

	NewOpenPgpKeyPopupView.prototype.onShow = function ()
	{
		this.clearPopup();
	};

	NewOpenPgpKeyPopupView.prototype.onShowWithDelay = function ()
	{
		this.email.focus(true);
	};

	module.exports = NewOpenPgpKeyPopupView;

}());
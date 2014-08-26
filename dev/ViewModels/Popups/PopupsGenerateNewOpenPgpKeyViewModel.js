/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Utils'),

		Data = require('../../Storages/WebMailDataStorage.js'),

		kn = require('kn'),
		KnoinAbstractViewModel = require('KnoinAbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsGenerateNewOpenPgpKeyViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsGenerateNewOpenPgpKey');

		var App = require('../../Apps/RainLoopApp.js');

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
	//			mKeyPair = window.openpgp.generateKeyPair(1, Utils.pInt(self.keyBitLength()), sUserID, Utils.trim(self.password()));
				mKeyPair = window.openpgp.generateKeyPair({
					'userId': sUserID,
					'numBits': Utils.pInt(self.keyBitLength()),
					'passphrase': Utils.trim(self.password())
				});

				if (mKeyPair && mKeyPair.privateKeyArmored)
				{
					oOpenpgpKeyring.privateKeys.importKey(mKeyPair.privateKeyArmored);
					oOpenpgpKeyring.publicKeys.importKey(mKeyPair.publicKeyArmored);
					oOpenpgpKeyring.store();

					App.reloadOpenPgpKeys();
					Utils.delegateRun(self, 'cancelCommand');
				}

				self.submitRequest(false);
			}, 100);

			return true;
		});

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('PopupsGenerateNewOpenPgpKeyViewModel', PopupsGenerateNewOpenPgpKeyViewModel);

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

	module.exports = PopupsGenerateNewOpenPgpKeyViewModel;

}(module, require));
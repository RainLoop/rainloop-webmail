/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */
'use strict';

(function (module) {

	var
		ko = require('../External/ko.js'),

		kn = require('../Knoin/Knoin.js'),

		Data = require('../Storages/WebMailDataStorage.js'),

		PopupsAddOpenPgpKeyViewModel = require('../ViewModels/Popups/PopupsAddOpenPgpKeyViewModel.js'),
		PopupsGenerateNewOpenPgpKeyViewModel = require('../ViewModels/Popups/PopupsGenerateNewOpenPgpKeyViewModel.js'),
		PopupsViewOpenPgpKeyViewModel = require('../ViewModels/Popups/PopupsViewOpenPgpKeyViewModel.js')
	;

	/**
	 * @constructor
	 */
	function SettingsOpenPGP()
	{
		this.openpgpkeys = Data.openpgpkeys;
		this.openpgpkeysPublic = Data.openpgpkeysPublic;
		this.openpgpkeysPrivate = Data.openpgpkeysPrivate;

		this.openPgpKeyForDeletion = ko.observable(null).extend({'falseTimeout': 3000}).extend({'toggleSubscribe': [this,
			function (oPrev) {
				if (oPrev)
				{
					oPrev.deleteAccess(false);
				}
			}, function (oNext) {
				if (oNext)
				{
					oNext.deleteAccess(true);
				}
			}
		]});
	}

	SettingsOpenPGP.prototype.addOpenPgpKey = function ()
	{
		kn.showScreenPopup(PopupsAddOpenPgpKeyViewModel);
	};

	SettingsOpenPGP.prototype.generateOpenPgpKey = function ()
	{
		kn.showScreenPopup(PopupsGenerateNewOpenPgpKeyViewModel);
	};

	SettingsOpenPGP.prototype.viewOpenPgpKey = function (oOpenPgpKey)
	{
		if (oOpenPgpKey)
		{
			kn.showScreenPopup(PopupsViewOpenPgpKeyViewModel, [oOpenPgpKey]);
		}
	};

	/**
	 * @param {OpenPgpKeyModel} oOpenPgpKeyToRemove
	 */
	SettingsOpenPGP.prototype.deleteOpenPgpKey = function (oOpenPgpKeyToRemove)
	{
		if (oOpenPgpKeyToRemove && oOpenPgpKeyToRemove.deleteAccess())
		{
			this.openPgpKeyForDeletion(null);

			if (oOpenPgpKeyToRemove && Data.openpgpKeyring)
			{
				this.openpgpkeys.remove(function (oOpenPgpKey) {
					return oOpenPgpKeyToRemove === oOpenPgpKey;
				});

				Data.openpgpKeyring[oOpenPgpKeyToRemove.isPrivate ? 'privateKeys' : 'publicKeys']
					.removeForId(oOpenPgpKeyToRemove.guid);

				Data.openpgpKeyring.store();

				var RL = require('../Boots/RainLoopApp.js');
				RL.reloadOpenPgpKeys();
			}
		}
	};

	module.exports = SettingsOpenPGP;

}(module));
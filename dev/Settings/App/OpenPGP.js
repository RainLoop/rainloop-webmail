
(function () {

	'use strict';

	var
		ko = require('ko'),

		kn = require('Knoin/Knoin'),

		Data = require('Storage/App/Data')
	;

	/**
	 * @constructor
	 */
	function OpenPGPAppSetting()
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

	OpenPGPAppSetting.prototype.addOpenPgpKey = function ()
	{
		kn.showScreenPopup(require('View/Popup/AddOpenPgpKey'));
	};

	OpenPGPAppSetting.prototype.generateOpenPgpKey = function ()
	{
		kn.showScreenPopup(require('View/Popup/NewOpenPgpKey'));
	};

	OpenPGPAppSetting.prototype.viewOpenPgpKey = function (oOpenPgpKey)
	{
		if (oOpenPgpKey)
		{
			kn.showScreenPopup(require('View/Popup/ViewOpenPgpKey'), [oOpenPgpKey]);
		}
	};

	/**
	 * @param {OpenPgpKeyModel} oOpenPgpKeyToRemove
	 */
	OpenPGPAppSetting.prototype.deleteOpenPgpKey = function (oOpenPgpKeyToRemove)
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

				require('App/App').reloadOpenPgpKeys();
			}
		}
	};

	module.exports = OpenPGPAppSetting;

}());
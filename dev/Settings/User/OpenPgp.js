
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Common/Utils'),

		kn = require('Knoin/Knoin'),

		Data = require('Storage/User/Data')
	;

	/**
	 * @constructor
	 */
	function OpenPgpUserSettings()
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

	OpenPgpUserSettings.prototype.addOpenPgpKey = function ()
	{
		kn.showScreenPopup(require('View/Popup/AddOpenPgpKey'));
	};

	OpenPgpUserSettings.prototype.generateOpenPgpKey = function ()
	{
		kn.showScreenPopup(require('View/Popup/NewOpenPgpKey'));
	};

	OpenPgpUserSettings.prototype.viewOpenPgpKey = function (oOpenPgpKey)
	{
		if (oOpenPgpKey)
		{
			kn.showScreenPopup(require('View/Popup/ViewOpenPgpKey'), [oOpenPgpKey]);
		}
	};

	/**
	 * @param {OpenPgpKeyModel} oOpenPgpKeyToRemove
	 */
	OpenPgpUserSettings.prototype.deleteOpenPgpKey = function (oOpenPgpKeyToRemove)
	{
		if (oOpenPgpKeyToRemove && oOpenPgpKeyToRemove.deleteAccess())
		{
			this.openPgpKeyForDeletion(null);

			if (oOpenPgpKeyToRemove && Data.openpgpKeyring)
			{
				var oFindedItem = _.find(this.openpgpkeys(), function (oOpenPgpKey) {
					return oOpenPgpKeyToRemove === oOpenPgpKey;
				});

				if (oFindedItem)
				{
					this.openpgpkeys.remove(oFindedItem);
					Utils.delegateRunOnDestroy(oFindedItem);

					Data.openpgpKeyring[oFindedItem.isPrivate ? 'privateKeys' : 'publicKeys']
						.removeForId(oFindedItem.guid);

					Data.openpgpKeyring.store();
				}

				require('App/User').reloadOpenPgpKeys();
			}
		}
	};

	module.exports = OpenPgpUserSettings;

}());
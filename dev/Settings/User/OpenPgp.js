
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),
		window = require('window'),

		Utils = require('Common/Utils'),

		kn = require('Knoin/Knoin'),

		PgpStore = require('Stores/User/Pgp')
	;

	/**
	 * @constructor
	 */
	function OpenPgpUserSettings()
	{
		this.openpgpkeys = PgpStore.openpgpkeys;
		this.openpgpkeysPublic = PgpStore.openpgpkeysPublic;
		this.openpgpkeysPrivate = PgpStore.openpgpkeysPrivate;

		this.openPgpKeyForDeletion = ko.observable(null).deleteAccessHelper();

		this.isHttps = window.document && window.document.location ? 'https:' === window.document.location.protocol : false;
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

			if (oOpenPgpKeyToRemove && PgpStore.openpgpKeyring)
			{
				var oFindedItem = _.find(PgpStore.openpgpkeys(), function (oOpenPgpKey) {
					return oOpenPgpKeyToRemove === oOpenPgpKey;
				});

				if (oFindedItem)
				{
					PgpStore.openpgpkeys.remove(oFindedItem);
					Utils.delegateRunOnDestroy(oFindedItem);

					PgpStore.openpgpKeyring[oFindedItem.isPrivate ? 'privateKeys' : 'publicKeys']
						.removeForId(oFindedItem.guid);

					PgpStore.openpgpKeyring.store();
				}

				require('App/User').reloadOpenPgpKeys();
			}
		}
	};

	module.exports = OpenPgpUserSettings;

}());
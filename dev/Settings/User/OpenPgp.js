
import _ from '_';
import ko from 'ko';

import {delegateRunOnDestroy} from 'Common/Utils';
import {bIsHttps} from 'Common/Globals';

import PgpStore from 'Stores/User/Pgp';

import {getApp} from 'Helper/Apps/User';

import {showScreenPopup} from 'Knoin/Knoin';

class OpenPgpUserSettings
{
	constructor() {
		this.openpgpkeys = PgpStore.openpgpkeys;
		this.openpgpkeysPublic = PgpStore.openpgpkeysPublic;
		this.openpgpkeysPrivate = PgpStore.openpgpkeysPrivate;

		this.openPgpKeyForDeletion = ko.observable(null).deleteAccessHelper();

		this.isHttps = bIsHttps;
	}

	addOpenPgpKey() {
		showScreenPopup(require('View/Popup/AddOpenPgpKey'));
	}

	generateOpenPgpKey() {
		showScreenPopup(require('View/Popup/NewOpenPgpKey'));
	}

	viewOpenPgpKey(openPgpKey) {
		if (openPgpKey)
		{
			showScreenPopup(require('View/Popup/ViewOpenPgpKey'), [openPgpKey]);
		}
	}

	/**
	 * @param {OpenPgpKeyModel} openPgpKeyToRemove
	 * @returns {void}
	 */
	deleteOpenPgpKey(openPgpKeyToRemove) {
		if (openPgpKeyToRemove && openPgpKeyToRemove.deleteAccess())
		{
			this.openPgpKeyForDeletion(null);

			if (openPgpKeyToRemove && PgpStore.openpgpKeyring)
			{
				const findedItem = _.find(PgpStore.openpgpkeys(), (key) => openPgpKeyToRemove === key);
				if (findedItem)
				{
					PgpStore.openpgpkeys.remove(findedItem);
					delegateRunOnDestroy(findedItem);

					PgpStore
						.openpgpKeyring[findedItem.isPrivate ? 'privateKeys' : 'publicKeys']
						.removeForId(findedItem.guid);

					PgpStore.openpgpKeyring.store();
				}

				getApp().reloadOpenPgpKeys();
			}
		}
	}
}

export {OpenPgpUserSettings, OpenPgpUserSettings as default};

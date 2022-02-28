import { AbstractFetchRemote } from 'Remote/AbstractFetch';

class RemoteAdminFetch extends AbstractFetchRemote {

	/**
	 * @param {?Function} fCallback
	 * @param {?} oData
	 */
	saveConfig(oData, fCallback) {
		this.request('AdminSettingsUpdate', fCallback, oData);
	}

	/**
	 * @param {string} key
	 * @param {?scalar} value
	 * @param {?Function} fCallback
	 */
	saveSetting(key, value, fCallback) {
		this.saveConfig({[key]: value}, fCallback);
	}

}

export default new RemoteAdminFetch();

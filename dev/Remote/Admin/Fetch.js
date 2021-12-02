import { AbstractFetchRemote } from 'Remote/AbstractFetch';

class RemoteAdminFetch extends AbstractFetchRemote {

	/**
	 * @param {?Function} fCallback
	 * @param {?} oData
	 */
	saveAdminConfig(fCallback, oData) {
		this.request('AdminSettingsUpdate', fCallback, oData);
	}

}

export default new RemoteAdminFetch();

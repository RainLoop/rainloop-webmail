import { pString, pInt, b64EncodeJSONSafe } from 'Common/Utils';

import {
	getFolderFromCacheList
} from 'Common/Cache';

import { SettingsGet } from 'Common/Globals';
import { SUB_QUERY_PREFIX } from 'Common/Links';

import { AppUserStore } from 'Stores/User/App';
import { SettingsUserStore } from 'Stores/User/Settings';

import { AbstractFetchRemote } from 'Remote/AbstractFetch';

class RemoteUserFetch extends AbstractFetchRemote {

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullName
	 * @param {number} iUid
	 * @returns {boolean}
	 */
	message(fCallback, sFolderFullName, iUid) {
		sFolderFullName = pString(sFolderFullName);
		iUid = pInt(iUid);

		if (getFolderFromCacheList(sFolderFullName) && 0 < iUid) {
			this.abort('Message').request('Message',
				fCallback,
				{},
				null,
				'Message/' +
					SUB_QUERY_PREFIX +
					'/' +
					b64EncodeJSONSafe([
						sFolderFullName,
						iUid,
						AppUserStore.threadsAllowed() && SettingsUserStore.useThreads() ? 1 : 0,
						SettingsGet('AccountHash')
					])
			);

			return true;
		}

		return false;
	}

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oData
	 */
	saveSettings(fCallback, oData) {
		this.request('SettingsUpdate', fCallback, oData);
	}

	/**
	 * @param {string} key
	 * @param {?scalar} value
	 * @param {?Function} fCallback
	 */
	saveSetting(key, value, fCallback) {
		this.saveSettings(fCallback, {
			[key]: value
		});
	}

/*
	folderMove(sPrevFolderFullName, sNewFolderFullName, bSubscribe) {
		return this.post('FolderMove', FolderUserStore.foldersRenaming, {
			Folder: sPrevFolderFullName,
			NewFolder: sNewFolderFullName,
			Subscribe: bSubscribe ? 1 : 0
		});
	}
*/
}

export default new RemoteUserFetch();


import {_} from 'common';
import {CookieDriver} from 'Common/ClientStorageDriver/Cookie';
import {LocalStorageDriver} from 'Common/ClientStorageDriver/LocalStorage';

class ClientStorage
{
	constructor() {
		const SupportedStorageDriver = _.find([LocalStorageDriver, CookieDriver],
			(StorageDriver) => StorageDriver && StorageDriver.supported());
		this.driver = SupportedStorageDriver ? new SupportedStorageDriver() : null;
	}

	/**
	 * @param {number} key
	 * @param {*} data
	 * @return {boolean}
	 */
	set(key, data) {
		return this.driver ? this.driver.set('p' + key, data) : false;
	}

	/**
	 * @param {number} key
	 * @return {*}
	 */
	get(key) {
		return this.driver ? this.driver.get('p' + key) : null;
	}
}

module.exports = new ClientStorage();

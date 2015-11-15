
import {_} from 'common';
import {Cookie} from 'Common/ClientStorageDriver/Cookie';
import {LocalStorage} from 'Common/ClientStorageDriver/LocalStorage';

class ClientStorage
{
	constructor() {
		const SupportedStorageDriver = _.find([LocalStorage, Cookie], (StorageDriver) => StorageDriver && StorageDriver.supported());
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

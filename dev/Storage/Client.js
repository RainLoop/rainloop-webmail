import _ from '_';
import { CookieDriver } from 'Common/ClientStorageDriver/Cookie';
import { LocalStorageDriver } from 'Common/ClientStorageDriver/LocalStorage';

const SupportedStorageDriver = _.find(
	[LocalStorageDriver, CookieDriver],
	(StorageDriver) => StorageDriver && StorageDriver.supported()
);

const driver = SupportedStorageDriver ? new SupportedStorageDriver() : null;

/**
 * @param {number} key
 * @param {*} data
 * @returns {boolean}
 */
export function set(key, data) {
	return driver ? driver.set('p' + key, data) : false;
}

/**
 * @param {number} key
 * @returns {*}
 */
export function get(key) {
	return driver ? driver.get('p' + key) : null;
}

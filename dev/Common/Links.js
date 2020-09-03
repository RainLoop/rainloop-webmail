import { pString, pInt } from 'Common/Utils';
import * as Settings from 'Storage/Settings';

const ROOT = './',
	HASH_PREFIX = '#/',
	SERVER_PREFIX = './?',
	SUB_QUERY_PREFIX = '&q[]=',
	VERSION = Settings.appSettingsGet('version'),
	WEB_PREFIX = Settings.appSettingsGet('webPath') || '',
	VERSION_PREFIX = Settings.appSettingsGet('webVersionPath') || 'rainloop/v/' + VERSION + '/',
	STATIC_PREFIX = VERSION_PREFIX + 'static/',
	ADMIN_HOST_USE = !!Settings.appSettingsGet('adminHostUse'),
	ADMIN_PATH = Settings.appSettingsGet('adminPath') || 'admin';

let AUTH_PREFIX = Settings.settingsGet('AuthAccountHash') || '0';

/**
 * @returns {void}
 */
export function populateAuthSuffix() {
	AUTH_PREFIX = Settings.settingsGet('AuthAccountHash') || '0';
}

/**
 * @returns {string}
 */
export function subQueryPrefix() {
	return SUB_QUERY_PREFIX;
}

/**
 * @param {string=} startupUrl
 * @returns {string}
 */
export function root(startupUrl = '') {
	return HASH_PREFIX + pString(startupUrl);
}

/**
 * @returns {string}
 */
export function rootAdmin() {
	return ADMIN_HOST_USE ? ROOT : SERVER_PREFIX + ADMIN_PATH;
}

/**
 * @returns {string}
 */
export function rootUser() {
	return ROOT;
}

/**
 * @param {string} type
 * @param {string} download
 * @param {string=} customSpecSuffix
 * @returns {string}
 */
export function attachmentRaw(type, download, customSpecSuffix) {
	customSpecSuffix = undefined === customSpecSuffix ? AUTH_PREFIX : customSpecSuffix;
	return (
		SERVER_PREFIX +
		'/Raw/' +
		SUB_QUERY_PREFIX +
		'/' +
		customSpecSuffix +
		'/' +
		type +
		'/' +
		SUB_QUERY_PREFIX +
		'/' +
		download
	);
}

/**
 * @param {string} download
 * @param {string=} customSpecSuffix
 * @returns {string}
 */
export function attachmentDownload(download, customSpecSuffix) {
	return attachmentRaw('Download', download, customSpecSuffix);
}

/**
 * @param {string} download
 * @param {string=} customSpecSuffix
 * @returns {string}
 */
export function attachmentPreview(download, customSpecSuffix) {
	return attachmentRaw('View', download, customSpecSuffix);
}

/**
 * @param {string} download
 * @param {string=} customSpecSuffix
 * @returns {string}
 */
export function attachmentThumbnailPreview(download, customSpecSuffix) {
	return attachmentRaw('ViewThumbnail', download, customSpecSuffix);
}

/**
 * @param {string} download
 * @param {string=} customSpecSuffix
 * @returns {string}
 */
export function attachmentPreviewAsPlain(download, customSpecSuffix) {
	return attachmentRaw('ViewAsPlain', download, customSpecSuffix);
}

/**
 * @param {string} download
 * @param {string=} customSpecSuffix
 * @returns {string}
 */
export function attachmentFramed(download, customSpecSuffix) {
	return attachmentRaw('FramedView', download, customSpecSuffix);
}

/**
 * @param {string} type
 * @returns {string}
 */
export function serverRequest(type) {
	return SERVER_PREFIX + '/' + type + '/' + SUB_QUERY_PREFIX + '/' + AUTH_PREFIX + '/';
}

/**
 * @returns {string}
 */
export function upload() {
	return serverRequest('Upload');
}

/**
 * @returns {string}
 */
export function uploadContacts() {
	return serverRequest('UploadContacts');
}

/**
 * @returns {string}
 */
export function uploadBackground() {
	return serverRequest('UploadBackground');
}

/**
 * @returns {string}
 */
export function append() {
	return serverRequest('Append');
}

/**
 * @param {string} email
 * @returns {string}
 */
export function change(email) {
	return serverRequest('Change') + encodeURIComponent(email) + '/';
}

/**
 * @param {string} add
 * @returns {string}
 */
export function ajax(add) {
	return serverRequest('Ajax') + add;
}

/**
 * @param {string} requestHash
 * @returns {string}
 */
export function messageViewLink(requestHash) {
	return (
		SERVER_PREFIX +
		'/Raw/' +
		SUB_QUERY_PREFIX +
		'/' +
		AUTH_PREFIX +
		'/ViewAsPlain/' +
		SUB_QUERY_PREFIX +
		'/' +
		requestHash
	);
}

/**
 * @param {string} requestHash
 * @returns {string}
 */
export function messageDownloadLink(requestHash) {
	return (
		SERVER_PREFIX + '/Raw/' + SUB_QUERY_PREFIX + '/' + AUTH_PREFIX + '/Download/' + SUB_QUERY_PREFIX + '/' + requestHash
	);
}

/**
 * @param {string} email
 * @returns {string}
 */
export function avatarLink(email) {
	return SERVER_PREFIX + '/Raw/0/Avatar/' + encodeURIComponent(email) + '/';
}

/**
 * @param {string} hash
 * @returns {string}
 */
export function publicLink(hash) {
	return SERVER_PREFIX + '/Raw/0/Public/' + hash + '/';
}

/**
 * @param {string} hash
 * @returns {string}
 */
export function userBackground(hash) {
	return (
		SERVER_PREFIX + '/Raw/' + SUB_QUERY_PREFIX + '/' + AUTH_PREFIX + '/UserBackground/' + SUB_QUERY_PREFIX + '/' + hash
	);
}

/**
 * @param {string} lang
 * @param {boolean} isAdmin
 * @returns {string}
 */
export function langLink(lang, isAdmin) {
	return SERVER_PREFIX + '/Lang/0/' + (isAdmin ? 'Admin' : 'App') + '/' + encodeURI(lang) + '/' + VERSION + '/';
}

/**
 * @returns {string}
 */
export function exportContactsVcf() {
	return SERVER_PREFIX + '/Raw/' + SUB_QUERY_PREFIX + '/' + AUTH_PREFIX + '/ContactsVcf/';
}

/**
 * @returns {string}
 */
export function exportContactsCsv() {
	return SERVER_PREFIX + '/Raw/' + SUB_QUERY_PREFIX + '/' + AUTH_PREFIX + '/ContactsCsv/';
}

/**
 * @param {string} path
 * @returns {string}
 */
export function staticPrefix(path) {
	return STATIC_PREFIX + path;
}

/**
 * @returns {string}
 */
export function emptyContactPic() {
	return staticPrefix('css/images/empty-contact.png');
}

/**
 * @param {string} fileName
 * @returns {string}
 */
export function sound(fileName) {
	return staticPrefix('sounds/' + fileName);
}

/**
 * @returns {string}
 */
export function notificationMailIcon() {
	return staticPrefix('css/images/icom-message-notification.png');
}

/**
 * @returns {string}
 */
export function openPgpJs() {
	return staticPrefix('js/min/openpgp.min.js');
}

/**
 * @returns {string}
 */
export function openPgpWorkerJs() {
	return staticPrefix('js/min/openpgp.worker.min.js');
}

/**
 * @returns {string}
 */
export function openPgpWorkerPath() {
	return staticPrefix('js/min/');
}

/**
 * @param {string} theme
 * @returns {string}
 */
export function themePreviewLink(theme) {
	let prefix = VERSION_PREFIX;
	if ('@custom' === theme.substr(-7)) {
		theme = theme.substr(0, theme.length - 7).trim();
		prefix = WEB_PREFIX;
	}

	return prefix + 'themes/' + encodeURI(theme) + '/images/preview.png';
}

/**
 * @param {string} inboxFolderName = 'INBOX'
 * @returns {string}
 */
export function inbox(inboxFolderName = 'INBOX') {
	return HASH_PREFIX + 'mailbox/' + inboxFolderName;
}

/**
 * @param {string=} screenName = ''
 * @returns {string}
 */
export function settings(screenName = '') {
	return HASH_PREFIX + 'settings' + (screenName ? '/' + screenName : '');
}

/**
 * @returns {string}
 */
export function about() {
	return HASH_PREFIX + 'about';
}

/**
 * @param {string} screenName
 * @returns {string}
 */
export function admin(screenName) {
	let result = HASH_PREFIX;
	switch (screenName) {
		case 'AdminDomains':
			result += 'domains';
			break;
		case 'AdminSecurity':
			result += 'security';
			break;
		// no default
	}

	return result;
}

/**
 * @param {string} folder
 * @param {number=} page = 1
 * @param {string=} search = ''
 * @param {string=} threadUid = ''
 * @returns {string}
 */
export function mailBox(folder, page = 1, search = '', threadUid = '') {
	page = pInt(page, 1);
	search = pString(search);

	let result = HASH_PREFIX + 'mailbox/';

	if (folder) {
		const resultThreadUid = pInt(threadUid);
		result += encodeURI(folder) + (0 < resultThreadUid ? '~' + resultThreadUid : '');
	}

	if (1 < page) {
		result = result.replace(/[/]+$/, '');
		result += '/p' + page;
	}

	if (search) {
		result = result.replace(/[/]+$/, '');
		result += '/' + encodeURI(search);
	}

	return result;
}

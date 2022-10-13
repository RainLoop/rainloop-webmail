import { pInt } from 'Common/Utils';
import { Settings } from 'Common/Globals';

const
	HASH_PREFIX = '#/',
	SERVER_PREFIX = './?',
	VERSION = Settings.app('version'),
	VERSION_PREFIX = 'snappymail/v/' + VERSION + '/',

	adminPath = () => rl.adminArea() && !Settings.app('adminHostUse'),

	prefix = () => SERVER_PREFIX + (adminPath() ? Settings.app('adminPath') : '');

export const
	SUB_QUERY_PREFIX = '&q[]=',

	/**
	 * @param {string=} startupUrl
	 * @returns {string}
	 */
	root = () => HASH_PREFIX,

	/**
	 * @returns {string}
	 */
	logoutLink = () => adminPath() ? prefix() : './',

	/**
	 * @param {string} type
	 * @param {string} hash
	 * @param {string=} customSpecSuffix
	 * @returns {string}
	 */
	serverRequestRaw = (type, hash) =>
		SERVER_PREFIX + '/Raw/' + SUB_QUERY_PREFIX + '/'
		+ '0/' // AuthAccountHash ?
		+ (type
			? type + '/' + (hash ? SUB_QUERY_PREFIX + '/' + hash : '')
			: ''),

	/**
	 * @param {string} download
	 * @param {string=} customSpecSuffix
	 * @returns {string}
	 */
	attachmentDownload = (download, customSpecSuffix) =>
		serverRequestRaw('Download', download, customSpecSuffix),

	proxy = url =>
		SERVER_PREFIX + '/ProxyExternal/'
			+ btoa(url.replace(/ /g, '%20')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),

	/**
	 * @param {string} type
	 * @returns {string}
	 */
	serverRequest = type => prefix() + '/' + type + '/' + SUB_QUERY_PREFIX + '/0/',

	/**
	 * @param {string} lang
	 * @param {boolean} isAdmin
	 * @returns {string}
	 */
	langLink = (lang, isAdmin) =>
		SERVER_PREFIX + '/Lang/0/' + (isAdmin ? 'Admin' : 'App') + '/' + encodeURI(lang) + '/' + VERSION + '/',

	/**
	 * @param {string} path
	 * @returns {string}
	 */
	staticLink = path => Settings.app('webPath') + VERSION_PREFIX + 'static/' + path,

	/**
	 * @param {string} theme
	 * @returns {string}
	 */
	themePreviewLink = theme => {
		let prefix = VERSION_PREFIX;
		if ('@custom' === theme.slice(-7)) {
			theme = theme.slice(0, theme.length - 7).trim();
			prefix = '';
		}

		return Settings.app('webPath') + prefix + 'themes/' + encodeURI(theme) + '/images/preview.png';
	},

	/**
	 * @param {string} inboxFolderName = 'INBOX'
	 * @returns {string}
	 */
	mailbox = (inboxFolderName = 'INBOX') => HASH_PREFIX + 'mailbox/' + inboxFolderName,

	/**
	 * @param {string=} screenName = ''
	 * @returns {string}
	 */
	settings = (screenName = '') => HASH_PREFIX + 'settings' + (screenName ? '/' + screenName : ''),

	/**
	 * @param {string=} screenName
	 * @returns {string}
	 */
	admin = screenName => HASH_PREFIX + (
		'AdminDomains' == screenName ? 'domains'
		: 'AdminSecurity' == screenName ? 'security'
		: ''
	),

	/**
	 * @param {string} folder
	 * @param {number=} page = 1
	 * @param {string=} search = ''
	 * @param {number=} threadUid = 0
	 * @returns {string}
	 */
	mailBox = (folder, page, search, threadUid) => {
		let result = [HASH_PREFIX + 'mailbox'];

		if (folder) {
			result.push(folder + (threadUid ? '~' + threadUid : ''));
		}

		page = pInt(page, 1);
		if (1 < page) {
			result.push('p' + page);
		}

		search && result.push(encodeURI(search));

		return result.join('/');
	};

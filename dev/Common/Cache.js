let FOLDERS_CACHE = new Map,
	FOLDERS_HASH_MAP = new Map,
	inboxFolderName = 'INBOX';

export const
	/**
	 * @returns {void}
	 */
	clearCache = () => {
		FOLDERS_CACHE.clear();
		FOLDERS_HASH_MAP.clear();
	},

	/**
	 * @returns {string}
	 */
	getFolderInboxName = () => inboxFolderName,

	/**
	 * @returns {string}
	 */
	setFolderInboxName = name => inboxFolderName = name,

	/**
	 * @param {string} fullNameHash
	 * @returns {string}
	 */
	getFolderFromHashMap = fullNameHash => getFolderFromCacheList(FOLDERS_HASH_MAP.get(fullNameHash)),

	/**
	 * @param {?FolderModel} folder
	 */
	setFolder = folder => {
		folder.etag = '';
		FOLDERS_CACHE.set(folder.fullName, folder);
		FOLDERS_HASH_MAP.set(folder.fullNameHash, folder.fullName);
	},

	/**
	 * @param {string} folderFullName
	 * @param {string} folderETag
	 */
	setFolderETag = (folderFullName, folderETag) =>
		FOLDERS_CACHE.has(folderFullName) && (FOLDERS_CACHE.get(folderFullName).etag = folderETag),

	/**
	 * @param {string} folderFullName
	 * @returns {?FolderModel}
	 */
	getFolderFromCacheList = folderFullName =>
		FOLDERS_CACHE.get(folderFullName),

	/**
	 * @param {string} folderFullName
	 */
	removeFolderFromCacheList = folderFullName => FOLDERS_CACHE.delete(folderFullName);

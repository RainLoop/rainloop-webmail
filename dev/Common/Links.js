
(function () {

	'use strict';

	var
		window = require('window'),
		Utils = require('Common/Utils')
	;

	/**
	 * @constructor
	 */
	function Links()
	{
		var Settings = require('Storage/Settings');

		this.sBase = '#/';
		this.sServer = './?';

		this.sVersion = Settings.settingsGet('Version');
		this.sAuthSuffix = Settings.settingsGet('AuthAccountHash') || '0';
		this.sWebPrefix = Settings.settingsGet('WebPath') || '';
		this.sVersionPrefix = Settings.settingsGet('WebVersionPath') || 'rainloop/v/' + this.sVersion + '/';
		this.sStaticPrefix = this.sVersionPrefix + 'static/';
	}

	Links.prototype.populateAuthSuffix = function ()
	{
		this.sAuthSuffix = require('Storage/Settings').settingsGet('AuthAccountHash') || '0';
	};

	/**
	 * @return {string}
	 */
	Links.prototype.subQueryPrefix = function ()
	{
		return '&q[]=';
	};

	/**
	 * @param {string=} sStartupUrl
	 * @return {string}
	 */
	Links.prototype.root = function (sStartupUrl)
	{
		return this.sBase + Utils.pString(sStartupUrl);
	};

	/**
	 * @return {string}
	 */
	Links.prototype.rootAdmin = function ()
	{
		return this.sServer + '/Admin/';
	};

	/**
	 * @return {string}
	 */
	Links.prototype.rootUser = function ()
	{
		return './';
	};

	/**
	 * @param {string} sDownload
	 * @param {string=} sCustomSpecSuffix
	 * @return {string}
	 */
	Links.prototype.attachmentDownload = function (sDownload, sCustomSpecSuffix)
	{
		sCustomSpecSuffix = Utils.isUnd(sCustomSpecSuffix) ? this.sAuthSuffix : sCustomSpecSuffix;
		return this.sServer + '/Raw/' + this.subQueryPrefix() + '/' + sCustomSpecSuffix + '/Download/' +
			this.subQueryPrefix() + '/' + sDownload;
	};

	/**
	 * @param {string} sDownload
	 * @param {string=} sCustomSpecSuffix
	 * @return {string}
	 */
	Links.prototype.attachmentPreview = function (sDownload, sCustomSpecSuffix)
	{
		sCustomSpecSuffix = Utils.isUnd(sCustomSpecSuffix) ? this.sAuthSuffix : sCustomSpecSuffix;
		return this.sServer + '/Raw/' + this.subQueryPrefix() + '/' + sCustomSpecSuffix + '/View/' +
			this.subQueryPrefix() + '/' + sDownload;
	};

	/**
	 * @param {string} sDownload
	 * @param {string=} sCustomSpecSuffix
	 * @return {string}
	 */
	Links.prototype.attachmentThumbnailPreview = function (sDownload, sCustomSpecSuffix)
	{
		sCustomSpecSuffix = Utils.isUnd(sCustomSpecSuffix) ? this.sAuthSuffix : sCustomSpecSuffix;
		return this.sServer + '/Raw/' + this.subQueryPrefix() + '/' + sCustomSpecSuffix + '/ViewThumbnail/' +
			this.subQueryPrefix() + '/' + sDownload;
	};

	/**
	 * @param {string} sDownload
	 * @param {string=} sCustomSpecSuffix
	 * @return {string}
	 */
	Links.prototype.attachmentPreviewAsPlain = function (sDownload, sCustomSpecSuffix)
	{
		sCustomSpecSuffix = Utils.isUnd(sCustomSpecSuffix) ? this.sAuthSuffix : sCustomSpecSuffix;
		return this.sServer + '/Raw/' + this.subQueryPrefix() + '/' + sCustomSpecSuffix + '/ViewAsPlain/' +
			this.subQueryPrefix() + '/' + sDownload;
	};

	/**
	 * @param {string} sDownload
	 * @param {string=} sCustomSpecSuffix
	 * @return {string}
	 */
	Links.prototype.attachmentFramed = function (sDownload, sCustomSpecSuffix)
	{
		sCustomSpecSuffix = Utils.isUnd(sCustomSpecSuffix) ? this.sAuthSuffix : sCustomSpecSuffix;
		return this.sServer + '/Raw/' + this.subQueryPrefix() + '/' + sCustomSpecSuffix + '/FramedView/' +
			this.subQueryPrefix() + '/' + sDownload;
	};

	/**
	 * @return {string}
	 */
	Links.prototype.upload = function ()
	{
		return this.sServer + '/Upload/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/';
	};

	/**
	 * @return {string}
	 */
	Links.prototype.uploadContacts = function ()
	{
		return this.sServer + '/UploadContacts/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/';
	};

	/**
	 * @return {string}
	 */
	Links.prototype.uploadBackground = function ()
	{
		return this.sServer + '/UploadBackground/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/';
	};

	/**
	 * @return {string}
	 */
	Links.prototype.append = function ()
	{
		return this.sServer + '/Append/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/';
	};

	/**
	 * @param {string} sEmail
	 * @return {string}
	 */
	Links.prototype.change = function (sEmail)
	{
		return this.sServer + '/Change/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/' + Utils.encodeURIComponent(sEmail) + '/';
	};

	/**
	 * @param {string=} sAdd
	 * @return {string}
	 */
	Links.prototype.ajax = function (sAdd)
	{
		return this.sServer + '/Ajax/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/' + sAdd;
	};

	/**
	 * @param {string} sRequestHash
	 * @return {string}
	 */
	Links.prototype.messageViewLink = function (sRequestHash)
	{
		return this.sServer + '/Raw/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/ViewAsPlain/' + this.subQueryPrefix() + '/' + sRequestHash;
	};

	/**
	 * @param {string} sRequestHash
	 * @return {string}
	 */
	Links.prototype.messageDownloadLink = function (sRequestHash)
	{
		return this.sServer + '/Raw/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/Download/' + this.subQueryPrefix() + '/' + sRequestHash;
	};

	/**
	 * @param {string} sEmail
	 * @return {string}
	 */
	Links.prototype.avatarLink = function (sEmail)
	{
		return this.sServer + '/Raw/0/Avatar/' + Utils.encodeURIComponent(sEmail) + '/';
	};

	/**
	 * @param {string} sHash
	 * @return {string}
	 */
	Links.prototype.publicLink = function (sHash)
	{
		return this.sServer + '/Raw/0/Public/' + sHash + '/';
	};

	/**
	 * @param {string} sHash
	 * @return {string}
	 */
	Links.prototype.userBackground = function (sHash)
	{
		return this.sServer + '/Raw/' + this.subQueryPrefix() + '/' + this.sAuthSuffix +
			'/UserBackground/' + this.subQueryPrefix() + '/' + sHash;
	};

	/**
	 * @param {string} sInboxFolderName = 'INBOX'
	 * @return {string}
	 */
	Links.prototype.inbox = function (sInboxFolderName)
	{
		sInboxFolderName = Utils.isUnd(sInboxFolderName) ? 'INBOX' : sInboxFolderName;
		return this.sBase + 'mailbox/' + sInboxFolderName;
	};

	/**
	 * @param {string=} sScreenName
	 * @return {string}
	 */
	Links.prototype.settings = function (sScreenName)
	{
		var sResult = this.sBase + 'settings';
		if (!Utils.isUnd(sScreenName) && '' !== sScreenName)
		{
			sResult += '/' + sScreenName;
		}

		return sResult;
	};

	/**
	 * @return {string}
	 */
	Links.prototype.about = function ()
	{
		return this.sBase + 'about';
	};

	/**
	 * @param {string} sScreenName
	 * @return {string}
	 */
	Links.prototype.admin = function (sScreenName)
	{
		var sResult = this.sBase;
		switch (sScreenName) {
		case 'AdminDomains':
			sResult += 'domains';
			break;
		case 'AdminSecurity':
			sResult += 'security';
			break;
		case 'AdminLicensing':
			sResult += 'licensing';
			break;
		}

		return sResult;
	};

	/**
	 * @param {string} sFolder
	 * @param {number=} iPage = 1
	 * @param {string=} sSearch = ''
	 * @param {string=} sThreadUid = ''
	 * @return {string}
	 */
	Links.prototype.mailBox = function (sFolder, iPage, sSearch, sThreadUid)
	{
		iPage = Utils.isNormal(iPage) ? Utils.pInt(iPage) : 1;
		sSearch = Utils.pString(sSearch);

		var
			sResult = this.sBase + 'mailbox/',
			iThreadUid = Utils.pInt(sThreadUid)
		;

		if ('' !== sFolder)
		{
			sResult += encodeURI(sFolder) + (0 < iThreadUid ? '~' + iThreadUid : '');
		}

		if (1 < iPage)
		{
			sResult = sResult.replace(/[\/]+$/, '');
			sResult += '/p' + iPage;
		}

		if ('' !== sSearch)
		{
			sResult = sResult.replace(/[\/]+$/, '');
			sResult += '/' + encodeURI(sSearch);
		}

		return sResult;
	};

	/**
	 * @return {string}
	 */
	Links.prototype.phpInfo = function ()
	{
		return this.sServer + 'Info';
	};

	/**
	 * @param {string} sLang
	 * @return {string}
	 */
	Links.prototype.langLink = function (sLang, bAdmin)
	{
		return this.sServer + '/Lang/0/' + (bAdmin ? 'Admin' : 'App') + '/' + encodeURI(sLang) + '/' + this.sVersion + '/';
	};

	/**
	 * @return {string}
	 */
	Links.prototype.exportContactsVcf = function ()
	{
		return this.sServer + '/Raw/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/ContactsVcf/';
	};

	/**
	 * @return {string}
	 */
	Links.prototype.exportContactsCsv = function ()
	{
		return this.sServer + '/Raw/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/ContactsCsv/';
	};

	/**
	 * @return {string}
	 */
	Links.prototype.emptyContactPic = function ()
	{
		return this.sStaticPrefix + 'css/images/empty-contact.png';
	};

	/**
	 * @param {string} sFileName
	 * @return {string}
	 */
	Links.prototype.sound = function (sFileName)
	{
		return  this.sStaticPrefix + 'sounds/' + sFileName;
	};

	/**
	 * @param {string} sTheme
	 * @return {string}
	 */
	Links.prototype.themePreviewLink = function (sTheme)
	{
		var sPrefix = this.sVersionPrefix;
		if ('@custom' === sTheme.substr(-7))
		{
			sTheme = Utils.trim(sTheme.substring(0, sTheme.length - 7));
			sPrefix = this.sWebPrefix;
		}

		return sPrefix + 'themes/' + window.encodeURI(sTheme) + '/images/preview.png';
	};

	/**
	 * @return {string}
	 */
	Links.prototype.notificationMailIcon = function ()
	{
		return  this.sStaticPrefix + 'css/images/icom-message-notification.png';
	};

	/**
	 * @return {string}
	 */
	Links.prototype.openPgpJs = function ()
	{
		return this.sStaticPrefix + 'js/min/openpgp.min.js';
	};

	/**
	 * @return {string}
	 */
	Links.prototype.openPgpWorkerJs = function ()
	{
		return this.sStaticPrefix + 'js/min/openpgp.worker.min.js';
	};

	/**
	 * @return {string}
	 */
	Links.prototype.openPgpWorkerPath = function ()
	{
		return this.sStaticPrefix + 'js/min/';
	};

	/**
	 * @param {boolean} bXAuth = false
	 * @return {string}
	 */
	Links.prototype.socialGoogle = function (bXAuth)
	{
		return this.sServer + 'SocialGoogle' + ('' !== this.sAuthSuffix ? '/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/' : '') +
			(bXAuth ? '&xauth=1' : '');
	};

	/**
	 * @return {string}
	 */
	Links.prototype.socialTwitter = function ()
	{
		return this.sServer + 'SocialTwitter' + ('' !== this.sAuthSuffix ? '/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/' : '');
	};

	/**
	 * @return {string}
	 */
	Links.prototype.socialFacebook = function ()
	{
		return this.sServer + 'SocialFacebook' + ('' !== this.sAuthSuffix ? '/' + this.subQueryPrefix() + '/' + this.sAuthSuffix + '/' : '');
	};

	module.exports = new Links();

}());
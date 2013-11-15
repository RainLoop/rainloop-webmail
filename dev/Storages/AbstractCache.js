/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function AbstractCacheStorage()
{
	this.oEmailsPicsHashes = {};
	this.oServices = {};
}
/**
 * @type {Object}
 */
AbstractCacheStorage.prototype.oEmailsPicsHashes = {};

/**
 * @type {Object}
 */
AbstractCacheStorage.prototype.oServices = {};

AbstractCacheStorage.prototype.clear = function ()
{
	this.oServices = {};
	this.oEmailsPicsHashes = {};
};

/**
 * @param {string} sEmail
 * @return {string}
 */
AbstractCacheStorage.prototype.getUserPic = function (sEmail)
{
	var
		sUrl = '',
		sService = '',
		sEmailLower = sEmail.toLowerCase(),
		sPicHash = Utils.isUnd(this.oEmailsPicsHashes[sEmail]) ? '' : this.oEmailsPicsHashes[sEmail]
	;
	
	if ('' === sPicHash)
	{
		sService = sEmailLower.substr(sEmail.indexOf('@') + 1);
		sUrl = '' !== sService && this.oServices[sService] ? this.oServices[sService] : '';
	}
	else
	{
		sUrl = RL.link().getUserPicUrlFromHash(sPicHash);
	}
	
	return sUrl;
};

/**
 * @param {Object} oData
 */
AbstractCacheStorage.prototype.setServicesData = function (oData)
{
	this.oServices = oData;
};

/**
 * @param {Object} oData
 */
AbstractCacheStorage.prototype.setEmailsPicsHashesData = function (oData)
{
	this.oEmailsPicsHashes = oData;
};

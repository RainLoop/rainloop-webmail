/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function AbstractCacheStorage()
{
	this.oServices = {};
	this.bCapaGravatar = RL.capa(Enums.Capa.Gravatar);
}

/**
 * @type {Object}
 */
AbstractCacheStorage.prototype.oServices = {};

/**
 * @type {boolean}
 */
AbstractCacheStorage.prototype.bCapaGravatar = false;

AbstractCacheStorage.prototype.clear = function ()
{
	this.oServices = {};
};

/**
 * @param {string} sEmail
 * @return {string}
 */
AbstractCacheStorage.prototype.getUserPic = function (sEmail, fCallback)
{
	sEmail = Utils.trim(sEmail);

	var
		sUrl = '',
		sService = '',
		sEmailLower = sEmail.toLowerCase()
	;

	sService = sEmailLower.substr(sEmail.indexOf('@') + 1);
	sUrl = '' !== sService && this.oServices[sService] ? this.oServices[sService] : '';

	if (this.bCapaGravatar && '' === sUrl && '' !== sEmailLower)
	{
		fCallback('//secure.gravatar.com/avatar/' + Utils.md5(sEmailLower) + '.jpg?s=80&d=mm', sEmail);
	}
	else
	{
		fCallback(sUrl, sEmail);
	}
};

/**
 * @param {Object} oData
 */
AbstractCacheStorage.prototype.setServicesData = function (oData)
{
	this.oServices = oData;
};

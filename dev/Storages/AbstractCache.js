/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function AbstractCacheStorage()
{
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
	this.bCapaGravatar = !!this.bCapaGravatar; // TODO
};

/**
 * @param {string} sEmail
 * @return {string}
 */
AbstractCacheStorage.prototype.getUserPic = function (sEmail, fCallback)
{
	sEmail = Utils.trim(sEmail);
	fCallback(this.bCapaGravatar && '' !== sEmail ? RL.link().avatarLink(sEmail) : '', sEmail);
};

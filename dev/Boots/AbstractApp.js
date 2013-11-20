/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractBoot
 */
function AbstractApp()
{
	KnoinAbstractBoot.call(this);
	
	this.oSettings = null;
	this.oPlugins = null;
	this.oLink = null;
	this.oLocal = null;
	
	this.isLocalAutocomplete = true;

	this.popupVisibility = ko.observable(false);

	this.iframe = $('<iframe style="display:none" src="javascript:;" />').appendTo('body');

	$window.on('error', function (oEvent) {
		if (RL && oEvent && oEvent.originalEvent && oEvent.originalEvent.message &&
			-1 === Utils.inArray(oEvent.originalEvent.message, [
				'Script error.', 'Uncaught Error: Error calling method on NPObject.'
			]))
		{
			RL.remote().jsError(
				Utils.emptyFunction,
				oEvent.originalEvent.message,
				oEvent.originalEvent.filename,
				oEvent.originalEvent.lineno,
				location && location.toString ? location.toString() : '',
				$html.attr('class'),
				Utils.microtime() - Globals.now
			);
		}
	});
}

_.extend(AbstractApp.prototype, KnoinAbstractBoot.prototype);

AbstractApp.prototype.oSettings = null;
AbstractApp.prototype.oLink = null;

/**
 * @param {string} sLink
 * @return {boolean}
 */
AbstractApp.prototype.download = function (sLink)
{
	var 
		oLink = null,
		oE = null,
		sUserAgent = navigator.userAgent.toLowerCase()
	;
	
	if (sUserAgent && (sUserAgent.indexOf('chrome') > -1 || sUserAgent.indexOf('chrome') > -1))
	{
		oLink = document.createElement('a');
		oLink['href'] = sLink;

		if (document['createEvent'])
		{
			oE = document['createEvent']('MouseEvents');
			if (oE && oE['initEvent'] && oLink['dispatchEvent'])
			{
				oE['initEvent']('click', true, true);
				oLink['dispatchEvent'](oE);
				return true;
			}
		}
	}

	if (Globals.bMobileDevice)
	{
		window.open(sLink, '_self');
		window.focus();
	}
	else
	{
		this.iframe.attr('src', sLink);
//		window.document.location.href = sLink;
	}
	
	return true;
};

/**
 * @return {LinkBuilder}
 */
AbstractApp.prototype.link = function ()
{
	if (null === this.oLink)
	{
		this.oLink = new LinkBuilder();
	}

	return this.oLink;
};

/**
 * @return {LocalStorage}
 */
AbstractApp.prototype.local = function ()
{
	if (null === this.oLocal)
	{
		this.oLocal = new LocalStorage();
	}

	return this.oLocal;
};

/**
 * @param {string} sName
 * @return {?}
 */
AbstractApp.prototype.settingsGet = function (sName)
{
	if (null === this.oSettings)
	{
		this.oSettings = Utils.isNormal(AppData) ? AppData : {};
	}

	return Utils.isUnd(this.oSettings[sName]) ? null : this.oSettings[sName];
};

/**
 * @param {string} sName
 * @param {?} mValue
 */
AbstractApp.prototype.settingsSet = function (sName, mValue)
{
	if (null === this.oSettings)
	{
		this.oSettings = Utils.isNormal(AppData) ? AppData : {};
	}

	this.oSettings[sName] = mValue;
};

AbstractApp.prototype.setTitle = function (sTitle)
{
	sTitle = ((0 < sTitle.length) ? sTitle + ' - ' : '') +
		RL.settingsGet('Title') || '';

	window.document.title = sTitle;
	_.delay(function () {
		window.document.title = sTitle;
	}, 5);
};

/**
 * @param {boolean=} bLogout = false
 * @param {boolean=} bClose = false
 */
AbstractApp.prototype.loginAndLogoutReload = function (bLogout, bClose)
{
	var
		sCustomLogoutLink = Utils.pString(RL.settingsGet('CustomLogoutLink')),
		bInIframe = !!RL.settingsGet('InIframe')
	;

	bLogout = Utils.isUnd(bLogout) ? false : !!bLogout;
	bClose = Utils.isUnd(bClose) ? false : !!bClose;
	
	if (bLogout && bClose && window.close)
	{
		window.close();
	}
	
	if (bLogout && '' !== sCustomLogoutLink && window.location.href !== sCustomLogoutLink)
	{
		_.delay(function () {
			if (bInIframe && window.parent)
			{
				window.parent.location.href = sCustomLogoutLink;
			}
			else
			{
				window.location.href = sCustomLogoutLink;
			}
		}, 100);
	}
	else
	{
		kn.routeOff();
		kn.setHash(RL.link().root(), true);
		kn.routeOff();

		_.delay(function () {
			if (bInIframe && window.parent)
			{
				window.parent.location.reload();
			}
			else
			{
				window.location.reload();
			}
		}, 100);
	}
};

/**
 * @param {string} sQuery
 * @param {number} iPage
 * @param {Function} fCallback
 */
AbstractApp.prototype.getAutocomplete = function (sQuery, iPage, fCallback)
{
	fCallback([], sQuery);
};

AbstractApp.prototype.bootstart = function ()
{
	Utils.initOnStartOrLangChange(function () {
		Utils.initNotificationLanguage();
	}, null);

	_.delay(function () {
		Utils.windowResize();
	}, 1000);
};

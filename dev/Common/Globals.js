/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @type {?}
 */
Globals.now = (new Date()).getTime();

/**
 * @type {?}
 */
Globals.momentTrigger = ko.observable(true);

/**
 * @type {?}
 */
Globals.langChangeTrigger = ko.observable(true);

/**
 * @type {number}
 */
Globals.iAjaxErrorCount = 0;

/**
 * @type {number}
 */
Globals.iTokenErrorCount = 0;

/**
 * @type {number}
 */
Globals.iMessageBodyCacheCount = 0;

/**
 * @type {boolean}
 */
Globals.bUnload = false;

/**
 * @type {string}
 */
Globals.sUserAgent = (navigator.userAgent || '').toLowerCase();

/**
 * @type {boolean}
 */
Globals.bIsiOSDevice = -1 < Globals.sUserAgent.indexOf('iphone') || -1 < Globals.sUserAgent.indexOf('ipod') || -1 < Globals.sUserAgent.indexOf('ipad');

/**
 * @type {boolean}
 */
Globals.bIsAndroidDevice = -1 < Globals.sUserAgent.indexOf('android');

/**
 * @type {boolean}
 */
Globals.bMobileDevice = Globals.bIsiOSDevice || Globals.bIsAndroidDevice;

/**
 * @type {boolean}
 */
Globals.bDisableNanoScroll = Globals.bMobileDevice;

/**
 * @type {boolean}
 */
Globals.bAllowPdfPreview = !Globals.bMobileDevice;

/**
 * @type {boolean}
 */
Globals.bAnimationSupported = !Globals.bMobileDevice && $html.hasClass('csstransitions');

/**
 * @type {string}
 */
Globals.sAnimationType = '';

if (Globals.bAllowPdfPreview && navigator && navigator.mimeTypes)
{
	Globals.bAllowPdfPreview = !!_.find(navigator.mimeTypes, function (oType) {
		return oType && 'application/pdf' === oType.type;
	});
}

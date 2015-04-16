
(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		$ = require('$'),

		Consts = require('Common/Consts'),
		Enums = require('Common/Enums'),
		Globals = require('Common/Globals'),
		Utils = require('Common/Utils'),
		Plugins = require('Common/Plugins'),
		Links = require('Common/Links'),

		Settings = require('Storage/Settings')
	;

	/**
	* @constructor
	*/
	function AbstractAjaxRemote()
	{
		this.oRequests = {};
	}

	AbstractAjaxRemote.prototype.oRequests = {};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sRequestAction
	 * @param {string} sType
	 * @param {?AjaxJsonDefaultResponse} oData
	 * @param {boolean} bCached
	 * @param {*=} oRequestParameters
	 */
	AbstractAjaxRemote.prototype.defaultResponse = function (fCallback, sRequestAction, sType, oData, bCached, oRequestParameters)
	{
		var
			fCall = function () {
				if (Enums.StorageResultType.Success !== sType && Globals.bUnload)
				{
					sType = Enums.StorageResultType.Unload;
				}

				if (Enums.StorageResultType.Success === sType && oData && !oData.Result)
				{
					if (oData && -1 < Utils.inArray(oData.ErrorCode, [
						Enums.Notification.AuthError, Enums.Notification.AccessError,
						Enums.Notification.ConnectionError, Enums.Notification.DomainNotAllowed, Enums.Notification.AccountNotAllowed,
						Enums.Notification.MailServerError,	Enums.Notification.UnknownNotification, Enums.Notification.UnknownError
					]))
					{
						Globals.iAjaxErrorCount++;
					}

					if (oData && Enums.Notification.InvalidToken === oData.ErrorCode)
					{
						Globals.iTokenErrorCount++;
					}

					if (Consts.Values.TokenErrorLimit < Globals.iTokenErrorCount)
					{
						if (Globals.__APP__ && Globals.__APP__.loginAndLogoutReload)
						{
							 Globals.__APP__.loginAndLogoutReload(false, true);
						}
					}

					if (oData.ClearAuth || oData.Logout || Consts.Values.AjaxErrorLimit < Globals.iAjaxErrorCount)
					{
						if (Globals.__APP__ && Globals.__APP__.clearClientSideToken)
						{
							Globals.__APP__.clearClientSideToken();

							if (!oData.ClearAuth &&  Globals.__APP__.loginAndLogoutReload)
							{
								 Globals.__APP__.loginAndLogoutReload(false, true);
							}
						}
					}
				}
				else if (Enums.StorageResultType.Success === sType && oData && oData.Result)
				{
					Globals.iAjaxErrorCount = 0;
					Globals.iTokenErrorCount = 0;
				}

				if (fCallback)
				{
					Plugins.runHook('ajax-default-response', [sRequestAction, Enums.StorageResultType.Success === sType ? oData : null, sType, bCached, oRequestParameters]);

					fCallback(
						sType,
						Enums.StorageResultType.Success === sType ? oData : null,
						bCached,
						sRequestAction,
						oRequestParameters
					);
				}
			}
		;

		switch (sType)
		{
			case 'success':
				sType = Enums.StorageResultType.Success;
				break;
			case 'abort':
				sType = Enums.StorageResultType.Abort;
				break;
			default:
				sType = Enums.StorageResultType.Error;
				break;
		}

		if (Enums.StorageResultType.Error === sType)
		{
			_.delay(fCall, 300);
		}
		else
		{
			fCall();
		}
	};

	/**
	 * @param {?Function} fResultCallback
	 * @param {Object} oParameters
	 * @param {?number=} iTimeOut = 20000
	 * @param {string=} sGetAdd = ''
	 * @param {Array=} aAbortActions = []
	 * @return {jQuery.jqXHR}
	 */
	AbstractAjaxRemote.prototype.ajaxRequest = function (fResultCallback, oParameters, iTimeOut, sGetAdd, aAbortActions)
	{
		var
			self = this,
			bPost = '' === sGetAdd,
			oHeaders = {},
			iStart = (new window.Date()).getTime(),
			oDefAjax = null,
			sAction = ''
		;

		oParameters = oParameters || {};
		iTimeOut = Utils.isNormal(iTimeOut) ? iTimeOut : 20000;
		sGetAdd = Utils.isUnd(sGetAdd) ? '' : Utils.pString(sGetAdd);
		aAbortActions = Utils.isArray(aAbortActions) ? aAbortActions : [];

		sAction = oParameters.Action || '';

		if (sAction && 0 < aAbortActions.length)
		{
			_.each(aAbortActions, function (sActionToAbort) {
				if (self.oRequests[sActionToAbort])
				{
					self.oRequests[sActionToAbort].__aborted = true;
					if (self.oRequests[sActionToAbort].abort)
					{
						self.oRequests[sActionToAbort].abort();
					}
					self.oRequests[sActionToAbort] = null;
				}
			});
		}

		if (bPost)
		{
			oParameters['XToken'] = Settings.settingsGet('Token');
		}

		oDefAjax = $.ajax({
			'type': bPost ? 'POST' : 'GET',
			'url': Links.ajax(sGetAdd),
			'async': true,
			'dataType': 'json',
			'data': bPost ? oParameters : {},
			'headers': oHeaders,
			'timeout': iTimeOut,
			'global': true
		});

		oDefAjax.always(function (oData, sType) {

			var bCached = false;
			if (oData && oData['Time'])
			{
				bCached = Utils.pInt(oData['Time']) > (new window.Date()).getTime() - iStart;
			}

			if (sAction && self.oRequests[sAction])
			{
				if (self.oRequests[sAction].__aborted)
				{
					sType = 'abort';
				}

				self.oRequests[sAction] = null;
			}

			self.defaultResponse(fResultCallback, sAction, sType, oData, bCached, oParameters);
		});

		if (sAction && 0 < aAbortActions.length && -1 < Utils.inArray(sAction, aAbortActions))
		{
			if (this.oRequests[sAction])
			{
				this.oRequests[sAction].__aborted = true;
				if (this.oRequests[sAction].abort)
				{
					this.oRequests[sAction].abort();
				}
				this.oRequests[sAction] = null;
			}

			this.oRequests[sAction] = oDefAjax;
		}

		return oDefAjax;
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sAction
	 * @param {Object=} oParameters
	 * @param {?number=} iTimeout
	 * @param {string=} sGetAdd = ''
	 * @param {Array=} aAbortActions = []
	 */
	AbstractAjaxRemote.prototype.defaultRequest = function (fCallback, sAction, oParameters, iTimeout, sGetAdd, aAbortActions)
	{
		oParameters = oParameters || {};
		oParameters.Action = sAction;

		sGetAdd = Utils.pString(sGetAdd);

		Plugins.runHook('ajax-default-request', [sAction, oParameters, sGetAdd]);

		return this.ajaxRequest(fCallback, oParameters,
			Utils.isUnd(iTimeout) ? Consts.Defaults.DefaultAjaxTimeout : Utils.pInt(iTimeout), sGetAdd, aAbortActions);
	};

	/**
	 * @param {?Function} fCallback
	 */
	AbstractAjaxRemote.prototype.noop = function (fCallback)
	{
		this.defaultRequest(fCallback, 'Noop');
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sMessage
	 * @param {string} sFileName
	 * @param {number} iLineNo
	 * @param {string} sLocation
	 * @param {string} sHtmlCapa
	 * @param {number} iTime
	 */
	AbstractAjaxRemote.prototype.jsError = function (fCallback, sMessage, sFileName, iLineNo, sLocation, sHtmlCapa, iTime)
	{
		this.defaultRequest(fCallback, 'JsError', {
			'Message': sMessage,
			'FileName': sFileName,
			'LineNo': iLineNo,
			'Location': sLocation,
			'HtmlCapa': sHtmlCapa,
			'TimeOnPage': iTime
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sType
	 * @param {Array=} mData = null
	 * @param {boolean=} bIsError = false
	 */
	AbstractAjaxRemote.prototype.jsInfo = function (fCallback, sType, mData, bIsError)
	{
		this.defaultRequest(fCallback, 'JsInfo', {
			'Type': sType,
			'Data': mData,
			'IsError': (Utils.isUnd(bIsError) ? false : !!bIsError) ? '1' : '0'
		});
	};

	/**
	 * @param {?Function} fCallback
	 */
	AbstractAjaxRemote.prototype.getPublicKey = function (fCallback)
	{
		this.defaultRequest(fCallback, 'GetPublicKey');
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sVersion
	 */
	AbstractAjaxRemote.prototype.jsVersion = function (fCallback, sVersion)
	{
		this.defaultRequest(fCallback, 'Version', {
			'Version': sVersion
		});
	};

	module.exports = AbstractAjaxRemote;

}());
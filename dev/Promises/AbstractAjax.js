
(function () {

	'use strict';

	var
		$ = require('$'),
		_ = require('_'),
		Q = require('Q'),

		Consts = require('Common/Consts'),
		Enums = require('Common/Enums'),
		Globals = require('Common/Globals'),
		Utils = require('Common/Utils'),
		Links = require('Common/Links'),
		Plugins = require('Common/Plugins'),

		Settings = require('Storage/Settings'),

		AbstractBasicPromises = require('Promises/AbstractBasic')
	;

	/**
	* @constructor
	*/
	function AbstractAjaxPromises()
	{
		AbstractBasicPromises.call(this);

		this.clear();
	}

	_.extend(AbstractAjaxPromises.prototype, AbstractBasicPromises.prototype);

	AbstractAjaxPromises.prototype.oRequests = {};

	AbstractAjaxPromises.prototype.clear = function ()
	{
		this.oRequests = {};
	};

	AbstractAjaxPromises.prototype.abort = function (sAction, bClearOnly)
	{
		if (this.oRequests[sAction])
		{
			if (!bClearOnly && this.oRequests[sAction].abort)
			{
				this.oRequests[sAction].__aborted__ = true;
				this.oRequests[sAction].abort();
			}

			this.oRequests[sAction] = null;
			delete this.oRequests[sAction];
		}

		return this;
	};

	AbstractAjaxPromises.prototype.ajaxRequest = function (sAction, bPost, iTimeOut, oParameters, sAdditionalGetString, fTrigger)
	{
		var
			oH = null,
			self = this,
			iStart = Utils.microtime(),
			oDeferred = Q.defer()
		;

		iTimeOut = Utils.isNormal(iTimeOut) ? iTimeOut : Consts.Defaults.DefaultAjaxTimeout;
		sAdditionalGetString = Utils.isUnd(sAdditionalGetString) ? '' : Utils.pString(sAdditionalGetString);

		if (bPost)
		{
			oParameters['XToken'] = Settings.settingsGet('Token');
		}

		Plugins.runHook('ajax-default-request', [sAction, oParameters, sAdditionalGetString]);

		this.setTrigger(fTrigger, true);

		oH = $.ajax({
			'type': bPost ? 'POST' : 'GET',
			'url': Links.ajax(sAdditionalGetString),
			'async': true,
			'dataType': 'json',
			'data': bPost ? (oParameters || {}) : {},
			'timeout': iTimeOut,
			'global': true
		}).always(function (oData, sTextStatus) {

			var bCached = false, oErrorData = null, sType = Enums.StorageResultType.Error;
			if (oData && oData['Time'])
			{
				bCached = Utils.pInt(oData['Time']) > Utils.microtime() - iStart;
			}

			// backward capability
			switch (true)
			{
				case 'success' === sTextStatus && oData && oData.Result && sAction === oData.Action:
					sType = Enums.StorageResultType.Success;
					break;
				case 'abort' === sTextStatus && (!oData || !oData.__aborted__):
					sType = Enums.StorageResultType.Abort;
					break;
			}

			Plugins.runHook('ajax-default-response', [sAction,
				Enums.StorageResultType.Success === sType ? oData : null, sType, bCached, oParameters]);

			if ('success' === sTextStatus)
			{
				if (oData && oData.Result && sAction === oData.Action)
				{
					oData.__cached__ = bCached;
					oDeferred.resolve(oData);
				}
				else if (oData && oData.Action)
				{
					oErrorData = oData;
					oDeferred.reject(oData.ErrorCode ? oData.ErrorCode : Enums.Notification.AjaxFalse);
				}
				else
				{
					oErrorData = oData;
					oDeferred.reject(Enums.Notification.AjaxParse);
				}
			}
			else if ('timeout' === sTextStatus)
			{
				oErrorData = oData;
				oDeferred.reject(Enums.Notification.AjaxTimeout);
			}
			else if ('abort' === sTextStatus)
			{
				if (!oData || !oData.__aborted__)
				{
					oDeferred.reject(Enums.Notification.AjaxAbort);
				}
			}
			else
			{
				oErrorData = oData;
				oDeferred.reject(Enums.Notification.AjaxParse);
			}

			if (self.oRequests[sAction])
			{
				self.oRequests[sAction] = null;
				delete self.oRequests[sAction];
			}

			self.setTrigger(fTrigger, false);

			if (oErrorData)
			{
				if (-1 < Utils.inArray(oErrorData.ErrorCode, [
					Enums.Notification.AuthError, Enums.Notification.AccessError,
					Enums.Notification.ConnectionError, Enums.Notification.DomainNotAllowed, Enums.Notification.AccountNotAllowed,
					Enums.Notification.MailServerError,	Enums.Notification.UnknownNotification, Enums.Notification.UnknownError
				]))
				{
					Globals.iAjaxErrorCount++;
				}

				if (Enums.Notification.InvalidToken === oErrorData.ErrorCode)
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

				if (oErrorData.ClearAuth || oErrorData.Logout || Consts.Values.AjaxErrorLimit < Globals.iAjaxErrorCount)
				{
					if (Globals.__APP__ && Globals.__APP__.clearClientSideToken)
					{
						Globals.__APP__.clearClientSideToken();
					}

					if (Globals.__APP__ && !oErrorData.ClearAuth && Globals.__APP__.loginAndLogoutReload)
					{
						Globals.__APP__.loginAndLogoutReload(false, true);
					}
				}
			}

		});

		if (oH)
		{
			if (this.oRequests[sAction])
			{
				this.oRequests[sAction] = null;
				delete this.oRequests[sAction];
			}

			this.oRequests[sAction] = oH;
		}

		return oDeferred.promise;
	};

	AbstractAjaxPromises.prototype.getRequest = function (sAction, fTrigger, sAdditionalGetString, iTimeOut)
	{
		sAdditionalGetString = Utils.isUnd(sAdditionalGetString) ? '' : Utils.pString(sAdditionalGetString);
		sAdditionalGetString = sAction + '/' + sAdditionalGetString;

		return this.ajaxRequest(sAction, false, iTimeOut, null, sAdditionalGetString, fTrigger);
	};

	AbstractAjaxPromises.prototype.postRequest = function (sAction, fTrigger, oParameters, iTimeOut)
	{
		oParameters = oParameters || {};
		oParameters['Action'] = sAction;

		return this.ajaxRequest(sAction, true, iTimeOut, oParameters, '', fTrigger);
	};

	module.exports = AbstractAjaxPromises;

}());
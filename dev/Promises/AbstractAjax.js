
var
	$ = require('$'),
	_ = require('_'),
	Promise = require('Promise'),

	Consts = require('Common/Consts'),
	Enums = require('Common/Enums'),
	Globals = require('Common/Globals'),
	Utils = require('Common/Utils'),
	Links = require('Common/Links'),
	Plugins = require('Common/Plugins'),

	Settings = require('Storage/Settings'),

	AbstractBasicPromises = require('Promises/AbstractBasic');

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

AbstractAjaxPromises.prototype.clear = function()
{
	this.oRequests = {};
};

AbstractAjaxPromises.prototype.abort = function(sAction, bClearOnly)
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

AbstractAjaxPromises.prototype.ajaxRequest = function(sAction, bPost, iTimeOut, oParameters, sAdditionalGetString, fTrigger)
{
	var self = this;
	return new Promise(function(resolve, reject) {

		var
			oH = null,
			iStart = Utils.microtime();

		iTimeOut = Utils.isNormal(iTimeOut) ? iTimeOut : Consts.DEFAULT_AJAX_TIMEOUT;
		sAdditionalGetString = Utils.isUnd(sAdditionalGetString) ? '' : Utils.pString(sAdditionalGetString);

		if (bPost)
		{
			oParameters.XToken = Settings.appSettingsGet('token');
		}

		Plugins.runHook('ajax-default-request', [sAction, oParameters, sAdditionalGetString]);

		self.setTrigger(fTrigger, true);

		oH = $.ajax({
			type: bPost ? 'POST' : 'GET',
			url: Links.ajax(sAdditionalGetString),
			async: true,
			dataType: 'json',
			data: bPost ? (oParameters || {}) : {},
			timeout: iTimeOut,
			global: true
		}).always(function(oData, sTextStatus) {
			var
				bCached = false,
				oErrorData = null,
				sType = Enums.StorageResultType.Error;

			if (oData && oData.Time)
			{
				bCached = Utils.pInt(oData.Time) > Utils.microtime() - iStart;
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
				// no default
			}

			Plugins.runHook('ajax-default-response', [sAction,
				Enums.StorageResultType.Success === sType ? oData : null, sType, bCached, oParameters]);

			if ('success' === sTextStatus)
			{
				if (oData && oData.Result && sAction === oData.Action)
				{
					oData.__cached__ = bCached;
					resolve(oData);
				}
				else if (oData && oData.Action)
				{
					oErrorData = oData;
					reject(oData.ErrorCode ? oData.ErrorCode : Enums.Notification.AjaxFalse);
				}
				else
				{
					oErrorData = oData;
					reject(Enums.Notification.AjaxParse);
				}
			}
			else if ('timeout' === sTextStatus)
			{
				oErrorData = oData;
				reject(Enums.Notification.AjaxTimeout);
			}
			else if ('abort' === sTextStatus)
			{
				if (!oData || !oData.__aborted__)
				{
					reject(Enums.Notification.AjaxAbort);
				}
			}
			else
			{
				oErrorData = oData;
				reject(Enums.Notification.AjaxParse);
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
					Globals.data.iAjaxErrorCount += 1;
				}

				if (Enums.Notification.InvalidToken === oErrorData.ErrorCode)
				{
					Globals.data.iTokenErrorCount += 1;
				}

				if (Consts.TOKEN_ERROR_LIMIT < Globals.data.iTokenErrorCount)
				{
					if (Globals.data.__APP__ && Globals.data.__APP__.loginAndLogoutReload)
					{
						Globals.data.__APP__.loginAndLogoutReload(false, true);
					}
				}

				if (oErrorData.ClearAuth || oErrorData.Logout || Consts.AJAX_ERROR_LIMIT < Globals.data.iAjaxErrorCount)
				{
					if (Globals.data.__APP__ && Globals.data.__APP__.clearClientSideToken)
					{
						Globals.data.__APP__.clearClientSideToken();
					}

					if (Globals.data.__APP__ && !oErrorData.ClearAuth && Globals.data.__APP__.loginAndLogoutReload)
					{
						Globals.data.__APP__.loginAndLogoutReload(false, true);
					}
				}
			}

		});

		if (oH)
		{
			if (self.oRequests[sAction])
			{
				self.oRequests[sAction] = null;
				delete self.oRequests[sAction];
			}

			self.oRequests[sAction] = oH;
		}
	});
};

AbstractAjaxPromises.prototype.getRequest = function(sAction, fTrigger, sAdditionalGetString, iTimeOut)
{
	sAdditionalGetString = Utils.isUnd(sAdditionalGetString) ? '' : Utils.pString(sAdditionalGetString);
	sAdditionalGetString = sAction + '/' + sAdditionalGetString;

	return this.ajaxRequest(sAction, false, iTimeOut, null, sAdditionalGetString, fTrigger);
};

AbstractAjaxPromises.prototype.postRequest = function(action, fTrigger, params, timeOut)
{
	params = params || {};
	params.Action = action;

	return this.ajaxRequest(action, true, timeOut, params, '', fTrigger);
};

module.exports = AbstractAjaxPromises;

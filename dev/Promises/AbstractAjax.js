
(function () {

	'use strict';

	var
		$ = require('$'),
		Q = require('Q'),

		Consts = require('Common/Consts'),
		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Links = require('Common/Links'),

		Settings = require('Storage/Settings')
	;

	/**
	* @constructor
	*/
	function AbstractAjaxPromises()
	{
		this.oRequests = {};
	}

	AbstractAjaxPromises.prototype.func = function (fFunc)
	{
		fFunc();

		return this;
	};

	AbstractAjaxPromises.prototype.fastPromise = function (mData)
	{
		var oDeferred = Q.defer();
		oDeferred.resolve(mData);
		return oDeferred.promise;
	};

	AbstractAjaxPromises.prototype.abort = function (sAction, bClearOnly)
	{
		if (this.oRequests[sAction])
		{
			if (!bClearOnly && this.oRequests[sAction].abort)
			{
				this.oRequests[sAction].__aborted = true;
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

		if (fTrigger)
		{
			fTrigger(true);
		}

		oH = $.ajax({
			'type': bPost ? 'POST' : 'GET',
			'url': Links.ajax(sAdditionalGetString),
			'async': true,
			'dataType': 'json',
			'data': bPost ? (oParameters || {}) : {},
			'timeout': iTimeOut,
			'global': true
		}).always(function (oData, sTextStatus) {

			var bCached = false;
			if (oData && oData['Time'])
			{
				bCached = Utils.pInt(oData['Time']) > Utils.microtime() - iStart;
			}

			if ('success' === sTextStatus)
			{
				if (oData && oData.Result && sAction === oData.Action)
				{
					oData.Result.__cached__ = bCached;
					oDeferred.resolve(oData.Result);
				}
				else if (oData && oData.Action)
				{
					oDeferred.reject(oData.ErrorCode ? oData.ErrorCode : Enums.Notification.AjaxFalse);
				}
				else
				{
					oDeferred.reject(Enums.Notification.AjaxParse);
				}
			}
			else if ('timeout' === sTextStatus)
			{
				oDeferred.reject(Enums.Notification.AjaxTimeout);
			}
			else if ('abort' === sTextStatus)
			{
				if (!oData || !oData.__aborted)
				{
					oDeferred.reject(Enums.Notification.AjaxAbort);
				}
			}
			else
			{
				oDeferred.reject(Enums.Notification.AjaxParse);
			}

			if (self.oRequests[sAction])
			{
				self.oRequests[sAction] = null;
				delete self.oRequests[sAction];
			}

			if (fTrigger)
			{
				fTrigger(false);
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
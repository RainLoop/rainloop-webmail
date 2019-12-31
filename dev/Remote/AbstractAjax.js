import window from 'window';
import _ from '_';
import $ from '$';

import { TOKEN_ERROR_LIMIT, AJAX_ERROR_LIMIT, DEFAULT_AJAX_TIMEOUT } from 'Common/Consts';
import { StorageResultType, Notification } from 'Common/Enums';
import { inArray, pInt, pString, isUnd } from 'Common/Utils';
import { data as GlobalsData } from 'Common/Globals';
import { ajax } from 'Common/Links';
import { runHook } from 'Common/Plugins';

import * as Settings from 'Storage/Settings';

class AbstractAjaxRemote {
	constructor() {
		this.oRequests = {};
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sRequestAction
	 * @param {string} sType
	 * @param {?AjaxJsonDefaultResponse} oData
	 * @param {boolean} bCached
	 * @param {*=} oRequestParameters
	 */
	defaultResponse(fCallback, sRequestAction, sType, oData, bCached, oRequestParameters) {
		const fCall = () => {
			if (StorageResultType.Success !== sType && GlobalsData.bUnload) {
				sType = StorageResultType.Unload;
			}

			if (StorageResultType.Success === sType && oData && !oData.Result) {
				if (
					oData &&
					-1 <
						inArray(oData.ErrorCode, [
							Notification.AuthError,
							Notification.AccessError,
							Notification.ConnectionError,
							Notification.DomainNotAllowed,
							Notification.AccountNotAllowed,
							Notification.MailServerError,
							Notification.UnknownNotification,
							Notification.UnknownError
						])
				) {
					GlobalsData.iAjaxErrorCount += 1;
				}

				if (oData && Notification.InvalidToken === oData.ErrorCode) {
					GlobalsData.iTokenErrorCount += 1;
				}

				if (TOKEN_ERROR_LIMIT < GlobalsData.iTokenErrorCount) {
					if (GlobalsData.__APP__ && GlobalsData.__APP__.loginAndLogoutReload) {
						GlobalsData.__APP__.loginAndLogoutReload(false, true);
					}
				}

				if (oData.ClearAuth || oData.Logout || AJAX_ERROR_LIMIT < GlobalsData.iAjaxErrorCount) {
					if (GlobalsData.__APP__ && GlobalsData.__APP__.clearClientSideToken) {
						GlobalsData.__APP__.clearClientSideToken();

						if (!oData.ClearAuth && GlobalsData.__APP__.loginAndLogoutReload) {
							GlobalsData.__APP__.loginAndLogoutReload(false, true);
						}
					}
				}
			} else if (StorageResultType.Success === sType && oData && oData.Result) {
				GlobalsData.iAjaxErrorCount = 0;
				GlobalsData.iTokenErrorCount = 0;
			}

			runHook('ajax-default-response', [
				sRequestAction,
				StorageResultType.Success === sType ? oData : null,
				sType,
				bCached,
				oRequestParameters
			]);

			if (fCallback) {
				fCallback(
					sType,
					StorageResultType.Success === sType ? oData : null,
					bCached,
					sRequestAction,
					oRequestParameters
				);
			}
		};

		switch (sType) {
			case 'success':
				sType = StorageResultType.Success;
				break;
			case 'abort':
				sType = StorageResultType.Abort;
				break;
			default:
				sType = StorageResultType.Error;
				break;
		}

		if (StorageResultType.Error === sType) {
			_.delay(fCall, 300);
		} else {
			fCall();
		}
	}

	/**
	 * @param {?Function} fResultCallback
	 * @param {Object} oParameters
	 * @param {?number=} iTimeOut = 20000
	 * @param {string=} sGetAdd = ''
	 * @param {Array=} aAbortActions = []
	 * @returns {jQuery.jqXHR}
	 */
	ajaxRequest(fResultCallback, params, iTimeOut = 20000, sGetAdd = '', abortActions = []) {
		const isPost = '' === sGetAdd,
			headers = {},
			start = new window.Date().getTime();

		let action = '';

		params = params || {};
		action = params.Action || '';

		if (action && 0 < abortActions.length) {
			_.each(abortActions, (actionToAbort) => {
				if (this.oRequests[actionToAbort]) {
					this.oRequests[actionToAbort].__aborted = true;
					if (this.oRequests[actionToAbort].abort) {
						this.oRequests[actionToAbort].abort();
					}
					this.oRequests[actionToAbort] = null;
				}
			});
		}

		if (isPost) {
			params.XToken = Settings.appSettingsGet('token');
		}

		const oDefAjax = $.ajax({
			type: isPost ? 'POST' : 'GET',
			url: ajax(sGetAdd),
			async: true,
			dataType: 'json',
			data: isPost ? params : {},
			headers: headers,
			timeout: iTimeOut,
			global: true
		});

		oDefAjax.always((oData, sType) => {
			let cached = false;
			if (oData && oData.Time) {
				cached = pInt(oData.Time) > new window.Date().getTime() - start;
			}

			if (oData && oData.UpdateToken) {
				if (GlobalsData.__APP__ && GlobalsData.__APP__.setClientSideToken) {
					GlobalsData.__APP__.setClientSideToken(oData.UpdateToken);
				}
			}

			if (action && this.oRequests[action]) {
				if (this.oRequests[action].__aborted) {
					sType = 'abort';
				}

				this.oRequests[action] = null;
			}

			this.defaultResponse(fResultCallback, action, sType, oData, cached, params);
		});

		if (action && 0 < abortActions.length && -1 < inArray(action, abortActions)) {
			if (this.oRequests[action]) {
				this.oRequests[action].__aborted = true;
				if (this.oRequests[action].abort) {
					this.oRequests[action].abort();
				}
				this.oRequests[action] = null;
			}

			this.oRequests[action] = oDefAjax;
		}

		// eslint-disable-next-line no-console
		oDefAjax.catch(console.log);
		return oDefAjax;
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sAction
	 * @param {Object=} oParameters
	 * @param {?number=} iTimeout
	 * @param {string=} sGetAdd = ''
	 * @param {Array=} aAbortActions = []
	 */
	defaultRequest(fCallback, sAction, oParameters, iTimeout, sGetAdd, aAbortActions) {
		oParameters = oParameters || {};
		oParameters.Action = sAction;

		sGetAdd = pString(sGetAdd);

		runHook('ajax-default-request', [sAction, oParameters, sGetAdd]);

		return this.ajaxRequest(
			fCallback,
			oParameters,
			isUnd(iTimeout) ? DEFAULT_AJAX_TIMEOUT : pInt(iTimeout),
			sGetAdd,
			aAbortActions
		);
	}

	/**
	 * @param {?Function} fCallback
	 */
	noop(fCallback) {
		this.defaultRequest(fCallback, 'Noop');
	}

	/**
	 * @param {?Function} fCallback
	 */
	getPublicKey(fCallback) {
		this.defaultRequest(fCallback, 'GetPublicKey');
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sVersion
	 */
	jsVersion(fCallback, sVersion) {
		this.defaultRequest(fCallback, 'Version', {
			'Version': sVersion
		});
	}
}

export { AbstractAjaxRemote, AbstractAjaxRemote as default };

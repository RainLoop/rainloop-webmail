import { TOKEN_ERROR_LIMIT, AJAX_ERROR_LIMIT, DEFAULT_AJAX_TIMEOUT } from 'Common/Consts';
import { StorageResultType, Notification } from 'Common/Enums';
import { pInt, pString } from 'Common/Utils';
import { data as GlobalsData } from 'Common/Globals';
import { ajax } from 'Common/Links';


class AbstractAjaxRemote {
	constructor() {
		this.oRequests = {};
	}

	abort(sAction, bClearOnly) {
		if (this.oRequests[sAction]) {
			if (!bClearOnly && this.oRequests[sAction].abort) {
//				this.oRequests[sAction].__aborted = true;
				this.oRequests[sAction].abort();
			}

			this.oRequests[sAction] = null;
			delete this.oRequests[sAction];
		}

		return this;
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
				const err = oData ? oData.ErrorCode : null;
				if (
					oData && [
							Notification.AuthError,
							Notification.AccessError,
							Notification.ConnectionError,
							Notification.DomainNotAllowed,
							Notification.AccountNotAllowed,
							Notification.MailServerError,
							Notification.UnknownNotification,
							Notification.UnknownError
						].includes(err)
				) {
					++GlobalsData.iAjaxErrorCount;
				}

				if (oData && Notification.InvalidToken === err) {
					++GlobalsData.iTokenErrorCount;
				}

				if (TOKEN_ERROR_LIMIT < GlobalsData.iTokenErrorCount) {
					rl.logoutReload();
				}

				if (oData.ClearAuth || oData.Logout || AJAX_ERROR_LIMIT < GlobalsData.iAjaxErrorCount) {
					if (GlobalsData.__APP__) {
						rl.hash.clear();

						if (!oData.ClearAuth) {
							rl.logoutReload();
						}
					}
				}
			} else if (StorageResultType.Success === sType && oData && oData.Result) {
				GlobalsData.iAjaxErrorCount = 0;
				GlobalsData.iTokenErrorCount = 0;
			}

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
			setTimeout(fCall, 300);
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
	 */
	ajaxRequest(fResultCallback, params, iTimeOut = 20000, sGetAdd = '', abortActions = []) {
		params = params || {};
		const start = Date.now(),
			action = params.Action || '';

		if (action && abortActions) {
			abortActions.forEach(actionToAbort => this.abort(actionToAbort));
		}

		let init = {};

		if (window.AbortController) {
			this.abort(action);
			const controller = new AbortController();
			if (iTimeOut) {
				setTimeout(() => controller.abort(), iTimeOut);
			}
			init.signal = controller.signal;
			this.oRequests[action] = controller;
		}

		return rl.fetchJSON(ajax(sGetAdd), init, iTimeOut, sGetAdd ? null : params)
			.then(oData => {
				let cached = false;
				if (oData && oData.Time) {
					cached = pInt(oData.Time) > Date.now() - start;
				}

				if (oData && oData.UpdateToken) {
					rl.hash.set();
					rl.settings.set('AuthAccountHash', oData.UpdateToken);
				}

				let sType = 'success';
				if (action && this.oRequests[action]) {
					if (this.oRequests[action].__aborted) {
						sType = 'abort';
					}

					this.oRequests[action] = null;
				}

				this.defaultResponse(fResultCallback, action, sType, oData, cached, params);
			}).catch(err => {
				if (err.name == 'AbortError') { // handle abort()
					return Promise.reject(Notification.AjaxAbort);
				}
				return Promise.reject(err);
			});
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

		return this.ajaxRequest(
			fCallback,
			oParameters,
			undefined === iTimeout ? DEFAULT_AJAX_TIMEOUT : pInt(iTimeout),
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

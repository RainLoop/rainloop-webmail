import { TOKEN_ERROR_LIMIT, AJAX_ERROR_LIMIT, DEFAULT_AJAX_TIMEOUT } from 'Common/Consts';
import { StorageResultType, Notification } from 'Common/Enums';
import { pInt, pString } from 'Common/Utils';
import { serverRequest } from 'Common/Links';

let iAjaxErrorCount = 0,
	iTokenErrorCount = 0,
	bUnload = false;

const getURL = (add = '') => serverRequest('Ajax') + add,

updateToken = data => {
	if (data.UpdateToken) {
		rl.hash.set();
		rl.settings.set('AuthAccountHash', data.UpdateToken);
	}
},

checkResponseError = data => {
	const err = data ? data.ErrorCode : null;
	if ([
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
		++iAjaxErrorCount;
	}

	if (Notification.InvalidToken === err) {
		++iTokenErrorCount;
	}

	if (TOKEN_ERROR_LIMIT < iTokenErrorCount) {
		rl.logoutReload();
	}

	if (window.rl && (data.ClearAuth || data.Logout || AJAX_ERROR_LIMIT < iAjaxErrorCount)) {
		rl.hash.clear();

		if (!data.ClearAuth) {
			rl.logoutReload();
		}
	}
},

oRequests = {};

addEventListener('unload', () => bUnload = true);

class AbstractFetchRemote
{
	abort(sAction, bClearOnly) {
		if (oRequests[sAction]) {
			if (!bClearOnly && oRequests[sAction].abort) {
//				oRequests[sAction].__aborted = true;
				oRequests[sAction].abort();
			}

			oRequests[sAction] = null;
			delete oRequests[sAction];
		}

		return this;
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sAction
	 * @param {Object=} oParameters
	 * @param {?number=} iTimeout
	 * @param {string=} sGetAdd = ''
	 * @param {Array=} aAbortActions = []
	 */
	defaultRequest(fCallback, sAction, params, iTimeout, sGetAdd, abortActions) {
		params = params || {};
		params.Action = sAction;

		sGetAdd = pString(sGetAdd);

		const start = Date.now(),
			action = params.Action || '';

		if (action && abortActions) {
			abortActions.forEach(actionToAbort => this.abort(actionToAbort));
		}

		return rl.fetchJSON(getURL(sGetAdd), {
				signal: this.createAbort(action, undefined === iTimeout ? DEFAULT_AJAX_TIMEOUT : pInt(iTimeout))
			}, sGetAdd ? null : params
		).then(data => {
			let cached = false;
			if (data) {
				if (data.Time) {
					cached = pInt(data.Time) > Date.now() - start;
				}

				updateToken(data);
			}

			let sType = 'success';
			if (action && oRequests[action]) {
				if (oRequests[action].__aborted) {
					sType = 'abort';
				}
				this.abort(action, true);
			}

			const fCall = () => {
				if (StorageResultType.Success !== sType && bUnload) {
					sType = StorageResultType.Unload;
				}

				if (StorageResultType.Success === sType && data && !data.Result) {
					checkResponseError(data);
				} else if (StorageResultType.Success === sType && data && data.Result) {
					iAjaxErrorCount = iTokenErrorCount = 0;
				}

				if (fCallback) {
					fCallback(
						sType,
						StorageResultType.Success === sType ? data : null,
						cached,
						action,
						params
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

		}).catch(err => {
			if (err.name == 'AbortError') { // handle abort()
				err = Notification.AjaxAbort;
			}
			return Promise.reject(err);
		});
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

	createAbort(action, timeout) {
		if (window.AbortController) {
			this.abort(action);
			const controller = new AbortController();
			if (timeout) {
				setTimeout(() => controller.abort(), timeout);
			}
			oRequests[action] = controller;
			return controller.signal;
		}
	}

	fastResolve(mData) {
		return Promise.resolve(mData);
	}

	setTrigger(trigger, value) {
		if (trigger) {
			value = !!value;
			(Array.isArray(trigger) ? trigger : [trigger]).forEach((fTrigger) => {
				if (fTrigger) {
					fTrigger(value);
				}
			});
		}
	}

	postRequest(action, fTrigger, params, timeOut) {
		params = params || {};
		params.Action = action;

		this.setTrigger(fTrigger, true);

		return rl.fetchJSON(getURL(), {
				signal: this.createAbort(action, pInt(timeOut, DEFAULT_AJAX_TIMEOUT))
			}, params
		).then(data => {
			this.abort(action, true);

			if (!data) {
				return Promise.reject(Notification.AjaxParse);
			}

			updateToken(data);
/*
			let isCached = false, type = '';
			if (data && data.Time) {
				isCached = pInt(data.Time) > microtime() - start;
			}
			// backward capability
			switch (true) {
				case 'success' === textStatus && data && data.Result && action === data.Action:
					type = StorageResultType.Success;
					break;
				case 'abort' === textStatus && (!data || !data.__aborted__):
					type = StorageResultType.Abort;
					break;
				default:
					type = StorageResultType.Error;
					break;
			}
*/
			this.setTrigger(fTrigger, false);

			if (!data.Result || action !== data.Action) {
				checkResponseError(data);
				const err = data ? data.ErrorCode : null;
				return Promise.reject(err || Notification.AjaxFalse);
			}

			return data;
		}).catch(err => {
			if (err.name == 'AbortError') { // handle abort()
				return Promise.reject(Notification.AjaxAbort);
			}
			return Promise.reject(err);
		});
	}
}

export { AbstractFetchRemote, AbstractFetchRemote as default };

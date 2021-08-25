import { Notification } from 'Common/Enums';
import { isArray, pInt, pString } from 'Common/Utils';
import { serverRequest } from 'Common/Links';

let iJsonErrorCount = 0,
	iTokenErrorCount = 0;

const getURL = (add = '') => serverRequest('Json') + add,

checkResponseError = data => {
	const err = data ? data.ErrorCode : null;
	if (Notification.InvalidToken === err && 10 < ++iTokenErrorCount) {
		rl.logoutReload();
	} else {
		if ([
				Notification.AuthError,
				Notification.ConnectionError,
				Notification.DomainNotAllowed,
				Notification.AccountNotAllowed,
				Notification.MailServerError,
				Notification.UnknownNotification,
				Notification.UnknownError
			].includes(err)
		) {
			++iJsonErrorCount;
		}
		if (data.Logout || 7 < iJsonErrorCount) {
			rl.logoutReload();
		}
	}
},

oRequests = {},

abort = (sAction, bClearOnly) => {
	if (oRequests[sAction]) {
		if (!bClearOnly && oRequests[sAction].abort) {
//			oRequests[sAction].__aborted = true;
			oRequests[sAction].abort();
		}

		oRequests[sAction] = null;
		delete oRequests[sAction];
	}
},

fetchJSON = (action, sGetAdd, params, timeout, jsonCallback) => {
	sGetAdd = pString(sGetAdd);
	params = params || {};
	if (params instanceof FormData) {
		params.set('Action', action);
	} else {
		params.Action = action;
	}
	let init = {};
	if (window.AbortController) {
		abort(action);
		const controller = new AbortController();
		timeout && setTimeout(() => controller.abort(), timeout);
		oRequests[action] = controller;
		init.signal = controller.signal;
	}
	return rl.fetchJSON(getURL(sGetAdd), init, sGetAdd ? null : params).then(jsonCallback);
};

class FetchError extends Error
{
	constructor(code, message) {
		super(message);
		this.code = code || Notification.JsonFalse;
	}
}

export class AbstractFetchRemote
{
	abort(sAction, bClearOnly) {
		abort(sAction, bClearOnly);
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

		const start = Date.now();

		if (sAction && abortActions) {
			abortActions.forEach(actionToAbort => abort(actionToAbort));
		}

		fetchJSON(sAction, sGetAdd,
			params,
			undefined === iTimeout ? 30000 : pInt(iTimeout),
			data => {
				let cached = false;
				if (data && data.Time) {
					cached = pInt(data.Time) > Date.now() - start;
				}

				let iError = 0;
				if (sAction && oRequests[sAction]) {
					if (oRequests[sAction].__aborted) {
						iError = 2;
					}
					abort(sAction, true);
				}

				if (!iError && data) {
/*
					if (sAction !== data.Action) {
						console.log(sAction + ' !== ' + data.Action);
					}
*/
					if (data.Result) {
						iJsonErrorCount = iTokenErrorCount = 0;
					} else {
						checkResponseError(data);
						iError = data.ErrorCode || Notification.UnknownError
					}
				}

				fCallback && fCallback(
					iError,
					data,
					cached,
					sAction,
					params
				);
			}
		)
		.catch(err => {
			console.error(err);
			fCallback && fCallback(err.name == 'AbortError' ? 2 : 1);
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
			Version: sVersion
		});
	}

	fastResolve(mData) {
		return Promise.resolve(mData);
	}

	setTrigger(trigger, value) {
		if (trigger) {
			value = !!value;
			(isArray(trigger) ? trigger : [trigger]).forEach(fTrigger => {
				fTrigger && fTrigger(value);
			});
		}
	}

	postRequest(action, fTrigger, params, timeOut) {
		this.setTrigger(fTrigger, true);
		return fetchJSON(action, '', params, pInt(timeOut, 30000),
			data => {
				abort(action, true);

				if (!data) {
					return Promise.reject(new FetchError(Notification.JsonParse));
				}
/*
				let isCached = false, type = '';
				if (data && data.Time) {
					isCached = pInt(data.Time) > microtime() - start;
				}
				// backward capability
				switch (true) {
					case 'success' === textStatus && data && data.Result && action === data.Action:
						type = AbstractFetchRemote.SUCCESS;
						break;
					case 'abort' === textStatus && (!data || !data.__aborted__):
						type = AbstractFetchRemote.ABORT;
						break;
					default:
						type = AbstractFetchRemote.ERROR;
						break;
				}
*/
				this.setTrigger(fTrigger, false);

				if (!data.Result || action !== data.Action) {
					checkResponseError(data);
					return Promise.reject(new FetchError(
						data ? data.ErrorCode : 0,
						data ? (data.ErrorMessageAdditional || data.ErrorMessage) : ''
					));
				}

				return data;
			}
		);
	}
}

Object.assign(AbstractFetchRemote.prototype, {
	SUCCESS : 0,
	ERROR : 1,
	ABORT : 2
});

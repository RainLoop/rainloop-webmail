import { StorageResultType, Notification } from 'Common/Enums';
import { Settings } from 'Common/Globals';
import { pInt, pString } from 'Common/Utils';
import { serverRequest } from 'Common/Links';

let iJsonErrorCount = 0,
	iTokenErrorCount = 0,
	bUnload = false;

const getURL = (add = '') => serverRequest('Json') + add,

updateToken = data => {
	if (data.UpdateToken) {
		rl.hash.set();
		Settings.set('AuthAccountHash', data.UpdateToken);
	}
},

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
		if (window.rl && (data.ClearAuth || data.Logout || 7 < iJsonErrorCount)) {
			rl.hash.clear();
			if (!data.ClearAuth) {
				rl.logoutReload();
			}
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
	params.Action = action;
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

addEventListener('unload', () => bUnload = true);

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
				if (data) {
					if (data.Time) {
						cached = pInt(data.Time) > Date.now() - start;
					}

					updateToken(data);
				}

				let sType = 'success';
				if (sAction && oRequests[sAction]) {
					if (oRequests[sAction].__aborted) {
						sType = 'abort';
					}
					abort(sAction, true);
				}

				const fCall = () => {
					if (StorageResultType.Success !== sType && bUnload) {
						sType = StorageResultType.Unload;
					}

					if (StorageResultType.Success === sType && data) {
						if (data.Result) {
							iJsonErrorCount = iTokenErrorCount = 0;
						} else {
							checkResponseError(data);
						}
					}

					if (fCallback) {
						fCallback(
							sType,
							StorageResultType.Success === sType ? data : null,
							cached,
							sAction,
							params
						);
					}
				};

				switch (sType) {
					case 'success':
						sType = StorageResultType.Success;
						fCall();
						break;
					case 'abort':
						sType = StorageResultType.Abort;
						fCall();
						break;
					default:
						sType = StorageResultType.Error;
						setTimeout(fCall, 300);
						break;
				}
			}
		)
		.catch(err => {
			console.error(err);
			fCallback && fCallback(err.name == 'AbortError' ? Notification.JsonAbort : StorageResultType.Error);
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

	fastResolve(mData) {
		return Promise.resolve(mData);
	}

	setTrigger(trigger, value) {
		if (trigger) {
			value = !!value;
			(Array.isArray(trigger) ? trigger : [trigger]).forEach(fTrigger => {
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
					return Promise.reject(Notification.JsonParse);
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
					return Promise.reject(err || Notification.JsonFalse);
				}

				return data;
			}
		);
	}
}

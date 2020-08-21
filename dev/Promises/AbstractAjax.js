import { ajax } from 'Common/Links';
import { pInt, pString } from 'Common/Utils';
import { DEFAULT_AJAX_TIMEOUT, TOKEN_ERROR_LIMIT, AJAX_ERROR_LIMIT } from 'Common/Consts';
import { Notification } from 'Common/Enums';
import { data as GlobalsData } from 'Common/Globals';
import * as Settings from 'Storage/Settings';

import { AbstractBasicPromises } from 'Promises/AbstractBasic';

class AbstractAjaxPromises extends AbstractBasicPromises {
	oRequests = {};

	constructor() {
		super();

		this.clear();
	}

	clear() {
		this.oRequests = {};
	}

	abort(sAction, bClearOnly) {
		if (this.oRequests[sAction]) {
			if (!bClearOnly && this.oRequests[sAction].abort) {
//				this.oRequests[sAction].__aborted__ = true;
				this.oRequests[sAction].abort();
			}

			this.oRequests[sAction] = null;
			delete this.oRequests[sAction];
		}

		return this;
	}

	ajaxRequest(action, isPost, timeOut, params, additionalGetString, fTrigger) {

		additionalGetString = pString(additionalGetString);

		let init = {
			mode: 'same-origin',
			cache: 'no-cache',
			redirect: 'error',
			referrerPolicy: 'no-referrer',
			credentials: 'same-origin'
		};
		if (isPost) {
			init.method = 'POST';
			init.headers = {
//				'Content-Type': 'application/json'
				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
			};
			params.XToken = Settings.appSettingsGet('token');
//			init.body = JSON.stringify(params);
			const formData = new FormData(),
			buildFormData = (formData, data, parentKey) => {
				if (data && typeof data === 'object' && !(data instanceof Date || data instanceof File)) {
					Object.keys(data).forEach(key =>
						buildFormData(formData, data[key], parentKey ? `${parentKey}[${key}]` : key)
					);
				} else {
					formData.set(parentKey, data == null ? '' : data);
				}
			};
			buildFormData(formData, params);
			init.body = new URLSearchParams(formData);
		}

		this.setTrigger(fTrigger, true);

		if (window.AbortController) {
			this.abort(action);
			const controller = new AbortController();
			setTimeout(() => controller.abort(), pInt(timeOut, DEFAULT_AJAX_TIMEOUT));
			init.signal = controller.signal;
			this.oRequests[action] = controller;
		}

		return fetch(ajax(additionalGetString), init)
			.then(response => response.json())
			.then(data => {
				this.abort(action, true);

				if (!data) {
					return Promise.reject(Notification.AjaxParse);
				}

				if (data.UpdateToken && GlobalsData.__APP__ && GlobalsData.__APP__.setClientSideToken) {
					GlobalsData.__APP__.setClientSideToken(data.UpdateToken);
				}

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
					if ([
							Notification.AuthError,
							Notification.AccessError,
							Notification.ConnectionError,
							Notification.DomainNotAllowed,
							Notification.AccountNotAllowed,
							Notification.MailServerError,
							Notification.UnknownNotification,
							Notification.UnknownError
						].includes(data.ErrorCode)
					) {
						++GlobalsData.iAjaxErrorCount;
					}

					if (Notification.InvalidToken === data.ErrorCode) {
						++GlobalsData.iTokenErrorCount;
					}

					if (TOKEN_ERROR_LIMIT < GlobalsData.iTokenErrorCount) {
						if (GlobalsData.__APP__ && GlobalsData.__APP__.loginAndLogoutReload) {
							GlobalsData.__APP__.loginAndLogoutReload(false, true);
						}
					}

					if (data.ClearAuth || data.Logout || AJAX_ERROR_LIMIT < GlobalsData.iAjaxErrorCount) {
						if (GlobalsData.__APP__ && GlobalsData.__APP__.clearClientSideToken) {
							GlobalsData.__APP__.clearClientSideToken();
						}

						if (GlobalsData.__APP__ && !data.ClearAuth && GlobalsData.__APP__.loginAndLogoutReload) {
							GlobalsData.__APP__.loginAndLogoutReload(false, true);
						}
					}

					return Promise.reject(data.ErrorCode ? data.ErrorCode : Notification.AjaxFalse);
				}

				return data;
			}).catch(err => {
				if (err.name == 'AbortError') { // handle abort()
					return Promise.reject(Notification.AjaxAbort);
				}
				return Promise.reject(err);
			});
	}

	getRequest(sAction, fTrigger, sAdditionalGetString, iTimeOut) {
		sAdditionalGetString = undefined === sAdditionalGetString ? '' : pString(sAdditionalGetString);
		sAdditionalGetString = sAction + '/' + sAdditionalGetString;

		return this.ajaxRequest(sAction, false, iTimeOut, null, sAdditionalGetString, fTrigger);
	}

	postRequest(action, fTrigger, params, timeOut) {
		params = params || {};
		params.Action = action;

		return this.ajaxRequest(action, true, timeOut, params, '', fTrigger);
	}
}

export { AbstractAjaxPromises, AbstractAjaxPromises as default };

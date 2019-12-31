import window from 'window';
import $ from '$';

import { ajax } from 'Common/Links';
import { microtime, isUnd, isNormal, pString, pInt, inArray } from 'Common/Utils';
import { DEFAULT_AJAX_TIMEOUT, TOKEN_ERROR_LIMIT, AJAX_ERROR_LIMIT } from 'Common/Consts';
import { StorageResultType, Notification } from 'Common/Enums';
import { data as GlobalsData } from 'Common/Globals';
import * as Plugins from 'Common/Plugins';
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
				this.oRequests[sAction].__aborted__ = true;
				this.oRequests[sAction].abort();
			}

			this.oRequests[sAction] = null;
			delete this.oRequests[sAction];
		}

		return this;
	}

	ajaxRequest(action, isPost, timeOut, params, additionalGetString, fTrigger) {
		return new window.Promise((resolve, reject) => {
			const start = microtime();

			timeOut = isNormal(timeOut) ? timeOut : DEFAULT_AJAX_TIMEOUT;
			additionalGetString = isUnd(additionalGetString) ? '' : pString(additionalGetString);

			if (isPost) {
				params.XToken = Settings.appSettingsGet('token');
			}

			Plugins.runHook('ajax-default-request', [action, params, additionalGetString]);

			this.setTrigger(fTrigger, true);

			const oH = $.ajax({
				type: isPost ? 'POST' : 'GET',
				url: ajax(additionalGetString),
				async: true,
				dataType: 'json',
				data: isPost ? params || {} : {},
				timeout: timeOut,
				global: true
			}).always((data, textStatus) => {
				let isCached = false,
					errorData = null;

				if (data && data.Time) {
					isCached = pInt(data.Time) > microtime() - start;
				}

				if (data && data.UpdateToken) {
					if (GlobalsData.__APP__ && GlobalsData.__APP__.setClientSideToken) {
						GlobalsData.__APP__.setClientSideToken(data.UpdateToken);
					}
				}

				// backward capability
				let type = '';
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

				Plugins.runHook('ajax-default-response', [
					action,
					StorageResultType.Success === type ? data : null,
					type,
					isCached,
					params
				]);

				if ('success' === textStatus) {
					if (data && data.Result && action === data.Action) {
						data.__cached__ = isCached;
						resolve(data);
					} else if (data && data.Action) {
						errorData = data;
						reject(data.ErrorCode ? data.ErrorCode : Notification.AjaxFalse);
					} else {
						errorData = data;
						reject(Notification.AjaxParse);
					}
				} else if ('timeout' === textStatus) {
					errorData = data;
					reject(Notification.AjaxTimeout);
				} else if ('abort' === textStatus) {
					if (!data || !data.__aborted__) {
						reject(Notification.AjaxAbort);
					}
				} else {
					errorData = data;
					reject(Notification.AjaxParse);
				}

				if (this.oRequests[action]) {
					this.oRequests[action] = null;
					delete this.oRequests[action];
				}

				this.setTrigger(fTrigger, false);

				if (errorData) {
					if (
						-1 <
						inArray(errorData.ErrorCode, [
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

					if (Notification.InvalidToken === errorData.ErrorCode) {
						GlobalsData.iTokenErrorCount += 1;
					}

					if (TOKEN_ERROR_LIMIT < GlobalsData.iTokenErrorCount) {
						if (GlobalsData.__APP__ && GlobalsData.__APP__.loginAndLogoutReload) {
							GlobalsData.__APP__.loginAndLogoutReload(false, true);
						}
					}

					if (errorData.ClearAuth || errorData.Logout || AJAX_ERROR_LIMIT < GlobalsData.iAjaxErrorCount) {
						if (GlobalsData.__APP__ && GlobalsData.__APP__.clearClientSideToken) {
							GlobalsData.__APP__.clearClientSideToken();
						}

						if (GlobalsData.__APP__ && !errorData.ClearAuth && GlobalsData.__APP__.loginAndLogoutReload) {
							GlobalsData.__APP__.loginAndLogoutReload(false, true);
						}
					}
				}
			});

			if (oH) {
				if (this.oRequests[action]) {
					this.oRequests[action] = null;
					delete this.oRequests[action];
				}

				this.oRequests[action] = oH;
			}
		});
	}

	getRequest(sAction, fTrigger, sAdditionalGetString, iTimeOut) {
		sAdditionalGetString = isUnd(sAdditionalGetString) ? '' : pString(sAdditionalGetString);
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

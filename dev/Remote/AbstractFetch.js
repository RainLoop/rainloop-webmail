import { Notifications } from 'Common/Enums';
import { isArray, pInt, pString } from 'Common/Utils';
import { serverRequest } from 'Common/Links';
import { getNotification } from 'Common/Translator';

let iJsonErrorCount = 0;

const getURL = (add = '') => serverRequest('Json') + pString(add),

checkResponseError = data => {
	const err = data ? data.ErrorCode : null;
	if (Notifications.InvalidToken === err) {
		console.error(getNotification(err));
//		alert(getNotification(err));
		rl.logoutReload();
	} else if ([
			Notifications.AuthError,
			Notifications.ConnectionError,
			Notifications.DomainNotAllowed,
			Notifications.AccountNotAllowed,
			Notifications.MailServerError,
			Notifications.UnknownNotification,
			Notifications.UnknownError
		].includes(err)
	) {
		if (7 < ++iJsonErrorCount) {
			rl.logoutReload();
		}
	}
},

oRequests = {},

abort = (sAction, sReason, bClearOnly) => {
	let controller = oRequests[sAction];
	oRequests[sAction] = null;
	if (controller) {
		clearTimeout(controller.timeoutId);
		bClearOnly || controller.abort(new DOMException(sAction, sReason || 'AbortError'));
	}
},

fetchJSON = (action, sUrl, params, timeout, jsonCallback) => {
	if (params) {
		if (params instanceof FormData) {
			params.set('Action', action);
		} else {
			params.Action = action;
		}
	}
	// Don't abort, read https://github.com/the-djmaze/snappymail/issues/487
//	abort(action, 0, 1);
	const controller = new AbortController(),
		signal = controller.signal;
	oRequests[action] = controller;
	// Currently there is no way to combine multiple signals, so AbortSignal.timeout() not possible
	controller.timeoutId = timeout && setTimeout(() => abort(action, 'TimeoutError'), timeout);
	return rl.fetchJSON(sUrl, {signal: signal}, params).then(data => {
		abort(action, 0, 1);
		return jsonCallback ? jsonCallback(data) : Promise.resolve(data);
	}).catch(err => {
		clearTimeout(controller.timeoutId);
		err.aborted = signal.aborted;
		return Promise.reject(err);
	});
};

class FetchError extends Error
{
	constructor(code, message) {
		super(message);
		this.code = code || Notifications.JsonFalse;
	}
}

export class AbstractFetchRemote
{
	abort(sAction, sReason) {
		abort(sAction, sReason);
		return this;
	}

	/**
	 * Allows quicker visual responses to the user.
	 * Can be used to stream lines of json encoded data, but does not work on all servers.
	 * Apache needs 'flushpackets' like in <Proxy "fcgi://...." flushpackets=on></Proxy>
	 */
	streamPerLine(fCallback, sGetAdd, postData) {
		rl.fetch(getURL(sGetAdd), {}, postData)
		.then(response => response.body)
		.then(body => {
			let buffer = '';
			const
				// Firefox TextDecoderStream is not defined
//				reader = body.pipeThrough(new TextDecoderStream()).getReader();
				reader = body.getReader(),
				re = /\r\n|\n|\r/gm,
				utf8decoder = new TextDecoder(),
				processText = ({ done, value }) => {
					buffer += value ? utf8decoder.decode(value, {stream: true}) : '';
					for (;;) {
						let result = re.exec(buffer);
						if (!result) {
							if (done) {
								break;
							}
							reader.read().then(processText);
							return;
						}
						fCallback(buffer.slice(0, result.index));
						buffer = buffer.slice(result.index + 1);
						re.lastIndex = 0;
					}
					// last line didn't end in a newline char
					buffer.length && fCallback(buffer);
				};
			reader.read().then(processText);
		})
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sAction
	 * @param {Object=} oParameters
	 * @param {?number=} iTimeout
	 * @param {string=} sGetAdd = ''
	 */
	request(sAction, fCallback, params, iTimeout, sGetAdd) {
		params = params || {};

		const start = Date.now();

		fetchJSON(sAction, getURL(sGetAdd),
			sGetAdd ? null : (params || {}),
			undefined === iTimeout ? 30000 : pInt(iTimeout),
			data => {
				let iError = 0;
				if (data) {
/*
					if (sAction !== data.Action) {
						console.log(sAction + ' !== ' + data.Action);
					}
*/
					if (data.Result) {
						iJsonErrorCount = 0;
					} else {
						checkResponseError(data);
						iError = data.ErrorCode || Notifications.UnknownError
					}
				}

				fCallback && fCallback(
					iError,
					data,
					/**
					 * Responses like "304 Not Modified" are returned as "200 OK"
					 * This is an attempt to detect if the request comes from cache.
					 * But when client has wrong date/time, it will fail.
					 */
					data?.epoch && data.epoch < Math.floor(start / 1000) - 60
				);
			}
		)
		.catch(err => {
			console.error({fetchError:err});
			fCallback && fCallback(
				'TimeoutError' == err.name ? 3 : (err.name == 'AbortError' ? 2 : 1),
				err
			);
		});
	}

	setTrigger(trigger, value) {
		if (trigger) {
			value = !!value;
			(isArray(trigger) ? trigger : [trigger]).forEach(fTrigger => {
				fTrigger?.(value);
			});
		}
	}

	get(action, url) {
		return fetchJSON(action, url);
	}

	post(action, fTrigger, params, timeOut) {
		this.setTrigger(fTrigger, true);
		return fetchJSON(action, getURL(), params || {}, pInt(timeOut, 30000),
			data => {
				abort(action, 0, 1);

				if (!data) {
					return Promise.reject(new FetchError(Notifications.JsonParse));
				}
/*
				let isCached = false, type = '';
				if (data?.epoch) {
					isCached = data.epoch > microtime() - start;
				}
				// backward capability
				switch (true) {
					case 'success' === textStatus && data?.Result && action === data.Action:
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

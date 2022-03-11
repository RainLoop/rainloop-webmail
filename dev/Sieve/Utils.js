export const
	// import { i18n } from 'Common/Translator';
	i18n = rl.i18n,

	// import { forEachObjectValue, forEachObjectEntry } from 'Common/Utils';
	forEachObjectValue = (obj, fn) => Object.values(obj).forEach(fn),
	forEachObjectEntry = (obj, fn) => Object.entries(obj).forEach(([key, value]) => fn(key, value)),

	// import { koArrayWithDestroy } from 'External/ko';
	// With this we don't need delegateRunOnDestroy
	koArrayWithDestroy = data => {
		data = ko.observableArray(data);
		data.subscribe(changes =>
			changes.forEach(item =>
				'deleted' === item.status && null == item.moved && item.value.onDestroy && item.value.onDestroy()
			)
		, data, 'arrayChange');
		return data;
	},

	// import { koComputable } from 'External/ko';
	koComputable = fn => ko.computed(fn, {'pure':true}),

	arrayToString = (arr, separator) =>
		arr.map(item => item.toString ? item.toString() : item).join(separator),
/*
	getNotificationMessage = code => {
		let key = getKeyByValue(Notification, code);
		return key ? I18N_DATA.NOTIFICATIONS[i18nKey(key).replace('_NOTIFICATION', '_ERROR')] : '';
		rl.i18n('NOTIFICATIONS/')
	},
	getNotification = (code, message = '', defCode = 0) => {
		code = parseInt(code, 10) || 0;
		if (Notification.ClientViewError === code && message) {
			return message;
		}

		return getNotificationMessage(code)
			|| getNotificationMessage(parseInt(defCode, 10))
			|| '';
	},
*/
	getNotification = code => 'ERROR ' + code,

	Remote = rl.app.Remote,

	// capabilities
	capa = ko.observableArray(),

	// Sieve scripts SieveScriptModel
	scripts = koArrayWithDestroy(),

	loading = ko.observable(false),
	serverError = ko.observable(false),
	serverErrorDesc = ko.observable(''),
	setError = text => {
		serverError(true);
		serverErrorDesc(text);
	};

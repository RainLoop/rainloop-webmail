import {
	capa,
	scripts,
	loading,
	serverError,
	serverErrorDesc,
	setError,
	updateList,
	getNotification,
	Remote
} from 'Sieve/Utils';

import { SieveScriptPopupView } from 'Sieve/View/Script';

// SieveUserStore
window.Sieve = {
	capa: capa,
	scripts: scripts,
	setError: setError,
	updateList: updateList,
	loading: loading,
	serverError: serverError,
	serverErrorDesc: serverErrorDesc,
	ScriptView: SieveScriptPopupView,

	folderList: null,

	deleteScript: script => {
		serverError(false);
		Remote.request('FiltersScriptDelete',
			(iError, data) => {
				if (iError) {
					setError((data && data.ErrorMessageAdditional) || getNotification(iError));
				} else {
					scripts.remove(script);
				}
			},
			{name:script.name()}
		);
	},

	toggleScript(script) {
		let name = script.active() ? '' : script.name();
		serverError(false);
		Remote.request('FiltersScriptActivate',
			(iError, data) => {
				if (iError) {
					setError((data && data.ErrorMessageAdditional) || iError)
				} else {
					scripts.forEach(script => script.active(script.name() === name));
				}
			},
			{name:name}
		);
	}
};

import {
	capa,
	forEachObjectValue,
	getNotification,
	loading,
	Remote,
	scripts,
	serverError,
	serverErrorDesc,
	setError
} from 'Sieve/Utils';

import { SieveScriptModel } from 'Sieve/Model/Script';
import { SieveScriptPopupView } from 'Sieve/View/Script';

// SieveUserStore
window.Sieve = {
	capa: capa,
	scripts: scripts,
	loading: loading,
	serverError: serverError,
	serverErrorDesc: serverErrorDesc,
	ScriptView: SieveScriptPopupView,

	folderList: null,

	updateList: () => {
		if (!loading()) {
			loading(true);
			serverError(false);

			Remote.request('Filters', (iError, data) => {
				loading(false);
				scripts([]);

				if (iError) {
					capa([]);
					setError(getNotification(iError));
				} else {
					capa(data.Result.Capa);
/*
					scripts(
						data.Result.Scripts.map(aItem => SieveScriptModel.reviveFromJson(aItem)).filter(v => v)
					);
*/
					forEachObjectValue(data.Result.Scripts, value => {
						value = SieveScriptModel.reviveFromJson(value);
						value && (value.allowFilters() ? scripts.unshift(value) : scripts.push(value))
					});
				}
			});
		}
	},

	deleteScript: script => {
		serverError(false);
		Remote.request('FiltersScriptDelete',
			(iError, data) =>
				iError
					? setError(data?.ErrorMessageAdditional || getNotification(iError))
					: scripts.remove(script)
			,
			{name:script.name()}
		);
	},

	setActiveScript(name) {
		serverError(false);
		Remote.request('FiltersScriptActivate',
			(iError, data) =>
				iError
					? setError(data?.ErrorMessageAdditional || iError)
					: scripts.forEach(script => script.active(script.name() === name))
			,
			{name:name}
		);
	}
};

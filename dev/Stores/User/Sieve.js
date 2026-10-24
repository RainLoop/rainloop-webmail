import { koArrayWithDestroy } from 'External/ko';

export const SieveUserStore = {
	// capabilities
	capa: ko.observableArray(),
	// Sieve scripts SieveScriptModel
	scripts: koArrayWithDestroy()
}

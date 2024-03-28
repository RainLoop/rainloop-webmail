import { koComputable, addObservablesTo } from 'External/ko';
import { FolderUserStore } from 'Stores/User/Folder';
import { SettingsGet/*, SettingsCapa*/ } from 'Common/Globals';

//export class UserSettingsFilters /*extends AbstractViewSettings*/ {
export class UserSettingsFilters /*extends AbstractViewSettings*/ {
	constructor() {
		this.scripts = ko.observableArray();
		this.loading = ko.observable(true).extend({ debounce: 200 });
		addObservablesTo(this, {
			serverError: false,
			serverErrorDesc: ''
		});

		rl.loadScript(SettingsGet('StaticLibsJs').replace('/libs.', '/sieve.')).then(() => {
			const Sieve = window.Sieve;
			Sieve.folderList = FolderUserStore.folderList;
			Sieve.serverError.subscribe(value => this.serverError(value));
			Sieve.serverErrorDesc.subscribe(value => this.serverErrorDesc(value));
			Sieve.loading.subscribe(value => this.loading(value));
			Sieve.scripts.subscribe(value => this.scripts(value));
			Sieve.updateList();
		}).catch(e => console.error(e));

		this.hasActive = koComputable(() => this.scripts().filter(script=>script.active()).length);

		this.scriptForDeletion = ko.observable(null).askDeleteHelper();
	}

/*
	// TODO: issue on account switch
	// When current domain has sieve but the new has not, or current has not and the new has
	disabled() {
		return !SettingsCapa('Sieve');
	}
*/

	addScript() {
		this.editScript();
	}

	editScript(script) {
		window.Sieve.ScriptView.showModal(script ? [script] : null);
	}

	deleteScript(script) {
		window.Sieve.deleteScript(script);
	}

	disableScripts() {
		window.Sieve.setActiveScript('');
	}

	enableScript(script) {
		window.Sieve.setActiveScript(script.name());
	}

	onBuild(oDom) {
		oDom.addEventListener('click', event => {
			const el = event.target.closestWithin('.script-item .script-name', oDom),
				script = el && ko.dataFor(el);
			script && this.editScript(script);
		});
	}

	onShow() {
		window.Sieve?.updateList();
	}
}

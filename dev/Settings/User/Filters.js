import { addObservablesTo } from 'External/ko';
import { staticLink } from 'Common/Links';
import { FolderUserStore } from 'Stores/User/Folder';

//export class UserSettingsFilters /*extends AbstractViewSettings*/ {
export class UserSettingsFilters /*extends AbstractViewSettings*/ {
	constructor() {
		this.scripts = ko.observableArray();
		this.loading = ko.observable(true).extend({ debounce: 200 });
		addObservablesTo(this, {
			serverError: false,
			serverErrorDesc: ''
		});

		rl.loadScript(staticLink('js/sieve.js')).then(() => {
			const Sieve = window.Sieve;
			Sieve.folderList = FolderUserStore.folderList;
			Sieve.serverError.subscribe(value => this.serverError(value));
			Sieve.serverErrorDesc.subscribe(value => this.serverErrorDesc(value));
			Sieve.loading.subscribe(value => this.loading(value));
			Sieve.scripts.subscribe(value => this.scripts(value));
			Sieve.updateList();
		}).catch(e => console.error(e));

		this.scriptForDeletion = ko.observable(null).askDeleteHelper();
	}

	addScript() {
		this.editScript();
	}

	editScript(script) {
		window.Sieve.ScriptView.showModal(script ? [script] : null);
	}

	deleteScript(script) {
		window.Sieve.deleteScript(script);
	}

	toggleScript(script) {
		window.Sieve.toggleScript(script);
	}

	onBuild(oDom) {
		oDom.addEventListener('click', event => {
			const el = event.target.closestWithin('.script-item .e-action', oDom),
				script = el && ko.dataFor(el);
			script && this.editScript(script);
		});
	}

	onShow() {
		window.Sieve && window.Sieve.updateList();
	}
}

import ko from 'ko';
import { Settings } from 'Common/Globals';
import Remote from 'Remote/Admin/Fetch';

export class AdminSettingsAbout /*extends AbstractViewSettings*/ {
	constructor() {
		this.version = Settings.app('version');
		this.phpextensions = ko.observableArray();
	}

	onBuild() {
		Remote.request('AdminPHPExtensions', (iError, data) => iError || this.phpextensions(data.Result));
	}

}

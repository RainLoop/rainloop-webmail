import ko from 'ko';
import { Settings } from 'Common/Globals';
import Remote from 'Remote/Admin/Fetch';

export class AboutAdminSettings /*extends AbstractViewSettings*/ {
	constructor() {
		this.version = ko.observable(Settings.app('version'));
		this.phpextensions = ko.observableArray();
	}

	onBuild() {
		Remote.phpExtensions((iError, data) => iError || this.phpextensions(data.Result));
	}

}

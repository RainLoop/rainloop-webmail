import ko from 'ko';
import { Settings } from 'Common/Globals';

export class AboutAdminSettings /*extends AbstractViewSettings*/ {
	constructor() {
		this.version = ko.observable(Settings.app('version'));
	}
}

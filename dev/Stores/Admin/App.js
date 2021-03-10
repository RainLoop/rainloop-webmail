import ko from 'ko';
import { SettingsGet } from 'Common/Globals';

export const AppAdminStore = {
	weakPassword: ko.observable(false),
	dataFolderAccess: ko.observable(false),

	populate: function() {
		this.weakPassword(!!SettingsGet('WeakPassword'));
/*
		SettingsGet('WeakPassword')
			&& fetch('./data/VERSION?' + Math.random()).then(() => this.dataFolderAccess(true));
*/
	}
};

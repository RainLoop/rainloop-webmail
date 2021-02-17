import ko from 'ko';

export const AppAdminStore = {
	weakPassword: ko.observable(false),
	dataFolderAccess: ko.observable(false),

	populate: function() {
		this.weakPassword(!!rl.settings.get('WeakPassword'));
/*
		rl.settings.get('WeakPassword')
			&& fetch('./data/VERSION?' + Math.random()).then(() => this.dataFolderAccess(true));
*/
	}
};

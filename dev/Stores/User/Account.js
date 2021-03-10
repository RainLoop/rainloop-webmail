import ko from 'ko';
import { SettingsGet } from 'Common/Globals';

class AccountUserStore {
	constructor() {
		ko.addObservablesTo(this, {
			email: '',
			parentEmail: '',
			signature: ''
		});

		this.accounts = ko.observableArray();
		this.accounts.loading = ko.observable(false).extend({ debounce: 100 });

		this.getEmailAddresses = () => this.accounts.map(item => item ? item.email : null).filter(v => v);

		this.accountsUnreadCount = ko.computed(() => 0);
		// this.accountsUnreadCount = ko.computed(() => {
		// 	let result = 0;
		// 	this.accounts().forEach(item => {
		// 		if (item)
		// 		{
		// 			result += item.count();
		// 		}
		// 	});
		// 	return result;
		// });
	}

	populate() {
		this.email(SettingsGet('Email'));
		this.parentEmail(SettingsGet('ParentEmail'));
	}
}

export default new AccountUserStore();

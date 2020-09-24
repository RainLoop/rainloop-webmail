import ko from 'ko';

class AccountUserStore {
	constructor() {
		this.email = ko.observable('');
		this.parentEmail = ko.observable('');

		this.signature = ko.observable('');

		this.accounts = ko.observableArray([]);
		this.accounts.loading = ko.observable(false).extend({ throttle: 100 });

		this.getEmailAddresses = () => this.accounts().map(item => item ? item.email : null).filter(value => !!value);

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
		this.email(rl.settings.get('Email'));
		this.parentEmail(rl.settings.get('ParentEmail'));
	}

	/**
	 * @returns {boolean}
	 */
	isRootAccount() {
		return !this.parentEmail();
	}
}

export default new AccountUserStore();

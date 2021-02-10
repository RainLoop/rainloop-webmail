import ko from 'ko';

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

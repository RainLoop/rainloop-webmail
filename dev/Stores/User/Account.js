import ko from 'ko';
import _ from '_';
import { Magics } from 'Common/Enums';
import * as Settings from 'Storage/Settings';

class AccountUserStore {
	constructor() {
		this.email = ko.observable('');
		this.parentEmail = ko.observable('');

		this.signature = ko.observable('');

		this.accounts = ko.observableArray([]);
		this.accounts.loading = ko.observable(false).extend({ throttle: Magics.Time100ms });

		this.computers();
	}

	computers() {
		this.accountsEmails = ko.computed(() => _.compact(_.map(this.accounts(), (item) => (item ? item.email : null))));

		this.accountsUnreadCount = ko.computed(() => 0);
		// this.accountsUnreadCount = ko.computed(() => {
		// 	let result = 0;
		// 	_.each(this.accounts(), (item) => {
		// 		if (item)
		// 		{
		// 			result += item.count();
		// 		}
		// 	});
		// 	return result;
		// });
	}

	populate() {
		this.email(Settings.settingsGet('Email'));
		this.parentEmail(Settings.settingsGet('ParentEmail'));
	}

	/**
	 * @returns {boolean}
	 */
	isRootAccount() {
		return '' === this.parentEmail();
	}
}

export default new AccountUserStore();

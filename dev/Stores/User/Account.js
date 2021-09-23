import ko from 'ko';
import { addObservablesTo } from 'Common/Utils';

export const AccountUserStore = {
	accounts: ko.observableArray(),
	loading: ko.observable(false).extend({ debounce: 100 }),

	getEmailAddresses: () => AccountUserStore.accounts.map(item => item ? item.email : null).filter(v => v),

	accountsUnreadCount: ko.computed(() => 0),
	// accountsUnreadCount: ko.computed(() => {
	// 	let result = 0;
	// 	AccountUserStore.accounts().forEach(item => {
	// 		if (item) {
	// 			result += item.count();
	// 		}
	// 	});
	// 	return result;
	// }),
};

addObservablesTo(AccountUserStore, {
	email: '',
	parentEmail: '',
	signature: ''
});

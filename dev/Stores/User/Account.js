import ko from 'ko';
import { addObservablesTo } from 'Common/Utils';

export const AccountUserStore = {
	accounts: ko.observableArray(),
	loading: ko.observable(false).extend({ debounce: 100 }),

	getEmailAddresses: () => AccountUserStore.accounts.map(item => item.email)
};

addObservablesTo(AccountUserStore, {
	email: '',
	signature: ''
});

import { i18n } from 'Common/Translator';
import { root } from 'Common/Links';

export default App => {

	rl.app = App;
	rl.logoutReload = App.logoutReload;

	rl.i18n = i18n;

	rl.Enums = {
		StorageResultType: {
			Success: 0,
			Error: 1,
			Abort: 2
		}
	};

	rl.route = {
		root: () => {
			rl.route.off();
			hasher.setHash(root());
		},
		reload: () => {
			rl.route.root();
			setTimeout(() => location.reload(), 100);
		},
		off: () => hasher.active = false,
		on: () => hasher.active = true
	};

};

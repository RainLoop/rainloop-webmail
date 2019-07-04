import ko from 'ko';

import * as Settings from 'Storage/Settings';

import { view, ViewType } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@view({
	name: 'View/User/About',
	type: ViewType.Center,
	templateID: 'About'
})
class AboutUserView extends AbstractViewNext {
	constructor() {
		super();
		this.version = ko.observable(Settings.appSettingsGet('version'));
	}
}

export { AboutUserView, AboutUserView as default };

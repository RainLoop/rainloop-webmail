
import _ from '_';
import $ from '$';
import key from 'key';

import {KeyState, Magics} from 'Common/Enums';
import {leftPanelDisabled} from 'Common/Globals';
import {settings, inbox} from 'Common/Links';
import {getFolderInboxName} from 'Common/Cache';

import * as Settings from 'Storage/Settings';

import {view, ViewType, setHash} from 'Knoin/Knoin';
import {AbstractViewNext} from 'Knoin/AbstractViewNext';

@view({
	name: 'View/User/Settings/Menu',
	type: ViewType.Left,
	templateID: 'SettingsMenu'
})
class MenuSettingsUserView extends AbstractViewNext
{
	/**
	 * @param {Object} screen
	 */
	constructor(screen) {
		super();

		this.leftPanelDisabled = leftPanelDisabled;

		this.mobile = Settings.appSettingsGet('mobile');

		this.menu = screen.menu;
	}

	onBuild(dom) {
		if (this.mobile)
		{
			dom.on('click', '.b-settings-menu .e-item.selectable', () => {
				leftPanelDisabled(true);
			});
		}

		key('up, down', KeyState.Settings, _.throttle((event, handler) => {

			const
				up = handler && 'up' === handler.shortcut,
				$items = $('.b-settings-menu .e-item', dom);

			if (event && $items.length)
			{
				let iIndex = $items.index($items.filter('.selected'));
				if (up && 0 < iIndex)
				{
					iIndex -= 1;
				}
				else if (!up && iIndex < $items.length - 1)
				{
					iIndex += 1;
				}

				const sH = $items.eq(iIndex).attr('href');
				if (sH)
				{
					setHash(sH, false, true);
				}
			}

		}, Magics.Time200ms));
	}

	link(route) {
		return settings(route);
	}

	backToMailBoxClick() {
		setHash(inbox(getFolderInboxName()));
	}
}

export {MenuSettingsUserView, MenuSettingsUserView as default};

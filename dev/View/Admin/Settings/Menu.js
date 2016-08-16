
import _ from '_';
import $ from '$';
import key from 'key';

import {leftPanelDisabled} from 'Common/Globals';
import {Magics} from 'Common/Enums';

import {view, ViewType, setHash} from 'Knoin/Knoin';
import {AbstractViewNext} from 'Knoin/AbstractViewNext';

@view({
	name: 'View/Admin/Settings/Menu',
	type: ViewType.Left,
	templateID: 'AdminMenu'
})
class MenuSettingsAdminView extends AbstractViewNext
{
	/**
	 * @param {?} screen
	 */
	constructor(screen) {

		super();

		this.leftPanelDisabled = leftPanelDisabled;

		this.menu = screen.menu;
	}

	link(route) {
		return '#/' + route;
	}

	onBuild(dom) {

		key('up, down', _.throttle((event, handler) => {

			const
				up = handler && 'up' === handler.shortcut,
				$items = $('.b-admin-menu .e-item', dom);

			if (event && $items.length)
			{
				let index = $items.index($items.filter('.selected'));
				if (up && 0 < index)
				{
					index -= 1;
				}
				else if (!up && index < $items.length - 1)
				{
					index += 1;
				}

				const sH = $items.eq(index).attr('href');
				if (sH)
				{
					setHash(sH, false, true);
				}
			}

		}, Magics.Time200ms));
	}
}

export {MenuSettingsAdminView, MenuSettingsAdminView as default};

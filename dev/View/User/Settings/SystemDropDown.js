import { view, ViewType } from 'Knoin/Knoin';
import { AbstractSystemDropDownUserView } from 'View/User/AbstractSystemDropDown';

@view({
	name: 'View/User/Settings/SystemDropDown',
	type: ViewType.Right,
	templateID: 'SystemDropDown'
})
class SystemDropDownSettingsUserView extends AbstractSystemDropDownUserView {}

export { SystemDropDownSettingsUserView, SystemDropDownSettingsUserView as default };

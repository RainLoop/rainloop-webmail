import { view, ViewType } from 'Knoin/Knoin';
import { AbstractSystemDropDownUserView } from 'View/User/AbstractSystemDropDown';

@view({
	name: 'View/User/MailBox/SystemDropDown',
	type: ViewType.Right,
	templateID: 'SystemDropDown'
})
class SystemDropDownMailBoxUserView extends AbstractSystemDropDownUserView {}

export { SystemDropDownMailBoxUserView, SystemDropDownMailBoxUserView as default };

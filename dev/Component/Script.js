import $ from '$';
import { AbstractComponent, componentExportHelper } from 'Component/Abstract';

class ScriptComponent extends AbstractComponent {
	/**
	 * @param {Object} params
	 */
	constructor(params) {
		super();

		if (
			params.component &&
			params.component.templateNodes &&
			params.element &&
			params.element[0] &&
			params.element[0].outerHTML
		) {
			let script = params.element[0].outerHTML;
			script = !script ? '' : script.replace(/<x-script/i, '<script').replace(/<b><\/b><\/x-script>/i, '</script>');

			if (script) {
				params.element.text('');
				params.element.replaceWith(
					$(script).text(
						params.component.templateNodes[0] && params.component.templateNodes[0].nodeValue
							? params.component.templateNodes[0].nodeValue
							: ''
					)
				);
			} else {
				params.element.remove();
			}
		}
	}
}

export default componentExportHelper(ScriptComponent, 'ScriptComponent');

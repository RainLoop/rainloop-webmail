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
			params.element
		) {
			let el = params.element, script = el.outerHTML;
			script = script ? script.replace(/<x-script/i, '<script').replace(/<b><\/b><\/x-script>/i, '</script>') : '';

			if (script) {
				const koNodes = params.component.templateNodes[0];
				el.textContent = '';
				el.replaceWith(
					Element.fromHTML(script).textContent = koNodes && koNodes.nodeValue ? koNodes.nodeValue : ''
				);
			} else {
				el.remove();
			}
		}
	}
}

export default componentExportHelper(ScriptComponent, 'ScriptComponent');

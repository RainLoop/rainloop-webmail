
(function () {

	'use strict';

	var
		_ = require('_'),
		$ = require('$'),

		AbstractComponent = require('Component/Abstract')
	;

	/**
	 * @constructor
	 *
	 * @param {Object} oParams
	 *
	 * @extends AbstractComponent
	 */
	function ScriptComponent(oParams)
	{
		AbstractComponent.call(this);

		if (oParams.component && oParams.component.templateNodes && oParams.element &&
			oParams.element[0] && oParams.element[0].outerHTML)
		{
			var sScript = oParams.element[0].outerHTML;
			sScript = sScript
				.replace(/<x-script/i, '<script')
				.replace(/<b><\/b><\/x-script>/i, '</script>')
			;

			if (sScript)
			{
				oParams.element.text('');
				oParams.element.replaceWith(
					$(sScript).text(oParams.component.templateNodes[0] &&
						oParams.component.templateNodes[0].nodeValue ?
							oParams.component.templateNodes[0].nodeValue : ''));
			}
			else
			{
				oParams.element.remove();
			}
		}
	}

	_.extend(ScriptComponent.prototype, AbstractComponent.prototype);

	module.exports = AbstractComponent.componentExportHelper(ScriptComponent);

}());

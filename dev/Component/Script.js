
(function () {

	'use strict';

	var
		_ = require('_'),

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

		if (oParams.component && oParams.component.templateNodes && oParams.element)
		{
			oParams.element.text('');
			if (oParams.component.templateNodes[0] && oParams.component.templateNodes[0].nodeValue)
			{
				oParams.element.replaceWith(
					$('<script></script>').text(oParams.component.templateNodes[0].nodeValue));
			}
		}
	}

	_.extend(ScriptComponent.prototype, AbstractComponent.prototype);

	module.exports = AbstractComponent.componentExportHelper(ScriptComponent);

}());


import {_} from 'common';
import ko from 'ko';
import Utils from 'Common/Utils';

class AbstractComponent
{
	constructor() {
		this.disposable = [];
	}

	dispose() {
		_.each(this.disposable, (funcToDispose) => {
			if (funcToDispose && funcToDispose.dispose)
			{
				funcToDispose.dispose();
			}
		});
	}
}

/**
 * @param {*} ClassObject
 * @param {string} templateID
 * @return {Object}
 */
const componentExportHelper = (ClassObject, templateID) => {
	return {
		template: templateID ? {element: templateID} : '<b></b>',
		viewModel: {
			createViewModel: (params, componentInfo) => {

				params = params || {};
				params.element = null;

				if (componentInfo && componentInfo.element)
				{
					params.component = componentInfo;
					params.element = $(componentInfo.element);

					require('Common/Translator').i18nToNodes(params.element);

					if (!Utils.isUnd(params.inline) && ko.unwrap(params.inline))
					{
						params.element.css('display', 'inline-block');
					}
				}

				return new ClassObject(params);
			}
		}
	};
}

export {AbstractComponent, componentExportHelper};

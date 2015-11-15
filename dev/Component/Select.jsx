
import Utils from 'Common/Utils';
import Translator from 'Common/Translator';
import {componentExportHelper} from 'Component/Abstract';
import {AbstractInput} from 'Component/AbstractInput';

class SelectComponent extends AbstractInput
{
	/**
	 * @param {Object} params
	 */
	constructor(params) {

		super(params);

		this.options = params.options || '';

		this.optionsText = params.optionsText || null;
		this.optionsValue = params.optionsValue || null;
		this.optionsCaption = params.optionsCaption || null;

		if (this.optionsCaption)
		{
			this.optionsCaption = Translator.i18n(this.optionsCaption);
		}

		this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;
	}
}

module.exports = componentExportHelper(SelectComponent, 'SelectComponent');


import {$} from 'common';

let
	cachedUrl = null,
	getUtl = () => {
		if (!cachedUrl)
		{
			const version = $('#rlAppVersion').attr('content') || '0.0.0';
			cachedUrl = `rainloop/v/${version}/static/css/svg/icons.svg`;
		}

		return cachedUrl;
	}
;

module.exports = {
	template: '<b></b>',
	viewModel: {
		createViewModel: (params, componentInfo) => {
			if (componentInfo && componentInfo.element)
			{
				const icon = params.icon || 'null';
				$(componentInfo.element).replaceWith(
					`<svg class="svg-icon svg-icon-${icon}"><use xlink:href="${getUtl()}#svg-icon-${icon}"></use></svg>`
				);
			}
		}
	}
};

let cachedUrl = null;
const getUrl = () => {
	if (!cachedUrl) {
		const version = jQuery('#rlAppVersion').attr('content') || '0.0.0';
		cachedUrl = `rainloop/v/${version}/static/css/svg/icons.svg`;
	}

	return cachedUrl;
};

export default {
	template: '<b></b>',
	viewModel: {
		createViewModel: ({ icon = 'null' }, componentInfo) => {
			if (componentInfo && componentInfo.element) {
				jQuery(componentInfo.element).replaceWith(
					`<svg class="svg-icon svg-icon-${icon}"><use xlink:href="${getUrl()}#svg-icon-${icon}"></use></svg>`
				);
			}
		}
	}
};

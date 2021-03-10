import ko from 'ko';

// import Remote from 'Remote/User/Fetch';

export const TemplateUserStore = new class {
	constructor() {
		this.templates = ko.observableArray();
		this.templates.loading = ko.observable(false).extend({ debounce: 100 });

		this.templatesNames = ko.observableArray().extend({ debounce: 1000 });
		this.templatesNames.skipFirst = true;

		this.subscribers();
	}

	subscribers() {
		this.templates.subscribe((list) => {
			this.templatesNames(list.map(item => (item ? item.name : null)).filter(v => v));
		});

		// this.templatesNames.subscribe((aList) => {
		// 	if (this.templatesNames.skipFirst)
		// 	{
		// 		this.templatesNames.skipFirst = false;
		// 	}
		// 	else if (aList && aList.length)
		// 	{
		// 		Remote.templatesSortOrder(null, aList);
		// 	}
		// });
	}
};

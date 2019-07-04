import ko from 'ko';
import _ from '_';

// import Remote from 'Remote/User/Ajax';

class TemplateUserStore {
	constructor() {
		this.templates = ko.observableArray([]);
		this.templates.loading = ko.observable(false).extend({ throttle: 100 });

		this.templatesNames = ko.observableArray([]).extend({ throttle: 1000 });
		this.templatesNames.skipFirst = true;

		this.subscribers();
	}

	subscribers() {
		this.templates.subscribe((list) => {
			this.templatesNames(_.compact(_.map(list, (item) => (item ? item.name : null))));
		});

		// this.templatesNames.subscribe((aList) => {
		// 	if (this.templatesNames.skipFirst)
		// 	{
		// 		this.templatesNames.skipFirst = false;
		// 	}
		// 	else if (aList && 1 < aList.length)
		// 	{
		// 		Remote.templatesSortOrder(null, aList);
		// 	}
		// });
	}
}

export default new TemplateUserStore();

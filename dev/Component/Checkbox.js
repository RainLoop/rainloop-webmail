export class CheckboxComponent {
	constructor(params = {}) {
		this.name = params.name;

		this.value = ko.isObservable(params.value) ? params.value
			: ko.observable(!!params.value);

		this.enable = ko.isObservable(params.enable) ? params.enable
			: ko.observable(params.enable ?? 1);

		this.label = params.label;
	}

	click() {
		this.enable() && this.value(!this.value());
	}
}

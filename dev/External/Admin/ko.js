import 'External/ko';
import ko from 'ko';
import { SaveSettingsStep } from 'Common/Enums';

// functions

ko.observable.fn.idleTrigger = function() {
	this.trigger = ko.observable(SaveSettingsStep.Idle);
	return this;
};

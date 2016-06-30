
var
	_ = require('_'),
	ko = require('ko'),

	Settings = require('Storage/Settings'),

	kn = require('Knoin/Knoin'),
	AbstractView = require('Knoin/AbstractView');

/**
 * @constructor
 * @extends AbstractView
 */
function AboutUserView()
{
	AbstractView.call(this, 'Center', 'About');

	this.version = ko.observable(Settings.appSettingsGet('version'));

	kn.constructorEnd(this);
}

kn.extendAsViewModel(['View/User/About', 'View/App/About', 'AboutViewModel'], AboutUserView);
_.extend(AboutUserView.prototype, AbstractView.prototype);

module.exports = AboutUserView;

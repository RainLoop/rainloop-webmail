
import window from 'window';
import ko from 'ko';

class QuotaUserStore
{
	constructor() {
		this.quota = ko.observable(0);
		this.usage = ko.observable(0);

		this.percentage = ko.computed(() => {

			const
				quota = this.quota(),
				usage = this.usage();

			return 0 < quota ? window.Math.ceil((usage / quota) * 100) : 0;

		});
	}

	/**
	 * @param {number} quota
	 * @param {number} usage
	 */
	populateData(quota, usage) {
		this.quota(quota * 1024);
		this.usage(usage * 1024);
	}
}

module.exports = new QuotaUserStore();

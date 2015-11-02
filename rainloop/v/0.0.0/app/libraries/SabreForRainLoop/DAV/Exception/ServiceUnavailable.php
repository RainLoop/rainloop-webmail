<?php

namespace SabreForRainLoop\DAV\Exception;

use SabreForRainLoop\DAV;

/**
 * ServiceUnavailable
 *
 * This exception is thrown in case the service
 * is currently not available (e.g. down for maintenance).
 *
 * @author Thomas Müller <thomas.mueller@tmit.eu>
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class ServiceUnavailable extends DAV\Exception {

	/**
	 * Returns the HTTP statuscode for this exception
	 *
	 * @return int
	 */
	public function getHTTPCode() {

		return 503;

	}

}

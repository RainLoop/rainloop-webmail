<?php

namespace SabreForRainLoop\DAV\Exception;

use SabreForRainLoop\DAV;

/**
 * NotAuthenticated
 *
 * This exception is thrown when the client did not provide valid
 * authentication credentials.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class NotAuthenticated extends DAV\Exception {

    /**
     * Returns the HTTP statuscode for this exception
     *
     * @return int
     */
    public function getHTTPCode() {

        return 401;

    }

}

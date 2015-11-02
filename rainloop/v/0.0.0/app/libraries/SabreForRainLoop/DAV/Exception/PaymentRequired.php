<?php

namespace SabreForRainLoop\DAV\Exception;

use SabreForRainLoop\DAV;

/**
 * Payment Required
 *
 * The PaymentRequired exception may be thrown in a case where a user must pay
 * to access a certain resource or operation.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class PaymentRequired extends DAV\Exception {

    /**
     * Returns the HTTP statuscode for this exception
     *
     * @return int
     */
    public function getHTTPCode() {

        return 402;

    }

}

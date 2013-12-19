<?php

namespace Sabre\DAV\Exception;

/**
 * BadRequest
 *
 * The BadRequest is thrown when the user submitted an invalid HTTP request
 * BadRequest
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class BadRequest extends \Sabre\DAV\Exception {

    /**
     * Returns the HTTP statuscode for this exception
     *
     * @return int
     */
    public function getHTTPCode() {

        return 400;

    }

}

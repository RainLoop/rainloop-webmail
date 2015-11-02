<?php

namespace SabreForRainLoop\DAV\Exception;

/**
 * MethodNotAllowed
 *
 * The 405 is thrown when a client tried to create a directory on an already existing directory
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class MethodNotAllowed extends \SabreForRainLoop\DAV\Exception {

    /**
     * Returns the HTTP statuscode for this exception
     *
     * @return int
     */
    public function getHTTPCode() {

        return 405;

    }

    /**
     * This method allows the exception to return any extra HTTP response headers.
     *
     * The headers must be returned as an array.
     *
     * @param \SabreForRainLoop\DAV\Server $server
     * @return array
     */
    public function getHTTPHeaders(\SabreForRainLoop\DAV\Server $server) {

        $methods = $server->getAllowedMethods($server->getRequestUri());

        return array(
            'Allow' => strtoupper(implode(', ',$methods)),
        );

    }

}

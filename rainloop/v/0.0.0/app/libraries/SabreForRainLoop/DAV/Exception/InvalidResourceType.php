<?php

namespace SabreForRainLoop\DAV\Exception;

/**
 * InvalidResourceType
 *
 * This exception is thrown when the user tried to create a new collection, with
 * a special resourcetype value that was not recognized by the server.
 *
 * See RFC5689 section 3.3
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class InvalidResourceType extends Forbidden {

    /**
     * This method allows the exception to include additional information into the WebDAV error response
     *
     * @param DAV\Server $server
     * @param \DOMElement $errorNode
     * @return void
     */
    public function serialize(\SabreForRainLoop\DAV\Server $server,\DOMElement $errorNode) {

        $error = $errorNode->ownerDocument->createElementNS('DAV:','d:valid-resourcetype');
        $errorNode->appendChild($error);

    }

}

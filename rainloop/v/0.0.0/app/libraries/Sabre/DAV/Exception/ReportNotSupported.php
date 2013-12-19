<?php

namespace Sabre\DAV\Exception;

use Sabre\DAV;

/**
 * ReportNotSupported
 *
 * This exception is thrown when the client requested an unknown report through the REPORT method
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class ReportNotSupported extends Forbidden {

    /**
     * This method allows the exception to include additional information into the WebDAV error response
     *
     * @param DAV\Server $server
     * @param \DOMElement $errorNode
     * @return void
     */
    public function serialize(DAV\Server $server,\DOMElement $errorNode) {

        $error = $errorNode->ownerDocument->createElementNS('DAV:','d:supported-report');
        $errorNode->appendChild($error);

    }

}

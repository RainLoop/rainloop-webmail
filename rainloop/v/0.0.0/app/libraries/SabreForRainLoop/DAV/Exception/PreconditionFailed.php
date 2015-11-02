<?php

namespace SabreForRainLoop\DAV\Exception;

use SabreForRainLoop\DAV;

/**
 * PreconditionFailed
 *
 * This exception is normally thrown when a client submitted a conditional request,
 * like for example an If, If-None-Match or If-Match header, which caused the HTTP
 * request to not execute (the condition of the header failed)
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class PreconditionFailed extends DAV\Exception {

    /**
     * When this exception is thrown, the header-name might be set.
     *
     * This allows the exception-catching code to determine which HTTP header
     * caused the exception.
     *
     * @var string
     */
    public $header = null;

    /**
     * Create the exception
     *
     * @param string $message
     * @param string $header
     */
    public function __construct($message, $header=null) {

        parent::__construct($message);
        $this->header = $header;

    }

    /**
     * Returns the HTTP statuscode for this exception
     *
     * @return int
     */
    public function getHTTPCode() {

        return 412;

    }

    /**
     * This method allows the exception to include additional information into the WebDAV error response
     *
     * @param DAV\Server $server
     * @param \DOMElement $errorNode
     * @return void
     */
    public function serialize(DAV\Server $server,\DOMElement $errorNode) {

        if ($this->header) {
            $prop = $errorNode->ownerDocument->createElement('s:header');
            $prop->nodeValue = $this->header;
            $errorNode->appendChild($prop);
        }

    }

}

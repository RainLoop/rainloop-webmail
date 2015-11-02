<?php

namespace SabreForRainLoop\DAV\Exception;

use SabreForRainLoop\DAV;

/**
 * Locked
 *
 * The 423 is thrown when a client tried to access a resource that was locked, without supplying a valid lock token
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class Locked extends DAV\Exception {

    /**
     * Lock information
     *
     * @var SabreForRainLoop\DAV\Locks\LockInfo
     */
    protected $lock;

    /**
     * Creates the exception
     *
     * A LockInfo object should be passed if the user should be informed
     * which lock actually has the file locked.
     *
     * @param DAV\Locks\LockInfo $lock
     */
    public function __construct(DAV\Locks\LockInfo $lock = null) {

        $this->lock = $lock;

    }

    /**
     * Returns the HTTP statuscode for this exception
     *
     * @return int
     */
    public function getHTTPCode() {

        return 423;

    }

    /**
     * This method allows the exception to include additional information into the WebDAV error response
     *
     * @param DAV\Server $server
     * @param \DOMElement $errorNode
     * @return void
     */
    public function serialize(DAV\Server $server,\DOMElement $errorNode) {

        if ($this->lock) {
            $error = $errorNode->ownerDocument->createElementNS('DAV:','d:lock-token-submitted');
            $errorNode->appendChild($error);

            $href = $errorNode->ownerDocument->createElementNS('DAV:','d:href');
            $href->appendChild($errorNode->ownerDocument->createTextNode($this->lock->uri));
            $error->appendChild(
                $href
            );
        }

    }

}


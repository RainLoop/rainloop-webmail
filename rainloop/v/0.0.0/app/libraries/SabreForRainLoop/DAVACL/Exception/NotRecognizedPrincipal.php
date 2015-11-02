<?php

namespace SabreForRainLoop\DAVACL\Exception;

use SabreForRainLoop\DAV;

/**
 * If a client tried to set a privilege assigned to a non-existant principal,
 * this exception will be thrown.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class NotRecognizedPrincipal extends DAV\Exception\PreconditionFailed {

    /**
     * Adds in extra information in the xml response.
     *
     * This method adds the {DAV:}recognized-principal element as defined in rfc3744
     *
     * @param DAV\Server $server
     * @param \DOMElement $errorNode
     * @return void
     */
    public function serialize(DAV\Server $server,\DOMElement $errorNode) {

        $doc = $errorNode->ownerDocument;

        $np = $doc->createElementNS('DAV:','d:recognized-principal');
        $errorNode->appendChild($np);

    }

}

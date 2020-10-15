<?php

namespace SabreForRainLoop\DAVACL;

/**
 * Principals Collection
 *
 * This collection represents a list of users.
 * The users are instances of SabreForRainLoop\DAVACL\Principal
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class PrincipalCollection extends AbstractPrincipalCollection {

    /**
     * This method returns a node for a principal.
     *
     * The passed array contains principal information, and is guaranteed to
     * at least contain a uri item. Other properties may or may not be
     * supplied by the authentication backend.
     *
     * @param array $principal
     * @return \SabreForRainLoop\DAV\INode
     */
    public function getChildForPrincipal(array $principal) {

        return new Principal($this->principalBackend, $principal);

    }

}

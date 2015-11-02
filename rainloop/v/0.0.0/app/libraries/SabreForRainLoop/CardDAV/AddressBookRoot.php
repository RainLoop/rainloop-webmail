<?php

namespace SabreForRainLoop\CardDAV;

use SabreForRainLoop\DAVACL;

/**
 * AddressBook rootnode
 *
 * This object lists a collection of users, which can contain addressbooks.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class AddressBookRoot extends DAVACL\AbstractPrincipalCollection {

    /**
     * Principal Backend
     *
     * @var SabreForRainLoop\DAVACL\PrincipalBackend\BackendInteface
     */
    protected $principalBackend;

    /**
     * CardDAV backend
     *
     * @var Backend\BackendInterface
     */
    protected $carddavBackend;

    /**
     * Constructor
     *
     * This constructor needs both a principal and a carddav backend.
     *
     * By default this class will show a list of addressbook collections for
     * principals in the 'principals' collection. If your main principals are
     * actually located in a different path, use the $principalPrefix argument
     * to override this.
     *
     * @param DAVACL\PrincipalBackend\BackendInterface $principalBackend
     * @param Backend\BackendInterface $carddavBackend
     * @param string $principalPrefix
     */
    public function __construct(DAVACL\PrincipalBackend\BackendInterface $principalBackend,Backend\BackendInterface $carddavBackend, $principalPrefix = 'principals') {

        $this->carddavBackend = $carddavBackend;
        parent::__construct($principalBackend, $principalPrefix);

    }

    /**
     * Returns the name of the node
     *
     * @return string
     */
    public function getName() {

        return Plugin::ADDRESSBOOK_ROOT;

    }

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

        return new UserAddressBooks($this->carddavBackend, $principal['uri']);

    }

}

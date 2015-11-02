<?php

namespace SabreForRainLoop\CalDAV;

use SabreForRainLoop\DAVACL\PrincipalBackend;

/**
 * Calendars collection
 *
 * This object is responsible for generating a list of calendar-homes for each
 * user.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class CalendarRootNode extends \SabreForRainLoop\DAVACL\AbstractPrincipalCollection {

    /**
     * CalDAV backend
     *
     * @var SabreForRainLoop\CalDAV\Backend\BackendInterface
     */
    protected $caldavBackend;

    /**
     * Constructor
     *
     * This constructor needs both an authentication and a caldav backend.
     *
     * By default this class will show a list of calendar collections for
     * principals in the 'principals' collection. If your main principals are
     * actually located in a different path, use the $principalPrefix argument
     * to override this.
     *
     * @param PrincipalBackend\BackendInterface $principalBackend
     * @param Backend\BackendInterface $caldavBackend
     * @param string $principalPrefix
     */
    public function __construct(PrincipalBackend\BackendInterface $principalBackend,Backend\BackendInterface $caldavBackend, $principalPrefix = 'principals') {

        parent::__construct($principalBackend, $principalPrefix);
        $this->caldavBackend = $caldavBackend;

    }

    /**
     * Returns the nodename
     *
     * We're overriding this, because the default will be the 'principalPrefix',
     * and we want it to be SabreForRainLoop\CalDAV\Plugin::CALENDAR_ROOT
     *
     * @return string
     */
    public function getName() {

        return Plugin::CALENDAR_ROOT;

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

        return new UserCalendars($this->caldavBackend, $principal);

    }

}

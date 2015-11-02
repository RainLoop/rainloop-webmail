<?php

namespace SabreForRainLoop\CalDAV\Principal;
use SabreForRainLoop\DAVACL;

/**
 * Principal collection
 *
 * This is an alternative collection to the standard ACL principal collection.
 * This collection adds support for the calendar-proxy-read and
 * calendar-proxy-write sub-principals, as defined by the caldav-proxy
 * specification.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class Collection extends DAVACL\AbstractPrincipalCollection {

    /**
     * Returns a child object based on principal information
     *
     * @param array $principalInfo
     * @return User
     */
    public function getChildForPrincipal(array $principalInfo) {

        return new User($this->principalBackend, $principalInfo);

    }

}

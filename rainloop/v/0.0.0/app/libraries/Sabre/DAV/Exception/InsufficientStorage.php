<?php

namespace Sabre\DAV\Exception;

/**
 * InsufficientStorage
 *
 * This Exception can be thrown, when for example a harddisk is full or a quota is exceeded
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class InsufficientStorage extends \Sabre\DAV\Exception {

    /**
     * Returns the HTTP statuscode for this exception
     *
     * @return int
     */
    public function getHTTPCode() {

        return 507;

    }

}

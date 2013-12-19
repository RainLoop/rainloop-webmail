<?php

namespace Sabre\DAV\Locks\Backend;

use Sabre\DAV\Locks;

/**
 * This is an Abstract clas for lock backends.
 *
 * Currently this backend has no function, but it exists for consistency, and
 * to ensure that if default code is required in the backend, there will be a
 * non-bc-breaking way to do so.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
abstract class AbstractBackend implements BackendInterface {

}


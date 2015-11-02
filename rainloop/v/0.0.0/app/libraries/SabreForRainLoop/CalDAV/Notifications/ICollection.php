<?php

namespace SabreForRainLoop\CalDAV\Notifications;

use SabreForRainLoop\DAV;

/**
 * This node represents a list of notifications.
 *
 * It provides no additional functionality, but you must implement this
 * interface to allow the Notifications plugin to mark the collection
 * as a notifications collection.
 *
 * This collection should only return SabreForRainLoop\CalDAV\Notifications\INode nodes as
 * its children.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
interface ICollection extends DAV\ICollection {


}

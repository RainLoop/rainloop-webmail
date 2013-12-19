<?php

namespace Sabre\CardDAV;

use Sabre\DAV;

/**
 * Card interface
 *
 * Extend the ICard interface to allow your custom nodes to be picked up as
 * 'Cards'.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
interface ICard extends DAV\IFile {

}


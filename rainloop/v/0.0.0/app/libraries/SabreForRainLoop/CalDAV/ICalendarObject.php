<?php

namespace SabreForRainLoop\CalDAV;
use SabreForRainLoop\DAV;

/**
 * CalendarObject interface
 *
 * Extend the ICalendarObject interface to allow your custom nodes to be picked up as
 * CalendarObjects.
 *
 * Calendar objects are resources such as Events, Todo's or Journals.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
interface ICalendarObject extends DAV\IFile {

}


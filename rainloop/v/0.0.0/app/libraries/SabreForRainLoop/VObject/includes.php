<?php

/**
 * Includes file
 *
 * This file includes the entire VObject library in one go.
 * The benefit is that an autoloader is not needed, which is often faster.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */

// Begin includes
include __DIR__ . '/Cli.php';
include __DIR__ . '/DateTimeParser.php';
include __DIR__ . '/ElementList.php';
include __DIR__ . '/FreeBusyGenerator.php';
include __DIR__ . '/Node.php';
include __DIR__ . '/Parameter.php';
include __DIR__ . '/ParseException.php';
include __DIR__ . '/Parser/Parser.php';
include __DIR__ . '/Property.php';
include __DIR__ . '/Reader.php';
include __DIR__ . '/RecurrenceIterator.php';
include __DIR__ . '/Splitter/SplitterInterface.php';
include __DIR__ . '/Splitter/VCard.php';
include __DIR__ . '/StringUtil.php';
include __DIR__ . '/TimeZoneUtil.php';
include __DIR__ . '/VCardConverter.php';
include __DIR__ . '/Version.php';
include __DIR__ . '/Component.php';
include __DIR__ . '/Document.php';
include __DIR__ . '/EofException.php';
include __DIR__ . '/Parser/Json.php';
include __DIR__ . '/Parser/MimeDir.php';
include __DIR__ . '/Property/Binary.php';
include __DIR__ . '/Property/Boolean.php';
include __DIR__ . '/Property/Float.php';
include __DIR__ . '/Property/ICalendar/DateTime.php';
include __DIR__ . '/Property/ICalendar/Duration.php';
include __DIR__ . '/Property/ICalendar/Period.php';
include __DIR__ . '/Property/ICalendar/Recur.php';
include __DIR__ . '/Property/Integer.php';
include __DIR__ . '/Property/Text.php';
include __DIR__ . '/Property/Time.php';
include __DIR__ . '/Property/Unknown.php';
include __DIR__ . '/Property/Uri.php';
include __DIR__ . '/Property/UtcOffset.php';
include __DIR__ . '/Property/VCard/DateAndOrTime.php';
include __DIR__ . '/Property/VCard/DateTime.php';
include __DIR__ . '/Property/VCard/LanguageTag.php';
include __DIR__ . '/Property/VCard/TimeStamp.php';
include __DIR__ . '/Splitter/ICalendar.php';
include __DIR__ . '/Component/VAlarm.php';
include __DIR__ . '/Component/VCalendar.php';
include __DIR__ . '/Component/VCard.php';
include __DIR__ . '/Component/VEvent.php';
include __DIR__ . '/Component/VFreeBusy.php';
include __DIR__ . '/Component/VJournal.php';
include __DIR__ . '/Component/VTodo.php';
include __DIR__ . '/Property/FlatText.php';
include __DIR__ . '/Property/ICalendar/CalAddress.php';
include __DIR__ . '/Property/ICalendar/Date.php';
include __DIR__ . '/Property/VCard/Date.php';
// End includes

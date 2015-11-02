<?php

namespace SabreForRainLoop\VObject\Component;

use
    SabreForRainLoop\VObject,
    SabreForRainLoop\VObject\Component;

/**
 * The VCalendar component
 *
 * This component adds functionality to a component, specific for a VCALENDAR.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class VCalendar extends VObject\Document {

    /**
     * The default name for this component.
     *
     * This should be 'VCALENDAR' or 'VCARD'.
     *
     * @var string
     */
    static public $defaultName = 'VCALENDAR';

    /**
     * This is a list of components, and which classes they should map to.
     *
     * @var array
     */
    static public $componentMap = array(
        'VEVENT'    => 'SabreForRainLoop\\VObject\\Component\\VEvent',
        'VFREEBUSY' => 'SabreForRainLoop\\VObject\\Component\\VFreeBusy',
        'VJOURNAL'  => 'SabreForRainLoop\\VObject\\Component\\VJournal',
        'VTODO'     => 'SabreForRainLoop\\VObject\\Component\\VTodo',
        'VALARM'    => 'SabreForRainLoop\\VObject\\Component\\VAlarm',
    );

    /**
     * List of value-types, and which classes they map to.
     *
     * @var array
     */
    static public $valueMap = array(
        'BINARY'           => 'SabreForRainLoop\\VObject\\Property\\Binary',
        'BOOLEAN'          => 'SabreForRainLoop\\VObject\\Property\\Boolean',
        'CAL-ADDRESS'      => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\CalAddress',
        'DATE'             => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\Date',
        'DATE-TIME'        => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\DateTime',
        'DURATION'         => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\Duration',
        'FLOAT'            => 'SabreForRainLoop\\VObject\\Property\\Float',
        'INTEGER'          => 'SabreForRainLoop\\VObject\\Property\\Integer',
        'PERIOD'           => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\Period',
        'RECUR'            => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\Recur',
        'TEXT'             => 'SabreForRainLoop\\VObject\\Property\\Text',
        'TIME'             => 'SabreForRainLoop\\VObject\\Property\\Time',
        'UNKNOWN'          => 'SabreForRainLoop\\VObject\\Property\\Unknown', // jCard / jCal-only.
        'URI'              => 'SabreForRainLoop\\VObject\\Property\\Uri',
        'UTC-OFFSET'       => 'SabreForRainLoop\\VObject\\Property\\UtcOffset',
    );

    /**
     * List of properties, and which classes they map to.
     *
     * @var array
     */
    static public $propertyMap = array(
        // Calendar properties
        'CALSCALE'      => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'METHOD'        => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'PRODID'        => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'VERSION'       => 'SabreForRainLoop\\VObject\\Property\\FlatText',

        // Component properties
        'ATTACH'            => 'SabreForRainLoop\\VObject\\Property\\Binary',
        'CATEGORIES'        => 'SabreForRainLoop\\VObject\\Property\\Text',
        'CLASS'             => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'COMMENT'           => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'DESCRIPTION'       => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'GEO'               => 'SabreForRainLoop\\VObject\\Property\\Float',
        'LOCATION'          => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'PERCENT-COMPLETE'  => 'SabreForRainLoop\\VObject\\Property\\Integer',
        'PRIORITY'          => 'SabreForRainLoop\\VObject\\Property\\Integer',
        'RESOURCES'         => 'SabreForRainLoop\\VObject\\Property\\Text',
        'STATUS'            => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'SUMMARY'           => 'SabreForRainLoop\\VObject\\Property\\FlatText',

        // Date and Time Component Properties
        'COMPLETED'     => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\DateTime',
        'DTEND'         => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\DateTime',
        'DUE'           => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\DateTime',
        'DTSTART'       => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\DateTime',
        'DURATION'      => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\Duration',
        'FREEBUSY'      => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\Period',
        'TRANSP'        => 'SabreForRainLoop\\VObject\\Property\\FlatText',

        // Time Zone Component Properties
        'TZID'          => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'TZNAME'        => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'TZOFFSETFROM'  => 'SabreForRainLoop\\VObject\\Property\\UtcOffset',
        'TZOFFSETTO'    => 'SabreForRainLoop\\VObject\\Property\\UtcOffset',
        'TZURL'         => 'SabreForRainLoop\\VObject\\Property\\Uri',

        // Relationship Component Properties
        'ATTENDEE'      => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\CalAddress',
        'CONTACT'       => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'ORGANIZER'     => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\CalAddress',
        'RECURRENCE-ID' => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\DateTime',
        'RELATED-TO'    => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'URL'           => 'SabreForRainLoop\\VObject\\Property\\Uri',
        'UID'           => 'SabreForRainLoop\\VObject\\Property\\FlatText',

        // Recurrence Component Properties
        'EXDATE'        => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\DateTime',
        'RDATE'         => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\DateTime',
        'RRULE'         => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\Recur',
        'EXRULE'        => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\Recur', // Deprecated since rfc5545

        // Alarm Component Properties
        'ACTION'        => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'REPEAT'        => 'SabreForRainLoop\\VObject\\Property\\Integer',
        'TRIGGER'       => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\Duration',

        // Change Management Component Properties
        'CREATED'       => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\DateTime',
        'DTSTAMP'       => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\DateTime',
        'LAST-MODIFIED' => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\DateTime',
        'SEQUENCE'      => 'SabreForRainLoop\\VObject\\Property\\Integer',

        // Request Status
        'REQUEST-STATUS' => 'SabreForRainLoop\\VObject\\Property\\Text',

        // Additions from draft-daboo-valarm-extensions-04
        'ALARM-AGENT'    => 'SabreForRainLoop\\VObject\\Property\\Text',
        'ACKNOWLEDGED'   => 'SabreForRainLoop\\VObject\\Property\\ICalendar\\DateTime',
        'PROXIMITY'      => 'SabreForRainLoop\\VObject\\Property\\Text',
        'DEFAULT-ALARM'  => 'SabreForRainLoop\\VObject\\Property\\Boolean',

    );

    /**
     * Returns the current document type.
     *
     * @return void
     */
    public function getDocumentType() {

        return self::ICALENDAR20;

    }

    /**
     * Returns a list of all 'base components'. For instance, if an Event has
     * a recurrence rule, and one instance is overridden, the overridden event
     * will have the same UID, but will be excluded from this list.
     *
     * VTIMEZONE components will always be excluded.
     *
     * @param string $componentName filter by component name
     * @return array
     */
    public function getBaseComponents($componentName = null) {

        $components = array();
        foreach($this->children as $component) {

            if (!$component instanceof VObject\Component)
                continue;

            if (isset($component->{'RECURRENCE-ID'}))
                continue;

            if ($componentName && $component->name !== strtoupper($componentName))
                continue;

            if ($component->name === 'VTIMEZONE')
                continue;

            $components[] = $component;

        }

        return $components;

    }

    /**
     * If this calendar object, has events with recurrence rules, this method
     * can be used to expand the event into multiple sub-events.
     *
     * Each event will be stripped from it's recurrence information, and only
     * the instances of the event in the specified timerange will be left
     * alone.
     *
     * In addition, this method will cause timezone information to be stripped,
     * and normalized to UTC.
     *
     * This method will alter the VCalendar. This cannot be reversed.
     *
     * This functionality is specifically used by the CalDAV standard. It is
     * possible for clients to request expand events, if they are rather simple
     * clients and do not have the possibility to calculate recurrences.
     *
     * @param DateTime $start
     * @param DateTime $end
     * @return void
     */
    public function expand(\DateTime $start, \DateTime $end) {

        $newEvents = array();

        foreach($this->select('VEVENT') as $key=>$vevent) {

            if (isset($vevent->{'RECURRENCE-ID'})) {
                unset($this->children[$key]);
                continue;
            }


            if (!$vevent->rrule) {
                unset($this->children[$key]);
                if ($vevent->isInTimeRange($start, $end)) {
                    $newEvents[] = $vevent;
                }
                continue;
            }

            $uid = (string)$vevent->uid;
            if (!$uid) {
                throw new \LogicException('Event did not have a UID!');
            }

            $it = new VObject\RecurrenceIterator($this, $vevent->uid);
            $it->fastForward($start);

            while($it->valid() && $it->getDTStart() < $end) {

                if ($it->getDTEnd() > $start) {

                    $newEvents[] = $it->getEventObject();

                }
                $it->next();

            }
            unset($this->children[$key]);

        }

        // Setting all properties to UTC time.
        foreach($newEvents as $newEvent) {

            foreach($newEvent->children as $child) {
                if ($child instanceof VObject\Property\ICalendar\DateTime && $child->hasTime()) {
                    $dt = $child->getDateTimes();
                    // We only need to update the first timezone, because
                    // setDateTimes will match all other timezones to the
                    // first.
                    $dt[0]->setTimeZone(new \DateTimeZone('UTC'));
                    $child->setDateTimes($dt);
                }

            }

            $this->add($newEvent);

        }

        // Removing all VTIMEZONE components
        unset($this->VTIMEZONE);

    }

    /**
     * This method should return a list of default property values.
     *
     * @return array
     */
    protected function getDefaults() {

        return array(
            'VERSION' => '2.0',
            'PRODID' => '-//Sabre//Sabre VObject ' . VObject\Version::VERSION . '//EN',
            'CALSCALE' => 'GREGORIAN',
        );

    }

    /**
     * Validates the node for correctness.
     * An array is returned with warnings.
     *
     * Every item in the array has the following properties:
     *    * level - (number between 1 and 3 with severity information)
     *    * message - (human readable message)
     *    * node - (reference to the offending node)
     *
     * @return array
     */
    public function validate($options = 0) {

        $warnings = array();

        $version = $this->select('VERSION');
        if (count($version)!==1) {
            $warnings[] = array(
                'level' => 1,
                'message' => 'The VERSION property must appear in the VCALENDAR component exactly 1 time',
                'node' => $this,
            );
        } else {
            if ((string)$this->VERSION !== '2.0') {
                $warnings[] = array(
                    'level' => 1,
                    'message' => 'Only iCalendar version 2.0 as defined in rfc5545 is supported.',
                    'node' => $this,
                );
            }
        }
        $version = $this->select('PRODID');
        if (count($version)!==1) {
            $warnings[] = array(
                'level' => 2,
                'message' => 'The PRODID property must appear in the VCALENDAR component exactly 1 time',
                'node' => $this,
            );
        }
        if (count($this->CALSCALE) > 1) {
            $warnings[] = array(
                'level' => 2,
                'message' => 'The CALSCALE property must not be specified more than once.',
                'node' => $this,
            );
        }
        if (count($this->METHOD) > 1) {
            $warnings[] = array(
                'level' => 2,
                'message' => 'The METHOD property must not be specified more than once.',
                'node' => $this,
            );
        }

        $componentsFound = 0;
        foreach($this->children as $child) {
            if($child instanceof Component) {
                $componentsFound++;
            }
        }

        if ($componentsFound===0) {
            $warnings[] = array(
                'level' => 1,
                'message' => 'An iCalendar object must have at least 1 component.',
                'node' => $this,
            );
        }

        return array_merge(
            $warnings,
            parent::validate()
        );

    }

}


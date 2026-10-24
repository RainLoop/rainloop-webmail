<?php

namespace Sabre\VObject\Component;

use Sabre\VObject;
use Sabre\VObject\Component;
use Sabre\VObject\InvalidDataException;
use Sabre\VObject\Property;
use Sabre\VObject\Recur\EventIterator;
use Sabre\VObject\Recur\NoInstancesException;

/**
 * The VCalendar component.
 *
 * This component adds functionality to a component, specific for a VCALENDAR.
 *
 * @copyright Copyright (C) fruux GmbH (https://fruux.com/)
 * @author Evert Pot (http://evertpot.com/)
 * @license http://sabre.io/license/ Modified BSD License
 *
 * @property VEvent VEVENT
 * @property VJournal VJOURNAL
 * @property Property\Text ORG
 * @property Property\FlatText METHOD
 */
class VCalendar extends VObject\Document
{
    /**
     * The default name for this component.
     *
     * This should be 'VCALENDAR' or 'VCARD'.
     */
    public static ?string $defaultName = 'VCALENDAR';

    /**
     * This is a list of components, and which classes they should map to.
     */
    public static array $componentMap = [
        'VCALENDAR' => self::class,
        'VALARM' => VAlarm::class,
        'VEVENT' => VEvent::class,
        'VFREEBUSY' => VFreeBusy::class,
        'VAVAILABILITY' => VAvailability::class,
        'AVAILABLE' => Available::class,
        'VJOURNAL' => VJournal::class,
        'VTIMEZONE' => VTimeZone::class,
        'VTODO' => VTodo::class,
    ];

    /**
     * List of value-types, and which classes they map to.
     */
    public static array $valueMap = [
        'BINARY' => Property\Binary::class,
        'BOOLEAN' => Property\Boolean::class,
        'CAL-ADDRESS' => Property\ICalendar\CalAddress::class,
        'DATE' => Property\ICalendar\Date::class,
        'DATE-TIME' => Property\ICalendar\DateTime::class,
        'DURATION' => Property\ICalendar\Duration::class,
        'FLOAT' => Property\FloatValue::class,
        'INTEGER' => Property\IntegerValue::class,
        'PERIOD' => Property\ICalendar\Period::class,
        'RECUR' => Property\ICalendar\Recur::class,
        'TEXT' => Property\Text::class,
        'TIME' => Property\Time::class,
        'UNKNOWN' => Property\Unknown::class, // jCard / jCal-only.
        'URI' => Property\Uri::class,
        'UTC-OFFSET' => Property\UtcOffset::class,
    ];

    /**
     * List of properties, and which classes they map to.
     */
    public static array $propertyMap = [
        // Calendar properties
        'CALSCALE' => Property\FlatText::class,
        'METHOD' => Property\FlatText::class,
        'PRODID' => Property\FlatText::class,
        'VERSION' => Property\FlatText::class,

        // Component properties
        'ATTACH' => Property\Uri::class,
        'CATEGORIES' => Property\Text::class,
        'CLASS' => Property\FlatText::class,
        'COMMENT' => Property\FlatText::class,
        'DESCRIPTION' => Property\FlatText::class,
        'GEO' => Property\FloatValue::class,
        'LOCATION' => Property\FlatText::class,
        'PERCENT-COMPLETE' => Property\IntegerValue::class,
        'PRIORITY' => Property\IntegerValue::class,
        'RESOURCES' => Property\Text::class,
        'STATUS' => Property\FlatText::class,
        'SUMMARY' => Property\FlatText::class,

        // Date and Time Component Properties
        'COMPLETED' => Property\ICalendar\DateTime::class,
        'DTEND' => Property\ICalendar\DateTime::class,
        'DUE' => Property\ICalendar\DateTime::class,
        'DTSTART' => Property\ICalendar\DateTime::class,
        'DURATION' => Property\ICalendar\Duration::class,
        'FREEBUSY' => Property\ICalendar\Period::class,
        'TRANSP' => Property\FlatText::class,

        // Time Zone Component Properties
        'TZID' => Property\FlatText::class,
        'TZNAME' => Property\FlatText::class,
        'TZOFFSETFROM' => Property\UtcOffset::class,
        'TZOFFSETTO' => Property\UtcOffset::class,
        'TZURL' => Property\Uri::class,

        // Relationship Component Properties
        'ATTENDEE' => Property\ICalendar\CalAddress::class,
        'CONTACT' => Property\FlatText::class,
        'ORGANIZER' => Property\ICalendar\CalAddress::class,
        'RECURRENCE-ID' => Property\ICalendar\DateTime::class,
        'RELATED-TO' => Property\FlatText::class,
        'URL' => Property\Uri::class,
        'UID' => Property\FlatText::class,

        // Recurrence Component Properties
        'EXDATE' => Property\ICalendar\DateTime::class,
        'RDATE' => Property\ICalendar\DateTime::class,
        'RRULE' => Property\ICalendar\Recur::class,
        'EXRULE' => Property\ICalendar\Recur::class, // Deprecated since rfc5545

        // Alarm Component Properties
        'ACTION' => Property\FlatText::class,
        'REPEAT' => Property\IntegerValue::class,
        'TRIGGER' => Property\ICalendar\Duration::class,

        // Change Management Component Properties
        'CREATED' => Property\ICalendar\DateTime::class,
        'DTSTAMP' => Property\ICalendar\DateTime::class,
        'LAST-MODIFIED' => Property\ICalendar\DateTime::class,
        'SEQUENCE' => Property\IntegerValue::class,

        // Request Status
        'REQUEST-STATUS' => Property\Text::class,

        // Additions from draft-daboo-valarm-extensions-04
        'ALARM-AGENT' => Property\Text::class,
        'ACKNOWLEDGED' => Property\ICalendar\DateTime::class,
        'PROXIMITY' => Property\Text::class,
        'DEFAULT-ALARM' => Property\Boolean::class,

        // Additions from draft-daboo-calendar-availability-05
        'BUSYTYPE' => Property\Text::class,

        // RFC 7986 properties
        'NAME' => Property\FlatText::class,
        'COLOR' => Property\FlatText::class,
    ];

    /**
     * Returns the current document type.
     */
    public function getDocumentType(): int
    {
        return self::ICALENDAR20;
    }

    /**
     * Returns a list of all 'base components'. For instance, if an Event has
     * a recurrence rule, and one instance is overridden, the overridden event
     * will have the same UID, but will be excluded from this list.
     *
     * VTIMEZONE components will always be excluded.
     *
     * @param string|null $componentName filter by component name
     *
     * @return Component[]
     */
    public function getBaseComponents(?string $componentName = null): array
    {
        $isBaseComponent = function ($component): bool {
            if (!$component instanceof Component) {
                return false;
            }
            if ('VTIMEZONE' === $component->name) {
                return false;
            }
            if (isset($component->{'RECURRENCE-ID'})) {
                return false;
            }

            return true;
        };

        if ($componentName) {
            // Early exit
            return array_filter(
                $this->select($componentName),
                $isBaseComponent
            );
        }

        $components = [];
        foreach ($this->children as $childGroup) {
            foreach ($childGroup as $child) {
                if (!$child instanceof Component) {
                    // If one child is not a component, they all are so we skip
                    // the entire group.
                    continue 2;
                }
                if ($isBaseComponent($child)) {
                    $components[] = $child;
                }
            }
        }

        return $components;
    }

    /**
     * Returns the first component that is not a VTIMEZONE, and does not have
     * an RECURRENCE-ID.
     *
     * If there is no such component, null will be returned.
     *
     * @param string|null $componentName filter by component name
     */
    public function getBaseComponent(?string $componentName = null): ?Component
    {
        $isBaseComponent = function ($component): bool {
            if (!$component instanceof Component) {
                return false;
            }
            if ('VTIMEZONE' === $component->name) {
                return false;
            }
            if (isset($component->{'RECURRENCE-ID'})) {
                return false;
            }

            return true;
        };

        if ($componentName) {
            foreach ($this->select($componentName) as $child) {
                if ($isBaseComponent($child)) {
                    return $child;
                }
            }

            return null;
        }

        // Searching all components
        foreach ($this->children as $childGroup) {
            foreach ($childGroup as $child) {
                if ($isBaseComponent($child)) {
                    return $child;
                }
            }
        }

        return null;
    }

    /**
     * Expand all events in this VCalendar object and return a new VCalendar
     * with the expanded events.
     *
     * If this calendar object, has events with recurrence rules, this method
     * can be used to expand the event into multiple sub-events.
     *
     * Each event will be stripped from its recurrence information, and only
     * the instances of the event in the specified time range will be left
     * alone.
     *
     * In addition, this method will cause timezone information to be stripped,
     * and normalized to UTC.
     *
     * @param \DateTimeZone|null $timeZone reference timezone for floating dates and
     *                                     times
     *
     * @throws InvalidDataException
     * @throws VObject\Recur\MaxInstancesExceededException
     */
    public function expand(\DateTimeInterface $start, \DateTimeInterface $end, ?\DateTimeZone $timeZone = null): VCalendar
    {
        $newChildren = [];
        $recurringEvents = [];

        if (!$timeZone) {
            $timeZone = new \DateTimeZone('UTC');
        }

        $stripTimezones = function (Component $component) use ($timeZone, &$stripTimezones): Component {
            foreach ($component->children() as $componentChild) {
                if ($componentChild instanceof Property\ICalendar\DateTime && $componentChild->hasTime()) {
                    $dt = $componentChild->getDateTimes($timeZone);
                    // We only need to update the first timezone, because
                    // setDateTimes will match all other timezones to the
                    // first.
                    $dt[0] = $dt[0]->setTimeZone(new \DateTimeZone('UTC'));
                    $componentChild->setDateTimes($dt);
                } elseif ($componentChild instanceof Component) {
                    $stripTimezones($componentChild);
                }
            }

            return $component;
        };

        foreach ($this->children() as $child) {
            if ($child instanceof Property && 'PRODID' !== $child->name) {
                // We explicitly want to ignore PRODID, because we want to
                // overwrite it with our own.
                $newChildren[] = clone $child;
            } elseif ($child instanceof Component && 'VTIMEZONE' !== $child->name) {
                // We're also stripping all VTIMEZONE objects because we're
                // converting everything to UTC.
                if ('VEVENT' === $child->name && (isset($child->{'RECURRENCE-ID'}) || isset($child->RRULE) || isset($child->RDATE))) {
                    // Handle these a bit later.
                    $uid = (string) $child->UID;
                    if (!$uid) {
                        throw new InvalidDataException('Every VEVENT object must have a UID property');
                    }
                    if (isset($recurringEvents[$uid])) {
                        $recurringEvents[$uid][] = clone $child;
                    } else {
                        $recurringEvents[$uid] = [clone $child];
                    }
                } elseif ('VEVENT' === $child->name && $child->isInTimeRange($start, $end)) {
                    $newChildren[] = $stripTimezones(clone $child);
                }
            }
        }

        foreach ($recurringEvents as $events) {
            try {
                $it = new EventIterator($events, null, $timeZone);
            } catch (NoInstancesException) {
                // This event is recurring, but it doesn't have a single
                // instance. We are skipping this event from the output
                // entirely.
                continue;
            }
            $it->fastForward($start);

            while ($it->valid() && $it->getDTStart() < $end) {
                if ($it->getDTEnd() > $start) {
                    $newChildren[] = $stripTimezones($it->getEventObject());
                }
                $it->next();
            }
        }

        return new self($newChildren);
    }

    /**
     * This method should return a list of default property values.
     */
    protected function getDefaults(): array
    {
        return [
            'VERSION' => '2.0',
            'PRODID' => '-//Sabre//Sabre VObject '.VObject\Version::VERSION.'//EN',
            'CALSCALE' => 'GREGORIAN',
        ];
    }

    /**
     * A simple list of validation rules.
     *
     * This is simply a list of properties, and how many times they either
     * must or must not appear.
     *
     * Possible values per property:
     *   * 0 - Must not appear.
     *   * 1 - Must appear exactly once.
     *   * + - Must appear at least once.
     *   * * - Can appear any number of times.
     *   * ? - May appear, but not more than once.
     */
    public function getValidationRules(): array
    {
        return [
            'PRODID' => 1,
            'VERSION' => 1,

            'CALSCALE' => '?',
            'METHOD' => '?',

            // RFC 7986 calendar properties
            'UID' => '?',
            'LAST-MODIFIED' => '?',
            'URL' => '?',
            'REFRESH-INTERVAL' => '?',
            'SOURCE' => '?',
            'COLOR' => '?',
            'NAME' => '*',
            'DESCRIPTION' => '*',
            'CATEGORIES' => '*',
            'IMAGE' => '*',
        ];
    }

    /**
     * Validates the node for correctness.
     *
     * The following options are supported:
     *   Node::REPAIR - May attempt to automatically repair the problem.
     *   Node::PROFILE_CARDDAV - Validate the vCard for CardDAV purposes.
     *   Node::PROFILE_CALDAV - Validate the iCalendar for CalDAV purposes.
     *
     * This method returns an array with detected problems.
     * Every element has the following properties:
     *
     *  * level - problem level.
     *  * message - A human-readable string describing the issue.
     *  * node - A reference to the problematic node.
     *
     * The level means:
     *   1 - The issue was repaired (only happens if REPAIR was turned on).
     *   2 - A warning.
     *   3 - An error.
     */
    public function validate(int $options = 0): array
    {
        $warnings = parent::validate($options);

        if ($ver = $this->VERSION) {
            if ('2.0' !== (string) $ver) {
                $warnings[] = [
                    'level' => 3,
                    'message' => 'Only iCalendar version 2.0 as defined in rfc5545 is supported.',
                    'node' => $this,
                ];
            }
        }

        $uidList = [];
        $componentsFound = 0;
        $componentTypes = [];

        foreach ($this->children() as $child) {
            if ($child instanceof Component) {
                ++$componentsFound;

                if (!in_array($child->name, ['VEVENT', 'VTODO', 'VJOURNAL'], true)) {
                    continue;
                }
                $componentTypes[] = $child->name;

                $uid = (string) $child->UID;
                $isMaster = isset($child->{'RECURRENCE-ID'}) ? 0 : 1;
                if (isset($uidList[$uid])) {
                    ++$uidList[$uid]['count'];
                    if ($isMaster && $uidList[$uid]['hasMaster']) {
                        $warnings[] = [
                            'level' => 3,
                            'message' => 'More than one master object was found for the object with UID '.$uid,
                            'node' => $this,
                        ];
                    }
                    $uidList[$uid]['hasMaster'] += $isMaster;
                } else {
                    $uidList[$uid] = [
                        'count' => 1,
                        'hasMaster' => $isMaster,
                    ];
                }
            }
        }

        if (0 === $componentsFound) {
            $warnings[] = [
                'level' => 3,
                'message' => 'An iCalendar object must have at least 1 component.',
                'node' => $this,
            ];
        }

        if ($options & self::PROFILE_CALDAV) {
            if (count($uidList) > 1) {
                $warnings[] = [
                    'level' => 3,
                    'message' => 'A calendar object on a CalDAV server may only have components with the same UID.',
                    'node' => $this,
                ];
            }
            if (0 === count($componentTypes)) {
                $warnings[] = [
                    'level' => 3,
                    'message' => 'A calendar object on a CalDAV server must have at least 1 component (VTODO, VEVENT, VJOURNAL).',
                    'node' => $this,
                ];
            }
            if (count(array_unique($componentTypes)) > 1) {
                $warnings[] = [
                    'level' => 3,
                    'message' => 'A calendar object on a CalDAV server may only have 1 type of component (VEVENT, VTODO or VJOURNAL).',
                    'node' => $this,
                ];
            }

            if (isset($this->METHOD)) {
                $warnings[] = [
                    'level' => 3,
                    'message' => 'A calendar object on a CalDAV server MUST NOT have a METHOD property.',
                    'node' => $this,
                ];
            }
        }

        return $warnings;
    }

    /**
     * Returns all components with a specific UID value.
     */
    public function getByUID($uid): array
    {
        return array_filter($this->getComponents(), function ($item) use ($uid) {
            if (!$itemUid = $item->select('UID')) {
                return false;
            }
            $itemUid = current($itemUid)->getValue();

            return $uid === $itemUid;
        });
    }
}

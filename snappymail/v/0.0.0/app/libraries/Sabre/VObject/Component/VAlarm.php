<?php

namespace Sabre\VObject\Component;

use Sabre\VObject;
use Sabre\VObject\InvalidDataException;

/**
 * VAlarm component.
 *
 * This component contains some additional functionality specific for VALARMs.
 *
 * @copyright Copyright (C) fruux GmbH (https://fruux.com/)
 * @author Evert Pot (http://evertpot.com/)
 * @license http://sabre.io/license/ Modified BSD License
 *
 * @property VObject\Property\ICalendar\DateTime DTSTART
 * @property VObject\Property\ICalendar\DateTime DTEND
 * @property VObject\Property\ICalendar\Duration DURATION
 * @property VObject\Property\ICalendar\Duration|VObject\Property\ICalendar\DateTime TRIGGER
 * @property VObject\Property\IntegerValue REPEAT
 */
class VAlarm extends VObject\Component
{
    /**
     * Returns a DateTime object when this alarm is going to trigger.
     *
     * This ignores repeated alarm, only the first trigger is returned.
     *
     * @throws InvalidDataException
     */
    public function getEffectiveTriggerTime(): \DateTimeImmutable
    {
        $trigger = $this->TRIGGER;
        if (!isset($trigger['VALUE']) || ($trigger['VALUE'] && 'DURATION' === strtoupper($trigger['VALUE']))) {
            $triggerDuration = VObject\DateTimeParser::parseDuration($this->TRIGGER);
            $related = (isset($trigger['RELATED']) && 'END' == strtoupper($trigger['RELATED'])) ? 'END' : 'START';

            /** @var VEvent|VTodo $parentComponent */
            $parentComponent = $this->parent;
            if ('START' === $related) {
                if ('VTODO' === $parentComponent->name) {
                    $propName = 'DUE';
                } else {
                    $propName = 'DTSTART';
                }

                $effectiveTrigger = $parentComponent->$propName->getDateTime();
            } else {
                if ('VTODO' === $parentComponent->name) {
                    $endProp = 'DUE';
                } elseif ('VEVENT' === $parentComponent->name) {
                    $endProp = 'DTEND';
                } else {
                    throw new InvalidDataException('time-range filters on VALARM components are only supported when they are a child of VTODO or VEVENT');
                }

                if (isset($parentComponent->$endProp)) {
                    $effectiveTrigger = $parentComponent->$endProp->getDateTime();
                } elseif (isset($parentComponent->DURATION)) {
                    $effectiveTrigger = $parentComponent->DTSTART->getDateTime();
                    $duration = VObject\DateTimeParser::parseDuration($parentComponent->DURATION);
                    $effectiveTrigger = $effectiveTrigger->add($duration);
                } else {
                    $effectiveTrigger = $parentComponent->DTSTART->getDateTime();
                }
            }
            $effectiveTrigger = $effectiveTrigger->add($triggerDuration);
        } else {
            $effectiveTrigger = $trigger->getDateTime();
        }

        return $effectiveTrigger;
    }

    /**
     * Returns true or false depending on if the event falls in the specified
     * time-range. This is used for filtering purposes.
     *
     * The rules used to determine if an event falls within the specified
     * time-range is based on the CalDAV specification.
     *
     * @throws InvalidDataException
     */
    public function isInTimeRange(\DateTimeInterface $start, \DateTimeInterface $end): bool
    {
        $effectiveTrigger = $this->getEffectiveTriggerTime();

        if (isset($this->DURATION)) {
            $duration = VObject\DateTimeParser::parseDuration($this->DURATION);
            $repeat = (string) $this->REPEAT;
            if (!$repeat) {
                $repeat = 1;
            }

            $period = new \DatePeriod($effectiveTrigger, $duration, (int) $repeat);

            foreach ($period as $occurrence) {
                if ($start <= $occurrence && $end > $occurrence) {
                    return true;
                }
            }

            return false;
        } else {
            return $start <= $effectiveTrigger && $end > $effectiveTrigger;
        }
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
            'ACTION' => 1,
            'TRIGGER' => 1,

            'DURATION' => '?',
            'REPEAT' => '?',

            'ATTACH' => '?',
        ];
    }
}

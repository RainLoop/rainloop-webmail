<?php

namespace Sabre\VObject;

/**
 * DateTimeParser
 *
 * This class is responsible for parsing the several different date and time
 * formats iCalendar and vCards have.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class DateTimeParser {

    /**
     * Parses an iCalendar (rfc5545) formatted datetime and returns a DateTime object
     *
     * Specifying a reference timezone is optional. It will only be used
     * if the non-UTC format is used. The argument is used as a reference, the
     * returned DateTime object will still be in the UTC timezone.
     *
     * @param string $dt
     * @param DateTimeZone $tz
     * @return DateTime
     */
    static public function parseDateTime($dt,\DateTimeZone $tz = null) {

        // Format is YYYYMMDD + "T" + hhmmss
        $result = preg_match('/^([0-9]{4})([0-1][0-9])([0-3][0-9])T([0-2][0-9])([0-5][0-9])([0-5][0-9])([Z]?)$/',$dt,$matches);

        if (!$result) {
            throw new \LogicException('The supplied iCalendar datetime value is incorrect: ' . $dt);
        }

        if ($matches[7]==='Z' || is_null($tz)) {
            $tz = new \DateTimeZone('UTC');
        }
        $date = new \DateTime($matches[1] . '-' . $matches[2] . '-' . $matches[3] . ' ' . $matches[4] . ':' . $matches[5] .':' . $matches[6], $tz);

        // Still resetting the timezone, to normalize everything to UTC
        // $date->setTimeZone(new \DateTimeZone('UTC'));
        return $date;

    }

    /**
     * Parses an iCalendar (rfc5545) formatted date and returns a DateTime object
     *
     * @param string $date
     * @return DateTime
     */
    static public function parseDate($date) {

        // Format is YYYYMMDD
        $result = preg_match('/^([0-9]{4})([0-1][0-9])([0-3][0-9])$/',$date,$matches);

        if (!$result) {
            throw new \LogicException('The supplied iCalendar date value is incorrect: ' . $date);
        }

        $date = new \DateTime($matches[1] . '-' . $matches[2] . '-' . $matches[3], new \DateTimeZone('UTC'));
        return $date;

    }

    /**
     * Parses an iCalendar (RFC5545) formatted duration value.
     *
     * This method will either return a DateTimeInterval object, or a string
     * suitable for strtotime or DateTime::modify.
     *
     * @param string $duration
     * @param bool $asString
     * @return DateInterval|string
     */
    static public function parseDuration($duration, $asString = false) {

        $result = preg_match('/^(?P<plusminus>\+|-)?P((?P<week>\d+)W)?((?P<day>\d+)D)?(T((?P<hour>\d+)H)?((?P<minute>\d+)M)?((?P<second>\d+)S)?)?$/', $duration, $matches);
        if (!$result) {
            throw new \LogicException('The supplied iCalendar duration value is incorrect: ' . $duration);
        }

        if (!$asString) {
            $invert = false;
            if ($matches['plusminus']==='-') {
                $invert = true;
            }


            $parts = array(
                'week',
                'day',
                'hour',
                'minute',
                'second',
            );
            foreach($parts as $part) {
                $matches[$part] = isset($matches[$part])&&$matches[$part]?(int)$matches[$part]:0;
            }


            // We need to re-construct the $duration string, because weeks and
            // days are not supported by DateInterval in the same string.
            $duration = 'P';
            $days = $matches['day'];
            if ($matches['week']) {
                $days+=$matches['week']*7;
            }
            if ($days)
                $duration.=$days . 'D';

            if ($matches['minute'] || $matches['second'] || $matches['hour']) {
                $duration.='T';

                if ($matches['hour'])
                    $duration.=$matches['hour'].'H';

                if ($matches['minute'])
                    $duration.=$matches['minute'].'M';

                if ($matches['second'])
                    $duration.=$matches['second'].'S';

            }

            if ($duration==='P') {
                $duration = 'PT0S';
            }
            $iv = new \DateInterval($duration);
            if ($invert) $iv->invert = true;

            return $iv;

        }



        $parts = array(
            'week',
            'day',
            'hour',
            'minute',
            'second',
        );

        $newDur = '';
        foreach($parts as $part) {
            if (isset($matches[$part]) && $matches[$part]) {
                $newDur.=' '.$matches[$part] . ' ' . $part . 's';
            }
        }

        $newDur = ($matches['plusminus']==='-'?'-':'+') . trim($newDur);
        if ($newDur === '+') { $newDur = '+0 seconds'; };
        return $newDur;

    }

    /**
     * Parses either a Date or DateTime, or Duration value.
     *
     * @param string $date
     * @param DateTimeZone|string $referenceTZ
     * @return DateTime|DateInterval
     */
    static public function parse($date, $referenceTZ = null) {

        if ($date[0]==='P' || ($date[0]==='-' && $date[1]==='P')) {
            return self::parseDuration($date);
        } elseif (strlen($date)===8) {
            return self::parseDate($date);
        } else {
            return self::parseDateTime($date, $referenceTZ);
        }

    }

    /**
     * This method parses a vCard date and or time value.
     *
     * This can be used for the DATE, DATE-TIME, TIMESTAMP and
     * DATE-AND-OR-TIME value.
     *
     * This method returns an array, not a DateTime value.
     *
     * The elements in the array are in the following order:
     * year, month, date, hour, minute, second, timezone
     *
     * Almost any part of the string may be omitted. It's for example legal to
     * just specify seconds, leave out the year, etc.
     *
     * Timezone is either returned as 'Z' or as '+08:00'
     *
     * For any non-specified values null is returned.
     *
     * List of date formats that are supported:
     * YYYY
     * YYYY-MM
     * YYYYMMDD
     * --MMDD
     * ---DD
     *
     * YYYY-MM-DD
     * --MM-DD
     * ---DD
     *
     * List of supported time formats:
     *
     * HH
     * HHMM
     * HHMMSS
     * -MMSS
     * --SS
     *
     * HH
     * HH:MM
     * HH:MM:SS
     * -MM:SS
     * --SS
     *
     * A full basic-format date-time string looks like :
     * 20130603T133901
     *
     * A full extended-format date-time string looks like :
     * 2013-06-03T13:39:01
     *
     * Times may be postfixed by a timezone offset. This can be either 'Z' for
     * UTC, or a string like -0500 or +1100.
     *
     * @param string $date
     * @return array
     */
    static public function parseVCardDateTime($date) {

        $regex = '/^
            (?:  # date part
                (?:
                    (?: (?P<year> [0-9]{4}) (?: -)?| --)
                    (?P<month> [0-9]{2})?
                |---)
                (?P<date> [0-9]{2})?
            )?
            (?:T  # time part
                (?P<hour> [0-9]{2} | -)
                (?P<minute> [0-9]{2} | -)?
                (?P<second> [0-9]{2})?

                (?P<timezone> # timezone offset

                    Z | (?: \+|-)(?: [0-9]{4})

                )?

            )?
            $/x';


        if (!preg_match($regex, $date, $matches)) {

            // Attempting to parse the extended format.
            $regex = '/^
                (?: # date part
                    (?: (?P<year> [0-9]{4}) - | -- )
                    (?P<month> [0-9]{2}) -
                    (?P<date> [0-9]{2})
                )?
                (?:T # time part

                    (?: (?P<hour> [0-9]{2}) : | -)
                    (?: (?P<minute> [0-9]{2}) : | -)?
                    (?P<second> [0-9]{2})?

                    (?P<timezone> # timezone offset

                        Z | (?: \+|-)(?: [0-9]{2}:[0-9]{2})

                    )?

                )?
                $/x';

            if (!preg_match($regex, $date, $matches)) {
                throw new \InvalidArgumentException('Invalid vCard date-time string: ' . $date);
            }

        }
        $parts = array(
            'year',
            'month',
            'date',
            'hour',
            'minute',
            'second',
            'timezone'
        );

        $result = array();
        foreach($parts as $part) {

            if (empty($matches[$part])) {
                $result[$part] = null;
            } elseif ($matches[$part] === '-' || $matches[$part] === '--') {
                $result[$part] = null;
            } else {
                $result[$part] = $matches[$part];
            }

        }

        return $result;

    }

    /**
     * This method parses a vCard TIME value.
     *
     * This method returns an array, not a DateTime value.
     *
     * The elements in the array are in the following order:
     * hour, minute, second, timezone
     *
     * Almost any part of the string may be omitted. It's for example legal to
     * just specify seconds, leave out the hour etc.
     *
     * Timezone is either returned as 'Z' or as '+08:00'
     *
     * For any non-specified values null is returned.
     *
     * List of supported time formats:
     *
     * HH
     * HHMM
     * HHMMSS
     * -MMSS
     * --SS
     *
     * HH
     * HH:MM
     * HH:MM:SS
     * -MM:SS
     * --SS
     *
     * A full basic-format time string looks like :
     * 133901
     *
     * A full extended-format time string looks like :
     * 13:39:01
     *
     * Times may be postfixed by a timezone offset. This can be either 'Z' for
     * UTC, or a string like -0500 or +11:00.
     *
     * @param string $date
     * @return array
     */
    static public function parseVCardTime($date) {

        $regex = '/^
            (?P<hour> [0-9]{2} | -)
            (?P<minute> [0-9]{2} | -)?
            (?P<second> [0-9]{2})?

            (?P<timezone> # timezone offset

                Z | (?: \+|-)(?: [0-9]{4})

            )?
            $/x';


        if (!preg_match($regex, $date, $matches)) {

            // Attempting to parse the extended format.
            $regex = '/^
                (?: (?P<hour> [0-9]{2}) : | -)
                (?: (?P<minute> [0-9]{2}) : | -)?
                (?P<second> [0-9]{2})?

                (?P<timezone> # timezone offset

                    Z | (?: \+|-)(?: [0-9]{2}:[0-9]{2})

                )?
                $/x';

            if (!preg_match($regex, $date, $matches)) {
                throw new \InvalidArgumentException('Invalid vCard time string: ' . $date);
            }

        }
        $parts = array(
            'hour',
            'minute',
            'second',
            'timezone'
        );

        $result = array();
        foreach($parts as $part) {

            if (empty($matches[$part])) {
                $result[$part] = null;
            } elseif ($matches[$part] === '-') {
                $result[$part] = null;
            } else {
                $result[$part] = $matches[$part];
            }

        }

        return $result;

    }
}

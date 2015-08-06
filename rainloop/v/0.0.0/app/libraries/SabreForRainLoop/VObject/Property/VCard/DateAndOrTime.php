<?php

namespace SabreForRainLoop\VObject\Property\VCard;

use
    SabreForRainLoop\VObject\DateTimeParser,
    SabreForRainLoop\VObject\Property\Text;

/**
 * DateAndOrTime property
 *
 * This object encodes DATE-AND-OR-TIME values.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH. All rights reserved.
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class DateAndOrTime extends Text {

    /**
     * Field separator
     *
     * @var null|string
     */
    public $delimiter = null;

    /**
     * Returns the type of value.
     *
     * This corresponds to the VALUE= parameter. Every property also has a
     * 'default' valueType.
     *
     * @return string
     */
    public function getValueType() {

        return "DATE-AND-OR-TIME";

    }

    /**
     * Returns the value, in the format it should be encoded for json.
     *
     * This method must always return an array.
     *
     * @return array
     */
    public function getJsonValue() {

        $parts = DateTimeParser::parseVCardDateTime($this->getValue());

        $dateStr = '';

        // Year
        if (!is_null($parts['year'])) {
            $dateStr.=$parts['year'];

            if (!is_null($parts['month'])) {
                // If a year and a month is set, we need to insert a separator
                // dash.
                $dateStr.='-';
            }

        } else {

            if (!is_null($parts['month']) || !is_null($parts['date'])) {
                // Inserting two dashes
                $dateStr.='--';
            }

        }

        // Month

        if (!is_null($parts['month'])) {
            $dateStr.=$parts['month'];

            if (isset($parts['date'])) {
                // If month and date are set, we need the separator dash.
                $dateStr.='-';
            }
        } else {
            if (isset($parts['date'])) {
                // If the month is empty, and a date is set, we need a 'empty
                // dash'
                $dateStr.='-';
            }
        }

        // Date
        if (!is_null($parts['date'])) {
            $dateStr.=$parts['date'];
        }


        // Early exit if we don't have a time string.
        if (is_null($parts['hour']) && is_null($parts['minute']) && is_null($parts['second'])) {
            return array($dateStr);
        }

        $dateStr.='T';

        // Hour
        if (!is_null($parts['hour'])) {
            $dateStr.=$parts['hour'];

            if (!is_null($parts['minute'])) {
                $dateStr.=':';
            }
        } else {
            // We know either minute or second _must_ be set, so we insert a
            // dash for an empty value.
            $dateStr.='-';
        }

        // Minute
        if (!is_null($parts['minute'])) {
            $dateStr.=$parts['minute'];

            if (!is_null($parts['second'])) {
                $dateStr.=':';
            }
        } else {
            if (isset($parts['second'])) {
                // Dash for empty minute
                $dateStr.='-';
            }
        }

        // Second
        if (!is_null($parts['second'])) {
            $dateStr.=$parts['second'];
        }

        // Timezone
        if (!is_null($parts['timezone'])) {
            $dateStr.=$parts['timezone'];
        }

        return array($dateStr);

    }

}

<?php

namespace SabreForRainLoop\VObject\Property\ICalendar;

use
    SabreForRainLoop\VObject\Property,
    SabreForRainLoop\VObject\Parser\MimeDir,
    SabreForRainLoop\VObject\DateTimeParser;

/**
 * Duration property
 *
 * This object represents DURATION values, as defined here:
 *
 * http://tools.ietf.org/html/rfc5545#section-3.3.6
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH. All rights reserved.
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class Duration extends Property {

    /**
     * In case this is a multi-value property. This string will be used as a
     * delimiter.
     *
     * @var string|null
     */
    public $delimiter = ',';

    /**
     * Sets a raw value coming from a mimedir (iCalendar/vCard) file.
     *
     * This has been 'unfolded', so only 1 line will be passed. Unescaping is
     * not yet done, but parameters are not included.
     *
     * @param string $val
     * @return void
     */
    public function setRawMimeDirValue($val) {

        $this->setValue(explode($this->delimiter, $val));

    }

    /**
     * Returns a raw mime-dir representation of the value.
     *
     * @return string
     */
    public function getRawMimeDirValue() {

        return implode($this->delimiter, $this->getParts());

    }

    /**
     * Returns the type of value.
     *
     * This corresponds to the VALUE= parameter. Every property also has a
     * 'default' valueType.
     *
     * @return string
     */
    public function getValueType() {

        return 'DURATION';

    }

    /**
     * Returns a DateInterval representation of the Duration property.
     *
     * If the property has more than one value, only the first is returned.
     *
     * @return \DateInterval
     */
    public function getDateInterval() {

        $parts = $this->getParts();
        $value = $parts[0];
        return DateTimeParser::parseDuration($value);

    }

}

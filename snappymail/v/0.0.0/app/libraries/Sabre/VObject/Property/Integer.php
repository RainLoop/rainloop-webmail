<?php

namespace Sabre\VObject\Property;

use
    Sabre\VObject\Property;

/**
 * Integer property
 *
 * This object represents INTEGER values. These are always a single integer.
 * They may be preceeded by either + or -.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH. All rights reserved.
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class Integer extends Property {

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

        $this->setValue((int)$val);

    }

    /**
     * Returns a raw mime-dir representation of the value.
     *
     * @return string
     */
    public function getRawMimeDirValue() {

        return $this->value;

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

        return "INTEGER";

    }

    /**
     * Returns the value, in the format it should be encoded for json.
     *
     * This method must always return an array.
     *
     * @return array
     */
    public function getJsonValue() {

        return array((int)$this->getValue());

    }
}

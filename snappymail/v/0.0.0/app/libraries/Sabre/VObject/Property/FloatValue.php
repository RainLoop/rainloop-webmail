<?php

namespace Sabre\VObject\Property;

use
    Sabre\VObject\Property;

/**
 * Float property
 *
 * This object represents FLOAT values. These can be 1 or more floating-point
 * numbers.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH. All rights reserved.
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class FloatValue extends Property {

    /**
     * In case this is a multi-value property. This string will be used as a
     * delimiter.
     *
     * @var string|null
     */
    public $delimiter = ';';

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

        $val = explode($this->delimiter, $val);
        foreach($val as &$item) {
            $item = (float)$item;
        }
        $this->setParts($val);

    }

    /**
     * Returns a raw mime-dir representation of the value.
     *
     * @return string
     */
    public function getRawMimeDirValue() {

        return implode(
            $this->delimiter,
            $this->getParts()
        );

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

        return "FLOAT";

    }

    /**
     * Returns the value, in the format it should be encoded for json.
     *
     * This method must always return an array.
     *
     * @return array
     */
    public function getJsonValue() {

        $val = array_map(function($item) {

            return (float)$item;

        }, $this->getParts());

        // Special-casing the GEO property.
        //
        // See:
        // http://tools.ietf.org/html/draft-ietf-jcardcal-jcal-04#section-3.4.1.2
        if ($this->name==='GEO') {
            return array($val);
        } else {
            return $val;
        }

    }
}

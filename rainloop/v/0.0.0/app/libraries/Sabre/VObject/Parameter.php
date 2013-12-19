<?php

namespace Sabre\VObject;

/**
 * VObject Parameter
 *
 * This class represents a parameter. A parameter is always tied to a property.
 * In the case of:
 *   DTSTART;VALUE=DATE:20101108
 * VALUE=DATE would be the parameter name and value.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class Parameter extends Node {

    /**
     * Parameter name
     *
     * @var string
     */
    public $name;

    /**
     * Parameter value
     *
     * @var string
     */
    public $value;

    /**
     * Sets up the object
     *
     * @param string $name
     * @param string $value
     */
    public function __construct($name, $value = null) {

        if (!is_scalar($value) && !is_null($value)) {
            throw new \InvalidArgumentException('The value argument must be a scalar value or null');
        }

        $this->name = strtoupper($name);
        $this->value = $value;

    }

    /**
     * Returns the parameter's internal value.
     *
     * @return string
     */
    public function getValue() {

        return $this->value;

    }


    /**
     * Turns the object back into a serialized blob.
     *
     * @return string
     */
    public function serialize() {

        if (is_null($this->value)) {
            return $this->name;
        }
        $src = array(
            '\\',
            "\n",
            ';',
            ',',
        );
        $out = array(
            '\\\\',
            '\n',
            '\;',
            '\,',
        );

        $value = str_replace($src, $out, $this->value);
        if (strpos($value,":")!==false) {
            $value = '"' . $value . '"';
        }
        return $this->name . '=' . $value;

    }

    /**
     * Called when this object is being cast to a string
     *
     * @return string
     */
    public function __toString() {

        return $this->value;

    }

}

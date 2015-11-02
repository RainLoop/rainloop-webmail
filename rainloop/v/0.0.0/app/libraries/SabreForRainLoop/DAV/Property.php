<?php

namespace SabreForRainLoop\DAV;

/**
 * Abstract property class
 *
 * Extend this class to create custom complex properties
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
abstract class Property implements PropertyInterface {

    /**
     * Unserializes the property.
     *
     * This static method should return a an instance of this object.
     *
     * @param \DOMElement $prop
     * @return DAV\IProperty
     */
    static function unserialize(\DOMElement $prop) {

        throw new Exception('Unserialize has not been implemented for this class');

    }

}


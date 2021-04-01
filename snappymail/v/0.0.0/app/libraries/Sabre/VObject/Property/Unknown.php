<?php

namespace Sabre\VObject\Property;

use
    Sabre\VObject\Property,
    Sabre\VObject\Component,
    Sabre\VObject\Parser\MimeDir,
    Sabre\VObject\Document;

/**
 * Unknown property
 *
 * This object represents any properties not recognized by the parser.
 * This type of value has been introduced by the jCal, jCard specs.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH. All rights reserved.
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class Unknown extends Text {

    /**
     * Returns the value, in the format it should be encoded for json.
     *
     * This method must always return an array.
     *
     * @return array
     */
    public function getJsonValue() {

        return array($this->getRawMimeDirValue());

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

        return "UNKNOWN";

    }

}

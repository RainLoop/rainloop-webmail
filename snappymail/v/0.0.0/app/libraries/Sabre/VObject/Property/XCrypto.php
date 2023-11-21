<?php

namespace Sabre\VObject\Property;

use Sabre\VObject\Property;
//use Sabre\VObject\Property\Text;

/**
 * XCrypto property.
 *
 * This object encodes X-CRYPTO values, as defined in KDE KAddressBook
 *
 * @copyright Copyright (C) SnappyMail (https://snappymail.eu/)
 * @author DJMaze (https://snappymail.eu/)
 * @license http://sabre.io/license/ Modified BSD License
 *
 * https://github.com/sabre-io/vobject/issues/589
 */

class XCrypto extends Property
//class XCrypto extends Text
{
    /**
     * Returns the type of value.
     *
     * This corresponds to the VALUE= parameter. Every property also has a
     * 'default' valueType.
     */
    public function getValueType(): string
    {
        return 'X-CRYPTO';
    }

    /**
     * Sets a raw value coming from a mimedir (iCalendar/vCard) file.
     *
     * This has been 'unfolded', so only 1 line will be passed. Unescaping is
     * not yet done, but parameters are not included.
     */
    public function setRawMimeDirValue($val): void
    {
        error_log("setRawMimeDirValue({$val})");
//        $this->setValue(MimeDir::unescapeValue($val, $this->delimiter));
    }

    /**
     * Returns a raw mime-dir representation of the value.
     */
    public function getRawMimeDirValue(): string
    {
        $result = [];
        foreach ($this->parameters as $parameter) {
            $result[] = strtolower($parameter->name) . '=' . $parameter->getValue();
        }
        return implode(',', $result);
    }

    public function xmlSerialize(\Sabre\Xml\Writer $writer): void
    {
        $writer->startElement(strtolower($this->name));
        foreach ($this->parameters as $parameter) {
            $writer->startElement(strtolower($parameter->name));
            $writer->write($parameter);
            $writer->endElement();
        }
        $writer->endElement();
    }
}

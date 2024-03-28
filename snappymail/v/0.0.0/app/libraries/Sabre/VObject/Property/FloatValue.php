<?php

namespace Sabre\VObject\Property;

use Sabre\VObject\Property;
use Sabre\Xml;

/**
 * Float property.
 *
 * This object represents FLOAT values. These can be 1 or more floating-point
 * numbers.
 *
 * @copyright Copyright (C) fruux GmbH (https://fruux.com/)
 * @author Evert Pot (http://evertpot.com/)
 * @license http://sabre.io/license/ Modified BSD License
 */
class FloatValue extends Property
{
    /**
     * In case this is a multi-value property. This string will be used as a
     * delimiter.
     */
    public string $delimiter = ';';

    /**
     * Sets a raw value coming from a mimedir (iCalendar/vCard) file.
     *
     * This has been 'unfolded', so only 1 line will be passed. Unescaping is
     * not yet done, but parameters are not included.
     */
    public function setRawMimeDirValue(string $val): void
    {
        $val = explode($this->delimiter, $val);
        foreach ($val as &$item) {
            $item = (float) $item;
        }
        $this->setParts($val);
    }

    /**
     * Returns a raw mime-dir representation of the value.
     */
    public function getRawMimeDirValue(): string
    {
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
     */
    public function getValueType(): string
    {
        return 'FLOAT';
    }

    /**
     * Returns the value, in the format it should be encoded for JSON.
     *
     * This method must always return an array.
     */
    public function getJsonValue(): array
    {
        $val = array_map('floatval', $this->getParts());

        // Special-casing the GEO property.
        //
        // See:
        // http://tools.ietf.org/html/draft-ietf-jcardcal-jcal-04#section-3.4.1.2
        if ('GEO' === $this->name) {
            return [$val];
        }

        return $val;
    }

    /**
     * Hydrate data from an XML subtree, as it would appear in a xCard or xCal
     * object.
     */
    public function setXmlValue(array $value): void
    {
        $value = array_map('floatval', $value);
        parent::setXmlValue($value);
    }

    /**
     * This method serializes only the value of a property. This is used to
     * create xCard or xCal documents.
     */
    protected function xmlSerializeValue(Xml\Writer $writer): void
    {
        // Special-casing the GEO property.
        //
        // See:
        // http://tools.ietf.org/html/rfc6321#section-3.4.1.2
        if ('GEO' === $this->name) {
            $value = array_map('floatval', $this->getParts());

            $writer->writeElement('latitude', $value[0]);
            $writer->writeElement('longitude', $value[1]);
        } else {
            parent::xmlSerializeValue($writer);
        }
    }
}

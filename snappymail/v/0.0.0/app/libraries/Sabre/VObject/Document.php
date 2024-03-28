<?php

namespace Sabre\VObject;

use Sabre\VObject;

/**
 * Document.
 *
 * A document is just like a component, except that it's also the top level
 * element.
 *
 * Both a VCALENDAR and a VCARD are considered documents.
 *
 * This class also provides a registry for document types.
 *
 * @copyright Copyright (C) fruux GmbH (https://fruux.com/)
 * @author Evert Pot (http://evertpot.com/)
 * @license http://sabre.io/license/ Modified BSD License
 *
 * @property VObject\Property\FlatText VERSION
 */
abstract class Document extends Component
{
    /**
     * Unknown document type.
     */
    public const UNKNOWN = 1;

    /**
     * vCalendar 1.0.
     */
    public const VCALENDAR10 = 2;

    /**
     * iCalendar 2.0.
     */
    public const ICALENDAR20 = 3;

    /**
     * vCard 2.1.
     */
    public const VCARD21 = 4;

    /**
     * vCard 3.0.
     */
    public const VCARD30 = 5;

    /**
     * vCard 4.0.
     */
    public const VCARD40 = 6;

    /**
     * The default name for this component.
     *
     * This should be 'VCALENDAR' or 'VCARD'.
     */
    public static ?string $defaultName = null;

    /**
     * List of properties, and which classes they map to.
     */
    public static array $propertyMap = [];

    /**
     * List of components, along with which classes they map to.
     */
    public static array $componentMap = [];

    /**
     * List of value-types, and which classes they map to.
     */
    public static array $valueMap = [];

    /**
     * Creates a new document.
     *
     * We're changing the default behavior slightly here. First, we don't want
     * to have to specify a name (we already know it), and we want to allow
     * children to be specified in the first argument.
     *
     * But, the default behavior also works.
     *
     * So the two sigs:
     *
     * new Document(array $children = [], $defaults = true);
     * new Document(string $name, array $children = [], $defaults = true)
     */
    public function __construct()
    {
        $args = func_get_args();
        $name = static::$defaultName;
        if (0 === count($args) || is_array($args[0])) {
            $children = $args[0] ?? [];
            $defaults = $args[1] ?? true;
        } else {
            $name = $args[0];
            $children = $args[1] ?? [];
            $defaults = $args[2] ?? true;
        }
        parent::__construct($this, $name, $children, $defaults);
    }

    /**
     * Returns the current document type.
     */
    public function getDocumentType(): int
    {
        return self::UNKNOWN;
    }

    /**
     * Creates a new component or property.
     *
     * If it's a known component, we will automatically call createComponent.
     * otherwise, we'll assume it's a property and call createProperty instead.
     */
    public function create(string $name)
    {
        if (isset(static::$componentMap[strtoupper($name)])) {
            return call_user_func_array([$this, 'createComponent'], func_get_args());
        } else {
            return call_user_func_array([$this, 'createProperty'], func_get_args());
        }
    }

    /**
     * Creates a new component.
     *
     * This method automatically searches for the correct component class, based
     * on its name.
     *
     * You can specify the children either in key=>value syntax, in which case
     * properties will automatically be created, or you can just pass a list of
     * Component and Property object.
     *
     * By default, a set of sensible values will be added to the component. For
     * an iCalendar object, this may be something like CALSCALE:GREGORIAN. To
     * ensure that this does not happen, set $defaults to false.
     */
    public function createComponent(string $name, array $children = null, bool $defaults = true): Component
    {
        $name = strtoupper($name);
        $class = Component::class;

        if (isset(static::$componentMap[$name])) {
            $class = static::$componentMap[$name];
        }
        if (is_null($children)) {
            $children = [];
        }

        return new $class($this, $name, $children, $defaults);
    }

    /**
     * Factory method for creating new properties.
     *
     * This method automatically searches for the correct property class, based
     * on its name.
     *
     * You can specify the parameters either in key=>value syntax, in which case
     * parameters will automatically be created, or you can just pass a list of
     * Parameter objects.
     *
     * @param string|null $valueType Force a specific valueType, such as URI or TEXT
     *
     * @throws InvalidDataException
     */
    public function createProperty(string $name, $value = null, array $parameters = null, string $valueType = null): Property
    {
        // If there's a . in the name, it means it's prefixed by a group name.
        if (false !== ($i = strpos($name, '.'))) {
            $group = substr($name, 0, $i);
            $name = strtoupper(substr($name, $i + 1));
        } else {
            $name = strtoupper($name);
            $group = null;
        }

        $class = null;

        if ($valueType) {
            // The valueType argument comes first to figure out the correct
            // class.
            $class = $this->getClassNameForPropertyValue($valueType);
        }

        if (is_null($class)) {
            // If a VALUE parameter is supplied, we should use that.
            if (isset($parameters['VALUE'])) {
                $class = $this->getClassNameForPropertyValue($parameters['VALUE']);
                if (is_null($class)) {
                    throw new InvalidDataException('Unsupported VALUE parameter for '.$name.' property. You supplied "'.$parameters['VALUE'].'"');
                }
            } else {
                $class = $this->getClassNameForPropertyName($name);
            }
        }
        if (is_null($parameters)) {
            $parameters = [];
        }

        return new $class($this, $name, $value, $parameters, $group);
    }

    /**
     * This method returns a full class-name for a value parameter.
     *
     * For instance, DTSTART may have VALUE=DATE. In that case we will look in
     * our valueMap table and return the appropriate class name.
     *
     * This method returns null if we don't have a specialized class.
     *
     * @return string|void|null
     */
    public function getClassNameForPropertyValue(string $valueParam)
    {
        $valueParam = strtoupper($valueParam);
        if (isset(static::$valueMap[$valueParam])) {
            return static::$valueMap[$valueParam];
        }
    }

    /**
     * Returns the default class for a property name.
     */
    public function getClassNameForPropertyName(string $propertyName): string
    {
        return static::$propertyMap[$propertyName] ?? Property\Unknown::class;
    }
}

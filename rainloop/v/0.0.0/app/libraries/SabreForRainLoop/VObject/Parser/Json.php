<?php

namespace SabreForRainLoop\VObject\Parser;

use
    SabreForRainLoop\VObject\Component\VCalendar,
    SabreForRainLoop\VObject\Component\VCard,
    SabreForRainLoop\VObject\ParseException,
    SabreForRainLoop\VObject\EofException;

/**
 * Json Parser.
 *
 * This parser parses both the jCal and jCard formats.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH. All rights reserved.
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class Json extends Parser {

    /**
     * The input data
     *
     * @var array
     */
    protected $input;

    /**
     * Root component
     *
     * @var Document
     */
    protected $root;

    /**
     * This method starts the parsing process.
     *
     * If the input was not supplied during construction, it's possible to pass
     * it here instead.
     *
     * If either input or options are not supplied, the defaults will be used.
     *
     * @param resource|string|array|null $input
     * @param int|null $options
     * @return array
     */
    public function parse($input = null, $options = null) {

        if (!is_null($input)) {
            $this->setInput($input);
        }
        if (is_null($this->input)) {
            throw new EofException('End of input stream, or no input supplied');
        }

        if (!is_null($options)) {
            $this->options = $options;
        }

        switch($this->input[0]) {
            case 'vcalendar' :
                $this->root = new VCalendar(array(), false);
                break;
            case 'vcard' :
                $this->root = new VCard(array(), false);
                break;
            default :
                throw new ParseException('The root component must either be a vcalendar, or a vcard');

        }
        foreach($this->input[1] as $prop) {
            $this->root->add($this->parseProperty($prop));
        }
        if (isset($this->input[2])) foreach($this->input[2] as $comp) {
            $this->root->add($this->parseComponent($comp));
        }

        // Resetting the input so we can throw an feof exception the next time.
        $this->input = null;

        return $this->root;

    }

    /**
     * Parses a component
     *
     * @param array $jComp
     * @return \SabreForRainLoop\VObject\Component
     */
    public function parseComponent(array $jComp) {

        // We can remove $self from PHP 5.4 onward.
        $self = $this;

        $properties = array_map(function($jProp) use ($self) {
            return $self->parseProperty($jProp);
        }, $jComp[1]);

        if (isset($jComp[2])) {

            $components = array_map(function($jComp) use ($self) {
                return $self->parseComponent($jComp);
            }, $jComp[2]);

        } else $components = array();

        return $this->root->createComponent(
            $jComp[0],
            array_merge( $properties, $components),
            $defaults = false
        );

    }

    /**
     * Parses properties.
     *
     * @param array $jProp
     * @return \SabreForRainLoop\VObject\Property
     */
    public function parseProperty(array $jProp) {

        list(
            $propertyName,
            $parameters,
            $valueType
        ) = $jProp;

        $propertyName = strtoupper($propertyName);

        // This is the default class we would be using if we didn't know the
        // value type. We're using this value later in this function.
        $defaultPropertyClass = $this->root->getClassNameForPropertyName($propertyName);

        $parameters = (array)$parameters;

        $value = array_slice($jProp, 3);

        $valueType = strtoupper($valueType);

        if (isset($parameters['group'])) {
            $propertyName = $parameters['group'] . '.' . $propertyName;
            unset($parameters['group']);
        }

        $prop = $this->root->createProperty($propertyName, null, $parameters, $valueType);
        $prop->setJsonValue($value);

        // We have to do something awkward here. FlatText as well as Text
        // represents TEXT values. We have to normalize these here. In the
        // future we can get rid of FlatText once we're allowed to break BC
        // again.
        if ($defaultPropertyClass === 'SabreForRainLoop\VObject\Property\FlatText') {
            $defaultPropertyClass = 'SabreForRainLoop\VObject\Property\Text';
        }

        // If the value type we received (e.g.: TEXT) was not the default value
        // type for the given property (e.g.: BDAY), we need to add a VALUE=
        // parameter.
        if ($defaultPropertyClass !== get_class($prop)) {
            $prop["VALUE"] = $valueType;
        }

        return $prop;

    }

    /**
     * Sets the input data
     *
     * @param resource|string|array $input
     * @return void
     */
    public function setInput($input) {

        if (is_resource($input)) {
            $input = stream_get_contents($input);
        }
        if (is_string($input)) {
            $input = json_decode($input);
        }
        $this->input = $input;

    }

}

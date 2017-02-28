<?php
/**
 * Copyright 2014 Facebook, Inc.
 *
 * You are hereby granted a non-exclusive, worldwide, royalty-free license to
 * use, copy, modify, and distribute this software in source code or binary
 * form for use in connection with the web services and APIs provided by
 * Facebook.
 *
 * As with any software that integrates with the Facebook platform, your use
 * of this software is subject to the Facebook Developer Principles and
 * Policies [http://developers.facebook.com/policy/]. This copyright notice
 * shall be included in all copies or substantial portions of the software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */
namespace Facebook\GraphNodes;

/**
 * Class GraphLocation
 *
 * @package Facebook
 */
class GraphLocation extends GraphNode
{
    /**
     * Returns the street component of the location
     *
     * @return string|null
     */
    public function getStreet()
    {
        return $this->getField('street');
    }

    /**
     * Returns the city component of the location
     *
     * @return string|null
     */
    public function getCity()
    {
        return $this->getField('city');
    }

    /**
     * Returns the state component of the location
     *
     * @return string|null
     */
    public function getState()
    {
        return $this->getField('state');
    }

    /**
     * Returns the country component of the location
     *
     * @return string|null
     */
    public function getCountry()
    {
        return $this->getField('country');
    }

    /**
     * Returns the zipcode component of the location
     *
     * @return string|null
     */
    public function getZip()
    {
        return $this->getField('zip');
    }

    /**
     * Returns the latitude component of the location
     *
     * @return float|null
     */
    public function getLatitude()
    {
        return $this->getField('latitude');
    }

    /**
     * Returns the street component of the location
     *
     * @return float|null
     */
    public function getLongitude()
    {
        return $this->getField('longitude');
    }
}

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
 * Class GraphPage
 *
 * @package Facebook
 */
class GraphPage extends GraphNode
{
    /**
     * @var array Maps object key names to Graph object types.
     */
    protected static $graphObjectMap = [
        'best_page' => '\Facebook\GraphNodes\GraphPage',
        'global_brand_parent_page' => '\Facebook\GraphNodes\GraphPage',
        'location' => '\Facebook\GraphNodes\GraphLocation',
    ];

    /**
     * Returns the ID for the user's page as a string if present.
     *
     * @return string|null
     */
    public function getId()
    {
        return $this->getField('id');
    }

    /**
     * Returns the Category for the user's page as a string if present.
     *
     * @return string|null
     */
    public function getCategory()
    {
        return $this->getField('category');
    }

    /**
     * Returns the Name of the user's page as a string if present.
     *
     * @return string|null
     */
    public function getName()
    {
        return $this->getField('name');
    }

    /**
     * Returns the best available Page on Facebook.
     *
     * @return GraphPage|null
     */
    public function getBestPage()
    {
        return $this->getField('best_page');
    }

    /**
     * Returns the brand's global (parent) Page.
     *
     * @return GraphPage|null
     */
    public function getGlobalBrandParentPage()
    {
        return $this->getField('global_brand_parent_page');
    }

    /**
     * Returns the location of this place.
     *
     * @return GraphLocation|null
     */
    public function getLocation()
    {
        return $this->getField('location');
    }

    /**
     * Returns the page access token for the admin user.
     *
     * Only available in the `/me/accounts` context.
     *
     * @return string|null
     */
    public function getAccessToken()
    {
        return $this->getField('access_token');
    }

    /**
     * Returns the roles of the page admin user.
     *
     * Only available in the `/me/accounts` context.
     *
     * @return array|null
     */
    public function getPerms()
    {
        return $this->getField('perms');
    }
}

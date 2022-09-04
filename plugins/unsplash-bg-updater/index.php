<?php
/**
 * Copyright © 2019 Denis Vadimov aka BloodyAltair
 */

    /** @noinspection PhpUndefinedClassInspection */

    include_once __DIR__ . DIRECTORY_SEPARATOR . 'vendor' . DIRECTORY_SEPARATOR . 'autoload.php';

    use Crew\Unsplash\HttpClient;
    use Crew\Unsplash\Photo;
    use RainLoop\Enumerations\PluginPropertyType;
    use RainLoop\Plugins\AbstractPlugin;
    use RainLoop\Plugins\Property;

    /** @noinspection SpellCheckingInspection */

class UnsplashBgUpdaterPlugin extends AbstractPlugin {

    public function Init() {
        $this->addJs ('js/unsplashbg.min.js');
        $this->addJs ('js/plugin.js');
        /**
         * Admin JS
         */
        $this->addJs ('js/unsplashbg.min.js', true);
        $this->addJs ('js/plugin.js', true);

        $this->addAjaxHook('getNewImage', 'getNewImage');
    }

    /**
     * Gets new image from Unsplash API
     * @return \RainLoop\Plugins\AbstractPlugin
     */
    public function getNewImage() {
        if(is_array($response = $this->checkConfiguration ())) {
            $response['success'] = false;
        } else {
            try {
                /** @noinspection PhpUndefinedClassInspection */
                HttpClient::init ([
                    'applicationId' => $this->Config ()->Get ('plugin', 'AccessToken', NULL),
                    'utmSource' => $this->Config ()->Get ('plugin', 'AppName', NULL)
                ]);
                /** @noinspection PhpUndefinedClassInspection */
                $data = Photo::random ([
                    'query' => $this->Config ()->Get ('plugin', 'Query', NULL),
                    'w' => $this->Config ()->Get ('plugin', 'Width', NULL),
                    'h' => $this->Config ()->Get ('plugin', 'Height', NULL)
                ]);
                /** @noinspection PhpUndefinedFieldInspection */
                $response = [
                    'success' => true,
                    'url' => $data->urls['custom'],
                    'image_user_name' => $data->user['name'],
                    'image_user_url' => $data->user['links']['html']
                ];
                if ($data === null)
                    $response = [
                        "success" => false,
                        "error" => "API unreachable. Probably reached requests limit."
                    ];
            } catch (Exception $e) {
                $response = [
                    'success' => false,
                    'error' => $e->getMessage (),
                ];
            }
        }
        return $this->ajaxResponse(__FUNCTION__, $response);
    }

    /**
     * Checks configuration. Returned array means error
     * @return array|bool
     */
    public function checkConfiguration() {
        $access_token   = $this->Config()->Get('plugin', 'AccessToken', null);
        $app_name       = $this->Config()->Get('plugin', 'AppName', null);
        $width          = $this->Config()->Get('plugin', 'Width', -1);
        $height         = $this->Config()->Get('plugin', 'Height', -1);
        $check          = $this->Config()->Get('plugin', 'Check', false);
        $update_rate    = $this->Config()->Get('plugin', 'UpdateRate', -1);

        $return = true;
        if(!$access_token) {
            $return = [
                'error' => "[Settings] Access token is mandatory!"
            ];
        }
        if(!$app_name) {
            $return = [
                'error' => "[Settings] You must supply app name!"
            ];
        }
        if(!$width || !$height) {
            $return = [
                'error' => "[Settings] Width and height are mandatory positive integers!"
            ];
        }
        if(!$check) {
            $return = [
                'error' => "[Settings] Toggle checkbox on settings page :)"
            ];
        }
        if(!$update_rate) {
            $return = [
                'error' => "[Settings] Update rate is mandatory positive integer!"
            ];
        }
        return $return;
    }

    /**
     * @return array
     */
    public function configMapping() {
        return [
            Property::NewInstance('AccessToken')->SetDescription ('You can get it by registering an application on https://unsplash.com/developers')
                ->SetLabel('Unsplash access key')
                ->SetType(PluginPropertyType::STRING)
                ->SetAllowedInJs (false),
            Property::NewInstance('AppName')->SetDescription ('(e.g "My Awesome BG Updater") You must supply this parameter: it is Unsplash API terms requirement')
                ->SetLabel('Name of your API application')
                ->SetType(PluginPropertyType::STRING)
                ->SetAllowedInJs (true),
            Property::NewInstance('UpdateRate')->SetDescription ('Note: different types of API applications allowed to use different request rate. 
                Read API docs at https://unsplash.com/documentation#rate-limiting')
                ->SetLabel('Background update rate (seconds)')
                ->SetType(PluginPropertyType::INT)
                ->SetDefaultValue (120)
                ->SetAllowedInJs (true),
            Property::NewInstance('Query')->SetLabel('Custom search query')
                ->SetType(PluginPropertyType::STRING)
                ->SetAllowedInJs (false),
            Property::NewInstance('Width')->SetLabel('Image width')
                ->SetType(PluginPropertyType::INT)
                ->SetDefaultValue (1920)
                ->SetAllowedInJs (true),
            Property::NewInstance('Height')->SetLabel('Image height')
                ->SetType(PluginPropertyType::INT)
                ->SetDefaultValue (1080)
                ->SetAllowedInJs (true),
            Property::NewInstance ('Check')->SetLabel ('I will not forget to install the theme `Default` or any other that looks good with this plugin')
                ->SetType (PluginPropertyType::BOOL)
                ->SetDefaultValue (false)
                ->SetAllowedInJs (true),
        ];
    }
}


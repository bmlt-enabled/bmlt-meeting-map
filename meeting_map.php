<?php
/*
Plugin Name: BMLT Meeting Map
Description: Simple responsive Meeting Map.
Author: BmltEnabled
Version: 2.0.1
*/
/* Disallow direct access to the plugin file */
if (basename($_SERVER['PHP_SELF']) == basename(__FILE__)) {
    // die('Sorry, but you cannot access this page directly.');
}
if (!class_exists("BMLTMeetingMap")) {
    // phpcs:disable PSR1.Classes.ClassDeclaration.MissingNamespace
    class BMLTMeetingMap
    {
        // phpcs:enable PSR1.Classes.ClassDeclaration.MissingNamespace
        public $optionsName = 'bmlt_meeting_map_options';
        public $options = array();

        public function __construct()
        {
            $this->getOptions();
            if (is_admin()) {
                // Back end
                add_action("admin_notices", array(&$this, "is_root_server_missing"));
                add_action("admin_enqueue_scripts", array(&$this, "enqueue_backend_files"), 500);
                add_action("admin_menu", array(&$this, "admin_menu_link"));
            } else {
                // Front end
                add_action("wp_enqueue_scripts", array(&$this, "enqueue_frontend_files"));
                add_shortcode('bmlt_meeting_map', array(
                    &$this,
                    "meeting_map"
                ));
            }
        }
        public function enhanceTileProvider()
        {
            switch ($this->options['tile_provider']) {
                case 'MapBox':
                    $this->options['tile_url'] =
                    'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}';
                    $this->options['tile_params'] = array(
                    'attribution'   => 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
                    'id'            => 'mapbox.streets',
                    'accessToken'   => $this->options['api_key']
                    );
                    break;
                case "OSM DE":
                    $this->options['tile_url'] =
                    'https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png';
                    $this->options['tile_params'] = array(
                    'attribution'   => 'Map data &copy; <a href="https://www.openstreetmap.de/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
                    "maxZoom"       => '18',
                    //'subdomains'    => '["a","b","c"]'
                    );
                    break;
                case custom:
                    // http://tileserver.maptiler.com/campus/{z}/{x}/{y}.png
                    $this->options['tile_params'] = array(
                    'attribution'   => $this->options['tile_attribution'],
                    "maxZoom"       => '18',
                    );
                    break;
                case "OSM":
                default:
                    $this->options['tile_url'] =
                    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
                    $this->options['tile_params'] = array(
                    'attribution'   => 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
                    "maxZoom"       => '18',
                    );
                    break;
            }
        }
        // phpcs:disable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
        public function has_shortcode()
        {
            // phpcs:enable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
            $post_to_check = get_post(get_the_ID());
            // check the post content for the short code
            if (stripos($post_to_check->post_content, '[bmlt_meeting_map') !== false) {
                return true;
            }
            return false;
        }
        // phpcs:disable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
        public function is_root_server_missing()
        {
            // phpcs:enable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
            $root_server = $this->options['root_server'];
            if ($root_server == '') {
                echo '<div id="message" class="error"><p>Missing BMLT Root Server in settings for BMLT Meeting Map.</p>';
                $url = admin_url('options-general.php?page=bmlt_meeting_map.php');
                echo "<p><a href='$url'>BMLT_Meeting_Map Settings</a></p>";
                echo '</div>';
            }
            add_action("admin_notices", array(
                &$this,
                "clear_admin_message"
            ));
        }
        // phpcs:disable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
        public function clear_admin_message()
        {
            // phpcs:enable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
            remove_action("admin_notices", array(
                &$this,
                "is_root_server_missing"
            ));
        }
        public function BMLTMeetingMap()
        {
            $this->__construct();
        }
        /**
         * @param $hook
         */
        // phpcs:disable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
        public function enqueue_backend_files($hook)
        {
            wp_enqueue_script('jquery');
            wp_enqueue_script("admin", plugin_dir_url(__FILE__) . "js/admin.js", false, filemtime(plugin_dir_path(__FILE__) . "js/admin.js"), true);
        }
        /**
         * @desc Adds JS/CSS to the header
         */
        // phpcs:disable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
        public function enqueue_frontend_files()
        {
            // phpcs:enable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
            if ($this->has_shortcode()) {
                if ($this->options['tile_provider'] == 'google') {
                    wp_enqueue_style("snazzy-info-window", plugin_dir_url(__FILE__) . "css/snazzy-info-window.min.css", false, filemtime(plugin_dir_path(__FILE__) . "css/snazzy-info-window.min.css"), false);
                    wp_enqueue_style("meeting_map", plugin_dir_url(__FILE__) . "css/meeting_map.css", false, filemtime(plugin_dir_path(__FILE__) . "css/meeting_map.css"), false);
                    wp_enqueue_script("snazzy-info-window", plugin_dir_url(__FILE__) . "js/snazzy-info-window.min.js", false, filemtime(plugin_dir_path(__FILE__) . "js/snazzy-info-window.min.js"), true);
                    wp_enqueue_script("gmapsDelegate", plugin_dir_url(__FILE__) . "js/gmapsDelegate.js", false, filemtime(plugin_dir_path(__FILE__) . "js/gmapsDelegate.js"), false);
                    wp_enqueue_script("meeting_map", plugin_dir_url(__FILE__) . "js/meeting_map.js", false, filemtime(plugin_dir_path(__FILE__) . "js/meeting_map.js"), false);
                } else {
                    wp_enqueue_style("leaflet", plugin_dir_url(__FILE__) . "css/leaflet.css", false, filemtime(plugin_dir_path(__FILE__) . "css/leaflet.css"), false);
                    wp_enqueue_style("meeting_map", plugin_dir_url(__FILE__) . "css/meeting_map.css", false, filemtime(plugin_dir_path(__FILE__) . "css/meeting_map.css"), false);
                    wp_enqueue_script("leaflet", plugin_dir_url(__FILE__) . "js/leaflet.js", false, filemtime(plugin_dir_path(__FILE__) . "js/leaflet.js"), false);
                    //wp_enqueue_script("geocoder", plugin_dir_url(__FILE__) . "js/nominatim.js", false, filemtime(plugin_dir_path(__FILE__) . "js/nominatim.js"), false);
                    wp_enqueue_script("osmDelegate", plugin_dir_url(__FILE__) . "js/osmDelegate.js", false, filemtime(plugin_dir_path(__FILE__) . "js/osmDelegate.js"), false);
                    wp_enqueue_script("meeting_map", plugin_dir_url(__FILE__) . "js/meeting_map.js", false, filemtime(plugin_dir_path(__FILE__) . "js/meeting_map.js"), false);
                }
            }
        }
        public function testRootServer($root_server)
        {
            $results = $this->get("$root_server/client_interface/serverInfo.xml");
            $httpcode = wp_remote_retrieve_response_code($results);
            $response_message = wp_remote_retrieve_response_message($results);
            if ($httpcode != 200 && $httpcode != 302 && $httpcode != 304 && !empty($response_message)) {
                return false;
            }
            $body = wp_remote_retrieve_body($results);
            return $body;
        }
        public function doQuit($message = '')
        {
            ob_flush();
            flush();
            $message .= '
			<script>
				document.getElementById("please-wait").style.display = "none";
			</script>';
            return $message;
        }
        // phpcs:disable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
        public function admin_menu_link()
        {
            // phpcs:enable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
            // If you change this from add_options_page, MAKE SURE you change the filter_plugin_actions function (below) to
            // reflect the page file name (i.e. - options-general.php) of the page your plugin is under!
            add_options_page('BMLT Meeting Map', 'BMLT Meeting Map', 'activate_plugins', basename(__FILE__), array(
                &$this,
                'admin_options_page'
            ));
            add_filter('plugin_action_links_' . plugin_basename(__FILE__), array(
                &$this,
                'filter_plugin_actions'
            ), 10, 2);
        }
        /**
         * Adds settings/options page
         */
        // phpcs:disable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
        public function admin_options_page()
        {
            // phpcs:enable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
            if (isset($_POST['bmltmapssave']) && boolval($_POST['bmltmapssave'])) {
                if (!wp_verify_nonce($_POST['_wpnonce'], 'bmltmapupdate-options')) {
                    die('Whoops! There was a problem with the data you posted. Please go back and try again.');
                }
                $this->options['root_server'] = validate_url($_POST['root_server']);
                $this->options['api_key'] = sanitize_text_field($_POST['api_key']);
                $this->options['region_bias'] = sanitize_text_field($_POST['region_bias']);
                $this->options['bounds_north'] = sanitize_text_field($_POST['bounds_north']);
                $this->options['bounds_south'] = sanitize_text_field($_POST['bounds_south']);
                $this->options['bounds_east'] = sanitize_text_field($_POST['bounds_east']);
                $this->options['bounds_west'] = sanitize_text_field($_POST['bounds_west']);
                $this->options['lat'] = floatval($_POST['lat']);
                $this->options['lng'] = floatval($_POST['lng']);
                $this->options['zoom'] = intval($_POST['zoom']);
                $this->options['time_format'] = intval($_POST['time_format']);
                $this->options['lang'] = sanitize_text_field($_POST['lang']);
                $this->options['tile_provider'] = sanitize_text_field($_POST['tile_provider']);
                $this->options['nominatim_url'] = sanitize_text_field($_POST['nominatim_url']);
                $this->options['tile_url'] = sanitize_text_field($_POST['tile_url']);
                $this->options['tile_attribution'] = wp_kses_post(stripslashes($_POST['tile_attribution']));
                if (empty($this->options['nominatim_url'])) {
                    $this->options['nominatim_url'] = 'https://nominatim.openstreetmap.org/';
                }
                $this->save_admin_options();
                set_transient('admin_notice', 'Please put down your weapon. You have 20 seconds to comply.');
                echo '<div class="updated"><p>Success! Your changes were successfully saved!</p></div>';
            }
            ?>
            <div class="wrap">
                <h2>BMLT Meeting Map</h2>
                <form style="display:inline!important;" method="POST" id="bmlt_maps_options" name="bmlt_maps_options">
                    <?php wp_nonce_field('bmltmapupdate-options'); ?>
                    <?php $this_connected = $this->testRootServer($this->options['root_server']); ?>
                    <?php $connect = "<p><div style='color: #f00;font-size: 16px;vertical-align: text-top;' class='dashicons dashicons-no'></div><span style='color: #f00;'>Connection to Root Server Failed.  Check spelling or try again.  If you are certain spelling is correct, Root Server could be down.</span></p>"; ?>
                    <?php if ($this_connected != false) {
                        $info = simplexml_load_string($this_connected);
                        if (!isset($this->options['lang']) || $this->options['lang']=='') {
                            $this->options['lang'] = 'en';
                        }
                        $versionString = $info->serverVersion->readableString;
                        $versionParts = explode('.', $versionString);
                        if (intval($versionParts[0])*100+intval($versionParts[1]) < intval(213)) {
                            $connect = "<span style='color: #f00;'><div style='font-size: 16px;vertical-align: text-top;' class='dashicons dashicons-no'></div>Version ".$this_connected." -- Requires at least 2.13</span>";
                        } else {
                            $connect = "<span style='color: #00AD00;'><div style='font-size: 16px;vertical-align: text-top;' class='dashicons dashicons-smiley'></div>Version ".$this_connected."</span>";
                            $this_connected = true;
                        }
                    } ?>
                    <div style="margin-top: 20px; padding: 0 15px;" class="postbox">
                        <h3>BMLT Root Server URL</h3>
                        <p>Example: http://narcotics-anonymous.de/bmlt</p>
                        <ul>
                            <li>
                                <label for="root_server">Default Root Server: </label>
                                <input id="root_server" type="text" size="40" name="root_server" value="<?php echo $this->options['root_server']; ?>" /> <?php echo $connect; ?>
                            </li>
                        </ul>
                    </div>
                    <div style="padding: 0 15px;" class="postbox">
                        <h3>Tile Provider</h3>
                        <select name="tile_provider" id="tile_provider">
                            <option value="OSM" <?php echo ( 'OSM' == $this->options['tile_provider'] ? 'selected' : '' )?>>Open Street Map</option>
                            <option value="OSM DE" <?php echo ( 'OSM DE' == $this->options['tile_provider'] ? 'selected' : '' )?>>German Open Street Map</option>
                            <option value="google" <?php echo ( 'google' == $this->options['tile_provider'] ? 'selected' : '' )?>>Google Maps</option>
                            <option value="custom" <?php echo ( 'custom' == $this->options['tile_provider'] ? 'selected' : '' )?>>Custom</option>
                        </select>
                        <div id="custom_tile_provider">
                            <label for="tile_url">URL for tiles: </label>
                            <input id="tile_url" type="text" size="60" name="tile_url" value="<?php echo $this->options['tile_url']; ?>" />
                            <br>
                            <label for="tile_attribution">Attribution: </label>
                            <input id="tile_attribution" type="text" size="60" name="tile_attribution" value="<?php echo esc_html($this->options['tile_attribution']); ?>" />
                        </div>
                        <div id="api_key_div">
                            <label for="api_key">API Key: </label>
                            <input id="api_key" type="text" size="40" name="api_key" value="<?php echo $this->options['api_key']; ?>" />
                        </div>
                        <h3>GeoCoding Parameters</h3>
                        <div id="nominatim_div">
                            <label for="nominatim_url">Nominatim URL: </label>
                            <input id="nominatim_url" type="text" size="40" name="nominatim_url" value="<?php echo $this->options['nominatim_url']; ?>" />
                        </div>
                        <ul>
                            <li>
                                <label for="region_bias">Region/ Country Code (optional): </label>
                                <input id="region_bias" type="text" size="2" name="region_bias" value="<?php echo $this->options['region_bias']; ?>" />
                            </li>
                            <li>
                            <table>
                            <tr>
                            <td>Geolocation Bounds (optional)</td>
                            <td>
                                <label for="bounds_north">North: </label>
                                <input id="bounds_north" type="text" size="8" name="bounds_north" value="<?php echo $this->options['bounds_north']; ?>" />
                                <label for="bounds_east">East: </label>
                                <input id="bounds_east" type="text" size="8" name="bounds_east" value="<?php echo $this->options['bounds_east']; ?>" />
                                <br>
                                <label for="bounds_south">South: </label>
                                <input id="bounds_south" type="text" size="8" name="bounds_south" value="<?php echo $this->options['bounds_south']; ?>" />
                                <label for="bounds_west">West: </label>
                                <input id="bounds_west" type="text" size="8" name="bounds_west" value="<?php echo $this->options['bounds_west']; ?>" />
                             </td>
                            </tr>
                            </table>
                            </li>
                        </ul>
                    </div>
                    <div style="padding: 0 15px;" class="postbox">
                        <h3>Default Latitude and Longitude of map</h3>
                        <p>Open Google Maps, right click on a point, and select "what is here?"</p>
                        <ul>
                            <li>
                                <label for="lat">Latitude: </label>
                                <input id="lat" type="text" size="10" name="lat" value="<?php echo $this->options['lat']; ?>" />
                            </li>
                            <li>
                                <label for="lng">longitude: </label>
                                <input id="lng" type="text" size="10" name="lng" value="<?php echo $this->options['lng']; ?>" />
                            </li>
                            <li>
                                <label for="zoom">zoom: </label>
                                <input id="zoom" type="text" size="3" name="zoom" value="<?php echo $this->options['zoom']; ?>" />
                            </li>                           
                        </ul>
                    </div>
                    <div style="padding: 0 15px;" class="postbox">
                        <h3>Internationalization</h3>
                        <ul>
                            <li>
                                <label for="lang">Default language: </label>
                                <select id="lang" name="lang" >
                                    <option value="de" <?php echo ( 'de' == $this->options['lang'] ? 'selected' : '' )  ?>>German</option>
                                    <option value="en" <?php echo ( 'en' == $this->options['lang'] ? 'selected' : '' )  ?>>English</option>
                                </select>
                            <li>
                            <li>
                                <label for="time_format">Time Format: </label>
                                <select id="time_format" name="time_format" >
                                    <option value="12" <?php echo ( 12 == $this->options['time_format'] ? 'selected' : '' )  ?>>12 Hour (e.g. 1:30pm)</option>
                                    <option value="24" <?php echo ( 24 == $this->options['time_format'] ? 'selected' : '' )  ?>>24 Hour (e.g. 13:30)</option>
                                </select>
                            </li>
                        </ul>
                    </div>
                    <input type="submit" value="SAVE CHANGES" name="bmltmapssave" class="button-primary" />                 
                </form>
                <h2>Instructions</h2>
                <p> Please join us on Facebook!  In the group <a href="http://www.facebook.com/groups/bmltapp">Basic Meeting List Toolbox</a> you'll
                find a community to support you, including the authors of this plugin.</p>
                <p> The shortcode <code>[bmlt_meeting_map]</code> can be embedded on any page, and
                its initial location, zoom factor, etc., will be as defined on this
                page.  Additionally, its behavior can be modified by including parameters
                in the shortcode, or in the query string of the URL.  
                <div id="accordion">
                    <h3 class="help-accordian"><strong>Shortcode Parameters</strong></h3>
                    <div>
                        <p><code>lat,lng,zoom</code> - Specify the latitude, longitude, and zoom factor of the map.<br>Example:
                        <code>[bmlt_meeting_map lat="52.533849" lng="13.418893" zoom="12"]</code>
                        <p><code>lang_enum</code> - Specify the language for format desciptions and weekdays.  Use standard 2-character abbrieviations, e.g. 'en' for English, 'de' for German.
                        <p><code>query_string</code> - Restrict the meetings on the map 
                        to those matching any criteria that can be expressed as a BMLT query.  Use the 
                        BMLT Semantic Workshop to find legal queries.<br>Example:
                        <code>[bmlt_meeting_map query_string="&formats=192"]</code>
                        <p><code>center_me</code> - Set to a non-zero value to obtain the user's location,
                        and use that to center the meeting map.
                        <p><code>goto</code> - Use Google geocoding to find the location.  May be either the name of a city 
                        or a zip code.<br>Example:
                        <code>[bmlt_meeting_map goto="Hamburg"]</code>
                    </div>
                    <h3 class="help-accordian"><strong>URL Query String Parameters</strong></h3>
                    <div>
                        <p>Having the map location parameters in the URL allows sites
                        to have a form asking for the location on one page (or in a widget that
                        appears on all pages) whose submission brings the user to a properly
                        configured meeting map.
                        <p><code>goto</code> - Use Google geocoding to find the location.  May be either the name of a city 
                        or a zip code.<br>Example:
                        <code>http://mysite.org/meeting-map-page?goto="Hamburg"</code>
                        <p><code>gotoMe</code> -  - Set to a non-zero value to obtain the user's location,
                        and use that to center the meeting map.<br>Example:
                        <code>http://mysite.org/meeting-map-page?gotoMe="1"</code>
                    </div>
                </div>
            </div>
            <?php
        }
        /**
         * @desc Adds the Settings link to the plugin activate/deactivate page
         */
        // phpcs:disable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
        public function filter_plugin_actions($links, $file)
        {
            // phpcs:enable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
            // If your plugin is under a different top-level menu than Settings (IE - you changed the function above to something other than add_options_page)
            // Then you're going to want to change options-general.php below to the name of your top-level page
            $settings_link = '<a href="options-general.php?page=' . basename(__FILE__) . '">' . __('Settings') . '</a>';
            array_unshift($links, $settings_link);
            // before other links
            return $links;
        }
        /**
         * Retrieves the plugin options from the database.
         * @return array
         */
        public function getOptions()
        {
            // Don't forget to set up the default options
            if (!$theOptions = get_option($this->optionsName)) {
                $theOptions = array(
                    'root_server' => '',
                    'api_key' => '',
                    'lat' => 52.533849,
                    'lng' => 13.418893,
                    'zoom' => 12
                );
                update_option($this->optionsName, $theOptions);
            }
            $this->options = $theOptions;
            $path_parts = pathinfo($this->options['root_server']);
            if (isset($path_parts['extension'])) {
                $this->options['root_server'] = $path_parts['dirname'];
            }
            $parts = parse_url($this->options['root_server']);
            if (isset($parts['scheme']) && isset($parts['host']) && isset($parts['path'])) {
                $this->options['root_server'] = $parts['scheme'].'://'.$parts['host'].$parts['path'];
            }
            if (!isset($this->options['tile_provider'])) {
                $this->options['tile_provider'] = 'google';
            }
            if (!isset($this->options['nominatim_url'])) {
                $this->options['nominatim_url'] = 'https://nominatim.openstreetmap.org/';
            }
        }
        /**
         * Saves the admin options to the database.
         */
        // phpcs:disable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
        public function save_admin_options()
        {
            // phpcs:enable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
            $path_parts = pathinfo($this->options['root_server']);
            if ($path_parts['extension']) {
                $this->options['root_server'] = $path_parts['dirname'];
            }
            $parts = parse_url($this->options['root_server']);
            $this->options['root_server'] = $parts['scheme'].'://'.$parts['host'].$parts['path'];
            $this->options['root_server'] = untrailingslashit($this->options['root_server']);
            update_option($this->optionsName, $this->options);
            return;
        }
        // phpcs:disable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
        public function meeting_map($att)
        {
            // phpcs:enable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
            while (@ob_end_flush()) {
            }
            if (!isset($this->options['lat']) || trim($this->options['lat'])=='') {
                $this->options['lat'] = 52.519575;
            }
            if (!isset($this->options['lng']) || trim($this->options['lng'])=='') {
                $this->options['lng'] = 13.392006;
            }
            if (!isset($this->options['zoom']) || trim($this->options['zoom'])=='') {
                $this->options['zoom'] = 12;
            }
            if (!isset($this->options['time_format'])) {
                $this->options['time_format'] = 24;
            }
            if (!isset($this->options['lang'])) {
                $this->options['lang'] = 'en';
            }
            if (!isset($this->options['nominatim_url'])
            ||  empty($this->options['nominatim_url'])) {
                $this->options['nominatim_url'] = 'https://nominatim.openstreetmap.org/';
            }
            extract($att = shortcode_atts(array(
                'lat' => $this->options['lat'],
                'lng' => $this->options['lng'],
                'zoom' => $this->options['zoom'],
                'lang_enum' => $this->options['lang'],
                'query_string' => '',
                'center_me' => 0,
                'goto' => ''
            ), $att, 'bmlt_meeting_map'));
            $gotomeTmp = isset($_GET['gotoMe']) ? $_sanitize_text_field($_GET['gotoMe']) : '';
            if ($gotomeTmp!='' && $gotomeTmp!='0') {
                $center_me = 1;
                $goto = '';
            }
            $gotoTmp = isset($_GET['goto']) ? sanitize_text_field($_GET['goto']) : '';
            if ($gotoTmp!='') {
                $goto = $gotoTmp;
                $center_me = 0;
            }
            include(dirname(__FILE__)."/lang/translate_".$lang_enum.".php");
            // phpcs:enable PSR1.Methods.CamelCapsMethodName.NotCamelCaps		        
              $the_new_content = $this->configure_javascript($translate, $query_string, $lang_enum);
                $the_new_content .= '<div class="bmlt_map_container_div"  id="bmlt_map_container" >';  // This starts off hidden, and is revealed by JS.
                $the_new_content .= '<div dir="ltr" class="bmlt_search_map_div" id="bmlt_search_map_div">';
                $the_new_content .= '<script type="text/javascript">var g_start_week = 2; document.getElementById("bmlt_map_container").style.display=\'block\';c_mm = new MeetingMap( document.getElementById(\'bmlt_search_map_div\'), {\'latitude\':'.$lat.',\'longitude\':'.$lng.',\'zoom\':'.$zoom.'});</script>';
                $the_new_content .= '<div id="filter_modal" class="modal">
		        
		        <div class="modal-content">
                <span class="modal-title">'.$translate['Filter_Header'].'</span><span id="close_filter" class="modal-close">&times;</span>
		        <p>
                '.$translate['By_Language'].'<br>
                <span class="custom-dropdown">
                <select id="language_filter">will be filled by javascript</select>
                </span><p>
                '.$translate['By_Format'].'<br>
                <span class="custom-dropdown">
                <select id="main_filter">will be filled by javascript</select>
                </span><p>
                '.$translate['By_Weekday'].'<br>
                <span class="custom-dropdown">
                <select id="day_filter">will be filled by javascript</select>
                </span>
                <p>
                <input id="open_filter" type="checkbox"><span id="open_filter_text">will be filled by javascript</span>
                <p>
                <button id="filter_button" class="filter-button" type="button"><b>'.$translate['Filter_Button'].'</b></button><button id="reset_filter_button" class="filter-button" type="button"><b>'.$translate['Reset_Filters'].'</b></button>
		        </div>
		        
		        </div>
		        <div id="table_modal" class="modal">
		        
		        <div id="table_content" class="modal-content">
		        <span class="modal-title">Meetings on Map</span><span id="close_table" class="modal-close">&times;</span>
                <div id="modal-tab">
                    <button id="modal-day-button" class="modal-tablinks" onclick="c_mm.openTableViewExt(event, \'modal-view-by-weekday\')">By Day</button>
                    <button id="modal-city-button" class="modal-tablinks" onclick="c_mm.openTableViewExt(event, \'modal-view-by-city\')">By City</button>
                </div>
                <div id="modal-view-by-weekday" class="modal-tabcontent"></div>
                <div id="modal-view-by-city" class="modal-tabcontent"></div>
		        </div>		        
		        </div>
		        <div id="search_modal" class="modal">
		        
		        <div id="search_content" class="modal-content">
		        <span class="modal-title">'.$translate['Find_Meetings'].'</span><span id="close_search" class="modal-close">&times;</span>
                <p><div class="modal-search">
                    '.$translate['SEARCH_PROMPT'].'
                    <input id="goto-text" type="text">
                    <p><button id="goto-button" class="filter-button">'.$translate['Go'].'</button>
                </div>
  		        </div>	
                </div>	        
                </div>
                </div>';
                
                $root_server = $this->options['root_server'];
                add_action('wp_footer', function () use ($root_server, $query_string, $center_me, $goto, $lang_enum) {
                    ob_flush();
                    flush();
                    $this_connected = $this->testRootServer($this->options['root_server']);
                    if ($this_connected == false) {
                        echo "<h1>Could not connect to BMLT Server: ".$this->options['root_server']."</h1>";
                        return;
                    } else {
                        $versionString = simplexml_load_string($this_connected)->serverVersion->readableString;
                        $versionParts = explode('.', $versionString);
                        if (intval($versionParts[0])*100+intval($versionParts[1]) < intval(213)) {
                            echo "<h1>BMLT Server: ".$this->options['root_server']." has incompatible version ".$versionString.". The meeeting map requires at least 2.13</h1>";
                            return;
                        }
                    }
                    $footer_content = '<div style="display:none;">';
                    $footer_content .= '<script type="text/javascript">c_mm.loadAllMeetingsExt(';
                    $footer_content .=  $this->getAllMeetings($root_server, $query_string).",";
                    $footer_content .=  $this->getAllFormats($root_server, $lang_enum).",";
                    $footer_content .= $center_me.',"'.$goto.'");</script>';
                    $footer_content .= '</div>';
                    echo $footer_content;
                });
                return $the_new_content;
        }
        
        
        /************************************************************************************//**
         *   \brief  This returns the global JavaScript stuff for the new map search that only   *
         *           only needs to be loaded once.                                               *
         *                                                                                       *
         *   \returns A string. The XHTML to be displayed.                                       *
         ****************************************************************************************/
		// phpcs:disable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
        public function configure_javascript($translate, $query_string, $lang_enum)
        {
		    // phpcs:enable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
            $this->enhanceTileProvider();
            $options = $this->options;
            $gKey = '';
            
            if (isset($options['api_key']) && ('' != $options['api_key']) && ('INVALID' != $options['api_key'])) {
                $gKey = $options['api_key'];
            }
            $ret = '';
            if ($this->options['tile_provider']=='google') {
            // Include the Google Maps API files.
                $ret = '<script type="text/javascript" src="https://maps.googleapis.com/maps/api/js?libraries=geometry&key='.$gKey;
                if (isset($options['region_bias']) && $options['region_bias']) {
                    $ret .= '&region='.strtoupper($options['region_bias']);
                }
                $ret .= '"></script>';
            }
            // Declare the various globals and display strings. This is how we pass strings to the JavaScript, as opposed to the clunky way we do it in the root server.
            $ret .= '<script type="text/javascript">' . (defined('_DEBUG_MODE_') ? "\n" : '');
            $ret .= 'var c_g_no_meetings_found = "'.htmlspecialchars($translate['NO_MEETINGS']).'";';
            $ret .= 'var c_g_server_error = "'.htmlspecialchars($translate['SERVER_ERROR']).'";';
            $ret .= 'var c_g_weekdays = '.htmlspecialchars($translate['WEEKDAYS']).';';
            $ret .= 'var c_g_weekdays_short = '.htmlspecialchars($translate['WKDYS']).';';
            $ret .= 'var c_g_menu_search = "'.htmlspecialchars($translate['MENU_SEARCH']).'";';
            $ret .= 'var c_g_searchPrompt = "'.htmlspecialchars($translate['SEARCH_PROMPT']).'";';
            $ret .= 'var c_g_menu_filter = "'.htmlspecialchars($translate['MENU_FILTER']).'";';
            $ret .= 'var c_g_menu_list = "'.htmlspecialchars($translate['MENU_LIST']).'";';
            $ret .= 'var c_g_address_lookup_fail = "'.htmlspecialchars($translate['ADDRESS_LOOKUP_FAIL']).'";';
            $ret .= 'var c_g_menu_nearMe = "'.htmlspecialchars($translate['MENU_NEAR_ME']).'";';
            $ret .= 'var c_g_menu_fullscreen = "'.htmlspecialchars($translate['MENU_FULLSCREEN']).'";';
            $ret .= 'var c_g_menu_exitFullscreen = "'.htmlspecialchars($translate['MENU_EXIT_FULLSCREEN']).'";';
            $ret .= 'var c_g_menu_tooltip = "'.htmlspecialchars($translate['MENU_TOOLTIP']).'";';
            
            $ret .= 'var c_BMLTPlugin_files_uri = \''.htmlspecialchars($this->get_plugin_path()).'?\';' . (defined('_DEBUG_MODE_') ? "\n" : '');
            $ret .= "var c_g_BMLTPlugin_images = '".htmlspecialchars($this->get_plugin_path()."/map_images")."';" . (defined('_DEBUG_MODE_') ? "\n" : '');
            $ret .= "var c_g_BMLTPlugin_lang_dir = '".htmlspecialchars($this->get_plugin_path()."/lang")."';" . (defined('_DEBUG_MODE_') ? "\n" : '');
            $ret .= "var c_g_BMLTPlugin_throbber_img_src = '".htmlspecialchars($this->get_plugin_path()."/map_images/Throbber.gif")."';" . (defined('_DEBUG_MODE_') ? "\n" : '');
            $ret .= 'var c_g_map_link_text = "'.htmlspecialchars($translate['OPEN_GOOGLE']).'";';
            $ret .= 'var c_g_region = "'.$options['region_bias'].'";';
            $ret .= 'var c_g_bounds = {';
                $ret .= ' "north": "'.$this->options['bounds_north'].'",';
                $ret .= ' "east": "'.$this->options['bounds_east'].'",';
                $ret .= ' "south": "'.$this->options['bounds_south'].'",';
                $ret .= ' "west": "'.$this->options['bounds_west'].'"';
            $ret .= '};';
            $ret .= 'var c_g_time_format = "'.$this->options['time_format'].'";';
            $ret .= 'var c_g_tileUrl = "'.$this->options['tile_url'].'";';
            $ret .= 'var c_g_nominatimUrl = "'.$this->options['nominatim_url'].'";';
            $ret .= 'var c_g_tileOptions = {';
            foreach ($this->options['tile_params'] as $key => $value) {
                $ret .= " '".$key."': '".$value."',";
            }
            $ret .= '};';
            $ret .= '</script>';
            $ret .= '<style type="text/css">.onoffswitch-inner:before {
    content: "'.$translate["Next_24_hours"].'";
    padding-left: 10px;
    background-color: #2d5c88; color: #FFFFFF;
}
.onoffswitch-inner:after {
    content: "'.$translate["All_Meetings"].'";
    padding-left: 30px;
    background-color: #EEEEEE; color: #2d5c88;
    text-align: left;
}</style>';
            return $ret;
        }
        // phpcs:disable PSR1.Methods.CamelCapsMethodName.NotCamelCaps    
        protected function get_plugin_path()
        {
            // phpcs:enable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
            return plugin_dir_url(__FILE__);
        }
        public function getAllMeetings($root_server, $query_string)
        {
            if (isset($query_string) && $query_string != '') {
                $query_string = "&$query_string";
            } else {
                $query_string = '';
            }
            $results = $this->get("$root_server/client_interface/json/?switcher=GetSearchResults$query_string&sort_key=time");
            $httpcode = wp_remote_retrieve_response_code($results);
            $response_message = wp_remote_retrieve_response_message($results);
            if ($httpcode != 200 && $httpcode != 302 && $httpcode != 304 && !empty($response_message)) {
                return 'Problem Connecting to Server!';
            }
            $body = wp_remote_retrieve_body($results);
            return $body;
        }
        public function getAllFormats($root_server, $lang_enum)
        {
            $results = $this->get("$root_server/client_interface/json/?switcher=GetFormats&lang_enum=$lang_enum");
            $httpcode = wp_remote_retrieve_response_code($results);
            $response_message = wp_remote_retrieve_response_message($results);
            if ($httpcode != 200 && $httpcode != 302 && $httpcode != 304 && !empty($response_message)) {
                return 'Problem Connecting to Server!';
            }
            $body = wp_remote_retrieve_body($results);
            return $body;
        }
        public function get($url, $cookies = null)
        {
            $args = array(
                'timeout' => '120',
                'headers' => array(
                    'User-Agent' => 'Mozilla/4.0 (compatible; MSIE 5.01; Windows NT 5.0) +BmltMeetingMap'
                )
            );
            return wp_remote_get($url, $args);
        }
    }
    //End Class BMLTmaps
}
// end if
// instantiate the class
if (class_exists("BMLTMeetingMap")) {
    $MeetingMap_instance = new BMLTMeetingMap();
}
?>

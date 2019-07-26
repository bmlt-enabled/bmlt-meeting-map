<?php
/*
Plugin Name: BMLT Meeting Map
Description: Simple responsive Meeting Map.
Author: Ron B
Version: 1.0.1
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
                $url = admin_url('options-general.php?page=meeting_map.php');
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
            // phpcs:enable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
            if ($hook == 'settings_page_meeting_map') {
                wp_enqueue_style('meeting-map-admin-ui-css', 'https://ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/themes/smoothness/jquery-ui.css', false, '1.11.4', false);
                wp_register_script('meeting-map-admin', plugins_url('js/meeting_map_admin.js', __FILE__), array('jquery'), '6.0', false);
                wp_enqueue_script('meeting-map-admin');
                wp_enqueue_script('common');
            }
        }
        /**
         * @desc Adds JS/CSS to the header
         */
        // phpcs:disable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
        public function enqueue_frontend_files()
        {
            // phpcs:enable PSR1.Methods.CamelCapsMethodName.NotCamelCaps
            if ($this->has_shortcode()) {
                wp_enqueue_style("meeting_map-select2", plugin_dir_url(__FILE__) . "css/select2.min.css", false, filemtime(plugin_dir_path(__FILE__) . "css/select2.min.css"), false);
                wp_enqueue_style("meeting_map-bootstrap", plugin_dir_url(__FILE__) . "css/bootstrap.min.css", false, filemtime(plugin_dir_path(__FILE__) . "css/bootstrap.min.css"), false);
                wp_enqueue_style("snazzy-info-window", plugin_dir_url(__FILE__) . "css/snazzy-info-window.min.css", false, filemtime(plugin_dir_path(__FILE__) . "css/snazzy-info-window.min.css"), false);
                wp_enqueue_style("meeting_map", plugin_dir_url(__FILE__) . "css/meeting_map.css", false, filemtime(plugin_dir_path(__FILE__) . "css/meeting_map.css"), false);
                wp_enqueue_script("meeting_map-bootstrap", plugin_dir_url(__FILE__) . "js/bootstrap.min.js", array('jquery'), filemtime(plugin_dir_path(__FILE__) . "js/bootstrap.min.js"), true);
                wp_enqueue_script("meeting_map-select2", plugin_dir_url(__FILE__) . "js/select2.full.min.js", array('jquery'), filemtime(plugin_dir_path(__FILE__) . "js/select2.full.min.js"), true);
                wp_enqueue_script("snazzy-info-window", plugin_dir_url(__FILE__) . "js/snazzy-info-window.min.js", false, filemtime(plugin_dir_path(__FILE__) . "js/snazzy-info-window.min.js"), true);
                wp_enqueue_script("meeting_map", plugin_dir_url(__FILE__) . "js/meeting_map.js", array('jquery'), filemtime(plugin_dir_path(__FILE__) . "js/meeting_map.js"), false);
            }
        }
        public function testRootServer($root_server)
        {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, "$root_server/client_interface/serverInfo.xml");
            curl_setopt($ch, CURLOPT_USERAGENT, "cURL Mozilla/5.0 (Windows NT 5.1; rv:21.0) Gecko/20130401 Firefox/21.0");
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_MAXREDIRS, 3);
            curl_setopt($ch, CURLOPT_ENCODING, 'gzip,deflate');
            $results  = curl_exec($ch);
            $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $c_error  = curl_error($ch);
            $c_errno  = curl_errno($ch);
            curl_close($ch);
            if ($httpcode != 200 && $httpcode != 302 && $httpcode != 304) {
                return false;
            }
            return $results;
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
            if (!isset($_POST['bmltmapssave'])) {
                $_POST['bmltmapssave'] = false;
            }
            if ($_POST['bmltmapssave']) {
                if (!wp_verify_nonce($_POST['_wpnonce'], 'bmltmapupdate-options')) {
                    die('Whoops! There was a problem with the data you posted. Please go back and try again.');
                }
                $this->options['root_server']    = $_POST['root_server'];
                $this->options['api_key'] = $_POST['api_key'];
                $this->options['region_bias'] = $_POST['region_bias'];
                $this->options['lat'] = $_POST['lat'];
                $this->options['lng'] = $_POST['lng'];
                $this->options['zoom'] = $_POST['zoom'];
                $this->options['url_of_pdf'] = $_POST['url_of_pdf'];
                $this->options['url_of_tabbed'] = $_POST['url_of_pdf'];
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
                    <?php if ($this_connected != false) { ?>
                        <?php $connect = "<span style='color: #00AD00;'><div style='font-size: 16px;vertical-align: text-top;' class='dashicons dashicons-smiley'></div>Version ".$this_connected."</span>"?>
                        <?php $this_connected = true; ?>
                    <?php } ?>
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
                        <h3>Google API Key</h3>
                        <p>Get it from Google</p>
                        <ul>
                            <li>
                                <label for="api_key">Google API Key: </label>
                                <input id="api_key" type="text" size="40" name="api_key" value="<?php echo $this->options['api_key']; ?>" />
                            </li>
                            <li>
                                <label for="region_bias">Google Region: </label>
                                <input id="region_bias" type="text" size="2" name="region_bias" value="<?php echo $this->options['region_bias']; ?>" />
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
                        <h3>Further Processing of Meetings</h3>
                        <ul>
                            <li>
                                <label for="url_of_pdf">URL of PDF: </label>
                                <input id="url_of_pdf" type="text" size="100" name="url_of_pdf" value="<?php echo $this->options['url_of_pdf']; ?>" />
                            </li>
                        </ul>
                    </div>
                    <input type="submit" value="SAVE CHANGES" name="bmltmapssave" class="button-primary" />                 
                </form>
            </div>
            <script>
            getValueSelected();
            </script>
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
            extract($att = shortcode_atts(array(
                'lat' => $this->options['lat'],
                'lng' => $this->options['lng'],
                'zoom' => $this->options['zoom'],
                'lang_enum' => 'de',
                'query_string' => '',
                'center_me' => 0,
                'goto' => ''
            ), $att, 'bmlt_meeting_map'));
            if ($_GET['gotoMe']!='' && $_GET['gotoMe']!='0') {
                $center_me = 1;
                $goto = '';
            }
            if ($_GET['goto']!='') {
                $goto = $_GET['goto'];
                $center_me = 0;
            }
            include(dirname(__FILE__)."/lang/translate_".$lang_enum.".php");
            // phpcs:enable PSR1.Methods.CamelCapsMethodName.NotCamelCaps		        
              $the_new_content = $this->configure_javascript($translate, $query_string, $lang_enum);
                $the_new_content .= '<div class="bmlt_map_container_div"  id="bmlt_map_container" >';  // This starts off hidden, and is revealed by JS.
                $the_new_content .= '<div dir="ltr" class="bmlt_search_map_div" id="bmlt_search_map_div">';
                $the_new_content .= '<script type="text/javascript">var g_start_week = 2; document.getElementById("bmlt_map_container").style.display=\'block\';c_mm = new MeetingMap( document.getElementById(\'bmlt_search_map_div\'), {\'latitude\':'.$lat.',\'longitude\':'.$lng.',\'zoom\':'.$zoom.'});</script>';
                $the_new_content .= '</div>
		        
		        <div id="filter_modal" class="modal">
		        
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
		        </div>';
                
                $root_server = $this->options['root_server'];
                add_action('wp_footer', function () use ($root_server, $query_string, $center_me, $goto, $lang_enum) {
                    ob_flush();
                    flush();
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
            $options = $this->options;
            $gKey = '';
            
            if (isset($options['api_key']) && ('' != $options['api_key']) && ('INVALID' != $options['api_key'])) {
                $gKey = $options['api_key'];
            }
            
            // Include the Google Maps API files.
            $region = 'de';
            $ret = '<script type="text/javascript" src="https://maps.googleapis.com/maps/api/js?libraries=geometry&key='.$gKey;
            if (isset($options['region_bias']) && $options['region_bias']) {
                $ret .= '&region='.strtoupper($options['region_bias']);
                $region = $options['region_bias'];
            }
            $ret .= '"></script>';
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
            $ret .= "var c_g_BMLTPlugin_images = '".htmlspecialchars($this->get_plugin_path()."/google_map_images")."';" . (defined('_DEBUG_MODE_') ? "\n" : '');
            $ret .= "var c_g_BMLTPlugin_lang_dir = '".htmlspecialchars($this->get_plugin_path()."/lang")."';" . (defined('_DEBUG_MODE_') ? "\n" : '');
            $ret .= "var c_g_BMLTPlugin_throbber_img_src = '".htmlspecialchars($this->get_plugin_path()."/google_map_images/Throbber.gif")."';" . (defined('_DEBUG_MODE_') ? "\n" : '');
            $ret .= 'var c_g_map_link_text = "'.htmlspecialchars($translate['OPEN_GOOGLE']).'";';
            $ret .= 'var c_g_region = "'.$region.'";';
            
            $ret .= '</script>';
            $ret .= '<style type="text/css">.onoffswitch-inner:before {
    content: "'.$translate["Next_24_hours"].'";
    padding-left: 10px;
    background-color: #34A7C1; color: #FFFFFF;
}
.onoffswitch-inner:after {
    content: "'.$translate["All_Meetings"].'";
    padding-left: 30px;
    background-color: #EEEEEE; color: #999999;
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
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, "$root_server/client_interface/json/?switcher=GetSearchResults$query_string&sort_key=time");
            //curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/4.0 (compatible; MSIE 5.01; Windows NT 5.0)");
            curl_setopt($ch, CURLOPT_USERAGENT, "cURL Mozilla/5.0 (Windows NT 5.1; rv:21.0) Gecko/20130401 Firefox/21.0");
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_MAXREDIRS, 3);
            curl_setopt($ch, CURLOPT_ENCODING, 'gzip,deflate');
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            
            $results  = curl_exec($ch);
            // echo curl_error($ch);
            $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $c_error  = curl_error($ch);
            $c_errno  = curl_errno($ch);
            curl_close($ch);
            return $results;
        }
        public function getAllFormats($root_server, $lang_enum)
        {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, "$root_server/client_interface/json/?switcher=GetFormats&lang_enum=$lang_enum");
            curl_setopt($ch, CURLOPT_USERAGENT, "cURL Mozilla/5.0 (Windows NT 5.1; rv:21.0) Gecko/20130401 Firefox/21.0");
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_MAXREDIRS, 3);
            curl_setopt($ch, CURLOPT_ENCODING, 'gzip,deflate');
            $formats = curl_exec($ch);
            curl_close($ch);
            return $formats;
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

function MeetingMap (
		in_div,
		in_coords
)
{
	/****************************************************************************************
	 *										CLASS VARIABLES									*
	 ****************************************************************************************/
	var	g_main_map = null;				///< This will hold the Google Map object.
	var	g_allMarkers = [];				///< Holds all the markers.
	var g_initial_call = false;         ///< Set to true, once we have zoomed in.
	var g_initial_coords = in_coords;
	var g_initial_div = in_div;
	var g_next24hours = false;
	var g_filterHaving = null;
	var g_filterWeekday = null;
	var g_filterNotHaving = null;

	/// These describe the regular NA meeting icon
	var g_icon_image_single = new google.maps.MarkerImage ( c_g_BMLTPlugin_images+"/NAMarker.png", new google.maps.Size(23, 32), new google.maps.Point(0,0), new google.maps.Point(12, 32) );
	var g_icon_image_multi = new google.maps.MarkerImage ( c_g_BMLTPlugin_images+"/NAMarkerG.png", new google.maps.Size(23, 32), new google.maps.Point(0,0), new google.maps.Point(12, 32) );
	var g_icon_image_selected = new google.maps.MarkerImage ( c_g_BMLTPlugin_images+"/NAMarkerSel.png", new google.maps.Size(23, 32), new google.maps.Point(0,0), new google.maps.Point(12, 32) );
	var g_icon_shadow = new google.maps.MarkerImage( c_g_BMLTPlugin_images+"/NAMarkerS.png", new google.maps.Size(43, 32), new google.maps.Point(0,0), new google.maps.Point(12, 32) );
	var g_icon_shape = { coord: [16,0,18,1,19,2,20,3,21,4,21,5,22,6,22,7,22,8,22,9,22,10,22,11,22,12,22,13,22,14,22,15,22,16,21,17,21,18,22,19,20,20,19,21,20,22,18,23,17,24,18,25,17,26,15,27,14,28,15,29,12,30,12,31,10,31,10,30,9,29,8,28,8,27,7,26,6,25,5,24,5,23,4,22,3,21,3,20,2,19,1,18,1,17,1,16,0,15,0,14,0,13,0,12,0,11,0,10,0,9,0,8,0,7,1,6,1,5,2,4,2,3,3,2,5,1,6,0,16,0], type: 'poly' };

	/****************************************************************************************
	 *									GOOGLE MAPS STUFF									*
	 ****************************************************************************************/

	/************************************************************************************//**
	 *	\brief Load the map and set it up.													*
	 ****************************************************************************************/

	function load_map ( in_div, in_location_coords )
	{
		if ( in_div )
		{
			in_div.myThrobber = null;

			if ( in_location_coords )
			{
				var myOptions = {
						'center': new google.maps.LatLng ( in_location_coords.latitude, in_location_coords.longitude ),
						'zoom': in_location_coords.zoom,
						'mapTypeId': google.maps.MapTypeId.ROADMAP,
						'zoomControl': true,
						'minZoom': 6,
						'mapTypeControl': false,
						'streetViewControl': false,
						'disableDoubleClickZoom' : true,
						'draggableCursor': "pointer",
						'scaleControl' : true,
						'fullscreenControl': false,
//						'fullscreenControlOptions' : {
//					        position: google.maps.ControlPosition.TOP_RIGHT
//						}
				};

				var	pixel_width = in_div.offsetWidth;
				var	pixel_height = in_div.offsetHeight;
				
				if ( (pixel_width < 640) || (pixel_height < 640) )
				{
					myOptions.scrollwheel = true;
					myOptions.zoomControlOptions = { 'style': google.maps.ZoomControlStyle.SMALL };
				}
				else
				{
					myOptions.zoomControlOptions = { 'style': google.maps.ZoomControlStyle.LARGE };
				};
				g_main_map = new google.maps.Map ( in_div, myOptions );
			};

			if ( g_main_map )
			{
				create_throbber(in_div);
				google.maps.event.addListener( g_main_map, 'zoom_changed', function(ev){
					if ( g_main_map.response_object &&
							g_main_map.format_hash) {
						search_response_callback();
					}
				});
				show_throbber();
				addFilterMeetingsToggle(g_main_map);
				addMenuButton(g_main_map, pixel_width);
			};
		};
	};

	/************************************************************************************//**
	 *	\brief 
	 ****************************************************************************************/

	function create_throbber ( in_div    ///< The container div for the throbber.
	)
	{
		if ( !g_main_map.myThrobber )
		{
			g_main_map.myThrobber = document.createElement("div");
			if ( g_main_map.myThrobber )
			{
				g_main_map.myThrobber.id = in_div.id+'_throbber_div';
				g_main_map.myThrobber.className = 'bmlt_map_throbber_div';
				g_main_map.myThrobber.style.display = 'none';
				in_div.appendChild ( g_main_map.myThrobber );
				var img = document.createElement("img");

				if ( img )
				{
					img.src = c_g_BMLTPlugin_throbber_img_src;
					img.className = 'bmlt_map_throbber_img';
					img.id = in_div.id+'_throbber_img';
					img.alt = 'AJAX Throbber';
					g_main_map.myThrobber.appendChild ( img );
				}
				else
				{
					in_div.myThrobber = null;
				};
			};
		};
	};

	/************************************************************************************//**
	 *	\brief 
	 ****************************************************************************************/

	function show_throbber()
	{
		if ( g_main_map.myThrobber )
		{
			g_main_map.myThrobber.style.display = 'block';
		};
	};

	/************************************************************************************//**
	 *	\brief 
	 ****************************************************************************************/

	function hide_throbber()
	{
		if ( g_main_map.myThrobber )
		{
			g_main_map.myThrobber.style.display = 'none';
		};
	};
	function loadAllMeetings(meetings_response_object,formats_response_object,centerMe,goto) {
		g_main_map.response_object = meetings_response_object;
		g_main_map.format_hash = create_format_hash(formats_response_object);
		search_response_callback();
		if (centerMe != 0) {
	        if(navigator.geolocation) {
	            navigator.geolocation.getCurrentPosition(function(position) {
	                var latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
	                g_main_map.setCenter(latlng);
	                g_main_map.setZoom(getZoomAdjust(false));
	            });
	        }
		} else if (goto != '') {
			callGeocoder(goto);
		} 
		hide_throbber();
	}
	function create_format_hash( format_arr ) {
		var ret = [];
		for (i=0; i<format_arr.length; i++) {
			ret[format_arr[i].key_string] = format_arr[i];
		}
		return ret;
	};
	function create_city_hash( all_meetings ) {
		var ret = [];
		all_meetings.forEach(function(meeting) {
			var found = false;
			for (var c=0; c<ret.length; c++) {
				if (ret[c].name==meeting.location_municipality) {
					ret[c].meetings[ret[c].meetings.length] = meeting;
					found = true;
					break;
				}
			};
			if (found==false) {
				ret[ret.length] = {
						name: meeting.location_municipality,
						meetings: [meeting]
				}
			}
		});
		return ret;
	}
	/************************************************************************************//**
	 *	\brief 
	 ****************************************************************************************/

	function search_response_callback()
	{
		if ( !g_main_map.response_object.length )
		{
			alert ( g_no_meetings_found );
			return;
		};

		try {
			draw_markers();
		} catch (e) {
			google.maps.event.addListenerOnce( g_main_map, 'bounds_changed', function(ev){
					draw_markers();
			});
		}

	};


	/****************************************************************************************
	 *									CREATING MARKERS									*
	 ****************************************************************************************/

	/************************************************************************************//**
	 *	\brief Remove all the markers.														*
	 ****************************************************************************************/
	function clearAllMarkers ( )
	{
		if ( g_allMarkers )
		{

			for ( var c = 0; c < g_allMarkers.length; c++ )
			{
				if ( g_allMarkers[c].info_win_ )
				{
					g_allMarkers[c].info_win_.close();
					g_allMarkers[c].info_win_ = null;
				};

				g_allMarkers[c].setMap( null );
				g_allMarkers[c] = null;
			};

			g_allMarkers.length = 0;
		};
	};

	/************************************************************************************//**
	 *	\brief Calculate and draw the markers.												*
	 ****************************************************************************************/

	function draw_markers()
	{
		clearAllMarkers();

		// This calculates which markers are the red "multi" markers.
		var overlap_map = mapOverlappingMarkersInCity ( filterMeetings(g_main_map.response_object) );

		// Draw the meeting markers.
		overlap_map.forEach ( function(marker) {
			createMapMarker ( marker );
		});
		//makeVisible();

	};
	function getZoomAdjust($only_out) {
		if (!g_main_map) return 12;
		var ret = g_main_map.getZoom();
		var center = g_main_map.getCenter();
		var bounds = g_main_map.getBounds();
		var zoomedOut = false;
		while(filterMeetings(filterBounds(bounds)).length==0 && ret>6) {
			zoomedOut = true;
			// no exact, because earth is curved
			ret -= 1;
			var ne = new google.maps.LatLng({
				lat: (2*bounds.getNorthEast().lat())-center.lat(),
				lng: (2*bounds.getNorthEast().lng())-center.lng()});
			var sw = new google.maps.LatLng({
				lat: (2*bounds.getSouthWest().lat())-center.lat(),
			    lng: (2*bounds.getSouthWest().lng())-center.lng()});
			bounds = new google.maps.LatLngBounds(sw,ne);
		}
		if (!$only_out && !zoomedOut && ret<12) {
			var knt = filterMeetings(filterBounds(bounds)).length;
			while(ret<12 && knt>0) {
				// no exact, because earth is curved
				ret += 1;
				var ne = new google.maps.LatLng({
					lat: 0.5*(bounds.getNorthEast().lat()+center.lat()),
					lng: 0.5*(bounds.getNorthEast().lng()+center.lng())});
				var sw = new google.maps.LatLng({
					lat: 0.5*(bounds.getSouthWest().lat()+center.lat()),
					lng: 0.5*(bounds.getSouthWest().lng()+center.lng())});
				bounds = new google.maps.LatLngBounds(sw,ne);
				knt = filterMeetings(filterBounds(bounds)).length;
			}
			if (knt == 0) {
				ret -= 1;
			}
		} 
		return ret;
	}
	function filterVisible() {
		if (g_main_map) {
			var bounds = g_main_map.getBounds();
			return filterBounds(bounds);
		};
		return new Array;
	};
	function filterBounds(bounds) {
		var ret = new Array;
		g_main_map.response_object.forEach( function(meeting) {
			if (bounds.contains(new google.maps.LatLng ( meeting.latitude, meeting.longitude ))) {
                ret.push(meeting);
            }
		});	
		return ret;
	}
	function fromLatLngToPoint(latLng, map) {
		var scale = 1 << map.getZoom();
		var worldPoint = map.getProjection().fromLatLngToPoint(latLng);
		return new google.maps.Point(worldPoint.x * scale, worldPoint.y * scale);
	};
	function mapOverlappingMarkersInCity (in_meeting_array)	///< Used to draw the markers when done.
	{
		var city_hash = create_city_hash(in_meeting_array);
		var tolerance = 8;	/* This is how many pixels we allow. */

		var ret = new Array;
		
		city_hash.forEach(function(city) {
			var tmp = new Array;
			for ( var c = 0; c < city.meetings.length; c++ )
			{
				tmp[c] = new Object;
				tmp[c].matched = false;
				tmp[c].matches = null;
				tmp[c].object = city.meetings[c];
				tmp[c].coords = fromLatLngToPoint( new google.maps.LatLng ( tmp[c].object.latitude, tmp[c].object.longitude ), g_main_map);
			};
			for ( var c = 0; c < city.meetings.length; c++ )
			{
				if ( false == tmp[c].matched )
				{
					tmp[c].matched = true;
					tmp[c].matches = new Array;
					tmp[c].matches[0] = tmp[c].object;

					for ( var c2 = c+1; c2 < city.meetings.length; c2++ )
					{
						if ( false == tmp[c2].matched )
						{
							var outer_coords = tmp[c].coords;
							var inner_coords = tmp[c2].coords;

							var xmin = outer_coords.x - tolerance;
							var xmax = outer_coords.x + tolerance;
							var ymin = outer_coords.y - tolerance;
							var ymax = outer_coords.y + tolerance;

							/* We have an overlap. */
							if ( (inner_coords.x >= xmin) && (inner_coords.x <= xmax) && (inner_coords.y >= ymin) && (inner_coords.y <= ymax) )
							{
								tmp[c].matches[tmp[c].matches.length] = tmp[c2].object;
								tmp[c2].matched = true;
							};
						};
					};
				};
			};
			for ( var c = 0; c < tmp.length; c++ )
			{
				if ( tmp[c].matches )
				{
					tmp[c].matches.sort ( sortMeetingSearchResponseCallback );
					ret[ret.length] = tmp[c].matches;
				};
			};
		});

		return ret;
	};

		
	/************************************************************************************//**
	 *	 \brief	Callback used to sort the meeting response by weekday.                      *
	 *    \returns 1 if a>b, -1 if a<b or 0 if they are equal.                               *
	 ****************************************************************************************/
	function sortMeetingSearchResponseCallback (    mtg_a,   ///< Meeting object A
			mtg_b    ///< Meeting Object B
	)
	{
		var weekday_score_a = parseInt ( mtg_a.weekday_tinyint, 10 );
		var weekday_score_b = parseInt ( mtg_b.weekday_tinyint, 10 );

		if ( weekday_score_a < g_start_week ) {
			weekday_score_a += 7;
		}

		if ( weekday_score_b < g_start_week ) {
			weekday_score_a += 7;
		}

		if ( weekday_score_a < weekday_score_b ) {
			return -1;
		}
		else if ( weekday_score_a > weekday_score_b ) {
			return 1;
		};
		var	time_a = mtg_a.start_time.toString().split(':');
		var	time_b = mtg_b.start_time.toString().split(':');
		if (parseInt(time_a[0])<parseInt(time_b[0])) {
			return -1;
		}
		if (parseInt(time_a[0])>parseInt(time_b[0])) {
			return 1;
		}
		if (parseInt(time_a[1])<parseInt(time_b[1])) {
			return -1;
		}
		if (parseInt(time_a[1])>parseInt(time_b[1])) {
			return 1;
		}
		return 0;
	};
	function sortByCityCallback(mtg_a, mtg_b) {
		if (mtg_a.location_municipality < mtg_b.location_municipality) {
			return -1;
		}
		if (mtg_a.location_municipality > mtg_b.location_municipality) {
			return 1;
		}
		return sortMeetingSearchResponseCallback(mtg_a, mtg_b);
	}

	/************************************************************************************//**
	 *	 \brief	This creates a single meeting's marker on the map.							*
	 ****************************************************************************************/

	function createMapMarker (	in_mtg_obj_array	/**< A meeting object array. */)
	{
		var main_point = new google.maps.LatLng ( in_mtg_obj_array[0].latitude, in_mtg_obj_array[0].longitude );
		var marker_html = '<div class="accordion">';
		var checked = ' checked';
		var marker_title = '';
		for ( var c = 0; c < in_mtg_obj_array.length; c++ ) {
			marker_html += '<div><input type="radio" name="panel" id="panel-'+c+'"'+checked+'>';
			if (c>0) {
				marker_title += '; ';
			}
			var dayAndTime = getDayAndTime(in_mtg_obj_array[c]);
			marker_title += dayAndTime;
			checked='';
			marker_html += '<label for="panel-'+c+'">'+dayAndTime+'</label>';
			marker_html += marker_make_meeting(in_mtg_obj_array[c]);
			marker_html += '</div>';
			
		}
		marker_html += '</div>';
		createMarker ( main_point,
				       g_icon_shadow,
				       ((in_mtg_obj_array.length>1) ? g_icon_image_multi : g_icon_image_single),
				       marker_html, marker_title );
	};
	function getDayAndTime( in_meeting_obj ) {
		return c_g_weekdays[in_meeting_obj.weekday_tinyint]+" "+formattedTime(in_meeting_obj.start_time);
	}
	function formattedTime( in_time ) {
		var	time = in_time.toString().split(':');
		if (c_g_time_format == '12') {
			var h = time[0] % 12 || 12;
			var ampm = (time[0] < 12 || time[0] === 24) ? "AM" : "PM";
			return h+':'+time[1]+ampm;
		}
		return time[0]+':'+time[1];
	}
	function getLangs( in_meeting_obj ) {
		var ret = '';
		if ( in_meeting_obj.formats && in_meeting_obj.formats.length > 0)
		{
			var myFormatKeys = in_meeting_obj.formats.split(',');
			for (i=0; i<myFormatKeys.length; i++) {
				theFormat = g_main_map.format_hash[myFormatKeys[i]];
				if (typeof theFormat == 'undefined') continue;
				if (theFormat.format_type_enum=='LANG') {
					var a = c_g_BMLTPlugin_images+'/../lang/'+theFormat.key_string+".png";
					ret += ' <img src="'+a+'">';
				}
			}
		}
		return ret;
	};
	/************************************************************************************//**
	 *	\brief Return the HTML for a meeting marker info window.							*
	 *																						*
	 *	\returns the XHTML for the meeting marker.											*
	 ****************************************************************************************/

	function marker_make_meeting ( in_meeting_obj )
	{
		var id = in_meeting_obj.id_bigint.toString();
		var ret = '<div class="marker_div_meeting" id="'+id+'">';
		ret += '<h4>'+in_meeting_obj.meeting_name.toString()+getLangs(in_meeting_obj)+'</h4>';

		if ( in_meeting_obj.comments ) {
			ret += '<em>'+in_meeting_obj.comments+'</em>';
		}

		var location = '';

		if ( in_meeting_obj.location_text )
		{
			ret += '<div class="marker_div_location_text">'+in_meeting_obj.location_text.toString()+'</div>';
		};

		if ( in_meeting_obj.location_street )
		{
			ret += '<div>'+in_meeting_obj.location_street.toString();
		};
		
		if ( in_meeting_obj.location_municipality )
		{
			ret += ', '+ in_meeting_obj.location_municipality.toString();

			if (in_meeting_obj.location_city_subsection) {
				ret += ' '+in_meeting_obj.location_city_subsection + ', ';
			}

			ret += '</div>';
		};

		if ( in_meeting_obj.location_info )
		{
			ret += '<div class="marker_div_location_info">'+in_meeting_obj.location_info.toString()+'</div>';
		};

		ret += '<div class="marker_div_location_maplink"><a href="';
		ret += 'https://www.google.com/maps/dir/?api=1&destination='
			+encodeURIComponent(in_meeting_obj.latitude.toString())+','+encodeURIComponent(in_meeting_obj.longitude.toString());
		ret += '" rel="external" target="_blank">'+c_g_map_link_text+'</a>';
		ret += '</div>';

		if ( in_meeting_obj.formats && in_meeting_obj.formats.length > 0)
		{
			ret += '<div class="marker_div_formats">';
			var myFormatKeys = in_meeting_obj.formats.split(',');
			for (i=0; i<myFormatKeys.length; i++) {
				theFormat = g_main_map.format_hash[myFormatKeys[i]];
				if (typeof theFormat == 'undefined') continue;
				if (theFormat.format_type_enum=='FC2' || theFormat.format_type_enum=='FC3' || 
				    ((typeof theFormat.format_type_enum!=='undefined')&&theFormat.format_type_enum.charAt(0)=='O')) {
					ret += theFormat['name_string'] + '; ';
				}
			}
			ret += '</div>';
		};
		ret += '</div>';


		return ret;
	};
	/************************************************************************************//**
	 *	\brief Create a generic marker.														*
	 *																						*
	 *	\returns a marker object.															*
	 ****************************************************************************************/

	function createMarker (	in_coords,		///< The long/lat for the marker.
			in_shadow_icon,	///< The URI for the icon shadow
			in_main_icon,	///< The URI for the main icon
			in_html,		///< The info window HTML
			in_title        ///< The tooltip
	)
	{
		var marker = null;

		var	is_clickable = (in_html ? true : false);

		var marker = new google.maps.Marker ( { 'position':		in_coords,
				'map':			g_main_map,
				'shadow':		in_shadow_icon,
				'icon':			in_main_icon,
				'shape':		g_icon_shape,
				'clickable':	is_clickable,
				'cursor':		'default',
				'title':        in_title,
				'draggable':    false
		} );

		marker.old_image = marker.getIcon();

		google.maps.event.addListener ( marker, "click", function () {
			// for some reason, closeWhenOthersOpen doesn't work on Chrome....
			g_allMarkers.forEach(function(marker)
			{
				if ( marker != this )
				{
					if ( marker.info_win_)
					{
						marker.info_win_.close();
					};
				};
			});
			if ( !marker.info_win_ )
			{
				if(marker.old_image){marker.setIcon(g_icon_image_selected)};
				marker.setZIndex(google.maps.Marker.MAX_ZINDEX+1);
				marker.info_win_ = new SnazzyInfoWindow({
		 		        marker: marker,
				        content: in_html,
				        showCloseButton: false,
				        closeWhenOthersOpen: true,
						callbacks: {
						    afterClose: function(){
						            	if(marker.old_image){
						            		marker.setIcon(marker.old_image);
						            	};
						            	marker.setZIndex(null);
						            	//setTimeout(function(){ this.close(); }, 1000);
						    }
						},
						edgeOffset: {
						        	  top: 50,
						        	  right: 5,
						        	  bottom: 20,
						        	  left: 5
						        	}
				});
				marker.info_win_.open();
			}
		});
		g_allMarkers[g_allMarkers.length] = marker;
	};
	/************************************************************************************//**
	 *	\brief  
	 ****************************************************************************************/
	function promptLocation(in_event) {
		in_event.target.value = c_g_searchPrompt;
	}
	function clearLocation(in_event) {
		in_event.target.value = '';
	}
	function lookupLocation (in_event)
	{
		if (in_event && in_event.keyCode!=13) { return false; };
		if ( in_event.target.value != '')
		{
			callGeocoder(in_event.target.value);
		}
		else
		{
			alert ( c_g_address_lookup_fail );
		};
		return true;
	};

	/************************************************************************************//**
	 *	\brief This catches the AJAX response, and fills in the response form.				*
	 ****************************************************************************************/

	function geoCallback ( in_geocode_response	///< The JSON object.
	)
	{
		if ( in_geocode_response && in_geocode_response[0] && in_geocode_response[0].geometry && in_geocode_response[0].geometry.location )
		{
				g_main_map.panTo ( in_geocode_response[0].geometry.location );
				google.maps.event.addListenerOnce( g_main_map, 'idle', function(ev) {
					g_main_map.fitBounds(in_geocode_response[0].geometry.viewport);
					g_main_map.setZoom(getZoomAdjust(true));
				});
		}
		else    // FAIL
		{
			alert ( c_g_address_lookup_fail );
		};
	};
	function callGeocoder(in_loc) {
		var	geocoder = new google.maps.Geocoder;

		if ( geocoder )
		{
			var geoCodeParams = { 'address': in_loc };
			if (c_g_region.trim() !== '') {
				geoCodeParams.region = c_g_region;
			}
			if (c_g_bounds
			&&  c_g_bounds.north && c_g_bounds.north.trim()!== ''
			&&  c_g_bounds.east && c_g_bounds.east.trim()!== ''
			&&  c_g_bounds.south && c_g_bounds.south.trim()!== ''
			&&  c_g_bounds.west && c_g_bounds.west.trim()!== '') {
				geoCodeParams.bounds = new google.maps.LatLngBounds(
					new google.maps.LatLng(c_g_bounds.south, c_g_bounds.west), 
					new google.maps.LatLng(c_g_bounds.north, c_g_bounds.east));
			}
			var	status = geocoder.geocode ( geoCodeParams, geoCallback );

			if ( google.maps.OK != status )
			{
				if ( google.maps.INVALID_REQUEST != status )
				{
					alert ( c_g_address_lookup_fail );
				}
				else
				{
					if ( google.maps.ZERO_RESULTS != status )
					{
						alert ( c_g_address_lookup_fail );
					}
					else
					{
						alert ( c_g_server_error );
					};
				};
			};
		}
		else	// None of that stuff is defined if we couldn't create the geocoder.
		{
			alert ( c_g_server_error );
		};
	}
	function addMenuButton(map,pixel_width) {
	    var controlDiv = document.createElement('div');

	    var firstChild = document.createElement('button');
	    firstChild.className = 'menu-button';
	    firstChild.title = c_g_menu_tooltip;
	    controlDiv.appendChild(firstChild);

	    var buttonImage = document.createElement('span');
	    buttonImage.className = 'menu-button-child';
	    buttonImage.style.backgroundImage = 'url('+c_g_BMLTPlugin_images+'/menu-32.png)';
	    firstChild.appendChild(buttonImage);
	    if (pixel_width>310) {
	    	buttonImage.className = 'menu-button-childSmall';
	    	firstChild.style.width = '95px';
	    	var label = document.createElement('span');
	    	label.className = "menu-button-label";
	    	label.innerHTML = "Menu ";
	    	firstChild.appendChild(label);
	    }
	    
	    var dropdownContent = document.createElement('div');
	    dropdownContent.className = "menu-dropdown"

	    var item = document.createElement('button');
	    item.innerHTML = c_g_menu_search;
	    item.addEventListener('click', showSearchDialog);
	    dropdownContent.appendChild(item);
	    item = document.createElement('button');
	    item.innerHTML = c_g_menu_nearMe;
	    item.style.display = 'block';
	    item.addEventListener('click', function(e) {
	    	if(navigator.geolocation) {
	    		navigator.geolocation.getCurrentPosition(function(position) {
	    			var latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
	    			map.setCenter(latlng);
	    			map.setZoom(getZoomAdjust(false));
	    		});
	    	}
        });
	    dropdownContent.appendChild(item);
	    item = document.createElement('button');
	    item.innerHTML = c_g_menu_filter;
	    item.style.display = 'block';
	    item.addEventListener('click', showFilterDialog);
	    dropdownContent.appendChild(item);
	    item = document.createElement('button');
	    item.innerHTML = c_g_menu_list;
	    item.style.display = 'block';
	    item.addEventListener('click', showListView);
	    dropdownContent.appendChild(item);
	    var ios = !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);
	    if (!ios) {
	    	item = document.createElement('button');
	    	item.innerHTML = c_g_menu_fullscreen;
	    	item.style.display = 'block';
	    	var toggleItem = item;
	    	item.addEventListener('click', function(){
	    		if (document.fullscreenElement) {
	    			document.exitFullscreen();
	    			toggleItem.innerHTML = c_g_menu_fullscreen;
	    		} else {
	    			g_initial_div.parentNode.requestFullscreen();
	    			toggleItem.innerHTML = c_g_menu_exitFullscreen;
	    		}
	    	});
	    	dropdownContent.appendChild(item);
	    }
	    firstChild.addEventListener('click', function(e){
	    	if (dropdownContent.style.display == "inline-block") 
	    		dropdownContent.style.display = "none";
	    	else
	    		dropdownContent.style.display = "inline-block";
	    });
	    firstChild.appendChild(dropdownContent);

	    controlDiv.index = 1;
	    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(controlDiv);
	}
	function closeModalWindow(modal) {
		modal.style.display = "none";
	}	
	function openModalWindow(modal) {
		modal.style.display = "block";
	}
	function showSearchDialog(e) {
    	var modal = document.getElementById('search_modal');
    	document.getElementById('close_search').addEventListener('click', function() {
    		closeModalWindow(modal);
    	});
    	document.getElementById('goto-text').addEventListener('keydown', function(event) {
    		if (lookupLocation(event)) {
    			closeModalWindow(modal);
    		}
    	});
    	document.getElementById('goto-button').addEventListener('click', function() {
    		callGeocoder(document.getElementById('goto-text').value);
    		closeModalWindow(modal);
    	});
    	openModalWindow(modal);
    }
	function showFilterDialog(e) {
    	var langFormats = new Array;
    	var mainFormats = new Array;
    	var openFormat;
    	
    	for (var key in g_main_map.format_hash) {
			var format = g_main_map.format_hash[key];
			if (typeof format.format_type_enum=='undefined') continue;
    		if (format.format_type_enum=='LANG' && key!='de') {
    			langFormats.push(format);
    		} else if (format.format_type_enum=='FC2' || format.format_type_enum=='FC3') {
    			mainFormats.push(format);
    		} else if (format.format_type_enum=='O') {
				openFormat = format;
			} else if (format.format_type_enum.length > 1 && format.format_type_enum=='O-*') {
    			openFormat = format;
    		}
    	}
    	langFormats.sort(function(a, b) {
    	    return a.name_string.localeCompare(b.name_string);
    	});
    	mainFormats.sort(function(a, b) {
    	    return a.name_string.localeCompare(b.name_string);
    	});
    	var dayFormats = new Array;
    	for (var c=1; c<=7; c++) {
    		dayFormats.push({'key_string':''+c, 
    						 'name_string':c_g_weekdays[c]});
    	}
    	lang_element = fillSelect('language_filter',langFormats,g_filterHaving);
    	fmt_element = fillSelect('main_filter',mainFormats,g_filterHaving);
    	day_element = fillSelect('day_filter',dayFormats,g_filterWeekday);
		open_element = document.getElementById('open_filter');
		if (typeof openFormat !== 'undefined') {
			document.getElementById('open_filter_text').innerHTML=openFormat.name_string;
			
    		if (g_filterHaving!=null && g_filterHaving.includes('O')) {
    			open_element.checked = true;
    		} else {
				open_element.checked = false;
			}
		} else {
			open_element.style.display = "none";
			document.getElementById('open_filter_text').style.display = "none";
			open_element.checked = false;
    	} 
    	
    	var modal = document.getElementById('filter_modal');
    	document.getElementById('filter_button').addEventListener('click', function() {
    		g_filterHaving = new Array;
    		g_filterWeekday = new Array;
    		var label = '';
    		var lang = lang_element.value;
    		if (lang != '') {
    			g_filterHaving.push(lang);
    			label = lang;
    		}
    		var fmt = fmt_element.value;
    		if (fmt!='') {
    			g_filterHaving.push(fmt);
    			if (label != '') {
    				label += ',';
    			}
    			label += fmt;
    		}
    		var day = day_element.value;
    		if (day!='') {
    			g_filterWeekday.push(day);
    			if (label != '') {
    				label += ',';
    			}
    			label += c_g_weekdays[day];
    		}
    		if (open_element.checked) {
    			g_filterHaving.push('O');
    			if (label != '') {
    				label += ',';
    			}
    			label += 'O';
    		}
    		if (g_filterHaving.length==0)
    			g_filterHaving = null;
    		if (g_filterWeekday.length==0)
    			g_filterWeekday = null;
    		closeModalWindow(modal);
    		draw_markers();
    		g_main_map.setZoom(getZoomAdjust(false));
    	});
    	document.getElementById('reset_filter_button').addEventListener('click', function() {
    		g_filterHaving = null;
    		g_filterNotHaving = null;
    		g_filterWeekday = null;
    		if (g_filterWeekday!=null || g_filterHaving!=null || g_filterNotHaving!=null) {
    			secondChild.style.backgroundImage = 'url('+c_g_BMLTPlugin_images+'/filter-26-off.png)';
    			firstChild.style.width = '26px';
    			secondChild.style.width = '26px';
    			secondChild.innerHTML = '';
    		}
    		closeModalWindow(modal);
    		draw_markers();
    	});
    	document.getElementById('close_filter').addEventListener('click', function() {
    		closeModalWindow(modal);
    	});
    	openModalWindow(modal);
    }
	function fillSelect(filterId, formats, filtered) {
    	var modalFilter = document.getElementById(filterId);
    	modalFilter.innerHTML = "";
        var newOption = document.createElement("option");
        newOption.value = '';
        newOption.innerHTML = "no filter";
        modalFilter.options.add(newOption);
        var selected = null;
		for ( var c = 0; c < formats.length; c++ )
		{
    		var fmt = formats[c];
            var newOption = document.createElement("option");
            newOption.value = fmt['key_string'];
            newOption.innerHTML = fmt['name_string'];
            if (filtered!=null && filtered.includes(newOption.value)) {
            	selected = newOption.value;
            }
            modalFilter.options.add(newOption);
        }
        if (selected != null) {
        	modalFilter.value = selected;
        }
		return modalFilter;
	}
	function filterMeetings(in_meetings_array) {
		var ret = filterMeetings24(in_meetings_array, g_next24hours);
		ret = filterMeetingsFmts(ret,g_filterHaving);
		ret = filterMeetingDay(ret,g_filterWeekday);
		return ret;
	}
	
	function filterMeetingsFmts(in_meetings_array, fmt) {
		if (fmt != null && fmt.length>0) {
			var ret = new Array;
			for ( var c = 0; c < in_meetings_array.length; c++ )
			{
				var ok = true;
				var keys = in_meetings_array[c].formats.split(',');
				for ( var d=0; d<fmt.length; d++) {
					if (keys.includes(fmt[d]))
						continue;
					ok = false;
					break;
				}
				if (ok) {
					ret.push(in_meetings_array[c]);
				}
			};
			return ret;
		}
		return in_meetings_array;
	}
	function filterMeetingDay(in_meetings_array, fmt) {
		if (fmt != null && fmt.length>0) {
			var ret = new Array;
			for ( var c = 0; c < in_meetings_array.length; c++ )
			{
				if (fmt.includes(in_meetings_array[c]['weekday_tinyint'])) {
					ret.push(in_meetings_array[c]);
				}
			};
			return ret;
		}
		return in_meetings_array;
	}
	function filterMeetings24(in_meeting_array, next24) {
		if (next24) {
			var ret = new Array;
			var date = new Date;
			var dayNow = date.getDay();
			var hour = date.getHours();
			var mins = date.getMinutes();
			for ( var c = 0; c < in_meeting_array.length; c++ )
			{
				if (isMeetingInTime(in_meeting_array[c],dayNow,hour,mins)) {
					ret.push(in_meeting_array[c]);
				}
			};
			return ret;
		}
		return in_meeting_array;
	}
	function isMeetingInTime(meeting,dayNow,hour,mins) {
		var weekday = meeting.weekday_tinyint-1;
		if (weekday==dayNow) {
			var	time = meeting.start_time.toString().split(':');
			var meetingHour = parseInt(time[0]);
			if (meetingHour > hour) {
				return true;
			}
			if (meetingHour == hour) {
				if (parseInt(time[1]) > mins) {
					return true;
				}
			}
		} else if (weekday==(dayNow+1)%7) {
			return true;
		}
		return false;
	}
    function addFilterMeetingsToggle(map) {
    	var controlDiv = document.createElement('div');
        // Set CSS for the control border.
        var controlUI = document.createElement('div');
        controlUI.style.background = 'rgba(0,0,0,0)';
        controlUI.style.cursor = 'pointer';
        controlUI.style.marginTop = '10px';
        controlUI.style.marginLeft = '10px';
        controlUI.style.textAlign = 'toggle';
        controlUI.title = 'Filter meetings toggle';
        controlDiv.appendChild(controlUI);

        // Set CSS for the control interior.
        var controlSwitch = document.createElement('div');
        controlSwitch.className = "onoffswitch";
        var checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = "onoffswitch";
        checkbox.className = "onoffswitch-checkbox";
        checkbox.id = "myonoffswitch";
        controlSwitch.appendChild(checkbox);
        var label = document.createElement("label");
        label.className = "onoffswitch-label";
        label.setAttribute("for","myonoffswitch");
        controlSwitch.appendChild(label);
        var span = document.createElement("span");
        span.className = "onoffswitch-inner";
        label.appendChild(span);
        span = document.createElement("span");
        span.className = "onoffswitch-switch";
        label.appendChild(span);

        controlUI.appendChild(controlSwitch);

        checkbox.addEventListener('click', function() {
        	g_next24hours = !g_next24hours;
           draw_markers();
        });
        controlDiv.index = 1;
        map.controls[google.maps.ControlPosition.TOP_LEFT].push(controlDiv);
      }
    function meetingTimes(meeting) {
	    var duration = meeting.duration_time.split(':');
	    var minutes = parseInt(duration[0]) * 60;
	    if (duration.length>1)
	    	minutes += parseInt(duration[1]);
	    var startDate = new Date (new Date().toDateString() + ' ' + meeting.start_time);
	    var endDate = new Date(startDate.getTime()+minutes*60000);
	    var startTimeSplit = meeting.start_time.split(':');
	    var startTime = formattedTime(meeting.start_time);
	    var endTime = ''+endDate.getHours()+':';
	    if (endDate.getMinutes()==0) {
	    	endTime += '00';
	    } else if (endDate.getMinutes()<10) {
	    	endTime += '0'+endDate.getMinutes();
	    } else {
	    	endTime += endDate.getMinutes();
		}
		endTime = formattedTime(endTime);
	    return startTime+ "&nbsp;-&nbsp;" + endTime;
    }
    function meetingDayAndTimes(meeting) {
    	return c_g_weekdays[meeting.weekday_tinyint] + ' ' + meetingTimes(meeting);
    }
	function showListView() {
    	var meetings = filterMeetings(filterVisible());
    	if (meetings.length == 0) return;
    	var modal = document.getElementById('table_modal');
    	document.getElementById('close_table').addEventListener('click', function() {
    		closeModalWindow(modal);
    	});
    	var listElement = document.getElementById("modal-view-by-weekday");
    	meetings.sort(sortMeetingSearchResponseCallback);
    	var html = '<table class="bmlt-table table table-striped table-hover table-bordered">';
    	var section = '';
    	meetings.forEach(function(meeting){
    		if (meeting.weekday_tinyint!=section) {
    			section = meeting.weekday_tinyint;
    			html += '<tr class="meeting-header"><td>'+c_g_weekdays[section]+'</td></tr>';
    		}
    		html += '<tr><td><div class="modal_times">'+meetingTimes(meeting)+'</div>';
    		html += marker_make_meeting(meeting) + '</td></tr>';
    	});
    	html += '</table>';
    	listElement.innerHTML = html;
    	listElement.style.display = "block";
    	document.getElementById("modal-day-button").className += " active";
    	document.getElementById("modal-city-button").className = document.getElementById("modal-city-button").className.replace(" active", "");
    	
    	listElement = document.getElementById("modal-view-by-city");
    	meetings.sort(sortByCityCallback);
    	var html = '<table class="bmlt-table table table-striped table-hover table-bordered">';
    	var section = '';
    	meetings.forEach(function(meeting){
    		if (meeting.location_municipality!=section) {
    			section = meeting.location_municipality;
    			html += '<tr><td class="meeting-header">'+section+'</td></tr>';
    		}
    		html += '<tr><td><div class="modal_times">'+meetingDayAndTimes(meeting)+'</div>';
    		html += marker_make_meeting(meeting) + '</td></tr>';
    	});
    	html += '</table>';
    	listElement.innerHTML = html;
    	openModalWindow(modal);
    }
	function openTableView(evt, name) {
		  // Declare all variables
		  var i, tabcontent, tablinks;

		  // Get all elements with class="tabcontent" and hide them
		  tabcontent = document.getElementsByClassName("modal-tabcontent");
		  for (i = 0; i < tabcontent.length; i++) {
		    tabcontent[i].style.display = "none";
		  }

		  // Get all elements with class="tablinks" and remove the class "active"
		  tablinks = document.getElementsByClassName("modal-tablinks");
		  for (i = 0; i < tablinks.length; i++) {
		    tablinks[i].className = tablinks[i].className.replace(" active", "");
		  }

		  // Show the current tab, and add an "active" class to the button that opened the tab
		  document.getElementById(name).style.display = "block";
		  evt.currentTarget.className += " active";
	}
	/****************************************************************************************
	 *								MAIN FUNCTIONAL INTERFACE								*
	 ****************************************************************************************/
	if ( in_div && in_coords )
	{
		load_map ( in_div, in_coords );
		this.loadAllMeetingsExt = loadAllMeetings;
		this.openTableViewExt = openTableView;
	};
};
MeetingMap.prototype.loadAllMeetingsExt = null;
MeetingMap.prototype.openTableViewExt = null;
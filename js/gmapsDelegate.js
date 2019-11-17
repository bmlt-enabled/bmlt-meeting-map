    function MapDelegate() {
        var g_icon_image_single = new google.maps.MarkerImage ( c_g_BMLTPlugin_images+"/NAMarker.png", new google.maps.Size(23, 32), new google.maps.Point(0,0), new google.maps.Point(12, 32) );
	    var g_icon_image_multi = new google.maps.MarkerImage ( c_g_BMLTPlugin_images+"/NAMarkerG.png", new google.maps.Size(23, 32), new google.maps.Point(0,0), new google.maps.Point(12, 32) );
	    var g_icon_image_selected = new google.maps.MarkerImage ( c_g_BMLTPlugin_images+"/NAMarkerSel.png", new google.maps.Size(23, 32), new google.maps.Point(0,0), new google.maps.Point(12, 32) );
	    var g_icon_shadow = new google.maps.MarkerImage( c_g_BMLTPlugin_images+"/NAMarkerS.png", new google.maps.Size(43, 32), new google.maps.Point(0,0), new google.maps.Point(12, 32) );
	    var g_icon_shape = { coord: [16,0,18,1,19,2,20,3,21,4,21,5,22,6,22,7,22,8,22,9,22,10,22,11,22,12,22,13,22,14,22,15,22,16,21,17,21,18,22,19,20,20,19,21,20,22,18,23,17,24,18,25,17,26,15,27,14,28,15,29,12,30,12,31,10,31,10,30,9,29,8,28,8,27,7,26,6,25,5,24,5,23,4,22,3,21,3,20,2,19,1,18,1,17,1,16,0,15,0,14,0,13,0,12,0,11,0,10,0,9,0,8,0,7,1,6,1,5,2,4,2,3,3,2,5,1,6,0,16,0], type: 'poly' };
        var g_main_map;
        var	g_allMarkers = [];				///< Holds all the markers.

        function createMap(in_div, in_location_coords) {
            if ( in_location_coords ) {
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
            
                if ( (pixel_width < 640) || (pixel_height < 640) ) {
                    myOptions.scrollwheel = true;
                    myOptions.zoomControlOptions = { 'style': google.maps.ZoomControlStyle.SMALL };
                } else {
                    myOptions.zoomControlOptions = { 'style': google.maps.ZoomControlStyle.LARGE };
                };
                g_main_map = new google.maps.Map ( in_div, myOptions );
                return g_main_map;
            };
            return null;
        }
        function addListener(ev,f,once) {
            var e = ev;
            switch (ev) {
                case "zoomend":
                    e = 'zoom_changed';
                    break;
                default:
                    ;
            }
            if (once) {
                google.maps.event.addListenerOnce( g_main_map, e, f);
            } else {
                google.maps.event.addListener( g_main_map, e, f);
            }
        }
        function setViewToPosition(position, filterMeetings) {
            var latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            g_main_map.setCenter(latlng);
            g_main_map.setZoom(getZoomAdjust(false, filterMeetings));
        }
        function clearAllMarkers ( )
        {
            if ( g_allMarkers )
            {
    
                for ( var c = 0; c < g_allMarkers.length; c++ )
                {
                    if ( g_allMarkers[c] && g_allMarkers[c].info_win ) {
                        g_allMarkers[c].info_win_.close();
                        g_allMarkers[c] = null;
                    };
                    marker.setMap( null );
                    g_allMarkers[c] = null;
                };
    
                g_allMarkers.length = 0;
            };
        };
        function getZoomAdjust(only_out,filterMeetings) {
            if (!g_main_map) return 12;
            var ret = g_main_map.getZoom();
            var center = g_main_map.getCenter();
            var bounds = g_main_map.getBounds();
            var zoomedOut = false;
            while(filterMeetings(bounds).length==0 && ret>6) {
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
            if (!only_out && !zoomedOut && ret<12) {
                var knt = filterMeetings(bounds).length;
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
                    knt = filterMeetings(bounds).length;
                }
                if (knt == 0) {
                    ret -= 1;
                }
            } 
            return ret;
        }
        function setZoom(filterMeetings) {
            g_main_map.setZoom(getZoomAdjust(false,filterMeetings));
        }
        function contains(bounds, lat, lng) {
           return bounds.contains(new google.maps.LatLng ( lat, lng));
        }
        function fromLatLngToPoint(lat, lng) {
            var latLng = new google.maps.LatLng ( lat, lng);
            var scale = 1 << g_main_map.getZoom();
            var worldPoint = g_main_map.getProjection().fromLatLngToPoint(latLng);
            return new google.maps.Point(worldPoint.x * scale, worldPoint.y * scale);
        };
        function setZoom(filterMeetings) {
            g_main_map.setZoom(getZoomAdjust(false,filterMeetings));
        }
    function createMarker (	in_coords,		///< The long/lat for the marker.
			multi, 
			in_html,		///< The info window HTML
			in_title        ///< The tooltip
	)
	{
        var in_main_icon = (multi ? g_icon_image_multi : g_icon_image_single)
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
    function createMarker (	coords,		///< The long/lat for the marker.
        multi,	///< The URI for the main icon
        in_html,		///< The info window HTML
        in_title        ///< The tooltip
    ) {
    var marker = null;

    var	is_clickable = (in_html ? true : false);
    var in_main_icon = (multi ? g_icon_image_multi : g_icon_image_single)
    var in_coords = new google.maps.LatLng(coords[0], coords[1]);
    var marker = new google.maps.Marker ( { 'position':		in_coords,
            'map':			g_main_map,
            'shadow':		g_icon_shadow,
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
    function addControl(div,pos) {
        var p = pos;
        switch(pos) {
            case 'topright':
                p = google.maps.ControlPosition.TOP_RIGHT;
                break;
            case 'topleft':
                p = google.maps.ControlPosition.TOP_LEFT;
                break;
        }
		div.index = 1;
	    g_main_map.controls[p].push(div);
    }
    	/************************************************************************************//**
	 *	\brief This catches the AJAX response, and fills in the response form.				*
	 ****************************************************************************************/
    function fitAndZoom(ev) {
        g_main_map.fitBounds(this.response[0].geometry.viewport);
        g_main_map.setZoom(getZoomAdjust(true,this.filterMeetings));
    }
    function geoCallback( in_geocode_response ) {
        var callback = fitAndZoom.bind({filterMeetings:this.filterMeetings,
                response: in_geocode_response});
        if ( in_geocode_response && in_geocode_response[0] && in_geocode_response[0].geometry && in_geocode_response[0].geometry.location ) {
                g_main_map.panTo ( in_geocode_response[0].geometry.location );
                google.maps.event.addListenerOnce( g_main_map, 'idle', callback);
        } else {
            alert ( c_g_address_lookup_fail );
        };
    };
        function callGeocoder(in_loc, filterMeetings) {
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
                var callback = geoCallback.bind({filterMeetings:filterMeetings});
                var	status = geocoder.geocode ( geoCodeParams, callback );
    
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
        this.createMap = createMap;
        this.addListener = addListener;
        this.addControl = addControl;
        this.setViewToPosition = setViewToPosition;
        this.clearAllMarkers = clearAllMarkers;
        this.fromLatLngToPoint = fromLatLngToPoint;
        this.callGeocoder = callGeocoder;
        this.setZoom = setZoom;
        this.createMarker = createMarker;
        this.contains = contains;
    }
    MapDelegate.prototype.createMap = null;
    MapDelegate.prototype.addListener = null;
    MapDelegate.prototype.addControl = null;
    MapDelegate.prototype.setViewToPosition = null;
    MapDelegate.prototype.clearAllMarkers = null;
    MapDelegate.prototype.fromLatLngToPoint = null;
    MapDelegate.prototype.callGeocoder = null;
    MapDelegate.prototype.setZoom = null;
    MapDelegate.prototype.createMarker = null;
    MapDelegate.prototype.contains = null;
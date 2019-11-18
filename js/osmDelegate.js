function MapDelegate() {
    var g_icon_image_single = L.icon({
		iconUrl: c_g_BMLTPlugin_images+"/NAMarker.png",
		shadowUrl: c_g_BMLTPlugin_images+"/NAMarkerS.png",
		iconSize:     [23, 32], // size of the icon
		shadowSize:   [43, 32], // size of the shadow
		iconAnchor:   [12, 32], // point of the icon which will correspond to marker's location
		shadowAnchor: [12, 32],  // the same for the shadow
		popupAnchor:  [0, -32] // point from which the popup should open relative to the iconAnchor
	});
	var g_icon_image_multi = L.icon({
		iconUrl: c_g_BMLTPlugin_images+"/NAMarkerG.png",
		shadowUrl: c_g_BMLTPlugin_images+"/NAMarkerS.png",
		iconSize:     [23, 32], // size of the icon
		shadowSize:   [43, 32], // size of the shadow
		iconAnchor:   [12, 32], // point of the icon which will correspond to marker's location
		shadowAnchor: [12, 32],  // the same for the shadow
		popupAnchor:  [0, -32] // point from which the popup should open relative to the iconAnchor
	});
	var g_icon_image_selected = L.icon({
		iconUrl: c_g_BMLTPlugin_images+"/NAMarkerSel.png",
		shadowUrl: c_g_BMLTPlugin_images+"/NAMarkerS.png",
		iconSize:     [23, 32], // size of the icon
		shadowSize:   [43, 32], // size of the shadow
		iconAnchor:   [12, 32], // point of the icon which will correspond to marker's location
		shadowAnchor: [12, 32],  // the same for the shadow
		popupAnchor:  [12, -32] // point from which the popup should open relative to the iconAnchor
    });
    var	g_allMarkers = [];				///< Holds all the markers.
    var g_main_map;
    function createMap(in_div, in_location_coords) {
        if ( in_location_coords ) {
            myOptions = {
                'center': new L.latLng ( in_location_coords.latitude, in_location_coords.longitude ),
                'zoom': in_location_coords.zoom,
                'minZoom': 6,
                'maxZoom': 18,
                'doubleClickZoom' : false
            };
            g_main_map = new L.Map ( in_div, myOptions );
            L.tileLayer(c_g_tileUrl,c_g_tileOptions).addTo(g_main_map);
            g_main_map.zoomControl.setPosition('bottomright');
            return g_main_map;
        }
        return null;
    }
    function addListener(ev,f,once) {
        if (once) {
			g_main_map.once(ev, f);
		} else {
			g_main_map.on(ev, f);
		}
    }
    function setViewToPosition(position, filterMeetings) {
        var latlng = L.latLng(position.coords.latitude, position.coords.longitude);
		g_main_map.flyTo(latlng);
        g_main_map.on('moveend', function(ev) {
			g_main_map.off('moveend');
            g_main_map.setZoom(getZoomAdjust(false, filterMeetings));
        });
	}
	function clearAllMarkers ( )
	{
		if ( g_allMarkers )
		{

			for ( var c = 0; c < g_allMarkers.length; c++ )
			{
				g_allMarkers[c].remove( );
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
			var ne = L.latLng(
				(2*bounds.getNorthEast().lat)-center.lat,
			    (2*bounds.getNorthEast().lng)-center.lng);
			var sw = L.latLng(
				(2*bounds.getSouthWest().lat)-center.lat,
				(2*bounds.getSouthWest().lng)-center.lng);
			bounds = L.latLngBounds(sw,ne);

		}
		if (!only_out && !zoomedOut && ret<12) {
			var knt = filterMeetings(bounds).length;
			while(ret<12 && knt>0) {
				// no exact, because earth is curved
				ret += 1;
				var ne = L.latLng(
					0.5*(bounds.getNorthEast().lat+center.lat),
					0.5*(bounds.getNorthEast().lng+center.lng));
				var sw = L.latLng(
					 0.5*(bounds.getSouthWest().lat+center.lat),
					0.5*(bounds.getSouthWest().lng+center.lng));
				bounds = L.latLngBounds(sw,ne);
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
	function fromLatLngToPoint(lat, lng) {
		return g_main_map.latLngToLayerPoint(L.latLng(lat,lng));
    };
	function createMarker (	in_coords,		///< The long/lat for the marker.
        multi,	///< The URI for the main icon
        in_html,		///< The info window HTML
        in_title        ///< The tooltip
)
{
    var in_main_icon = (multi ? g_icon_image_multi : g_icon_image_single);

    var marker = L.marker(in_coords, {icon: in_main_icon, title: in_title}).bindPopup(in_html).addTo(g_main_map);
	marker.on('popupopen', function(e) {
        marker.oldIcon = marker.getIcon();
        marker.setIcon(g_icon_image_selected);
    });
    marker.on('popupclose', function(e) {
        marker.setIcon(marker.oldIcon);
    });
    g_allMarkers[g_allMarkers.length] = marker;
};
function addControl(div,pos) {
		var ControlClass =  L.Control.extend({
	  		onAdd: function (map) {
				return div;
			},
			onRemove: function(map) {
				// Nothing to do here
			}
		});
		var controlConstructor = function(opts) {
			return new ControlClass(opts);
		}
		controlConstructor({ position: pos }).addTo(g_main_map);
    }
    	// Low level GeoCoding
	function getJSON(url, params, callback) {
		var xmlHttp = new XMLHttpRequest();
		xmlHttp.onreadystatechange = function() {
		if (xmlHttp.readyState !== 4) {
		  return;
		}
		var message;
		if (xmlHttp.status !== 200 && xmlHttp.status !== 304) {
		  message = '';
		} else if (typeof xmlHttp.response === 'string') {
		  // IE doesn't parse JSON responses even with responseType: 'json'.
		  try {
			message = JSON.parse(xmlHttp.response);
		  } catch (e) {
			// Not a JSON response
			message = xmlHttp.response;
		  }
		} else {
		  message = xmlHttp.response;
		}
		callback(message);
	  };
	  xmlHttp.open('GET', url + getParamString(params), true);
	  xmlHttp.responseType = 'json';
	  xmlHttp.setRequestHeader('Accept', 'application/json');
	  xmlHttp.send(null);
	};
	function getParamString(obj, existingUrl, uppercase) {
		var params = [];
		for (var i in obj) {
		  var key = encodeURIComponent(uppercase ? i.toUpperCase() : i);
		  var value = obj[i];
		  if (!L.Util.isArray(value)) {
			params.push(key + '=' + encodeURIComponent(value));
		  } else {
			for (var j = 0; j < value.length; j++) {
			  params.push(key + '=' + encodeURIComponent(value[j]));
			}
		  }
		}
		return (!existingUrl || existingUrl.indexOf('?') === -1 ? '?' : '&') + params.join('&');
	}
	function geocode(query, params, cb, filterMeetings) {
		var serviceUrl = c_g_nominatimUrl;
		getJSON(
		  serviceUrl + 'search',
		  L.extend(
			{
			  q: query,
			  limit: 5,
			  format: 'json',
			  addressdetails: 1
			},
			params
		  ),
		  L.bind(function(data) {
			var results = [];
			for (var i = data.length - 1; i >= 0; i--) {
			  var bbox = data[i].boundingbox;
			  for (var j = 0; j < 4; j++) bbox[j] = parseFloat(bbox[j]);
			  results[i] = {
				icon: data[i].icon,
				name: data[i].display_name,
				bbox: L.latLngBounds([bbox[0], bbox[2]], [bbox[1], bbox[3]]),
				center: L.latLng(data[i].lat, data[i].lon),
				properties: data[i]
			  };
			}
			cb(results,filterMeetings);
		}, this)
		);
    };
    	/************************************************************************************//**
	 *	\brief This catches the AJAX response, and fills in the response form.				*
	 ****************************************************************************************/

	function geoCallback ( in_geocode_response,	///< The JSON object.
        filterMeetings)
        {
            if ( in_geocode_response && in_geocode_response[0] && in_geocode_response[0].bbox ) {
                g_main_map.flyToBounds ( in_geocode_response[0].bbox );
                g_main_map.on('moveend', function(ev) {
					g_main_map.off('moveend');
                    g_main_map.setZoom(getZoomAdjust(true, filterMeetings));
                });
            } else {
                alert ( c_g_address_lookup_fail );
            };
		};
        function callGeocoder(in_loc, filterMeetings) {
			geoCodeParams = {};
			if (c_g_region.trim() !== '') {
				geoCodeParams.countrycodes = c_g_region;
			}
			if (c_g_bounds
			&&  c_g_bounds.north && c_g_bounds.north.trim()!== ''
			&&  c_g_bounds.east && c_g_bounds.east.trim()!== ''
			&&  c_g_bounds.south && c_g_bounds.south.trim()!== ''
			&&  c_g_bounds.west && c_g_bounds.west.trim()!== '') {
				geoCodeParams.viewbox = c_g_bounds.south+","+c_g_bounds.west+","+
					                    c_g_bounds.north+","+c_g_bounds.east;
			}
            var	geocoder = geocode(in_loc, geoCodeParams, geoCallback, filterMeetings);
        }
	function contains(bounds, lat, lng) {
		return bounds.contains(L.latLng ( lat, lng ));
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
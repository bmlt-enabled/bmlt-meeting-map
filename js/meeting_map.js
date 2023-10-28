function MeetingMap(inConfig, inDiv, inCoords, inMeetingDetail) {
	/****************************************************************************************
	 *										CLASS VARIABLES									*
	 ****************************************************************************************/
	var g_next24hours = false;
	var g_filterHaving = null;
	var g_filterWeekday = null;
	var g_filterNotHaving = null;

	var gDelegate = new MapDelegate(inConfig);
	const config = inConfig;

	var gAllMeetings = null;
	var gFormatHash = null;
	var gMeetingIdsFromCrouton = null;
	var loadedCallbackFunction = null;
	var loadedCallbackArgs = [];
	function preloadApiLoadedCallback(f,a) {
		loadedCallbackFunction = f;
		loadedCallbackArgs = a;
	}
	function apiLoadedCallback() {
		loadedCallbackFunction(...loadedCallbackArgs);
	}
	/************************************************************************************//**
	 *	\brief Load the map and set it up.													*
	 ****************************************************************************************/

	function loadMap(handlebarMapOptions=null) {
		if (!gDelegate.isApiLoaded()) {
			preloadApiLoadedCallback(loadMap, []);
			gDelegate.loadApi();
			return;
		}
		let location = inCoords;
		if (handlebarMapOptions) {
			location = {latitude: handlebarMapOptions.lat, longitude: handlebarMapOptions.lng};
		}
		if (inDiv) {
			inDiv.myThrobber = null;

			if (gDelegate.createMap(inDiv, location)) {
				createThrobber(inDiv);
				gDelegate.addListener('zoomend', function (ev) {
					if (gAllMeetings &&
						gFormatHash) {
						searchResponseCallback();
					}
				}, false);
				showThrobber();
				var pixel_width = inDiv.offsetWidth;
				if (!inMeetingDetail) {
					gDelegate.addControl(createFilterMeetingsToggle(), 'topleft');
					gDelegate.addControl(createMenuButton(pixel_width), 'topright');
				}
			};
		};
	};
	function loadFromCrouton(inDiv_id, meetings_responseObject, formats_responseObject, handlebarMapOptions = null) {
		if (!gDelegate.isApiLoaded()) {
			preloadApiLoadedCallback(loadFromCrouton, [inDiv_id, meetings_responseObject, formats_responseObject, handlebarMapOptions]);
			gDelegate.loadApi();
			return;
		}
		inDiv = document.getElementById(inDiv_id);
		loadMap(handlebarMapOptions);
		loadAllMeetings(meetings_responseObject, formats_responseObject, 0, '', true);
		const lat_lngs = gAllMeetings.reduce(function(a,m) {a.push([m.latitude, m.longitude]); return a;},[]);
		gDelegate.fitBounds(lat_lngs);
	};
	function filterFromCrouton(filter) {
		gMeetingIdsFromCrouton = filter;
		if (gAllMeetings)
			searchResponseCallback(true);
	};
	/************************************************************************************//**
	 *	\brief 
	 ****************************************************************************************/

	function createThrobber(inDiv) {
		if (!inDiv.myThrobber) {
			inDiv.myThrobber = document.createElement("div");
			if (inDiv.myThrobber) {
				inDiv.myThrobber.id = inDiv.id + 'Throbber_div';
				inDiv.myThrobber.className = 'bmlt_mapThrobber_div';
				inDiv.myThrobber.style.display = 'none';
				inDiv.appendChild(inDiv.myThrobber);
				var img = document.createElement("img");

				if (img) {
					img.src = config.BMLTPluginThrobber_img_src;
					img.className = 'bmlt_mapThrobber_img';
					img.id = inDiv.id + 'Throbber_img';
					img.alt = 'AJAX Throbber';
					inDiv.myThrobber.appendChild(img);
				} else {
					inDiv.myThrobber = null;
				};
			};
		};
	};
	function showThrobber() {
		if (inDiv.myThrobber) {
			inDiv.myThrobber.style.display = 'block';
		};
	};
	function hideThrobber() {
		if (inDiv.myThrobber) {
			inDiv.myThrobber.style.display = 'none';
		};
	};
	function loadAllMeetings(meetings_responseObject, formats_responseObject, centerMe, goto, fitAll=false) {
		gAllMeetings = meetings_responseObject.filter(m => m.venue_type != 2);
		gFormatHash = createFormatHash(formats_responseObject);
		searchResponseCallback();
		if (centerMe != 0) {
			if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(
					function (position) {
						coords = {latitude: position.coords.latitude, longitude: position.coords.longitude};
						gDelegate.setViewToPosition(coords, filterMeetingsAndBounds);
					},
					function () {
						showSearchDialog(null);
					}
				);
			} else if (fitAll) {
				showSearchDialog(null);
			}
		} else if (goto != '') {
			gDelegate.callGeocoder(goto, filterMeetingsAndBounds);
		}
		hideThrobber();
	}
	function createFormatHash(format_arr) {
		var ret = [];
		for (i = 0; i < format_arr.length; i++) {
			ret[format_arr[i].key_string] = format_arr[i];
		}
		return ret;
	};
	function createCityHash(allMeetings) {
		return allMeetings.reduce(function(prev, meeting) {
			if (prev.hasOwnProperty(meeting.location_municipality))
				prev[meeting.location_municipality].push(meeting);
			else
				prev[meeting.location_municipality] = [meeting];
			return prev;
		}, {});
	}
	function searchResponseCallback(expand = false) {
		if (!gAllMeetings.length) {
			alert(config.no_meetings_found);
			return;
		};
		try {
			drawMarkers(expand);
		} catch (e) {
			gDelegate.addListener('projection_changed', function (ev) {
				drawMarkers(expand);
			}, true);
		}
	};
	/****************************************************************************************
	 *									CREATING MARKERS									*
	 ****************************************************************************************/
	function drawMarkers(expand = false) {
		gDelegate.clearAllMarkers();

		// This calculates which markers are the red "multi" markers.
		const filtered = filterMeetings(gAllMeetings);
		var overlap_map = mapOverlappingMarkersInCity(filtered);

		// Draw the meeting markers.
		overlap_map.forEach(function (marker) {
			createMapMarker(marker);
		});
		if (expand) {
			const lat_lngs = filtered.reduce(function(a,m) {a.push([m.latitude, m.longitude]); return a;},[]);
			gDelegate.fitBounds(lat_lngs);
		}
	};

	function mapOverlappingMarkersInCity(in_meeting_array)	///< Used to draw the markers when done.
	{
		var tolerance = 8;	/* This is how many pixels we allow. */

		var ret = new Array;
		// We create this hash because we limit looking for "matches" to within one city.
		for (const [city, meetings] of Object.entries(createCityHash(in_meeting_array))) {
			// create a tmp object so we can mark which items haven't been matched yet.
			var tmp = meetings.map((meeting) => {
				item = new Object;
				item.matched = false;
				item.meeting = meeting;
				item.coords = gDelegate.fromLatLngToPoint(meeting.latitude, meeting.longitude);
				return item;
			});
			markersInCity = tmp.reduce(function(prev, item, index) {
				if (item.matched) return prev;
				matches = [item.meeting];
				var outer_coords = item.coords;
				for (c2 = index+1; c2<meetings.length; c2++) {
					if (tmp[c2].matched) continue;
					var inner_coords = tmp[c2].coords;

					var xmin = outer_coords.x - tolerance;
					var xmax = outer_coords.x + tolerance;
					var ymin = outer_coords.y - tolerance;
					var ymax = outer_coords.y + tolerance;

					/* We have an overlap. */
					if ((inner_coords.x >= xmin) && (inner_coords.x <= xmax) && (inner_coords.y >= ymin) && (inner_coords.y <= ymax)) {
						matches.push(tmp[c2].meeting);
						tmp[c2].matched = true;
					}
				}
				matches.sort(sortMeetingSearchResponseCallback)
				prev.push(matches);
				return prev;
			}, []);
			ret = ret.concat(markersInCity);
		}

		return ret;
	};
	/************************************************************************************//**
	 *	 \brief	Callback used to sort the meeting response by weekday.                      *
	 *    \returns 1 if a>b, -1 if a<b or 0 if they are equal.                               *
	 ****************************************************************************************/
	function sortMeetingSearchResponseCallback(mtg_a,   ///< Meeting object A
		mtg_b    ///< Meeting Object B
	) {
		var weekday_score_a = parseInt(mtg_a.weekday_tinyint, 10);
		var weekday_score_b = parseInt(mtg_b.weekday_tinyint, 10);

		if (weekday_score_a < config.start_week) {
			weekday_score_a += 7;
		}

		if (weekday_score_b < config.start_week) {
			weekday_score_b += 7;
		}

		if (weekday_score_a < weekday_score_b) {
			return -1;
		}
		else if (weekday_score_a > weekday_score_b) {
			return 1;
		};
		var time_a = mtg_a.start_time.toString().split(':');
		var time_b = mtg_b.start_time.toString().split(':');
		if (parseInt(time_a[0]) < parseInt(time_b[0])) {
			return -1;
		}
		if (parseInt(time_a[0]) > parseInt(time_b[0])) {
			return 1;
		}
		if (parseInt(time_a[1]) < parseInt(time_b[1])) {
			return -1;
		}
		if (parseInt(time_a[1]) > parseInt(time_b[1])) {
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
	function createMapMarker(in_mtg_obj_array	/**< A meeting object array. */) {
		var main_point = [in_mtg_obj_array[0].latitude, in_mtg_obj_array[0].longitude];
		var marker_html = '<div class="accordion">';
		var checked = ' checked';
		var marker_title = '';
		for (var c = 0; c < in_mtg_obj_array.length; c++) {
			marker_html += '<div><input type="radio" name="panel" id="panel-' + in_mtg_obj_array[c].id_bigint + '"' + checked + '>';
			if (c > 0) {
				marker_title += '; ';
			}
			var dayAndTime = getDayAndTime(in_mtg_obj_array[c]);
			marker_title += dayAndTime;
			checked = '';
			marker_html += '<label for="panel-' + in_mtg_obj_array[c].id_bigint + '">' + dayAndTime + '</label>';
			marker_html += marker_make_meeting(in_mtg_obj_array[c],false);
			marker_html += '</div>';
		}
		marker_html += '</div>';
		gDelegate.createMarker(main_point,
			(in_mtg_obj_array.length > 1),
			marker_html, marker_title,in_mtg_obj_array.map((m)=>parseInt(m.id_bigint)));
	};
	function getDayAndTime(in_meeting_obj) {
		return config.weekdays[in_meeting_obj.weekday_tinyint] + " " + formattedTime(in_meeting_obj.start_time);
	}
	function formattedTime(in_time) {
		var time = in_time.toString().split(':');
		if (config.time_format == '12') {
			var h = time[0] % 12 || 12;
			var ampm = (time[0] < 12 || time[0] === 24) ? "AM" : "PM";
			return h + ':' + time[1] + ampm;
		}
		return time[0] + ':' + time[1];
	}
	function getLangs(in_meeting_obj) {
		var ret = '';
		if (in_meeting_obj.formats && in_meeting_obj.formats.length > 0) {
			var myFormatKeys = in_meeting_obj.formats.split(',');
			for (i = 0; i < myFormatKeys.length; i++) {
				theFormat = gFormatHash[myFormatKeys[i]];
				if (typeof theFormat == 'undefined') continue;
				if (theFormat.format_type_enum == 'LANG') {
					var a = config.BMLTPlugin_images + '/../lang/' + theFormat.key_string + ".png";
					ret += ' <img src="' + a + '">';
				}
			}
		}
		return ret;
	}
	function marker_make_meeting(in_meeting_obj, listView) {
		var id = in_meeting_obj.id_bigint.toString();
		var myFormatKeys = in_meeting_obj.formats.split(',');
		var covidFormats = new Array;
		var regFormats = new Array;
		var address_class = 'active';
		var hygene_class = 'hidden';
		for (i=0; i<myFormatKeys.length; i++) {
			theFormat = gFormatHash[myFormatKeys[i]];
			if (typeof theFormat == 'undefined') continue;
			if (theFormat.format_type_enum=='FC2' || theFormat.format_type_enum=='FC3' || theFormat.format_type_enum=='Covid' || 
				((typeof theFormat.format_type_enum!=='undefined')&&theFormat.format_type_enum.charAt(0)=='O')) {
				regFormats.push(theFormat);
			}
			else if (theFormat.format_type_enum=='xCovidx') {
				covidFormats.push(theFormat);
				address_class = listView ? 'active' : 'hidden';
				hygene_class = 'active';
			} 
		}
		var ret = '<div class="marker_div_meeting" id="' + id + '">';
		ret += '<h4>' + in_meeting_obj.meeting_name.toString() + getLangs(in_meeting_obj) + '</h4>';
		var address_id = "meeting_address_" + id;
		var hygene_id = "meeting_hygene_" + id;


		ret += '<div id="' + address_id + '" class="'+address_class+'">';
		if (in_meeting_obj.comments) {
			ret += '<em>' + in_meeting_obj.comments + '</em>';
		}

		if (in_meeting_obj.location_text) {
			ret += '<div class="marker_div_location_text">' + in_meeting_obj.location_text.toString() + '</div>';
		};

		var location = '';
		if (in_meeting_obj.location_street) {
			location = in_meeting_obj.location_street.toString();
		};

		if (in_meeting_obj.location_municipality) {
			location += ', ' + in_meeting_obj.location_municipality.toString();

			if (in_meeting_obj.location_city_subsection) {
				location += ' ' + in_meeting_obj.location_city_subsection + ', ';
			}
		};
		if (location.length > 0) {
			ret += '<div class="marker_div_location_address">' + location + "</div>";
		}
		if (in_meeting_obj.location_info) {
			ret += '<div class="marker_div_location_info">' + in_meeting_obj.location_info.toString() + '</div>';
		};
		if (config.meeting_details_href.length) {
			ret += '<div class="marker_div_location_maplink"><a href="';
			ret += config.meeting_details_href + '?meeting-id=' + in_meeting_obj.id_bigint;
			ret += '" target="_blank">' + config.more_info_text + '</a>';
			ret += '</div>';
		} else {
			ret += '<div class="marker_div_location_maplink"><a href="';
			ret += 'https://www.google.com/maps/dir/?api=1&destination='
				+ encodeURIComponent(in_meeting_obj.latitude.toString()) + ',' + encodeURIComponent(in_meeting_obj.longitude.toString());
			ret += '" rel="external" target="_blank">' + config.map_link_text + '</a>';
			ret += '</div>';
		}
		if (regFormats.length > 0) {
			ret += '<div class="marker_div_formats">';
			regFormats.forEach(function(format) {
				ret += format['name_string'] + '; ';
			});
			ret += '</div>';
		};
		if (covidFormats.length > 0 && !listView) {
			ret += '<button class="hygene-button" onClick=\'exchange("' + address_id + '", "' + hygene_id + '")\'>' + config.hygene_button + '</button>';
		}
		ret += '</div>';
		if (covidFormats.length > 0) {
			ret += '<div id="' + hygene_id + '" class="'+hygene_class+'">';
			ret += '<div class="bmlt-hygene-header">' + config.hygene_header + '</div>';
			ret += '<div class="bmlt-hygene-descr">';
			covidFormats.forEach(function(format) {
				ret += format['description_string'] + '; ';
			});
			ret += '</div>';
			if (!listView)
				ret += '<button class="hygene-button" onClick=\'exchange("' + hygene_id + '", "' + address_id + '")\'>' + config.hygene_back + '</button>';
			ret += '</div>';
		}
		ret += '</div>';


		return ret;
	};
	function filterVisible() {
		return filterBounds(gDelegate.getBounds());
	}
	function filterBounds(bounds) {
		var ret = new Array;
		gAllMeetings.forEach(function (meeting) {
			if (gDelegate.contains(bounds, meeting.latitude, meeting.longitude)) {
				ret.push(meeting);
			}
		});
		return ret;
	}
	function lookupLocation(text, fullscreen) {
		if (document.getElementById('goto-text').value != '') {
			if (fullscreen) {
				gDelegate.addListener('idle', function () {
					gDelegate.callGeocoder(document.getElementById('goto-text').value, filterMeetingsAndBounds);
				}, true);
			} else {
				gDelegate.callGeocoder(document.getElementById('goto-text').value, filterMeetingsAndBounds);
			}
		} else {
			alert(config.address_lookup_fail);
		};
		return true;
	};
	function createMenuButton(pixel_width) {
		var controlDiv = document.createElement('div');

		var firstChild = document.createElement('button');
		firstChild.className = 'menu-button';
		firstChild.title = config.menu_tooltip;
		controlDiv.appendChild(firstChild);

		var buttonImage = document.createElement('span');
		buttonImage.className = 'menu-button-child';
		buttonImage.style.backgroundImage = 'url(' + config.BMLTPlugin_images + '/menu-32.png)';
		firstChild.appendChild(buttonImage);
		if (pixel_width > 310) {
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
		item.innerHTML = config.menu_search;
		item.addEventListener('click', showSearchDialog);
		dropdownContent.appendChild(item);
		item = document.createElement('button');
		item.innerHTML = config.menu_nearMe;
		item.style.display = 'block';
		item.addEventListener('click', function (e) {
			if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(function (position) {
					coords = position.coords;
					gDelegate.setViewToPosition(coords, filterMeetingsAndBounds);
				});
			}
		});
		dropdownContent.appendChild(item);
		item = document.createElement('button');
		item.innerHTML = config.menu_filter;
		item.style.display = 'block';
		item.addEventListener('click', showFilterDialog);
		dropdownContent.appendChild(item);
		item = document.createElement('button');
		item.innerHTML = config.menu_list;
		item.style.display = 'block';
		item.addEventListener('click', showListView);
		dropdownContent.appendChild(item);
		item = document.createElement('button');
		item.innerHTML = config.menu_fullscreen;
		item.style.display = 'block';
		var toggleItem = item;
		item.addEventListener('click', function () {
			toggleFullscreen();
		});
		dropdownContent.appendChild(item);

		firstChild.addEventListener('click', function (e) {
			if (dropdownContent.style.display == "inline-block")
				dropdownContent.style.display = "none";
			else
				dropdownContent.style.display = "inline-block";
		});
		firstChild.appendChild(dropdownContent);
		return controlDiv;
	}
	function focusOnMeeting(meetingId) {
		let meeting = gAllMeetings.find((meeting) => meeting.id_bigint == meetingId);
		if (!meeting) return;
		if ((gDelegate.getZoom()>=14) && gDelegate.contains(gDelegate.getBounds(), meeting.latitude, meeting.longitude)) {
			gDelegate.openMarker(meetingId);
		} else {
			gDelegate.setViewToPosition({latitude: meeting.latitude, longitude: meeting.longitude}, filterMeetingsAndBounds, function() {gDelegate.openMarker(meetingId);});
		}
	}
	var g_suspendedFullscreen = false;
	function closeModalWindow(modal) {
		modal.style.display = "none";
		if (g_suspendedFullscreen) {
			g_suspendedFullscreen = false;
			if (!isFullscreen()) {
				toggleFullscreen();
			}
		}
	}
	function openModalWindow(modal) {
		if (isFullscreen()) {
			g_suspendedFullscreen = true;
			toggleFullscreen();
		}
		modal.style.display = "block";
	}
	var g_searchDialog_created = false;
	function showSearchDialog(e) {
		var modal = document.getElementById('search_modal');
		if (!g_searchDialog_created) {
			g_searchDialog_created = true;
			document.getElementById('close_search').addEventListener('click', function () {
				closeModalWindow(modal);
			});
			document.getElementById('goto-text').addEventListener('keydown', function (event) {
				if (event && event.keyCode == 13) {
					var t = g_suspendedFullscreen;
					closeModalWindow(modal);
					lookupLocation(document.getElementById('goto-text').value, t);
				}
			});
			document.getElementById('goto-button').addEventListener('click', function () {
				var t = g_suspendedFullscreen;
				closeModalWindow(modal);
				lookupLocation(document.getElementById('goto-text').value, t);
			});
		}
		openModalWindow(modal);
	}
	var g_filterDialog_created = false;
	function showFilterDialog(e) {
		var modal = document.getElementById('filter_modal');
		if (!g_filterDialog_created) {
			g_filterDialog_created = true;
			var langFormats = new Array;
			var mainFormats = new Array;
			var openFormat;

			for (var key in gFormatHash) {
				var format = gFormatHash[key];
				if (typeof format.format_type_enum == 'undefined') continue;
				if (format.format_type_enum == 'LANG') {
					langFormats.push(format);
				} else if (format.format_type_enum == 'FC2' || format.format_type_enum == 'FC3') {
					mainFormats.push(format);
				} else if (format.format_type_enum == 'O') {
					openFormat = format;
				} else if (format.format_type_enum.length > 1 && format.format_type_enum == 'O-*') {
					openFormat = format;
				}
			}
			langFormats.sort(function (a, b) {
				return a.name_string.localeCompare(b.name_string);
			});
			mainFormats.sort(function (a, b) {
				return a.name_string.localeCompare(b.name_string);
			});
			var dayFormats = new Array;
			for (var c = 1; c <= 7; c++) {
				dayFormats.push({
					'key_string': '' + c,
					'name_string': config.weekdays[c]
				});
			}
			lang_element = fillSelect('language_filter', langFormats, g_filterHaving);
			fmt_element = fillSelect('main_filter', mainFormats, g_filterHaving);
			day_element = fillSelect('day_filter', dayFormats, g_filterWeekday);
			open_element = document.getElementById('open_filter');
			if (typeof openFormat !== 'undefined') {
				document.getElementById('open_filter_text').innerHTML = openFormat.name_string;

				if (g_filterHaving != null && g_filterHaving.includes('O')) {
					open_element.checked = true;
				} else {
					open_element.checked = false;
				}
			} else {
				open_element.style.display = "none";
				document.getElementById('open_filter_text').style.display = "none";
				open_element.checked = false;
			}
			document.getElementById('filter_button').addEventListener('click', function () {
				g_filterHaving = new Array;
				g_filterWeekday = new Array;
				var label = '';
				var lang = lang_element.value;
				if (lang != '') {
					g_filterHaving.push(lang);
					label = lang;
				}
				var fmt = fmt_element.value;
				if (fmt != '') {
					g_filterHaving.push(fmt);
					if (label != '') {
						label += ',';
					}
					label += fmt;
				}
				var day = day_element.value;
				if (day != '') {
					g_filterWeekday.push(day);
					if (label != '') {
						label += ',';
					}
					label += config.weekdays[day];
				}
				if (open_element.checked) {
					g_filterHaving.push('O');
					if (label != '') {
						label += ',';
					}
					label += 'O';
				}
				if (g_filterHaving.length == 0)
					g_filterHaving = null;
				if (g_filterWeekday.length == 0)
					g_filterWeekday = null;
				closeModalWindow(modal);
				drawMarkers();
				gDelegate.zoomOut(filterMeetingsAndBounds);
			});
			document.getElementById('reset_filter_button').addEventListener('click', function () {
				g_filterHaving = null;
				g_filterNotHaving = null;
				g_filterWeekday = null;
				if (g_filterWeekday != null || g_filterHaving != null || g_filterNotHaving != null) {
					secondChild.style.backgroundImage = 'url(' + config.BMLTPlugin_images + '/filter-26-off.png)';
					firstChild.style.width = '26px';
					secondChild.style.width = '26px';
					secondChild.innerHTML = '';
				}
				closeModalWindow(modal);
				drawMarkers();
			});
			document.getElementById('close_filter').addEventListener('click', function () {
				closeModalWindow(modal);
			});
		}
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
		for (var c = 0; c < formats.length; c++) {
			var fmt = formats[c];
			var newOption = document.createElement("option");
			newOption.value = fmt['key_string'];
			newOption.innerHTML = fmt['name_string'];
			if (filtered != null && filtered.includes(newOption.value)) {
				selected = newOption.value;
			}
			modalFilter.options.add(newOption);
		}
		if (selected != null) {
			modalFilter.value = selected;
		}
		return modalFilter;
	}
	function filterMeetingsAndBounds(bounds) {
		return filterMeetings(filterBounds(bounds));
	}
	function filterMeetings(in_meetings_array) {
		var ret = in_meetings_array.filter(m => m.venue_type != 2);
		if (gMeetingIdsFromCrouton != null) {
			return ret.filter((m) => gMeetingIdsFromCrouton.includes(m.id_bigint));
		}
		if (g_next24hours) {
			const date = new Date();
			var dayNow = date.getDay();
			var hour = date.getHours();
			var mins = date.getMinutes();
			ret = ret.filter(m => isMeetingInTime(m, dayNow, hour, mins));
		}
		if (g_filterHaving != null && g_filterHaving.length > 0) {
			ret = ret.filter(m => g_filterHaving.every(
				f => addNativeLangToFmts(m.formats.split(','),f).includes(f)));
		}
		if (g_filterWeekday != null && g_filterWeekday.length > 0) {
			ret = ret.filter(m => g_filterWeekday.includes(m.weekday_tinyint));
		}
		return ret;
	}
	function addNativeLangToFmts(fmts, lang) {
		if (lang != 'de') return fmts;
		for (i = 0; i < fmts.length; i++) {
			theFormat = gFormatHash[fmts[i]];
			if (typeof theFormat == 'undefined') continue;
			if (typeof theFormat.format_type_enum == 'undefined') continue;
			if (theFormat.format_type_enum == 'LANG') return fmts;
		}
		fmts.push('de');
		return fmts;
	}
	function isMeetingInTime(meeting, dayNow, hour, mins) {
		var weekday = meeting.weekday_tinyint - 1;
		if (weekday == dayNow) {
			var time = meeting.start_time.toString().split(':');
			var meetingHour = parseInt(time[0]);
			if (meetingHour > hour) {
				return true;
			}
			if (meetingHour == hour) {
				if (parseInt(time[1]) > mins) {
					return true;
				}
			}
		} else if (weekday == (dayNow + 1) % 7) {
			return true;
		}
		return false;
	}
	function createFilterMeetingsToggle(map) {
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
		label.setAttribute("for", "myonoffswitch");
		controlSwitch.appendChild(label);
		var span = document.createElement("span");
		span.className = "onoffswitch-inner";
		label.appendChild(span);
		span = document.createElement("span");
		span.className = "onoffswitch-switch";
		label.appendChild(span);

		controlUI.appendChild(controlSwitch);

		checkbox.addEventListener('click', function () {
			g_next24hours = !g_next24hours;
			drawMarkers();
		});
		controlDiv.index = 1;
		return controlDiv;
	}
	function meetingTimes(meeting) {
		var duration = meeting.duration_time.split(':');
		var minutes = parseInt(duration[0]) * 60;
		if (duration.length > 1)
			minutes += parseInt(duration[1]);
		var startDate = new Date(new Date().toDateString() + ' ' + meeting.start_time);
		var endDate = new Date(startDate.getTime() + minutes * 60000);
		var startTimeSplit = meeting.start_time.split(':');
		var startTime = formattedTime(meeting.start_time);
		var endTime = '' + endDate.getHours() + ':';
		if (endDate.getMinutes() == 0) {
			endTime += '00';
		} else if (endDate.getMinutes() < 10) {
			endTime += '0' + endDate.getMinutes();
		} else {
			endTime += endDate.getMinutes();
		}
		endTime = formattedTime(endTime);
		return startTime + "&nbsp;-&nbsp;" + endTime;
	}
	function meetingDayAndTimes(meeting) {
		return config.weekdays[meeting.weekday_tinyint] + ' ' + meetingTimes(meeting);
	}
	function showListView() {
		var meetings = filterMeetings(filterVisible());
		if (meetings.length == 0) return;
		var modal = document.getElementById('table_modal');
		document.getElementById('close_table').addEventListener('click', function () {
			closeModalWindow(modal);
		});
		var listElement = document.getElementById("modal-view-by-weekday");
		meetings.sort(sortMeetingSearchResponseCallback);
		document.getElementById('modal-title').innerHTML = meetings.length + ' ' + config.Meetings_on_Map;
		var html = '<table class="bmlt-table table table-striped table-hover table-bordered">';
		var section = '';
		meetings.forEach(function (meeting) {
			if (meeting.weekday_tinyint != section) {
				section = meeting.weekday_tinyint;
				html += '<tr class="meeting-header"><td>' + config.weekdays[section] + '</td></tr>';
			}
			html += '<tr><td><div class="modal_times">' + meetingTimes(meeting) + '</div>';
			html += marker_make_meeting(meeting,true) + '</td></tr>';
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
		meetings.forEach(function (meeting) {
			if (meeting.location_municipality != section) {
				section = meeting.location_municipality;
				html += '<tr><td class="meeting-header">' + section + '</td></tr>';
			}
			html += '<tr><td><div class="modal_times">' + meetingDayAndTimes(meeting) + '</div>';
			html += marker_make_meeting(meeting,true) + '</td></tr>';
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
	var _isPseudoFullscreen = false;
	function isFullscreen() {
		var fullscreenElement =
			document.fullscreenElement ||
			document.mozFullScreenElement ||
			document.webkitFullscreenElement ||
			document.msFullscreenElement;

		return (fullscreenElement === inDiv) || _isPseudoFullscreen;
	}
	function toggleFullscreen(options) {
		var container = inDiv;
		if (isFullscreen()) {
			if (options && options.pseudoFullscreen) {
				_setFullscreen(false);
			} else if (document.exitFullscreen) {
				document.exitFullscreen();
			} else if (document.mozCancelFullScreen) {
				document.mozCancelFullScreen();
			} else if (document.webkitCancelFullScreen) {
				document.webkitCancelFullScreen();
			} else if (document.msExitFullscreen) {
				document.msExitFullscreen();
			} else {
				_disablePseudoFullscreen(container);
			}
		} else {
			if (options && options.pseudoFullscreen) {
				_setFullscreen(true);
			} else if (container.requestFullscreen) {
				container.requestFullscreen();
			} else if (container.mozRequestFullScreen) {
				container.mozRequestFullScreen();
			} else if (container.webkitRequestFullscreen) {
				container.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
			} else if (container.msRequestFullscreen) {
				container.msRequestFullscreen();
			} else {
				_enablePseudoFullscreen(container);
			}
		}
	}
	function getMeetings(url, centerMe, goto) {
		var promises = [fetchJsonp(url).then(function(response) { return response.json(); })];

		return Promise.all(promises)
			.then(function(data) {
				var mainMeetings = data[0];
				var jsonMeetings = JSON.stringify(mainMeetings['meetings']);
				if (jsonMeetings === "{}" || jsonMeetings === "[]") {
					var fullUrl = self.config['root_server'] + url
					console.log("Could not find any meetings for the criteria specified with the query <a href=\"" + fullUrl + "\" target=_blank>" + fullUrl + "</a>");
					//jQuery('#' + self.config['placeholder_id']).html("No meetings found.");
					return;
				}
				if (inMeetingDetail) {
					if (mainMeetings['meetings'].length > 0) { 
						inCoords.latitude = mainMeetings['meetings'][0].latitude;
						inCoords.longitude = mainMeetings['meetings'][0].longitude;
					}
					loadMap();
				}
				loadAllMeetings(mainMeetings['meetings'], mainMeetings['formats'], centerMe, goto, fitAll=false);
			});
	};
	var _isPseudoFullscreen = false;
	function _setFullscreen(fullscreen) {
		_isPseudoFullscreen = fullscreen;
		var container = inDiv;
		if (fullscreen) {
			L.DomUtil.addClass(container, 'leaflet-pseudo-fullscreen');
		} else {
			L.DomUtil.removeClass(container, 'leaflet-pseudo-fullscreen');
		}
		gDelegate.invalidateSize();
	}
	var _firstShow = true;
	function showMap() {
		if (!_firstShow) return;
		//_firstShow = false;
		gDelegate.invalidateSize();
		gDelegate.fitBounds(
			((gMeetingIdsFromCrouton) ? gAllMeetings.filter((m) => gMeetingIdsFromCrouton.includes(m.id_bigint)) : gAllMeetings)
				.reduce(function(a,m) {a.push([m.latitude, m.longitude]); return a;},[])
		);
	}
	/****************************************************************************************
	 *								MAIN FUNCTIONAL INTERFACE								*
	 ****************************************************************************************/
	if (inDiv && inCoords) {
		if (!inMeetingDetail) loadMap();
		this.getMeetingsExt = getMeetings;
		this.openTableViewExt = openTableView;
	};
	this.initialize = loadFromCrouton;
	this.showMap = showMap;
	this.fillMap = filterFromCrouton;
	this.rowClick = focusOnMeeting;
	this.apiLoadedCallback = apiLoadedCallback;
};
MeetingMap.prototype.getMeetingsExt = null;
MeetingMap.prototype.openTableViewExt = null;
MeetingMap.prototype.initialize = null;
MeetingMap.prototype.showMap = null;
MeetingMap.prototype.fillMap = null;
MeetingMap.prototype.rowClick = null;
MeetingMap.apiLoadedCallback = null;
function exchange(id1, id2) {
	var el = document.getElementById(id1);
	el.classList.remove("active");
	el.classList.add("hidden");
	el = document.getElementById(id2);
	el.classList.remove("hidden");
	el.classList.add("active");
}
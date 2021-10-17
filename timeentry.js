/* https://github.com/CMBrando/timeentry
   Vanilla JS time entry fork of jquery plugin at: https://github.com/kbwood/timeentry
   Brandon Kuehl October 2021
   Available under the MIT (https://opensource.org/licenses/MIT) license.
*/
var TimeEntry = (function () {

	'use strict';

	var Constructor = function (elem, optionParams) {


		var _defaults = {
			appendText: '',
			showSeconds: false,
			unlimitedHours: false,
			timeSteps: [1, 1, 1],
			initialField: null,
			noSeparatorEntry: false,
			tabToExit: false,
			useMouseWheel: true,
			defaultTime: null,
			minTime: null,
			maxTime: null,
			beforeShow: null,
			beforeSetTime: null,
			show24Hours: false,
			separator: ':',
			ampmPrefix: '',
			ampmNames: ['AM', 'PM']
		}
		
		var _elem = typeof(elem) === 'string' ? document.getElementById(elem) : elem;
		
		var _options = Object.assign({}, _defaults, (optionParams || {}));
		
		_options.show24Hours = (_options.show24Hours || _options.unlimitedHours);	
		
		var _focussed = false;
		
		var _field = 0;
		var _selectedHour = 0;
		var _selectedMinute = 0;
		var _selectedSecond = 0;
		var _secondField = 1;
		var _ampmField = null;
		var _lastChr = '';
		var _lastInput = {};
			
		var publicAPI = {};
		
		publicAPI.setOptions = function(options) {
			_options = Object.assign({}, _options, (options || {}))
			_options.show24Hours = (_options.show24Hours || _options.unlimitedHours);
		}
		
		publicAPI.destroy = function() {
			_elem.removeEventListener('focus', _doFocus);
			_elem.removeEventListener('blur', _doBlur);
			_elem.removeEventListener('click', _doClick);
			_elem.removeEventListener('keydown', _doKeyDown);
			_elem.removeEventListener('keypress', _doKeyPress);
			_elem.removeEventListener('wheel', _doMouseWheel);
			_elem.removeEventListener('paste', _doPaste);
			
			_options = _defaults;
		}	

		/** Initialise the current time for a time entry input field.
			@param time {Date|number|string} The new time or offset or <code>null</code> to clear.
					An actual time or offset in seconds from now or units and periods of offsets from now.
			@example $(selector).timeEntry('setTime', new Date(0, 0, 0, 11, 22, 33))
			 $(selector).timeEntry('setTime', +300)
			 $(selector).timeEntry('setTime', '+1H +30M')
			 $(selector).timeEntry('setTime', null) */
		publicAPI.setTime = function(time) {
			if (time === null || time === '') {
				_elem.value = '';
			}
			else {
				_setTime(time ? (Array.isArray(time) ? time :
					(typeof time === 'object' ? new Date(time.getTime()) : time)) : null);
			}
			
		};

		/** Retrieve the current time for a time entry input field.
			@return {Date} The current time or <code>null</code> if none.
			@example var time = $(selector).timeEntry('getTime') */
		publicAPI.getTime = function() {
			var currentTime = _extractTime();
			return (!currentTime ? null :
				new Date(0, 0, 0, currentTime[0], currentTime[1], currentTime[2]));
		};

		/** Retrieve the millisecond offset for the current time.
			@return {number} The time as milliseconds offset or zero if none.
			@example var offset = $(selector).timeEntry('getOffset') */
		publicAPI.getOffset = function() {
			var currentTime = _extractTime();
			return (!currentTime ? 0 :
				(currentTime[0] * 3600 + currentTime[1] * 60 + currentTime[2]) * 1000);
		};

		/** Initialise date entry.
			@private
			@param elem {Element|Event} The input field or the focus event. */
		var _doFocus = function(elem) {
			
			var input = (elem.nodeName && elem.nodeName.toLowerCase() === 'input' ? elem : this);
			if (_lastInput === input || input.disabled) {
				_focussed = false;
				return;
			}

			_focussed = true;
			_lastInput = input;
			_options = Object.assign({}, _options, (typeof(_options.beforeShow) === 'function') ? _options.beforeShow.apply(input) : {});
			_parseTime(elem.nodeName ? null : elem);
			setTimeout(function() { _showField(); }, 10);
		};

		/** Note that the field has been exited.
			@private
			@param event {Event} The blur event. */
		var _doBlur = function(event) {
			_lastInput = null;
		};

		/** Select appropriate field portion on click, if already in the field.
			@private
			@param event {Event} The click event. */
		var _doClick = function(event) {
			var input = event.target;
			var prevField = _field;
			if (!_focussed) {
				_field = _getSelection(input, event);
			}
			if (prevField !== _field) {
				_lastChr = '';
			}
			_showField();
			_focussed = false;
		};

		/** Find the selected subfield within the control.
			@private
			@param input {Element} The input control.
			@param event {Event} The triggering event.
			@return {number} The selected subfield. */
		var _getSelection = function(input, event) {
			var select = 0;
			var fieldSizes = [_elem.value.split(_options.separator)[0].length, 2, 2];
			if (input.selectionStart !== null) { // Use input select range
				var end = 0;
				for (var field = 0; field <= Math.max(1, _secondField, _ampmField); field++) {
					end += (field !== _ampmField ? fieldSizes[field] + _options.separator.length :
						_options.ampmPrefix.length + _options.ampmNames[0].length);
					select = field;
					if (input.selectionStart < end) {
						break;
					}
				}
			}
			else if (input.createTextRange && event != null) { // Check against bounding boxes
				var src = $(event.srcElement);
				var range = input.createTextRange();
				var convert = function(value) {
					return {thin: 2, medium: 4, thick: 6}[value] || value;
				};
				var offsetX = event.clientX + document.documentElement.scrollLeft -
					(src.offset().left + parseInt(convert(src.css('border-left-width')), 10)) -
					range.offsetLeft; // Position - left edge - alignment
				for (var field = 0; field <= Math.max(1, _secondField, _ampmField); field++) {
					var end = (field !== _ampmField ? (field * fieldSize) + 2 :
						(_ampmField * fieldSize) + _options.ampmPrefix.length +
						_options.ampmNames[0].length);
					range.collapse();
					range.moveEnd('character', end);
					select = field;
					if (offsetX < range.boundingWidth) { // And compare
						break;
					}
				}
			}
			return select;
		};
		
		var _doPaste = function(event) {
			setTimeout(function() { _parseTime(); }, 1);
		};

		/** Handle keystrokes in the field.
			@private
			@param event {Event} The keydown event.
			@return {boolean} <code>true</code> to continue, <code>false</code> to stop processing. */
		var _doKeyDown = function(event) {
			if (event.keyCode >= 48) { // >= '0'
				return true;
			}
			
			var retVal = false;
			switch (event.keyCode) {
				case 9:  retVal = 
							(_options.tabToExit ? true : (event.shiftKey ?
							// Move to previous time field, or out if at the beginning
							_changeField(-1, true) :
							// Move to next time field, or out if at the end
							_changeField(+1, true)));
						 break;
				case 35: if (event.ctrlKey) { // Clear time on ctrl+end
							_setValue('');
						}
						else { // Last field on end
							_field = Math.max(1, _secondField, _ampmField);
							_adjustField(0);
						}
						break;
				case 36: if (event.ctrlKey) { // Current time on ctrl+home
							_setTime();
						}
						else { // First field on home
							_field = 0;
							_adjustField(0);
						}
						break;
				case 37: _changeField(-1, false); break; // Previous field on left
				case 38: _adjustField(+1); break; // Increment time field on up
				case 39: _changeField(+1, false); break; // Next field on right
				case 40: _adjustField(-1); break; // Decrement time field on down
				case 46: _setValue(''); break; // Clear time on delete
				case 8: _lastChr = ''; // Fall through
				default: return true;
			}
			
			if(!retVal)
				event.preventDefault();
			
			return retVal;
		};

		/** Disallow unwanted characters.
			@private
			@param event {Event} The keypress event.
			@return {boolean} <code>true</code> to continue, <code>false</code> to stop processing. */
		var _doKeyPress = function(event) {
			var chr = String.fromCharCode(event.charCode === undefined ? event.keyCode : event.charCode);
			if (chr < ' ') {
				return true;
			}
			
			_handleKeyPress(chr);
			
			event.preventDefault();	
			return false;
		};

		/** Update date based on keystroke entered.
			@private
			@param chr {string} The new character. */
		var _handleKeyPress = function(chr) {
			if (chr === _options.separator) {
				_changeField(+1, false);
			}
			else if (chr >= '0' && chr <= '9') { // Allow direct entry of date
				var key = parseInt(chr, 10);
				var value = parseInt(_lastChr + chr, 10);
				var hour = (_field !== 0 ? _selectedHour :
					(_options.unlimitedHours ? value :
					(_options.show24Hours ? (value < 24 ? value : key) :
					(value >= 1 && value <= 12 ? value :
					(key > 0 ? key : _selectedHour)) % 12 +
					(_selectedHour >= 12 ? 12 : 0))));
				var minute = (_field !== 1 ? _selectedMinute :
					(value < 60 ? value : key));
				var second = (_field !== _secondField ? _selectedSecond :
					(value < 60 ? value : key));
				var fields = _constrainTime([hour, minute, second]);
				_setTime((_options.unlimitedHours ? fields :
					new Date(0, 0, 0, fields[0], fields[1], fields[2])));
				if (_options.noSeparatorEntry && _lastChr) {
					_changeField(+1, false);
				}
				else {
					_lastChr = (_options.unlimitedHours && _field === 0 ? _lastChr + chr : chr);
				}
			}
			else if (!_options.show24Hours) { // Set am/pm based on first char of names
				chr = chr.toLowerCase();
				if ((chr === _options.ampmNames[0].substring(0, 1).toLowerCase() &&
						_selectedHour >= 12) ||
						(chr === _options.ampmNames[1].substring(0, 1).toLowerCase() &&
						_selectedHour < 12)) {
					var saveField = _field;
					_field = _ampmField;
					_adjustField(+1);
					_field = saveField;
					_showField();
				}
			}
		};
		
		
		/** Increment/decrement on mouse wheel activity.
			@private
			@param event {Event} The mouse wheel event.
			@param delta {number} The amount of change. */
		var _doMouseWheel =  function(event) {
			
			var delta = Math.sign(event.deltaY);
			
 			if (event.target.disabled) {
				return;
			}			
			
			_elem.focus();
			if (!_elem.value) {
				_parseTime();
			}
			
			_adjustField(delta);
			event.preventDefault();
		};


		/** Extract the time value from the input field, or default to now.
			@private
			@param event {Event} The triggering event or <code>null</code>. */
		var _parseTime = function(event) {
			var currentTime = _extractTime();
			if (currentTime) {
				_selectedHour = currentTime[0];
				_selectedMinute = currentTime[1];
				_selectedSecond = currentTime[2];
			}
			else {
				var now = _constrainTime();
				_selectedHour = now[0];
				_selectedMinute = now[1];
				_selectedSecond = (_options.showSeconds ? now[2] : 0);
			}
			_secondField = (_options.showSeconds ? 2 : -1);
			_ampmField = (_options.show24Hours ? -1 : (_options.showSeconds ? 3 : 2));
			_lastChr = '';
			var postProcess = function() {
				if (_elem.value !== '') {
					_showTime();
				}
			};
			if (typeof _options.initialField === 'number') {
				_field = Math.max(0, Math.min(
					Math.max(1, _secondField, _ampmField), _options.initialField));
				postProcess();
			}
			else {
				setTimeout(function() {
					_field = _getSelection(_elem, event);
					postProcess();
				}, 0);
			}
		};

		/** Extract the time value from a string as an array of values, or default to <code>null</code>.
			@private
			@param value {string} The date text.
			@return {number[]} The retrieved time components (hours, minutes, seconds) or
					<code>null</code> if no value. */
		var _extractTime = function(value) {
			value = value || _elem.value;
			var currentTime = value.split(_options.separator);
			if (_options.separator === '' && value !== '') {
				currentTime[0] = value.substring(0, 2);
				currentTime[1] = value.substring(2, 4);
				currentTime[2] = value.substring(4, 6);
			}
			if (currentTime.length >= 2) {
				var isAM = !_options.show24Hours && (value.indexOf(_options.ampmNames[0]) > -1);
				var isPM = !_options.show24Hours && (value.indexOf(_options.ampmNames[1]) > -1);
				var hour = parseInt(currentTime[0], 10);
				hour = (isNaN(hour) ? 0 : hour);
				hour = ((isAM || isPM) && hour === 12 ? 0 : hour) + (isPM ? 12 : 0);
				var minute = parseInt(currentTime[1], 10);
				minute = (isNaN(minute) ? 0 : minute);
				var second = (currentTime.length >= 3 ? parseInt(currentTime[2], 10) : 0);
				second = (isNaN(second) || !_options.showSeconds ? 0 : second);
				return _constrainTime([hour, minute, second]);
			} 
			return null;
		};

		/** Constrain the given/current time to the time steps.
			@private
			@param fields {number[]} The current time components (hours, minutes, seconds).
			@return {number[]} The constrained time components (hours, minutes, seconds). */
		var _constrainTime = function(fields) {
			var specified = (fields !== null && fields !== undefined);
			if (!specified) {
				var now = _determineTime(_options.defaultTime) || new Date();
				fields = [now.getHours(), now.getMinutes(), now.getSeconds()];
			}
			var reset = false;
			for (var i = 0; i < _options.timeSteps.length; i++) {
				if (reset) {
					fields[i] = 0;
				}
				else if (_options.timeSteps[i] > 1) {
					fields[i] = Math.round(fields[i] / _options.timeSteps[i]) *
						_options.timeSteps[i];
					reset = true;
				}
			}
			return fields;
		};

		/** Set the selected time into the input field.
			@private
			*/
		var _showTime = function() {
			var currentTime = (_options.unlimitedHours ? _selectedHour :
				_formatNumber(_options.show24Hours ? _selectedHour :
				((_selectedHour + 11) % 12) + 1)) + _options.separator +
				_formatNumber(_selectedMinute) +
				(_options.showSeconds ? _options.separator +
				_formatNumber(_selectedSecond) : '') +
				(_options.show24Hours ?  '' : _options.ampmPrefix +
				_options.ampmNames[(_selectedHour < 12 ? 0 : 1)]);
			_setValue(currentTime);
			_showField();
		};

		/** Highlight the current date field.
			@private
			*/
		var _showField = function() {
			var input = _elem;
			if (_elem.hidden || _lastInput !== input) {
				return;
			}
			var fieldSizes = [_elem.value.split(_options.separator)[0].length, 2, 2];
			var start = 0;
			var field = 0;
			while (field < _field) {
				start += fieldSizes[field] +
					(field === Math.max(1, _secondField) ? 0 : _options.separator.length);
				field++;
			}
			var end = start + (_field !== _ampmField ? fieldSizes[field] :
				_options.ampmPrefix.length + _options.ampmNames[0].length);
			if (input.setSelectionRange) { // Mozilla
				input.setSelectionRange(start, end);
			}
			else if (input.createTextRange) { // IE
				var range = input.createTextRange();
				range.moveStart('character', start);
				range.moveEnd('character', end - _elem.value.length);
				range.select();
			}
			if (!input.disabled) {
				input.focus();
			}
		};

		/** Ensure displayed single number has a leading zero.
			@private
			@param value {number} The current value.
			@return {string} Number with at least two digits. */
		var _formatNumber = function(value) {
			return (value < 10 ? '0' : '') + value;
		};

		/** Update the input field and notify listeners.
			@private
			@param value {string} The new value. */
		var _setValue = function(value) {
			if (value !== _elem.value) {
				_elem.value = value;
				_elem.dispatchEvent(new Event('change'));
			}
		};

		/** Move to previous/next field, or out of field altogether if appropriate.
			@private
			@param offset {number} The direction of change (-1, +1).
			@param moveOut {boolean} <code>true</code> if can move out of the field.
			@return {boolean} <code>true</code> if exiting the field, <code>false</code> if not. */
		var _changeField = function(offset, moveOut) {
			var atFirstLast = (_elem.value) === '' ||
				_field === (offset === -1 ? 0 : Math.max(1, _secondField, _ampmField));
			if (!atFirstLast) {
				_field += offset;
			}
			_showField();
			_lastChr = '';
			return (atFirstLast && moveOut);
		};

		/** Update the current field in the direction indicated.
			@private
			@param offset {number} The amount to change by. */
		var _adjustField = function(offset) {
			if (_elem.value === '') {
				offset = 0;
			}
			if (_options.unlimitedHours) {
				_setTime([_selectedHour + (_field === 0 ? offset * _options.timeSteps[0] : 0),
					_selectedMinute + (_field === 1 ? offset * _options.timeSteps[1] : 0),
					_selectedSecond + (_field === _secondField ? offset * _options.timeSteps[2] : 0)]);
			}
			else {
			  _setTime(new Date(0, 0, 0,
				_selectedHour + (_field === 0 ? offset * _options.timeSteps[0] : 0) +
				(_field === _ampmField ? offset * 12 : 0),
				_selectedMinute + (_field === 1 ? offset * _options.timeSteps[1] : 0),
					_selectedSecond + (_field === _secondField ? offset * _options.timeSteps[2] : 0)));
			}
		};

		/** Check against minimum/maximum and display time.
			@private
			@param time {Date|number|string|number[]} The actual time or offset in seconds from now or
					units and periods of offsets from now or numeric period values. */
		var _setTime = function(time) {
			if (_options.unlimitedHours && Array.isArray(time)) {
				var fields = time;
			}
			else {
			time = _determineTime(time);
				var fields = (time ? [time.getHours(), time.getMinutes(), time.getSeconds()] : null);
			}
			fields = _constrainTime(fields);
			time = new Date(0, 0, 0, fields[0], fields[1], fields[2]);
			// Normalise to base date
			var time = _normaliseTime(time);
			var minTime = _normaliseTime(_determineTime(_options.minTime));
			var maxTime = _normaliseTime(_determineTime(_options.maxTime));
			// Ensure it is within the bounds set
			if (_options.unlimitedHours) {
				while (fields[2] < 0) {
					fields[2] += 60;
					fields[1]--;
				}
				while (fields[2] > 59) {
					fields[2] -= 60;
					fields[1]++;
				}
				while (fields[1] < 0) {
					fields[1] += 60;
					fields[0]--;
				}
				while (fields[1] > 59) {
					fields[1] -= 60;
					fields[0]++;
				}
				minTime = (_options.minTime != null && Array.isArray(_options.minTime)) ?
					_options.minTime : [0, 0, 0];
				if (fields[0] < minTime[0]) {
					fields = minTime.slice(0, 3);
				}
				else if (fields[0] === minTime[0]) {
					if (fields[1] < minTime[1]) {
						fields[1] = minTime[1];
						fields[2] = minTime[2];
					}
					else if (fields[1] === minTime[1]) {
						if (fields[2] < minTime[2]) {
							fields[2] = minTime[2];
						}
					}
				}
				if (_options.maxTime != null && Array.isArray(_options.maxTime)) {
					if (fields[0] > _options.maxTime[0]) {
						fields = _options.maxTime.slice(0, 3);
					}
					else if (fields[0] === _options.maxTime[0]) {
						if (fields[1] > _options.maxTime[1]) {
							fields[1] = _options.maxTime[1];
							fields[2] = _options.maxTime[2];
						}
						else if (fields[1] === _options.maxTime[1]) {
							if (fields[2] > _options.maxTime[2]) {
								fields[2] = _options.maxTime[2];
							}
						}
					}
				}
			}
			else {
			if (minTime && maxTime && minTime > maxTime) {
				if (time < minTime && time > maxTime) {
					time = (Math.abs(time - minTime) < Math.abs(time - maxTime) ? minTime : maxTime);
				}
			}
			else {
				time = (minTime && time < minTime ? minTime :
					(maxTime && time > maxTime ? maxTime : time));
			}
				fields[0] = time.getHours();
				fields[1] = time.getMinutes();
				fields[2] = time.getSeconds();
			}
			// Perform further restrictions if required
			if ((typeof _options.beforeSetTime) === 'function') {
				time = _options.beforeSetTime.apply(_elem,
					[publicAPI.getTime(_elem), time, minTime, maxTime]);
				fields[0] = time.getHours();
				fields[1] = time.getMinutes();
				fields[2] = time.getSeconds();
			}
			_selectedHour = fields[0];
			_selectedMinute = fields[1];
			_selectedSecond = fields[2];
			_showTime();
		};

		/** A time may be specified as an exact value or a relative one.
			@private
			@param setting {Date|number|string|number[]} The actual time or offset in seconds from now or
					units and periods of offsets from now or numeric period values.
			@return {Date} The calculated time. */
		var _determineTime = function(setting) {
			var offsetNumeric = function(offset) { // E.g. +300, -2
				var time = new Date();
				time.setTime(time.getTime() + offset * 1000);
				return time;
			};
			var offsetString = function(offset) { // E.g. '+2m', '-4h', '+3h +30m' or '12:34:56PM'
				var fields = _extractTime(offset); // Actual time?
				var time = new Date();
				var hour = (fields ? fields[0] : time.getHours());
				var minute = (fields ? fields[1] : time.getMinutes());
				var second = (fields ? fields[2] : time.getSeconds());
				if (!fields) {
					var pattern = /([+-]?[0-9]+)\s*(s|S|m|M|h|H)?/g;
					var matches = pattern.exec(offset);
					while (matches) {
						switch (matches[2] || 's') {
							case 's' : case 'S' :
								second += parseInt(matches[1], 10); break;
							case 'm' : case 'M' :
								minute += parseInt(matches[1], 10); break;
							case 'h' : case 'H' :
								hour += parseInt(matches[1], 10); break;
						}
						matches = pattern.exec(offset);
					}
				}
				time = new Date(0, 0, 10, hour, minute, second, 0);
				if (/^!/.test(offset)) { // No wrapping
					if (time.getDate() > 10) {
						time = new Date(0, 0, 10, 23, 59, 59);
					}
					else if (time.getDate() < 10) {
						time = new Date(0, 0, 10, 0, 0, 0);
					}
				}
				return time;
			};
			var offsetArray = function(setting) {
				return new Date(0, 0, 0, setting[0], setting[1] || 0, setting[2] || 0, 0);
			};
			return (setting ? (typeof setting === 'string' ? offsetString(setting) :
				(typeof setting === 'number' ? offsetNumeric(setting) :
				(Array.isArray(setting) ? offsetArray(setting) : setting))) : null);
		};

		/** Normalise time object to a common date.
			@private
			@param time {Date} The original time.
			@return {Date} The normalised time. */
		var _normaliseTime = function(time) {
			if (!time) {
				return null;
			}
			time.setFullYear(1900);
			time.setMonth(0);
			time.setDate(0);
			return time;
		};		
	
		
		_elem.addEventListener('focus', _doFocus);
		_elem.addEventListener('blur', _doBlur);
		_elem.addEventListener('click', _doClick);
		_elem.addEventListener('keydown', _doKeyDown);
		_elem.addEventListener('keypress', _doKeyPress);
		
		if(_options.useMouseWheel)
			_elem.addEventListener('wheel', _doMouseWheel
		);
		
		if(_elem.value == '' && _options.defaultTime)
			_setTime();
		
		_elem.addEventListener('paste', _doPaste);
			
			
		return publicAPI;

	};


	return Constructor;

})();
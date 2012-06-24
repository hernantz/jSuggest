 /*
 * jSuggest
 * Version 1.0.2 - Updated: Jun. 24, 2012
 *
 * This Plug-In will set up a UI that suggest results for your search queries as you type. 
 * You can add multiple selections as tokens and remove them on the fly. 
 * It supports keybord navigation and multiple jSuggest fields on the same page.
 *
 * Built on top of the Autocomplete plugin by: Drew Wilson | www.drewwilson.com
 * code.drewwilson.com/entry/autosuggest-jquery-plugin
 *
 * This jSuggest jQuery plug-in is dual licensed under the MIT and GPL licenses:
 * http:// www.opensource.org/licenses/mit-license.php
 * http:// www.gnu.org/licenses/gpl.html
 */
 
(function($){

	$.fn.jSuggest = function(options) {
		var defaults = {
			source: {}, // Object or URL where jSuggest gets the suggestions from.
			uniqID: false,
			startText: 'Enter a Value', // Text to display when the jSuggest input field is empty.
			emptyText: 'No Results Found', // Text to display when their are no search results.
			repeatText: 'Inserting the same value twice is not allowed', // Text to display when the user tries to enter same value twice.
			loadingText: 'Loading...', // Text to display when the results are being retrieved.
			preFill: {}, // Object from which you automatically add items when the page is first loaded.
			limitText: 'No More Values Are Allowed', // Text to display when the number of selections has reached it's limit.
			newItem: false, // If set to false, the user will not be able to add new items by any other way than by selecting from the suggestions list.
			newText: 'Adding New Values Is Not Allowed', // Text to display when the user tries to enter a new item by typing.
			selectedItemProp: 'value', // Value displayed on the added item
			selectProp: 'value', // Name of object property added to the hidden input.
			seekVal: 'value', // Comma separated list of object property names.
			queryParam: 'q', // The name of the param that will hold the search string value in the AJAX request.
			queryLimit: false, // Number for 'limit' param on ajax request.
			extraParams: '', // This will be added onto the end of the AJAX request URL. Make sure you add an '&' before each param.
			matchCase: false, // Make the search case sensitive when set to true.
			minChars: 1, // Minimum number of characters that must be entered before the search begins.
			keyDelay: 400, //  The delay after a keydown on the jSuggest input field and before search is started.
			resultsHighlight: true, // Option to choose whether or not to highlight the matched text in each result item.
			selectionLimit: false, // Limits the number of selections that are allowed.
			showResultList: true, // If set to false, the Results Dropdown List will never be shown at any time.
			selectionClick: function(elem, data){}, // Custom function that is run when a previously chosen item is clicked.
			selectionAdded: function(elem, data){}, // Custom function that is run when an item is added to the items holder.
			selectionRemoved: function(elem, data){ elem.remove(); }, // Custom function that is run when an item is removed from the items holder.
			spotFirst: true, // Option that spots the first suggestions on the results list if true.
			formatList: false, // Custom function that is run after all the data has been retrieved and before the results are put into the suggestion results list. 
			beforeRetrieve: function(string){ return string; }, // Custom function that is run before the AJAX request is made, or the local objected is searched.
			retrieveComplete: function(data){ return data; },
			resultClick: function(data){}, // Custom function that is run when a search result item is clicked.
			resultsComplete: function(){} // Custom function that is run when the suggestion results dropdown list is made visible.
		};  
		
		// Merge the options passed with the defaults.
		var opts = $.extend(defaults, options);     
		
		// Get the data type of the source.
		// Ensure that the source is either an object or a string.
		var dType = typeof opts.source;

		return this.each(function(x) {
		
			//If there is not a uniqID, build a ramdom ID so we can call this plugin multiple times.
			x = !opts.uniqID ? x+""+Math.floor(Math.random()*100) : x = opts.uniqID;
			var xID = !opts.uniqID ? "as-input-"+x : x;
		   
			// Get the text input and tune it up.
			var input = $(this);
			input.attr('autocomplete', 'off').addClass('as-input').attr('id', xID).val(opts.startText);
			
			// Setup basic elements and render them to the DOM.
			input.wrap('<ul class="as-selections" id="as-selections-'+x+'"></ul>').wrap('<li class="as-original" id="as-original-'+x+'"></li>');
			
			// UL that acts as a global container of the selected items and the orgLI.
			var itemsHolder = $('#as-selections-'+x);
			
			// LI element that holds the text input and the hidden input.
			var orgLI = $('#as-original-'+x);
		   
			// Div that holds each result or message inside the resultsUL. 
			var resultsHolder = $('<div class="as-results" id="as-results-'+x+'"></div>').hide();
			
			// UL where all search results and messages are placed.
			var resultsUL =  $('<ul class="as-list"></ul>').css('width', itemsHolder.outerWidth()).appendTo(resultsHolder);
			
			// Hidden input where all selected items are placed.
			var hiddenInput = $('<input type="hidden" class="as-values" name="as_values_'+x+'" id="as-values-'+x+'" />');
			
			// Get the query limit value.
			var qLimit = opts.queryLimit;
			
			// Get the selection limit value.
			var sLimit = opts.selectionLimit;
			
			// Flag variable activated when the results are showed up, to enable adding new items.
			var resultsFlag = false;
			
			// Variable that will be holding the remaining time to process the input between each keyup event.
			var timeout = null;
			
			// If the preFill source is a string.
			if (typeof opts.preFill === 'object') {

				// Set up a prefill counter.
				var pCount = 0;

				// Get the number of elements inside the prefill object.
				for (var k in opts.preFill) if (opts.preFill.hasOwnProperty(k)) pCount++;
				  
				// If we got at least one element.
				if (pCount > 0) {

					// Take into account the selection limit when adding new items.
					if (sLimit && pCount >= sLimit) { pCount = sLimit; }

					// Add each value of the prefill object.
					for(var n=0; n<pCount; n++) { addItem(opts.preFill[n], "000"+n); }
									  
					// Remove the start text and set up the styles.
					$('li.as-selection-item', itemsHolder).addClass('blur').removeClass('selected');
					input.val('').width(30);
				}
			}
			
			// Insert the selected values hidden input in the DOM.
			input.after(hiddenInput);
			
			// When the jSuggest container is clicked trigger the focus() event on the input.
			itemsHolder.click(function() {
			  input.focus();
			}).after(resultsHolder);  

			// Handle input field events.
			input.focus(function(){
			  
				// Remove the startText if we click on the input. 
				if (input.val() === opts.startText && hiddenInput.val() === '') { input.val(''); }
				  
				// When the input is active, highlight the selections by removing the 'blur' class.
				$("li.as-selection-item", itemsHolder).removeClass('blur');
				
				// Show the results list if there is a value in the input.
				if ($.trim(input.val()) !== ''){ resultsHolder.show(); }
			  
			}).blur(function() { // When we loose the focus.
			  
				// If no selections where made, show startText again.
				if (input.val() === '' && hiddenInput.val() === ''){ input.val(opts.startText); }
				
				// Set the input's width back.
				input.width(input.val().length * 8 + 30);

				// If the user is no longer manipulating the results list, hide it.
				if (!(resultsHolder.is(':hover'))){
					$('li.as-selection-item', itemsHolder).addClass('blur').removeClass('selected');
					resultsHolder.hide();
				}
			  
			}).keydown(function(e) { // The user is typing on the input.
			  
				// Track last key pressed.
				lastKey = e.keyCode;
				
				switch(lastKey) {
					
					// Up / Down arrow keys pressed.
					case 38: case 40:
						e.preventDefault();
						
						if (lastKey === 38) spotResult('up'); else spotResult('down');
						
						break;

					// Delete key pressed.
					case 8:
			  
						// If the input field is empty.
						if (input.val() === '') {

							// If there was a previous item with the 'selected' class, remove it.
							itemsHolder.children().not(orgLI.prev()).removeClass('selected');

							// If the last item is already selected, trigger the close click event on that item.
							if (orgLI.prev().hasClass('selected')) { 
								orgLI.prev().find('.as-close').click(); 
							} else {
								// Else, select the last item, and call the selectionClick custom function.
								opts.selectionClick.call(this, orgLI.prev(), orgLI.prev().data('js-data'));
								orgLI.prev().addClass('selected');    
							}
						}

						// Remove the last char from the input and hide the results list.
						if (input.val().length === 1){ resultsHolder.hide(); }

						// Make the search again, after the timeout delay.
						if (timeout){ clearTimeout(timeout); }
						timeout = setTimeout(function(){ keyChange(); }, opts.keyDelay);

						break;

					// Tab or comma keys pressed.
					case 9: case 188: case 13:
					
						// Prevent default behaviour if the comma or return keys are pressed to avoid submiting the form which jSuggest is part of.
						e.preventDefault();

						var nInput = $.trim(input.val()).replace(/(,)/g, '');
						if (nInput !== '' && hiddenInput.val().search(nInput + ',') < 0 && nInput.length >= opts.minChars) { 
							
							// If the tab or return keys are pressed when an result item is active, add it.
							if ((lastKey === 9 || lastKey === 13) && $('li.as-result-item:visible', resultsHolder).length > 0 && $('li.active:first', resultsUL).length > 0) { 
								$('li.active:first', resultsUL).click();
							
							} else { // The tab or return keys where pressed when no results where found.
								
								// If adding new items is allowed.
								if (opts.newItem) {

									// Check that the results where loaded.
									if (resultsFlag) {
										resultsFlag = false;
										
										// If we still are in within the number of items allowed.
										if (sLimit && $('li', itemsHolder).length <= sLimit) {

											// Get the custom formated object from the new item function.
											var nData = opts.newItem.call(this, nInput);

											// Generate a custom number identifier for the new item.
											var lis = $('li', itemsHolder).length;

											// Add the new item.
											addItem(nData, '00' + (lis+1));

											// Hide the results list.
											resultsHolder.hide();

											// Reset the text input.
											input.val('');

										} else { 
											// Show the message that alerts we cannot add more items.
											resultsUL.html('<li class="as-message">'+opts.limitText+'</li>').show(); 
										} 
									}
								} else { 
									// Show the newText message.
									resultsUL.html('<li class="as-message">'+opts.newText+'</li>').show(); 
								}
							}
						} else {
							// If the result is already in the hidden input field.
							resultsUL.html('<li class="as-message">'+opts.repeatText+'</li>').show(); 
						}	
						break;

					default:
						// First check if we reached the limit.
						if (sLimit && $("li.as-selection-item", itemsHolder).length >= sLimit) {
							resultsUL.html('<li class="as-message">'+opts.limitText+'</li>');
							resultsHolder.show();
						} else {
							// Other key was pressed, call the keyChange event after the timeout delay.
							if (timeout) { clearTimeout(timeout); }
							timeout = setTimeout(function(){ keyChange(); }, opts.keyDelay);
						}
						break;
				}

			}).keyup(function() {
			
				// Dynamically set the input width for a better user experience.
				input.width(input.val().length * 8 + 30);
			
			});

			// Function that is executed when typing and after the key delay timeout.
			function keyChange() {

				// ignore if the following keys are pressed: [del] [shift] [capslock]
				if ( lastKey == 46 || (lastKey > 9 && lastKey < 32) ){ return resultsHolder.hide(); }

				// Get the text from the input.
				// Remove the slashes (\ /) and then the extra whitespaces.
				var string = $.trim(input.val()).replace(/[\\]+|[\/]+/g,"").replace(/\s+/g," ");

				// If we passed the min chars limit, proceed.
				if (string.length >= opts.minChars) {

					// This counter is to get the number of values inside the source.
					var dCount = 0;

					// Call the custom beforeRetrieve function.
					if (opts.beforeRetrieve){ string = opts.beforeRetrieve.call(this, string); }

					// Show the loading text, and start the loading state.
					itemsHolder.addClass('loading');
					resultsUL.html('<li class="as-message">'+opts.loadingText+'</li>').show(); resultsHolder.show();

					// If the data is a URL, retrieve the results from it. Else, the data is an object, retrieve the results directly from the source.
					if (dType === 'string') {

					  // Set up the limit of the query.
					  var limit = qLimit ? "&limit="+encodeURIComponent(qLimit) : '';

						// Build the query and retrieve the response in JSON format.
						$.getJSON(opts.source+"?"+opts.queryParam+"="+encodeURIComponent(string)+limit+opts.extraParams, function(rData) { retrieveData(rData, string); });

					} else { retrieveData(opts.source, string); }

				} else {
					// We don't have the min chars required. 
					itemsHolder.removeClass('loading');
					resultsHolder.hide();
				}

			}
			
			// Function that gets the matched results and displays them.
			function processData(data, query, counter) {
			  
				var matchCount = 0, num, str, name;

				resultsHolder.html(resultsUL.html('')).hide();
			  
				// Loop the data to get an index of each element.
				for(var i=0; i<counter; i++) { 

					num = i;
							 
					str = '';
					
					// Get the properties which the user wants to search with.
					var props = opts.seekVal.split(',');
					
					for (var y=0; y<props.length; y++) {
						
						name = $.trim(props[y]);
					  
						str = str+data[num][name];
		  
					}
				
					// If not required, ignore the case sensitive search.
					if (!opts.matchCase) { str = str.toLowerCase(); query = query.toLowerCase(); }
					
					// If the search returned at least one result, and that result is not already selected.
					if (str.search(query) !== -1 && hiddenInput.val().search(data[num][opts.selectProp]+',') === -1) {
					  
						// Build each result li element to show on the results list, and bind the click event as a way to select results.
						var resultLI = $('<li class="as-result-item" id="as-result-item-'+num+'"></li>').click(function() {
							var rawData = $(this).data('data');
							var number = rawData.num;
							var data = rawData.attributes;
							input.val('').focus();

							// Add the clicked result as a new item.
							addItem(data, number);

							// Call the custom resultClick event.
							opts.resultClick.call(this, rawData);

							// Hide the results list.
							resultsHolder.hide();

						}).mouseover(function() { // When the mouse is over a suggestion, spot it. 
							$('li', resultsUL).removeClass('active');
							$(this).addClass('active');
						}).data('data',{attributes: data[num], num: num});

						var thisData = $.extend({}, data[num]);

						// Make the suggestions case sensitive or not. 
						var cType = !opts.matchCase ? 'gi' : 'g';
						var regx = new RegExp('(?![^&;]+;)(?!<[^<>]*)(' + query + ')(?![^<>]*>)(?![^&;]+;)', ''+ cType + '');

						// Highlight the results if the option is set to true.
						if (opts.resultsHighlight) {
							thisData[opts.selectedItemProp] = thisData[opts.selectedItemProp].replace(regx,"<em>$1</em>");
						}

						// Call the custom formatList event if it exists.
						resultLI = !opts.formatList ? resultLI.html(thisData[opts.selectedItemProp]) : opts.formatList.call(this, thisData, resultLI);

						// Add the LI element to the results list.
						resultsUL.append(resultLI);
						//delete thisData;

						// Increment the results counter after each result is added to the results list.
						matchCount++;

						// Check if we reached the limit of results to show.
						if (qLimit && qLimit == matchCount ){ break; }
					
					}
			  
				}
	  
				// There results where processed, remove the loading state
				itemsHolder.removeClass('loading');
				resultsFlag = true;
			
				// If no results were found, show the empty text message.
				if (matchCount <= 0){ 
					resultsUL.html('<li class="as-message">'+opts.emptyText+'</li>'); 
				}

				// Show the results list.
				resultsHolder.show();

				// Set the first result with the 'active' class if required.
				if (opts.spotFirst) { spotResult('down'); }

				// Call the custom resultsComplete function.
				opts.resultsComplete.call(this);
			
			}
		  
			function addItem(data, num) {
				
				// Add to the hidden input the seleced values property from the passed data.
				hiddenInput.val(hiddenInput.val()+data[opts.selectProp]+',');

				// If a selected item is clicked, add the selected class and call the custom selectionClick function.
				var item = $('<li class="as-selection-item" id="as-selection-'+num+'"></li>').click(function() {
				
					opts.selectionClick.call(this, $(this), data);
					itemsHolder.children().removeClass('selected');
					$(this).data(data).addClass('selected');
				
				}).data('js-data', data);

				// If the close cross is clicked, 
				var close = $('<a class="as-close">x</a>').click(function() {

					// Remove the item from the hidden input.
					hiddenInput.val(hiddenInput.val().replace(data[opts.selectProp]+',',''));

					// Call the custom selectionRemoved function.
					opts.selectionRemoved.call(this, item, data);
					input.focus();
					return false;

				});

				// Insert the item with the selectedItemProp as text and the close cross.
				orgLI.before(item.html(data[opts.selectedItemProp]).prepend(close));

				// Call the custom selectionAdded function with the recently added item as elem and its associated data.
				opts.selectionAdded.call(this, orgLI.prev(), data);

			}
			
			
			// Function that handles the up & down key press events to select the results.
			function spotResult(dir) {

				// If there is at least one visible item in the results list.
				if ($(':visible', resultsHolder).length > 0) {
				
					// Get all the LI elements from the results list.
					var lis = $('li', resultsHolder);

					// If the direction is 'down' spot the first result. If it is 'up', spot the last result.
					var spot = dir === 'down' ? lis.eq(0) : lis.filter(':last');

					// If a LI element was already spoted, take it as the base for future movements.
					var active = $('li.active:first', resultsHolder);
					if (active.length > 0){ spot = dir === 'down' ? active.next() : active.prev(); }

					// Set the 'active' class to the current result item.
					lis.removeClass('active');
					spot.addClass('active');

				}
				
			}
			
			// Function used to get the data from the source and send it to the processData function.
			function retrieveData (d, str) {
				// This counter is to get the number of values inside the source.
				var dCount = 0;
				
				// This variable will hold the object from the source to be processed or the URL to get the values via an ajax request. 
				// Call the custom retrieveComplete function.
				var theData = opts.retrieveComplete.call(this, d);

				// Count the number of items inside the object.
				for (var k in theData) if (theData.hasOwnProperty(k)) dCount++;

				// Send the object, the number of items inside and the string to processData function.
				processData(theData, str, dCount); 
			
			}
		});
	};
})(jQuery);

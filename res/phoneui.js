/*
 *  MobiOne PhoneUI Framework
 *  version 0.1.1
 *  <http://genuitec.com/mobile/resources/phoneui>
 *  (c) Copyright 2010, Genuitec, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ 
   
var phoneui = {};

/** 
  * Support for deprecated API mobione namespace
  * @deprecated 
  * @see phoneui
  */
var mobione = phoneui; 

// Initialize webapp for use by phoneui framework
$(document).ready(function() {
	jQuery.preloadCssImages();
	
	var webappCache = window.applicationCache;
	if (webappCache) {
		/*
		webappCache.addEventListener("checking", function() {
			phoneui.showActivityDialog("Checking for update...");
		}, false);
		*/
		var wasDownloaded = false;
		webappCache.addEventListener("noupdate", function() {
			phoneui.hideActivityDialog();
		}, false);
		webappCache.addEventListener("downloading", function() {
			phoneui.showActivityDialog("Updating...");
			wasDownloaded = true;
		}, false);
		webappCache.addEventListener("cached", function() {
			phoneui.hideActivityDialog();
		}, false);
		webappCache.addEventListener("updateready", function() { 
			location.reload(); // Reload page right after update came. 
		}, false);
		webappCache.addEventListener("obsolete", function() {
			phoneui.hideActivityDialog();
			alert("Error: The manifest is no longer available (code 404). Unable to cache web page for offline use.");
		}, false);
		webappCache.addEventListener("error", function(str) {
			phoneui.hideActivityDialog();
			if (wasDownloaded) {
				alert("Error: Unable to cache web page for offline use. Visit Safari settings and clear cache.");
			}
		}, false);

	}

	var isSliding = false;
	var hyperLinkClickSrc = null;
	var firstScreenTime = 1;
	// Map of already loaded URLs
	var defAncPars = [m1Design.root(), 'NONE', firstScreenTime];
	var currentScreen = parseAnchor('');

	// FORMAT: page_id:transition:time
	function parseAnchor(str) {
		var spl = str == "" ? [] : str.substr(1).split(':');
		
		// Append default params
		if (spl.length < defAncPars.length) {
			spl = spl.concat(defAncPars.slice(spl.length));
		}
		
		function obj() {};
		obj.prototype = m1Design.pages(spl[0]);
		var ret = new obj();
		ret.transition = spl[1];
		ret.time = spl[2];
		ret.equals = function(el) {
			return !el || (this.anchor_id == el.anchor_id);
		};
		ret.toString = function() { return this.anchor_id + ":" + this.transition; };
				
		return ret; 
	}
	
	// Install checkNewScreen as history change listener
	if ('onhashchange' in window) {
		window.onhashchange = checkNewScreen;
	} else {
		setInterval(checkNewScreen, 200);
	}
	checkNewScreen();

	// Re-orient screen (commented out until we can make it work correctly)
	/*
	function reorient() {
	    var isPort = !('orientation' in window) || (window.orientation % 180 == 0);
	    var p = m1Design.css('portrait');
	    var l = m1Design.css('landscape');
	    $('.' + m1Design.css('top-root')).removeClass(isPort ? l : p).addClass(isPort ? p : l);
	}
	window.onorientationchange = reorient;
	reorient();
	*/
	
	var prevHref;
	function checkNewScreen() {
		var initialCall = !prevHref;
		if (prevHref != window.location.href) {
			prevHref = window.location.href;
			
			var nextScreen = parseAnchor(window.location.hash);
			
			if (!nextScreen.equals(currentScreen)) {
				var revertTransition = false;
				var trans = nextScreen.transition;
	
				if ((+nextScreen.time) < (+currentScreen.time)) {
					// We're moving back in history!
					revertTransition = true;
					trans = currentScreen.transition;
				}
				
				function doAnimate() {
					var $next = $(nextScreen.anchor_id);
					animateNavigation( 
							$next, $(currentScreen.anchor_id), 
							initialCall ? "NONE" : trans, revertTransition);
	
					currentScreen = nextScreen;
					callPostTransition();
				}
	
				if (nextScreen.dynamic) {
					// Load page first
					loadExternalPage(nextScreen, doAnimate);
				} else {
					// Animate!
					doAnimate();
				}
			}
		}
	}

	function parseDPIPageData(data) {
		var pg = $('<div></div>');
		pg.html(data);
		var rt = pg.find('.' + m1Design.css('root'));
		preProcess(rt);
		rt.appendTo('.' + m1Design.css('top-root'));
	}
	
	function loadPageCssAndJs(nextScreen, onok) {
		var $next = $(nextScreen.anchor_id);
		if ($next.length > 0) {
			// Remove old div
			$next.remove();
		}

		// Load stylesheet as well
		$('<link rel="stylesheet" type="text/css" href="' + nextScreen.css_url() +'" >').appendTo("head");

		// LOADING AND ACTIVATE THE PAGE JS
		$.ajax({
		  url: nextScreen.js_url(),
		  dataType: 'script',
		  success: onok,
		  error: onok // Call onok anyway, we don't care about failed JS loading
		});
	}

	function loadExternalPage(nextScreen, onok) 
	{
		phoneui.showActivityDialog();
		
		loadPageCssAndJs(nextScreen, function () {
    		var req = new XMLHttpRequest();
    		req.open("GET", nextScreen.html_url(), true);
    		// req.setRequestHeader("If-Modified-Since", "Sat, 1 Jan 2005 00:00:00 GMT");
    		var timer = setTimeout(function() {
    		       req.abort();
    		     }, 10000);
    		req.onreadystatechange = function() {
    			if (req.readyState == req.DONE) {
    				var ok = (req.status >= 200 && req.status < 300) || (req.status == 0 && req.responseText.length > 0); 
    				if (ok) {
    					clearTimeout(timer);

						parseDPIPageData(req.responseText);
    				}

    				phoneui.hideActivityDialog();

    				if (ok) {
    					onok();
    				}
    			}
    		}
    		req.send(null);
        });		
	}
	
	function callPreTransition(nextScreen) {
		if ('prePageTransition' in window) {
			var result = 
				window['prePageTransition'](currentScreen.anchor_id, nextScreen.anchor_id);
			return !!result;
		}		
		return true;
	}
	
	function callPostTransition() {	    
		if ('postPageTransition' in window) {
			window['postPageTransition'](currentScreen.anchor_id);
		}		
	}
	
    
    function initOrientationMgmt() { 
    	function checkOrientation() {
   			if ('postOrientationChange' in window) {
				window['postOrientationChange'](window.orientation);			
			}		
		}
		window.onorientationchange = checkOrientation;
		// That check should be performed there,
		// but that line causes problem in TC.
		// checkOrientation();
	}
	initOrientationMgmt();
	
	/**
	 * Get ID of current page. ID of the page is it's anchor name (f.e. #m1-page1)
	 */
	phoneui.getCurrentPageId = function() {
		return currentScreen.anchor_id;
	}

	phoneui.submitForm = function(formId, button, urlToGoAfter) {
		var result = false;
		var form = document.forms(formId);
		if (form == null) return result;
		
		var onsubmitName = "preSubmitForm_" + form.name;
		if (onsubmitName in window) {
			result = window[onsubmitName](form);
			if (result == false) {
				return result;
			}
		}	
		
		var method = $(form).attr('method');
		var restype = $(form).attr('resulttype');
		var str = $(form).serialize();
		var path = $(form).attr('action');
		var aftersubmitName = "postSubmitForm_" + form.name;

		if (restype == 'WEB_PAGE') {
			// Pure Web submisson
			$(form)[0].submit();
			return;
		}
		
		phoneui.showActivityDialog();
		
		jQuery.ajax({
			type: method,
			url: path,
			data: str,
			cache: false,
			beforeSend: function(){ 
				return true; //return false if execution should terminate
			},
			error: function(XMLHttpRequest, textStatus, errorThrown) {
				console.log(textStatus);
				phoneui.hideActivityDialog();
				if (aftersubmitName in window) {
					window[aftersubmitName](false,textStatus);
				}			 
			},
			complete: function(xMLHttpRequest, textStatus) {

			},
			success: function(data) {
					result = true;

					if (aftersubmitName in window) {
						result = window[aftersubmitName](true, data);
					}
					
					if (result) {
						if (restype == 'DYNAMIC_PAGE') {
							var nextScreen = parseAnchor(urlToGoAfter);
							
							if (callPreTransition(nextScreen)) {
								loadPageCssAndJs(nextScreen, function() {
									parseDPIPageData(data);
	
									phoneui.hideActivityDialog();
	
									setNewLocation(urlToGoAfter);

									var $next = $(nextScreen.anchor_id);
									animateNavigation( 
											$next, $(currentScreen.anchor_id), 
											nextScreen.transition, false);
	
									nextScreen.time = currentScreen.time + 1;
									currentScreen = nextScreen;
									callPostTransition();
								});
							}
						} else if (urlToGoAfter) {
							// only restype == 'DATA' should be here 
							phoneui.hideActivityDialog();
							setNewLocation(urlToGoAfter);
						}
					}
			}
		});	

		return result;
	}
	
	function animateNavigation($new, $old, transition, revertTransition) {
		if(isSliding === false && ($new.attr('id') != $old.attr('id')))  {
			if ($new.length == 0) {
				return; // Target page is not found
			}

			var trNone = transition == 'NONE';
			var trFade = transition == 'FADE';
			var trFlipRight = transition == 'FLIP_LEFT';
			var trFlipLeft = transition == 'FLIP_RIGHT';
			var trSlideRight = transition == 'SLIDE_RIGHT';			
			var trSlideLeft = transition == 'SLIDE_LEFT' || transition == 'DEFAULT';
			
			isSliding = true;
			function afterTransition() {
				isSliding = false;
			}

			function doAfterTransition($el, fn) {
				var performAfterTrans = function() {
					fn();
					afterTransition();
					$el.unbind('webkitAnimationEnd', performAfterTrans);
				}
				$el.bind('webkitAnimationEnd', performAfterTrans);
			}

			var cssIn = m1Design.css("in"); 
			var cssOut = m1Design.css("out");
			if (trFade) {
				var cssFade = m1Design.css("fade") + " " + cssIn;
				doAfterTransition($new, function () { 
					$old.hide();
					$new.removeClass(cssFade);
				});
				$new .show().css({left: '0px'}).addClass(cssFade);
			} else if (trFlipRight || trFlipLeft) {
				var reverse = (trFlipLeft == revertTransition) ? (" " + m1Design.css("reverse")) : "";
				var cssFlip = m1Design.css("flip");
				$old .addClass(cssFlip + " " + cssOut + reverse);
	
				doAfterTransition($old, function() {
					$old.hide();
					$old.removeClass(cssFlip + " " + cssOut + reverse);
					doAfterTransition($new, function() {
						$new .removeClass(cssFlip + " " + cssIn + reverse).css({left: '0'});
					});
					$new.show().css({left: '0'}).addClass(cssFlip + " " + cssIn + reverse);
				});
			} else if (trSlideRight || trSlideLeft) {
				var cssSlide = m1Design.css("slide");
				var reverse = (trSlideLeft == revertTransition) ? (" " + m1Design.css("reverse")) : "";				
				doAfterTransition($new, function() {
					$old.hide();
					$old.removeClass(cssSlide + " " + cssOut + reverse);
					$new.removeClass(cssSlide + " " + cssIn + reverse);
				});
				
				$old .addClass(cssSlide + " " + cssOut + reverse);
				$new .show().addClass(cssSlide + " " + cssIn + reverse);
			} else {
				// No animation for "NONE" transitions
				$old.hide();
				$new.css({left:'0px', display:'block'});
				afterTransition();
			}
		}
		
		$new.find('.' + m1Design.css("iscroll-scroller")).each(function() {
			var el = $(this).get(0);
			!el.myScroll || el.myScroll.refresh();
		});
	};
	
	function setNewLocation(href) {
		if (href.match(/^#/)) {
			var nextScreen = parseAnchor(href);
			if (!nextScreen.equals(currentScreen)) {
				if (callPreTransition(nextScreen)) {
					// Add timestamp
					window.location = href + ":" + ((+currentScreen.time) + 1);
				}
			}
		} else if (href.match(/^http/) || href.match(/^mailto/)) { 
			window.location.href = href;
		} else if (href.match(/^javascript/)) {
			window.location.href = href;
		}		
	}
	
	function preProcess(context) {
		$('.' + m1Design.css("hyperlink"), context).click(function(event) {
			event.preventDefault();
			hyperLinkClickSrc = this;
			
			var href = $(this).attr('href');
			setNewLocation(href);
			
			setTimeout(function() {
				hyperLinkClickSrc = null;
			}, 0);
		});
	
		var btns = $('.' + m1Design.css("button"), context);
		btns.bind("touchstart", function() {
			$(this).attr('active', 'true');
		});
		
		btns.bind("touchend", function() {
			$(this).attr('active', 'false');
		});
		
		btns.bind("touchcancel", function() {
			$(this).attr('active', 'false');
		});
	
		// Support for "spinner mode" in SLM
		$('.' + m1Design.css('select-list-menu-spinner'), context).each(function(i, v) {	
			var sel = $("#" + $(v).attr("hiddenInputId"));
			var selInfoId = $("#" + $(v).attr("selectionInfoId"));
			if (selInfoId) {
				function onSelectionChange() {
					var labelsArray = [];
					var lis = sel.children('option');
					for(var i = 0; i < lis.length; i++) {
						var lbl = $(lis[i]);
						if (lbl.get(0).selected) {
							labelsArray.push(lbl.text());
						}
					}
					if ($(v).attr('multiple')=='false') {
						selInfoId.text(labelsArray[0]);
					} else {
						selInfoId.text("" + labelsArray.length);
					}
				}
	
				onSelectionChange();
				sel.unbind('change', onSelectionChange).bind('change', onSelectionChange);
				// For iOS4 support, subscribe to blur too 
				sel.unbind('blur', onSelectionChange).bind('blur', onSelectionChange);
			}
		});
		
		$('.' + m1Design.css("select-list-menu-spinner"), context).click(function() {
			var sel = $("#" + $(this).attr("hiddenInputId"));
			var el = sel.get(0);
			var evt = el.ownerDocument.createEvent('MouseEvents');
			evt.initMouseEvent('mousedown', true, true, el.ownerDocument.defaultView, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
			el.dispatchEvent(evt);
		});
		
		// End of support for "spinner mode" in SLM
		
		var prevTableClick = new Date();
		$('.' + m1Design.css("selection-list") + ' > li', context).click(function() {
			// Avoid double clicking on selection list items
			if (((new Date()).getTime() - prevTableClick.getTime()) > 100) {
				// 100 ms
				tableListMngt($(this));
			}
			prevTableClick = new Date();
		});
		
		jQuery.each($('.' + m1Design.css("selection-list")), function(i, v) {
			processSelectionList(v);
		});
	}
	preProcess($('.' + m1Design.css("top-root")));
	
	function processSelectionList(elt) {
		var selInfoId = $("#" + $(elt).attr("selectionInfoId"));
		var labelsArray = [];
		var resultMap = {};
		var lis = $(elt).children('li');
		for(var i = 0; i < lis.length; i++) {
			var lbl = $(lis[i]);
			if(lbl.hasClass(m1Design.css("selected"))) {
				resultMap[lbl.attr('val')] = true;
				if (selInfoId) {
					labelsArray.push(lbl.text());
				}
			}
		}
		var hiddenSel = $("#" + $(elt).attr("hiddenInputId"));
		
		// Update options states
		hiddenSel.children('option').each(function() {
			this.selected = resultMap[this.value];
		});
		
		if (selInfoId) {
			if ($(elt).attr('multiple')=='false') {
				selInfoId.text(labelsArray[0]);
			} else {
				selInfoId.text("" + labelsArray.length);
			}
		}
	}
	
	function tableListMngt(item) {		
		var elt = $(item).closest('ul')[0];	 
		if($(elt).attr('multiple')=='false') {
			$(elt).children('li').removeClass(m1Design.css("selected") + " " + m1Design.css('sl-select') + " " + m1Design.css('sl-unselect'));
			$(item).addClass(m1Design.css("selected"));
			setTimeout(function() {
				$(item).addClass(m1Design.css('sl-select'));
			}, 0);
		} else {
			if ($(item).is("." + m1Design.css("selected"))) {
				$(item).removeClass(m1Design.css("selected") + " " + m1Design.css('sl-select'));
				$(item).addClass(m1Design.css('sl-unselect'));
			} else {
				$(item).removeClass(m1Design.css('sl-unselect'));
				$(item).addClass(m1Design.css("selected") + " " + m1Design.css('sl-select'));
			}
		}
		// Remove animation classes after animation is finished
		setTimeout(function() {
			$(elt).children('li').removeClass(m1Design.css('sl-select') + " " + m1Design.css('sl-unselect'));
			}, 350);
		processSelectionList(elt);
	}
			
	function SetCookie(sName, sValue) {
			document.cookie = sName + "=" + escape(sValue);
			var date = new Date();
			var expdate = date.getTime();
			expdate += 3600*1000 //expires (milliseconds - 1000 is for a day)
			date.setTime(expdate);
			document.cookie += ("; expires=" + date.toUTCString());
	}
	
	function GetCookie(sName) {
			var aCookie = document.cookie.split("; ");
			for (var i=0; i < aCookie.length; i++)
			{
					var aCrumb = aCookie[i].split("=");
					if (sName == aCrumb[0])
							return unescape(aCrumb[1]);
			}
			return null;
	}

	var hsp = $('.' + m1Design.css('homescreen-prompt'));
	if(window.navigator.standalone != true && 
			window.navigator.userAgent.toLowerCase().indexOf('iphone')!=-1) {
		if(GetCookie('phc')) {
			// Hide the dialog box - to avoid scrolling
			hsp.hide();
		} else {
			// Show prompt dialog
			SetCookie('phc','true');
			hsp .css({top: '400px', opacity: '0.0'});
			setTimeout(function() { hsp .animate(
					{top: '300px', opacity: '1.0'}, 
					{duration: 400, complete: function() {
						setTimeout(function() { hsp .animate({opacity: '0'}, {
							duration:400,
							complete: function() { hsp .hide(); }
						})}, 5000);
					} }); }, 600);
		}
	} else {
		hsp .hide();
	}
});


document.addEventListener('DOMContentLoaded', function() {
	$('.' + m1Design.css('iscroll-scroller')).each(function() {
		var el = $(this).get(0);
		
		document.addEventListener('touchmove', function(e){ e.preventDefault(); });
		el.myScroll = new iScroll(el, { hScrollbar : false, vScrollbar : true, desktopCompatibility : true});
	});
});

/**
 * Navigate to previous URL in history
*/
phoneui.back = function() {
	history.go(-1);
}
	
/**
 *  Hide the addressBar if visible. 
 */
phoneui.hideAddressBar = function () {
	setTimeout(function() { window.scrollTo(0, 1) }, 100);
}

/**
 *  Show a small dialog composed of an animated graphic and an optional text 
 *  message. Use this function to indicate to the user that a potentially
 *  long running activity is underway, such as loading resources or waiting for
 *  computation to complete.
 *
 *  @see #hideActivityDialog
 */
phoneui.showActivityDialog = function (text) {
	if (!text && (text != "")) {
		text = "Loading..."; 
	}

	$('.' + m1Design.css('loading-text')) .html(text);

	if (!phoneui.showActivityDialog.controller) {
		var canvas = $('.' + m1Design.css("loading-spinner"))[0];
	
		var ctx = canvas.getContext("2d");
		var bars = 12;
		var currOffs = 0;
	
		function draw(ctx, offset) {
			clearFrame(ctx);
			ctx.save();
			ctx.translate(15, 15); // Center coordinates
			for(var i = 0; i<bars; i++){
				var cb = (offset+i) % bars;
				var angle = 2 * Math.PI * cb / bars;
	
				ctx.save();
				ctx.rotate(angle);
	
				var op = (1 + i)/bars;
				ctx.fillStyle = "rgba(255, 255, 255, " + op*op*op + ")";			
				ctx.fillRect(-1, 3, 2, 6);
	
				ctx.restore();
			}
			ctx.restore();
		}
		function clearFrame() {
			ctx.clearRect(0, 0, ctx.canvas.clientWidth, ctx.canvas.clientHeight);
		}
		function nextAnimation(){
			currOffs = (currOffs + 1) % bars;
			draw(ctx, currOffs);
		}
		phoneui.showActivityDialog.controller = {
			timer: -1,
			stop: function (){
				clearFrame();
				clearInterval(this.timer);
			},
			start: function (){
				this.timer = setInterval(nextAnimation, 80); // 20 fps
			}
		};
	}
	phoneui.showActivityDialog.controller.start();

	$('.' + m1Design.css('loading')) .show();
}

/**
 *  Terminate the activity dialog and remove it from the display. 
 *  This function is a NOP if the activity dialog is not already exposed.
 *
 *  @see #showActivityDialog
 */
phoneui.hideActivityDialog = function () {
	if (phoneui.showActivityDialog.controller) {
		phoneui.showActivityDialog.controller.stop();
	}
	$('.' + m1Design.css('loading')) .hide();
}

/**
 *  Contains current PhoneUI framework version
 */
phoneui.version = { 
	major : 0, 
	minor : 1, 
	maintenance : 1, 
	toString : function() {
		return this.major + "." + this.minor + "." + this.maintenance;
	}
}


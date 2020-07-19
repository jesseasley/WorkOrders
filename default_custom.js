/**
 * Notification that the UI is about to transition to a new page.
 * Perform custom prepage-transition logic here.
 * @param {String} currentPageId 
 * @param {String} targetPageId 
 * @returns {boolean} true to continue transtion; false to halt transition
 */
function prePageTransition(currentPageId,targetPageId) {
  // add custom pre-transition code here
  // return false to terminate transition
  return true;
}

/**
 * Notification that the UI has transition to a new page.
 * 
 * @param {String} newPageId 
 */
function postPageTransition(newPageId) {
  
}

/**
 * Notification that device orientation has changed. 
 * 
 * @param {String} newOrientation 
 */
function postOrientationChange(newOrientation) {
  if (Math.abs(newOrientation) == 90) {
     alert('Landscape orientation not supported. ' +
           'Please use portrait orientation.');
  }
}


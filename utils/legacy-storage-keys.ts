// The app was called billsend, and its keys in localStorage and sessionStorage
// started "billsend-"; they carry no name now. Runs first in <head>, before
// anything reads a key, and moves each old key to its new name so a returning
// visitor keeps their editor settings and any unsaved edits stashed at their
// last page exit.
export const RENAME_LEGACY_STORAGE_KEYS_SCRIPT = `(function(){var prefix="billsend-";[function(){return localStorage},function(){return sessionStorage}].forEach(function(area){try{var storage=area(),keys=[];for(var i=0;i<storage.length;i++){var key=storage.key(i);if(key&&key.indexOf(prefix)===0)keys.push(key)}keys.forEach(function(key){var renamed=key.slice(prefix.length);if(storage.getItem(renamed)===null)storage.setItem(renamed,storage.getItem(key));storage.removeItem(key)})}catch(error){}})})()`;

/*!
 * author:jieyou
 * contacts:百度hi->youyo1122
 * see https://github.com/jieyou/remember
 */
;(function(global){
	// configs, user can custom
	var configs = {
		// a group of radios with same `name`, but currect checked radio have no `value` ,use the checked radio's index of the same `name` radio group to storage
		// `noValueRadioIndexPrefix` is the fake value prefix
		// for example, the third radio has been checked, we storage the `__R_NVRIP__2` as value
		noValueRadioIndexPrefix : '__R_NVRIP__'
		// inputs (not radio or checkbox) and textareas must storage the old value to check if value changed
		,oldValueAttributeName  : 'data-roldvalue'
		// The line feed in textarea's value will be dropped when be be joined with other string. We user following string to replace.
		,textareaLineFeedHolder : '__R_TLFH_ramdom_769768842_ramdom_'
		// A especial key, used for localStorage key prefix. To avoid conflicts, this value should be more complex
		,localStorageKeyPrefix  : '__R_LSK__'
	}
	// In this version, we do nothing in broswer which do not support `localStorage`
	,supportLocalStorage = 'localStorage' in window
	// Get current url without hash as the localStorage key suffix
	,localStorageKeySuffix = encodeURIComponent(location.href.replace(location.hash,''))+'__'
	// storage the userd WrapperDom
	,initedRemembersWrapperDom = []
	
	// todo : polyfill
	,ArrayPrototypeForEach = Array.prototype.forEach
	,ArrayPrototypeSome = Array.prototype.some
	// todo : event polyfill
	// addEventListener
	// removeEventListener

	// helper functions
	// make sure any DOM operation function is called after dom ready
	// see https://github.com/jquery/jquery/blob/master/src/core/ready.js#L63
	function readyCall(callbackFunc){
		function ready(){
			document.removeEventListener('DOMContentLoaded',ready,false)
			window.removeEventListener('load',ready,false)
			callbackFunc.call(document)
		}
		if(document.readyState === 'complete'){
			setTimeout(ready)
		}else{
			document.addEventListener('DOMContentLoaded',ready,false)
			window.addEventListener('load',ready,false)
		}
	}

	function getTagName(dom){
		var tagName = dom.tagName
		return tagName?tagName.toUpperCase():null
	}

	function getValidWrapperDOM(wrapperDOM){
		if(typeof(wrapperDOM) === 'string'){
			wrapperDOM = document.getElementById(wrapperDOM)
		}
		if(wrapperDOM && wrapperDOM.nodeType === 1){
			return wrapperDOM
		}
		return document
	}

	function contains(parent,child){
		if(parent === child){
			return true
		}
		if(parent.compareDocumentPosition){
			if(parent.compareDocumentPosition(child) === 20){
				return true
			}
		}else if(parent.contains){
			if(parent.contains(child)){
				return true
			}
		}
		return false
	}

	// todo : if not support localStorage ,use cookie instead
	function getCacheStr(){
		var cache
		try{
			cache = localStorage.getItem(configs.localStorageKeyPrefix + localStorageKeySuffix)
			if(cache){
				return cache
			}
		}catch(e){}
		return null
	}

	function setCache(kvObj){
		var oldCacheStr = getCacheStr()
			,oldKvArr
			,mergedKvObj
			,key
			,key2
			,kvArr = []
		if(oldCacheStr){
			mergedKvObj = {}
			oldKvArr = oldCacheStr.split('&')
			ArrayPrototypeForEach.call(oldKvArr,function(e,i){
				var thisArr = e.split('=')
				mergedKvObj[thisArr[0]] = thisArr[1]
			})
		}
		if(mergedKvObj){
			for(key in kvObj){
				mergedKvObj[key] = kvObj[key];
			}
		}else{
			mergedKvObj = kvObj
		}
		for(key2 in mergedKvObj){
			kvArr.push(key2+'='+mergedKvObj[key2])
		}
		try{
			localStorage.setItem(configs.localStorageKeyPrefix + localStorageKeySuffix,kvArr.join('&'))
		}catch(e){}
	}

	// helper functions end

	// constructor
	function Remember(wrapperDOM,settings){
		settings = settings || {}
		this.wrapperDOM = wrapperDOM
		this.handleSetValueFromCacheFuncs = settings.handleSetValueFromCacheFuncs || {}
		this.ignoreIds = settings.ignoreIds || []
	}

	// call when init
	Remember.prototype.setValue = function(cacheStr){
		var cacheArr = cacheStr.split('&')
			,that = this

		ArrayPrototypeForEach.call(cacheArr,function(e,i){
			var one = e.split('='),
				id = one[0],
				DOM = document.getElementById(id),
				tagName,
				value = one[1],
				type,
				runDefaultSet,
				radiosGroup,
				optionsGronp,
				thisHandleValueChangeFunc
			if(DOM && that.ignoreIds.indexOf(id) === -1 && contains(that.wrapperDOM,DOM)){

				runDefaultSet = true
				thisHandleSetValueFromCacheFunc = that.handleSetValueFromCacheFuncs[id]
				if(typeof(thisHandleSetValueFromCacheFunc) === 'function'){
					runDefaultSet = thisHandleSetValueFromCacheFunc.call(DOM,value,that.wrapperDOM)
				}

				if(runDefaultSet){
					tagName = getTagName(DOM)
					if(tagName === 'INPUT'){
						type = DOM.type
						if(type === 'checkbox'){
							DOM.checked = value === '1'
						}else if(type === 'radio'){
							radiosGroup = DOM.ownerDocument.getElementsByName(DOM.name)
							if(value.indexOf(configs.noValueRadioIndexPrefix) === 0){
								value = parseInt(value.replace(configs.noValueRadioIndexPrefix,''))
								if(!isNaN(value) && radiosGroup[value]){
									radiosGroup[value].checked = true
								}
							}else{
								ArrayPrototypeSome.call(radiosGroup,function(_e,_i){
									if(_e.value === value){
										_e.checked = true
										return true
									}
								})
							}
						}else{
							DOM.setAttribute(configs.oldValueAttributeName,value)
							DOM.value = value
						}
					}else if(tagName === 'TEXTAREA'){
						DOM.setAttribute(configs.oldValueAttributeName,value)
						DOM.value = value.replace(new RegExp(configs.textareaLineFeedHolder,'g'),'\n')
					}else if(tagName === 'SELECT'){
						// `DOM.value = value` are not perfect if no options have the given value
						optionsGronp = DOM.getElementsByTagName('OPTION')
						ArrayPrototypeSome.call(optionsGronp,function(_e,_i){
							if(_e.value === value){
								DOM.selectedIndex = _i
								return true
							}
						})
					}else{
						DOM.value = value
					}
				}
			}
		})
	}

	Remember.prototype.getKvObj = function(){
		var kvObj = {},
			selects,
			textareas,
			inputs,
			usedRadioInputIds = [],
			that = this,
			wrapperDOM = this.wrapperDOM,
			tagName = getTagName(wrapperDOM)
			// ,name

		switch(tagName){
			case 'SELECT':
				selects = [wrapperDOM]
				textareas = []
				inputs = []
				break;
			case 'TEXTAREA':
				selects = []
				textareas = [wrapperDOM]
				inputs = []
				break;
			case 'INPUT':
				selects = []
				textareas = []
				// if(wrapperDOM.type === 'radio'){
				// 	name = wrapperDOM.name
				// 	inputs = name ? wrapperDOM.ownerDocument.getElementsByName(name) : [wrapperDOM]
				// }else{
				inputs = [wrapperDOM]
				// }
				break;
			default:
				selects = wrapperDOM.getElementsByTagName('SELECT') // reget 来避免在此期间dom插入，会损失一些性能
				textareas = wrapperDOM.getElementsByTagName('TEXTAREA')
				inputs = wrapperDOM.getElementsByTagName('INPUT')
				break;
		}

		ArrayPrototypeForEach.call(selects,function(e,i){
			var DOM = e,
				id = DOM.id
			if(id && that.ignoreIds.indexOf(id) === -1){
				kvObj[id] = DOM.value
			}
		})
		ArrayPrototypeForEach.call(textareas,function(e,i){
			var DOM = e,
				id = DOM.id
			if(id && that.ignoreIds.indexOf(id) === -1){
				kvObj[id] = DOM.value.replace(/\n/g,configs.textareaLineFeedHolder)
			}
		})
		ArrayPrototypeForEach.call(inputs,function(e,i){
			var DOM = e,
				id = DOM.id,
				type,
				value,
				name,
				radiosGroup,
				givenNameFoundChecked
			if(id && usedRadioInputIds.indexOf(id) === -1 && that.ignoreIds.indexOf(id) === -1){
				type = DOM.type
				if(type === 'checkbox'){
					if(DOM.checked){
						value = '1'
					}else{
						value = '0'
					}
				}else if(type === 'radio'){
					name = DOM.name
					radiosGroup = name ? DOM.ownerDocument.getElementsByName(name) : [DOM]
					ArrayPrototypeForEach.call(radiosGroup,function(_e,_i){
						if(_e.checked && !givenNameFoundChecked){
							givenNameFoundChecked = true
							value = _e.getAttribute('value') // use `.value` will return `on` when radio has no `value` attribute
							if(!value){
								value = configs.noValueRadioIndexPrefix+_i
							}
						}
						usedRadioInputIds.push(_e.id)
					})
					if(!value){
						value = ''
					}
				}else{
					value = DOM.value
				}

				kvObj[id] = value
			}
		})
		return kvObj
	}

	Remember.prototype.stop = function(){
		var wrapperDOM = this.wrapperDOM
		wrapperDOM.removeEventListener('change',this._changeEventFunc,true)
		wrapperDOM.removeEventListener('blur',this._blurEventFunc,true)
		delete this._changeEventFunc
		delete this._blurEventFunc
		ArrayPrototypeSome.call(initedRemembersWrapperDom,function(e,i){
			if(e === wrapperDOM){
				initedRemembersWrapperDom.splice(i,1)
				return true
			}
		})
	}

	function bindEvent(thisRemember){
		// cache for unbind
		thisRemember._changeEventFunc = function(e){
			var DOM = e.target,
				tagName = getTagName(DOM),
				id = DOM.id,
				type,
				isObjectTarget
			if(id && thisRemember.ignoreIds.indexOf(id) !== -1){
				return true
			}
			if(tagName === 'SELECT'){
				isObjectTarget = true
			}else if(tagName === 'INPUT'){
				isObjectTarget = true
				type = DOM.type
				if(type === 'checkbox' || type === 'radio'){
					isObjectTarget = true
				}
			}
			if(isObjectTarget){
				setCache(thisRemember.getKvObj())
			}
		}
		thisRemember.wrapperDOM.addEventListener('change',thisRemember._changeEventFunc,true) // change event do not bubble in some browsers, use capture instead

		thisRemember._blurEventFunc = function(e){
			var DOM = e.target,
				tagName = getTagName(DOM),
				id = DOM.id,
				type = DOM.type,
				value
			if(id && thisRemember.ignoreIds.indexOf(id) !== -1){
				return true
			}
			if((tagName === 'INPUT' && (type !== 'checkbox' && type !== 'radio')) || tagName === 'TEXTAREA'){
				value = DOM.value
				if(tagName === 'TEXTAREA'){
					value = value.replace(/\n/g,configs.textareaLineFeedHolder)
				}
				if(value !== DOM.getAttribute(configs.oldValueAttributeName)){
					DOM.setAttribute(configs.oldValueAttributeName,value)
					setCache(thisRemember.getKvObj())
				}
			}
		}
		thisRemember.wrapperDOM.addEventListener('blur',thisRemember._blurEventFunc,true) // blur event do not bubble in some browsers, use capture instead
	}

	// main & factory function
	function remember(wrapperDOM,settings){
		var newRemember
			,hasContainedDom = false
		wrapperDOM = getValidWrapperDOM(wrapperDOM)
		ArrayPrototypeSome.call(initedRemembersWrapperDom,function(e,i){
			if(contains(e,wrapperDOM) || contains(wrapperDOM,e)){
				hasContainedDom = true
				return true
			}
		})
		if(hasContainedDom){
			// 指定的`wrapperDOM`已被占用，或与另一个已被使用的`wrapperDOM`有包含或被包含的关系。
			throw new Error('Specified `wrapperDOM` has been occupied or has been included by another occupied `wrapperDOM` or has another occupied `wrapperDOM` included.')
		}
		initedRemembersWrapperDom.push(wrapperDOM)
		newRemember = new Remember(wrapperDOM,settings)
		readyCall(function(){
			var cacheStr = getCacheStr()
			if(supportLocalStorage){
				if(cacheStr){
					newRemember.setValue(cacheStr)
				}
				bindEvent(newRemember)
			}
		})
		return newRemember
	}

	global.remember = remember
	
	global.remember.configs = configs

})((function(){return this})())
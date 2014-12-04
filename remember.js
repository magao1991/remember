/*!
 * author:jieyou
 * contacts:baidu hi->youyo1122
 * see https://github.com/jieyou/remember
 */
;(function(global){
	// configs, user can custom
	var configs = {
		// a group of radios with same `name`, but currect checked radio have no `value` ,use the checked radio's index of the same `name` radio group to storage
		// `noValueRadioIndexPrefix` is the fake value prefix
		// for example, the third radio has been checked, we storage the `__R_NVRIP__2` as value
		noValueRadioIndexPrefix  : '__R_NVRIP__'
		// inputs (not radio or  checkbox) and textareas must storage the old value to check if value changed
		,oldValueAttributeName   : 'data-roldvalue'
		// The line feed in text area's value will be dropped when be be joined with other string. We user following string to replace.
		,textareaLineFeedHolder  : '__R_TLFH_ramdom_769768842_ramdom_'
		// A especial key, used  for localStorage key prefix. To avoid conflicts, this value should be more complex
		,localStorageKeyPrefix   : '__R_LSK__'
		// 我们将不同“网址”的值存储在不同的key下，这里所说的“网址”不包含location.hash部分。但是是否包含location.search部分是可选的。当这个值为false时，将包含（http://www.example.com/?a=1与http://www.example.com/?a=2视为不同“网址”）；否则不包含（http://www.example.com/?a=1与http://www.example.com/?a=2视为同一个“网址”）
		,ignoreSearchStringInUrl :false
	}
	// In this version, we do nothing in broswer which do not support `localStorage`
	,supportLocalStorage = 'localStorage' in window
	// Get current url as the localStorage key suffix
	,localStorageKeySuffix
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
			global.removeEventListener('load',ready,false)
			callbackFunc.call(document)
		}
		if(document.readyState === 'complete'){
			setTimeout(ready)
		}else{
			document.addEventListener('DOMContentLoaded',ready,false)
			global.addEventListener('load',ready,false)
		}
	}

	function getTagName(dom){
		var tagName = dom.tagName
		return tagName?tagName.toUpperCase():null
	}

	// Get current url as the localStorage key suffix
	function getLocalStorageKeySuffix(){
		if(!localStorageKeySuffix){
			localStorageKeySuffix = encodeURIComponent(configs.ignoreSearchStringInUrl?location.href.split('?')[0]:location.href.replace(location.hash,''))+'__'
		}
		return localStorageKeySuffix
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

	function isNormalInput(type){
		return type !== 'submit' && type !== 'button' && type !== 'hidden' && type !== 'image' && type !== 'file' && type !== 'reset'
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
			cache = localStorage.getItem(configs.localStorageKeyPrefix + getLocalStorageKeySuffix())
			if(cache){
				return cache
			}
		}catch(e){}
		return null
	}

	function setCache(kvObj){
		// alert('setCache')
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
			localStorage.setItem(configs.localStorageKeyPrefix + getLocalStorageKeySuffix(),kvArr.join('&'))
		}catch(e){}
	}

	// helper functions end

	// constructor
	function Remember(wrapperDOM,settings){
		var that = this
		settings = settings || {}
		that.wrapperDOM = wrapperDOM
		that.handleSetValueFromCacheFuncs = settings.handleSetValueFromCacheFuncs || {}
		that.ignoreIds = settings.ignoreIds || []
		switch(getTagName(that.wrapperDOM)){
			case 'SELECT':
				that.selects = [wrapperDOM]
				that.textareas = []
				that.inputs = []
				break;
			case 'TEXTAREA':
				that.selects = []
				that.textareas = [wrapperDOM]
				that.inputs = []
				break;
			case 'INPUT':
				that.selects = []
				that.textareas = []
				that.inputs = [wrapperDOM]
				break;
			default:
				that.selects = wrapperDOM.getElementsByTagName('SELECT')
				that.textareas = wrapperDOM.getElementsByTagName('TEXTAREA')
				that.inputs = wrapperDOM.getElementsByTagName('INPUT')
				break;
		}
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
				thisHandleSetValueFromCacheFunc
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
						}else if(isNormalInput(type)){
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
			// selects,
			// textareas,
			// inputs,
			usedRadioInputIds = [],
			that = this
		// 	,
		// 	wrapperDOM = this.wrapperDOM,
		// 	tagName = getTagName(wrapperDOM)
		// 	// ,name

		// switch(tagName){
		// 	case 'SELECT':
		// 		selects = [wrapperDOM]
		// 		textareas = []
		// 		inputs = []
		// 		break;
		// 	case 'TEXTAREA':
		// 		selects = []
		// 		textareas = [wrapperDOM]
		// 		inputs = []
		// 		break;
		// 	case 'INPUT':
		// 		selects = []
		// 		textareas = []
		// 		// if(wrapperDOM.type === 'radio'){
		// 		// 	name = wrapperDOM.name
		// 		// 	inputs = name ? wrapperDOM.ownerDocument.getElementsByName(name) : [wrapperDOM]
		// 		// }else{
		// 		inputs = [wrapperDOM]
		// 		// }
		// 		break;
		// 	default:
		// 		selects = wrapperDOM.getElementsByTagName('SELECT')
		// 		textareas = wrapperDOM.getElementsByTagName('TEXTAREA')
		// 		inputs = wrapperDOM.getElementsByTagName('INPUT')
		// 		break;
		// }

		ArrayPrototypeForEach.call(that.selects,function(e,i){
			var DOM = e,
				id = DOM.id
			if(id && that.ignoreIds.indexOf(id) === -1){
				kvObj[id] = DOM.value // option 如果没有设置value值，则浏览器会将它的innerHTML当做value值；如果value和option都没有，则为空字符串''。所以总能正确设置
			}
		})
		ArrayPrototypeForEach.call(that.textareas,function(e,i){
			var DOM = e,
				id = DOM.id
			if(id && that.ignoreIds.indexOf(id) === -1){
				kvObj[id] = DOM.value.replace(/\n/g,configs.textareaLineFeedHolder)
			}
		})
		ArrayPrototypeForEach.call(that.inputs,function(e,i){
			var DOM = e,
				id = DOM.id,
				type,
				value = null,
				name,
				radiosGroup,
				givenNameFoundChecked = false
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
							if(!value){ // radio 未设置value值
								value = configs.noValueRadioIndexPrefix+_i
							}
						}
						usedRadioInputIds.push(_e.id)
					})
					if(!value){ // 没有任何一个radio被选中了
						value = ''
					}
				}else if(isNormalInput(type)){
					value = DOM.value
				}
				if(value !== null){
					kvObj[id] = value
				}
			}
		})
		return kvObj
	}

	Remember.prototype.stop = function(){
		var that = this
		var wrapperDOM = that.wrapperDOM
		wrapperDOM.removeEventListener('change',that._changeEventFunc,true)
		wrapperDOM.removeEventListener('blur',that._blurEventFunc,true)
		delete that._changeEventFunc
		delete that._blurEventFunc
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
			if(tagName === 'SELECT' || tagName === 'TEXTAREA'){
				isObjectTarget = true
			}else if(tagName === 'INPUT'){
				// isObjectTarget = true
				type = DOM.type
				// if(isNormalInput(type)){
				// 	sObjectTarget = true
				// }
				if(!type || type === 'text' || type === 'checkbox' || type === 'radio' || type === 'password' || type === 'range'){ // todo : input type="range" 在IE上的一次拖动，会触发多次change事件 
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
				type = DOM.type
				// ,
				// value
			if(id && thisRemember.ignoreIds.indexOf(id) !== -1){
				return true
			}
			if(tagName === 'INPUT'){
				type = DOM.type
				if((type && type !== 'text' && type !== 'checkbox' && type !== 'radio' && type !== 'password' && type !== 'range' && isNormalInput(type)) && DOM.value !== DOM.getAttribute(configs.oldValueAttributeName)){
				// value = DOM.value
				// if(tagName === 'TEXTAREA'){
				// 	value = value.replace(/\n/g,configs.textareaLineFeedHolder)
				// }
				// if(DOM.value !== DOM.getAttribute(configs.oldValueAttributeName)){
					DOM.setAttribute(configs.oldValueAttributeName,DOM.value)
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

	remember.configs = configs

	// AMD && CMD
	if(typeof define === 'function'){
		define(function(){
			return remember
		})
	// CommonJS
	}else if(typeof module !== "undefined" && module !== null){
		module.exports = remember
	// global
	}else{
		global.remember = remember
	}

})((function(){return this})())

// todo 提供每个id，设置值完毕后的回调，目前只提供了设置值之前的handle
// todo 设置值的时候，采用传参的形式，手动指明只有哪个“可交互元素”发生了改变，无需为wrapperDOM内的所有元素重新取值
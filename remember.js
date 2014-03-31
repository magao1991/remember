;(function(){
	// configs, user can custom
	var configs = {
		// a group of radios with same `name`, but currect checked radio have no `value` ,use the checked radio's index of the same `name` radio group to storage
		// `radioIndexPrefix` is the fake value prefix
		// for example, the third radio has been checked, we storage the `__R_NVRIP__2` as value
		noValueRadioIndexPrefix : '__R_NVRIP__'
		// inputs (not radio or checkbox) and textareas must storage the old value to check if value changed
		,oldValueAttributeName  : 'data-roldvalue'
		// The line feed in textarea's value will be dropped when be appended to hash string. We user following string to replace.
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

	// todo : 不支持localStorage的，降级兼容到使用cookie
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
			Array.prototype.forEach.call(oldKvArr,function(e,i){
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
	// todo : polyfill
	// 	Array.prototype.foreach
	// 	Array.prototype.some

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

		Array.prototype.forEach.call(cacheArr,function(e,i){
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
					tagName = DOM.tagName.toUpperCase()
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
								Array.prototype.some.call(radiosGroup,function(_e,_i){
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
						Array.prototype.some.call(optionsGronp,function(_e,_i){
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
			that = this

		selects = this.wrapperDOM.getElementsByTagName('SELECT') // reget 来避免在此期间dom插入，会损失一些性能
		textareas = this.wrapperDOM.getElementsByTagName('TEXTAREA')
		inputs = this.wrapperDOM.getElementsByTagName('INPUT')

		Array.prototype.forEach.call(selects,function(e,i){
			var DOM = e,
				id = DOM.id
			if(id && that.ignoreIds.indexOf(id) === -1){
				// cacheArr.push(id+'='+DOM.value)
				kvObj[id] = DOM.value
			}
		})
		Array.prototype.forEach.call(textareas,function(e,i){
			var DOM = e,
				id = DOM.id
			if(id && that.ignoreIds.indexOf(id) === -1){
				// cacheArr.push(id+'='+DOM.value.replace(/\n/g,configs.textareaLineFeedHolder))
				kvObj[id] = DOM.value.replace(/\n/g,configs.textareaLineFeedHolder)
			}
		})
		Array.prototype.forEach.call(inputs,function(e,i){
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
					Array.prototype.forEach.call(radiosGroup,function(_e,_i){
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

				// cacheArr.push(id+'='+value)
				kvObj[id] = value
			}
		})
		return kvObj
	}
	// todo 提供remove的方法，在方法中解绑事件

	// 私有化bindEvent方法，让外部无法调用，多次调用会导致重复绑定事件
	function bindEvent(thisRemember){
		thisRemember.wrapperDOM.addEventListener('change',function(e){
			var DOM = e.target,
				tagName = DOM.tagName.toUpperCase(),
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
		},true) // change event do not bubble in some browsers, use capture instead

		thisRemember.wrapperDOM.addEventListener('blur',function(e){
			var DOM = e.target,
				tagName = DOM.tagName.toUpperCase(),
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
		},true) // blur event do not bubble in some browsers, use capture instead
	}

	// main & factory function
	function remember(wrapperDOM,settings){
		// todo : 每次的wrapperDOM不能包含或被已经init化的wrapperDOM包含 done
		var newRemember
			,hasContainedDom = false
		wrapperDOM = getValidWrapperDOM(wrapperDOM)
		Array.prototype.some.call(initedRemembersWrapperDom,function(e,i){
			if(contains(e,wrapperDOM) || contains(wrapperDOM,e)){
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

	// todo : 不写死window为global，而是动态获取global 
	window.remember = remember
	
	window.remember.configs = configs

})()
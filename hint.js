(function() {
    var controllerEles = getControllerEles(),
        mask = createMaskElement()

    var __VM = avalon.define('_tmp', function(vm) {
        vm.$skipArray = ['mouseoverid', 'vmid']
        vm.vmid = ''
        vm.name = ''
        vm.identifier = ''
        vm.mouseoverid = ''
        vm.mouseoverIdentifition = ''
    })
    
    __VM.$watch('identifier', function(identifier) {
        if (!identifier) return
        var vmId = __VM.vmid,
            parseVmodel = displayObj(avalon.vmodels[vmId])
        sendMessage(parseVmodel, 'vmodel')
        __VM.identifier = ''
    })
    __VM.$watch('name', function(name) {
        if (!name) return
        var vmodel = avalon.vmodels[__VM.vmid],
            vmObj = eval('vmodel' + name),
            parseVmodel = displayObj(vmObj),
            arr = avalon.type(vmObj) === 'array'
        parseVmodel.__arr = arr
        sendMessage(parseVmodel, 'nestObj')
    })
    __VM.$watch('mouseoverIdentifition', function(mouseoverIdentifition) {
        var vmId = __VM.mouseoverid
        if (!mouseoverIdentifition) {
            mask.style.cssText = 'display: none;'
        } else {
            setMaskPosition(vmId, mouseoverIdentifition)
        }
    })

    function displayObj (vmObj) {
        var obj = vmObj.$model ? vmObj.$model : vmObj,
            displayObj = {},
            funcReg = /^(function\s*[a-zA-Z0-9_]*\([a-zA-Z0-9_var,\s]*\))\s*\{/
        console.log('displayObj arguments vmObj')
        console.log(vmObj)
        for (var i in obj) {
            var item = obj[i],
                type = avalon.type(item),
                watch = !(i.charAt(0) === '$' || (vmObj.$skipArray && vmObj.$skipArray.indexOf(i) !== -1 ? true: false)),
                displayObjI = {},
                elementObj = false

            if (item && item.ELEMENT_NODE && item.DOCUMENT_NODE) {
                elementObj = true
                type = 'string'
                watch = false
                item = Object.prototype.toString.call(item)
            }

            displayObj[i] = displayObjI = {
                watch: watch,
                val: item,
                type: type
            }
            elementObj && (displayObjI.elementObj = true)

            switch(type) {
                case 'function':
                    displayObjI.val = funcReg.exec(item)[0] + '...}'
                break
                case 'array':
                    displayObjI.val = '[...]'
                break
                case 'object':
                    displayObjI.val = '{...}'
                break
                case 'string':
                    displayObjI.val = avalon.filters.escape(item)
            }
        }
        console.log('displayObj')
        console.log(displayObj)
        return displayObj
    }
    var eventProxyElement = document.getElementById('__avalonVmodelElement')
    avalon.scan(eventProxyElement, __VM)
    var customEvent = document.createEvent('Event')
    customEvent.initEvent('avalonVmodel', true, true)

    function sendMessage (obj, messageType) {
        obj.__messageType = messageType
        eventProxyElement.innerText = JSON.stringify(obj)
        eventProxyElement.dispatchEvent(customEvent)
    }

    eventProxyElement.addEventListener('clearInjected', function () {
        mask.parentNode.removeChild(mask)
        delete avalon.vmodels._tmp
        eventProxyElement.innerText = 'clearOk'
        eventProxyElement.dispatchEvent(customEvent)
    })

    function getControllerEles() {
        var elements = document.getElementsByTagName('*'),
            avalonElements = []

        for (var i = 0, len = elements.length; i < len; i++) {
            var element = elements[i],
                vmodel = element.getAttribute('avalonctrl')

            if (vmodel) {
                avalonElements.push(element)
            }
        }
        return avalonElements
    }
    function createMaskElement() {
        var html = document.getElementsByTagName('html')[0];
        var maskElement = document.createElement('div')
        maskElement.style.display = 'none'
        html.appendChild(maskElement)
        return maskElement
    }
    function setMaskPosition(name, identifier) {
        for (var i = 0, len = controllerEles.length; i < len; i++) {
            var controllerEle = controllerEles[i]
            if (controllerEle.getAttribute('avalonctrl') === name && controllerEle.getAttribute('identifier') === identifier) {
                setCss(controllerEle, mask)
            }
        }
    }
    function setCss(element, mask) {
        var width = element.offsetWidth,
            height = element.offsetHeight,
            offset = avalon(element).offset(),
            offsetLeft = offset.left,
            offsetTop = offset.top

        mask.style.cssText = 'display: block; width: ' + width + 'px;height: ' + height + 'px;left: ' + offsetLeft + 'px; top:' + offsetTop + 'px; background: rgba(244, 68, 168, 0.2);position:absolute;'
    }
})()
